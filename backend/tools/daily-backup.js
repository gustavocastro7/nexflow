
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BACKUP_DIR = path.join(__dirname, '../../backups');
const MAX_BACKUPS = 7;
const DOCKER_SERVICE = 'postgres';
const CONTAINER_NAME = 'nexflow-postgres-debug';

// DB credentials (must match docker-compose.yml)
const DB_USER = 'nexflow_user';
const DB_NAME = 'nexflow_db';

async function runBackup() {
  console.log('📦 Starting Docker-based Daily Backup...');

  try {
    // 1. Ensure container is up
    console.log(`🚀 Ensuring Docker service "${DOCKER_SERVICE}" is running...`);
    execSync(`docker-compose up -d ${DOCKER_SERVICE}`, { stdio: 'inherit', cwd: path.join(__dirname, '../../') });

    // 2. Wait for Postgres to be ready
    console.log('⏳ Waiting for database to be ready...');
    let ready = false;
    let attempts = 0;
    while (!ready && attempts < 10) {
      try {
        execSync(`docker exec ${CONTAINER_NAME} pg_isready -U ${DB_USER}`, { stdio: 'ignore' });
        ready = true;
      } catch (e) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!ready) throw new Error('Database failed to become ready in time.');
    console.log('✅ Database is ready.');

    // 3. Create backup directory
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${DB_NAME}-${timestamp}.sql`;
    const filePath = path.join(BACKUP_DIR, filename);

    // 4. Run pg_dump inside container and pipe to host file
    console.log(`💾 Dumping database to: ${filename}...`);
    execSync(`docker exec ${CONTAINER_NAME} pg_dump -U ${DB_USER} ${DB_NAME} > "${filePath}"`, { shell: true });
    
    console.log('✅ Backup successful!');

    // 5. Cleanup old backups
    cleanupOldBackups();
    
    console.log('✨ All done!');
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
  }
}

function cleanupOldBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return;
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.sql'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length > MAX_BACKUPS) {
    console.log(`Sweep: removing ${files.length - MAX_BACKUPS} old backup(s)...`);
    for (let i = MAX_BACKUPS; i < files.length; i++) {
      fs.unlinkSync(path.join(BACKUP_DIR, files[i].name));
      console.log(`   Deleted: ${files[i].name}`);
    }
  }
}

runBackup();
