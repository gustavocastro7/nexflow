import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../lib/config/database.js';
import { findOrCreate } from '../lib/utils/db.js';
import User from '../lib/models/User.js';
import Workspace from '../lib/models/Workspace.js';
import CostCenter from '../lib/models/CostCenter.js';
import UserWorkspace from '../lib/models/UserWorkspace.js';

async function seed() {
  await connectDB();
  console.log('Database connected.');

  await mongoose.connection.syncIndexes();
  console.log('Indexes synced.');

  const [defaultWorkspace] = await findOrCreate(Workspace, { name: 'Nexflow Matriz' }, {
    schema_name: 'nexflow_matriz',
    status: 'active'
  });
  console.log(`Workspace "${defaultWorkspace.name}" ready.`);

  const ccCount = await CostCenter.countDocuments({ workspace_id: defaultWorkspace.id });
  if (ccCount === 0) {
    await CostCenter.insertMany([
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
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      const user = await User.create({
        name: u.name,
        email: u.email,
        password_hash: u.password,
        profile: u.profile || 'jedi',
        default_workspace_id: defaultWorkspace.id
      });
      await findOrCreate(UserWorkspace, { user_id: user.id, workspace_id: defaultWorkspace.id });
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
