require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

// Start HTTP server immediately (required by Hostinger - must call listen within 3s)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});

// Then connect to database, sync and seed
(async () => {
  try {
    const sequelize = require('./src/config/database');
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    
    // Ensure all models are registered before sync
    require('./src/models/PhoneLine');

    // Sync models
    await sequelize.sync({ force: false, alter: false });
    console.log('Database synced.');

    // Seed jedi users from env
    const User = require('./src/models/User');
    const Workspace = require('./src/models/Workspace');
    const MockSeeder = require('./src/utils/MockSeeder');

    let jediUsers;
    try {
      jediUsers = JSON.parse(process.env.JEDI_USERS || '[]');
    } catch { jediUsers = []; }

    if (jediUsers.length > 0) {
      let defaultWorkspace = await Workspace.findOne({ where: { name: 'Nexflow Matriz' } });
      if (!defaultWorkspace) {
        defaultWorkspace = await Workspace.create({
          name: 'Nexflow Matriz',
          schema_name: 'nexflow_matriz',
          status: 'active'
        });
        const CostCenter = require('./src/models/CostCenter');
        await CostCenter.bulkCreate([
          { name: 'Diretoria', description: 'Centro de custo da diretoria', workspace_id: defaultWorkspace.id },
          { name: 'TI', description: 'Centro de custo de infraestrutura e TI', workspace_id: defaultWorkspace.id },
          { name: 'Financeiro', description: 'Centro de custo do financeiro', workspace_id: defaultWorkspace.id }
        ]);
      }

      for (const u of jediUsers) {
        const existing = await User.findOne({ where: { email: u.email } });
        if (!existing) {
          await User.create({
            name: u.name,
            email: u.email,
            password_hash: u.password,
            profile: u.profile || 'jedi',
            default_workspace_id: defaultWorkspace.id
          });
          console.log(`Jedi user "${u.name}" seeded.`);
        }
      }
    }

    // Run Mock Seeder
    await MockSeeder.run();
  } catch (error) {
    console.error('Database setup failed (server continues running):', error.message);
  }
})();
