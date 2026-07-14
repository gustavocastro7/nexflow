const { Sequelize } = require('../node_modules/sequelize');
const sequelize = new Sequelize('nexflow_db', 'nexflow_user', 'nexflow_password', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false,
});

async function run() {
  try {
    const res = await sequelize.query("SELECT workspace_id, count(*) FROM invoices GROUP BY workspace_id");
    console.log('Invoice distribution by workspace:');
    console.table(res[0]);
    
    const workspaces = await sequelize.query("SELECT id, name FROM workspaces");
    console.log('\nWorkspaces:');
    console.table(workspaces[0]);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
