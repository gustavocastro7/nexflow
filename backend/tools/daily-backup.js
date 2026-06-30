const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BACKUP_DIR = path.join(__dirname, '../../backups');
const MAX_BACKUPS = 7;
const CONTAINER_NAME = 'nexflow-postgres-debug';

const DB_USER = 'nexflow_user';
const DB_NAME = 'nexflow_db';

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  const logFile = path.join(BACKUP_DIR, 'backup.log');
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.appendFileSync(logFile, line + '\n');
  } catch {}
}

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf-8', timeout: 120000, maxBuffer: 100 * 1024 * 1024, ...opts });
}

async function runBackup() {
  log('Iniciando backup...');

  try {
    log('Verificando se o container do PostgreSQL esta rodando...');
    try {
      run(`docker inspect --format='{{.State.Status}}' ${CONTAINER_NAME}`);
    } catch {
      log('Container nao encontrado. Tentando iniciar via Docker Compose...');
      run(`docker compose -f docker-compose.yml up -d postgres`, { cwd: path.join(__dirname, '../../') });
    }

    log('Aguardando database ficar pronta...');
    let ready = false;
    for (let i = 0; i < 10; i++) {
      try {
        run(`docker exec ${CONTAINER_NAME} pg_isready -U ${DB_USER}`);
        ready = true;
        break;
      } catch {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    if (!ready) throw new Error('Database nao ficou pronta a tempo.');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${DB_NAME}-${timestamp}.sql.gz`;
    const filePath = path.join(BACKUP_DIR, filename);

    log(`Gerando dump comprimido: ${filename}...`);
    const dump = run(`docker exec ${CONTAINER_NAME} pg_dump -U ${DB_USER} ${DB_NAME}`);
    const compressed = zlib.gzipSync(dump);
    fs.writeFileSync(filePath, compressed);

    log(`Backup concluido: ${(compressed.length / 1024 / 1024).toFixed(2)} MB`);

    cleanupOldBackups();
    log('Backup finalizado com sucesso.');
  } catch (error) {
    log(`ERRO: ${error.message}`);
    process.exitCode = 1;
  }
}

function cleanupOldBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return;
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.sql.gz'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length > MAX_BACKUPS) {
    log(`Removendo ${files.length - MAX_BACKUPS} backup(s) antigo(s)...`);
    for (let i = MAX_BACKUPS; i < files.length; i++) {
      fs.unlinkSync(path.join(BACKUP_DIR, files[i].name));
      log(`  Removido: ${files[i].name}`);
    }
  }
}

runBackup();
