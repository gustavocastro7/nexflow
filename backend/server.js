const app = require('./src/app');
const sequelize = require('./src/config/database');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected successfully.');
    
    // Ensure all models are registered before sync
    require('./src/models/PhoneLine');

    // Sync models
    await sequelize.sync({ force: false, alter: true });
    console.log('Database synced.');

    // Seed jedi and default workspace
    const User = require('./src/models/User');
    const Workspace = require('./src/models/Workspace');
    const MockSeeder = require('./src/utils/MockSeeder');
    const adminEmail = process.env.ADMIN_EMAIL || 'gustavocastro73@gmail.com';
    
    let admin = await User.findOne({ where: { email: adminEmail } });
    
    if (!admin) {
      // Create Default Workspace first
      const defaultWorkspace = await Workspace.create({
        name: 'Nexflow Matriz',
        schema_name: 'nexflow_matriz',
        status: 'active'
      });

      admin = await User.create({
        name: 'Jedi Master',
        email: adminEmail,
        password_hash: process.env.ADMIN_PASSWORD || 'castro',
        profile: 'jedi',
        default_workspace_id: defaultWorkspace.id
      });

      // Create some default cost centers for the matrix
      const CostCenter = require('./src/models/CostCenter');
      await CostCenter.bulkCreate([
        { name: 'Diretoria', description: 'Centro de custo da diretoria', workspace_id: defaultWorkspace.id },
        { name: 'TI', description: 'Centro de custo de infraestrutura e TI', workspace_id: defaultWorkspace.id },
        { name: 'Financeiro', description: 'Centro de custo do financeiro', workspace_id: defaultWorkspace.id }
      ]);

      console.log('Default jedi, workspace and cost centers created.');
    }

    // Seed Fabio if not exists
    const fabioEmail = 'fabioluckmann79@gmail.com';
    let fabio = await User.findOne({ where: { email: fabioEmail } });
    if (!fabio) {
      const defaultWS = await Workspace.findOne({ where: { name: 'Nexflow Matriz' } });
      if (defaultWS) {
        await User.create({
          name: 'Fabio Luckmann',
          email: fabioEmail,
          password_hash: 'fabio',
          profile: 'jedi',
          default_workspace_id: defaultWS.id
        });
        console.log('Fabio Luckmann seeded as Jedi.');
      }
    }

    // Run Mock Seeder
    await MockSeeder.run();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

startServer();
