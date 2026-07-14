import 'dotenv/config';
import { getSequelize } from '../lib/config/database.js';
import { initModels, getModel } from '../lib/models/registry.js';

async function seed() {
  const sequelize = getSequelize();

  await sequelize.authenticate();
  console.log('Database connected.');

  initModels();
  await sequelize.sync({ force: false, alter: false });
  console.log('Models synced.');

  const User = getModel('User');
  const Workspace = getModel('Workspace');
  const CostCenter = getModel('CostCenter');
  const UserWorkspace = getModel('UserWorkspace');

  const [defaultWorkspace] = await Workspace.findOrCreate({
    where: { name: 'Nexflow Matriz' },
    defaults: { name: 'Nexflow Matriz', schema_name: 'nexflow_matriz', status: 'active' }
  });
  console.log(`Workspace "${defaultWorkspace.name}" ready.`);

  const ccCount = await CostCenter.count({ where: { workspace_id: defaultWorkspace.id } });
  if (ccCount === 0) {
    await CostCenter.bulkCreate([
      { name: 'Diretoria', description: 'Centro de custo da diretoria', workspace_id: defaultWorkspace.id },
      { name: 'TI', description: 'Centro de custo de infraestrutura e TI', workspace_id: defaultWorkspace.id },
      { name: 'Financeiro', description: 'Centro de custo do financeiro', workspace_id: defaultWorkspace.id },
    ]);
    console.log('Default cost centers created.');
  }

  let jediUsers;
  try {
    jediUsers = JSON.parse(process.env.JEDI_USERS || '[]');
  } catch {
    jediUsers = [];
  }

  for (const u of jediUsers) {
    const existing = await User.findOne({ where: { email: u.email } });
    if (!existing) {
      const user = await User.create({
        name: u.name,
        email: u.email,
        password_hash: u.password,
        profile: u.profile || 'jedi',
        default_workspace_id: defaultWorkspace.id
      });
      await UserWorkspace.findOrCreate({
        where: { user_id: user.id, workspace_id: defaultWorkspace.id }
      });
      console.log(`Jedi user "${u.name}" seeded.`);
    }
  }

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
