const fs = require('fs');
const path = require('path');
const sequelize = require('./src/config/database');
const User = require('./src/models/User');
const Workspace = require('./src/models/Workspace');
const UserWorkspace = require('./src/models/UserWorkspace');

async function resetAndSeed() {
  try {
    console.log('--- Iniciando o reset do banco de dados com DDL ---');

    // 1. Ler o arquivo DDL
    const ddlPath = path.join(__dirname, 'schema.sql');
    const ddl = fs.readFileSync(ddlPath, 'utf8');

    // 2. Limpar o schema public
    try {
        await sequelize.query('DROP SCHEMA IF EXISTS public CASCADE;');
        await sequelize.query('CREATE SCHEMA public AUTHORIZATION pg_database_owner;');
        console.log('✅ Schema public limpo e recriado.');
    } catch (e) {
        console.warn('⚠️ Falha ao dropar schema public, tentando continuar com o DDL...');
    }

    // 3. Executar o DDL
    await sequelize.query(ddl);
    console.log('✅ Tabelas e tipos recriados com sucesso através do arquivo schema.sql.');

    // 4. Criar os Workspaces
    const nexflowMatriz = await Workspace.create({
      name: 'Nexflow Matriz',
      schema_name: 'nexflow_matriz',
      status: 'active'
    });
    console.log('🏢 Workspace "Nexflow Matriz" criado.');

    const CostCenter = require('./src/models/CostCenter');
    await CostCenter.create({
      name: 'Matriz',
      code: 'MATRIZ',
      description: 'Centro de Custo Padrão',
      workspace_id: nexflowMatriz.id
    });
    console.log('💰 Centro de Custo "Matriz" criado para Nexflow.');

    const teleen = await Workspace.create({
      name: 'Teleen Consultoria',
      schema_name: 'teleen_consultoria',
      status: 'active'
    });
    console.log('🏢 Workspace "Teleen Consultoria" criado.');

    await CostCenter.create({
      name: 'Matriz',
      code: 'MATRIZ',
      description: 'Centro de Custo Padrão',
      workspace_id: teleen.id
    });
    console.log('💰 Centro de Custo "Matriz" criado para Teleen.');

    // 5. Criar os usuários Jedi
    const gustavo = await User.create({
      name: 'Gustavo Castro',
      email: 'gustavocastro73@gmail.com',
      password_hash: 'castro',
      profile: 'jedi',
      default_workspace_id: nexflowMatriz.id
    });
    console.log('👤 Usuário Jedi "Gustavo Castro" criado.');

    const fabio = await User.create({
      name: 'Fabio Luckmann',
      email: 'fabioluckmann79@gmail.com',
      password_hash: 'fabio',
      profile: 'jedi',
      default_workspace_id: nexflowMatriz.id
    });
    console.log('👤 Usuário Jedi "Fabio Luckmann" criado.');

    // 6. Associar usuários aos workspaces
    await UserWorkspace.bulkCreate([
      { user_id: gustavo.id, workspace_id: nexflowMatriz.id },
      { user_id: gustavo.id, workspace_id: teleen.id },
      { user_id: fabio.id, workspace_id: nexflowMatriz.id },
      { user_id: fabio.id, workspace_id: teleen.id },
    ]);
    console.log('🔗 Usuários associados aos workspaces.');
    
    console.log('--- Script finalizado com sucesso! ---');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro durante a execução do script:', error);
    process.exit(1);
  }
}

resetAndSeed();
