# Nexflow Project

Plataforma SaaS com multi‑tenancy por schema.

## Configurações de Banco de Dados

### PostgreSQL
*   **Conexão:** `postgresql://nexflow_user:nexflow_password@localhost:5432/nexflow_db`
*   **Host:** `localhost`
*   **Porta:** `5432`
*   **Usuário:** `nexflow_user`
*   **Senha:** `nexflow_password`
*   **Database:** `nexflow_db`

### Interface de Gerenciamento (pgAdmin)
*   **URL:** `http://localhost:5050`
*   **Usuário:** `admin@nexflow.com`
*   **Senha:** `admin_password`

### MongoDB
*   **Conexão:** `mongodb://localhost:27017/nexflow_logs`
*   **Host:** `localhost`
*   **Porta:** `27017`
*   **Database:** `nexflow_logs`
*   **Senha:** (Sem senha configurada no ambiente de debug)

## Portas do Sistema
*   **Backend:** `3000` (API & Swagger)
*   **Frontend:** `8080` (Vite Dev Server)
*   **PostgreSQL:** `5432`
*   **MongoDB:** `27017`
*   **pgAdmin:** `5050`

## Estrutura do Projeto

- `/backend`: API REST em Node.js com Express e Sequelize.
- `/frontend`: SPA em React com Vite, TypeScript e Material UI.
- `/backups`: Diretório onde são salvos os backups diários do banco de dados.
- `docker-compose.yml`: Orquestração para PostgreSQL, MongoDB e pgAdmin.

## Como Iniciar o Ambiente Unificado

Para iniciar todo o ecossistema (Bancos de Dados via Docker, Backend e Frontend) em um único terminal, utilize o arquivo:

```bash
.\start_all.bat
```

Este script irá:
1. Subir os containers do PostgreSQL, MongoDB e pgAdmin via Docker Compose.
2. Instalar as dependências do `backend` e `frontend` (caso não existam).
3. Iniciar o servidor do Backend em `http://localhost:3000`.
4. Iniciar o servidor do Frontend em `http://localhost:8080`.
5. Manter todos os logs no mesmo terminal.

## Ferramentas de Relatórios (Novidade)

Os relatórios do sistema foram atualizados para garantir 100% de visibilidade dos dados:
- **Phone Lines Report**: Agora mostra **todos** os números de telefone encontrados nas faturas importadas, mesmo aqueles que ainda não foram cadastrados no sistema.
- **Identificação Automática**: Utiliza o campo `original_user` da fatura como "Nome de Origem" quando não há um responsável associado manualmente.
- **Centro de Custo Padrão (Matriz)**: Todo novo workspace agora vem com um centro de custo padrão chamado "Matriz".
- **Auto-associação**: Ao importar faturas, qualquer número de telefone novo é automaticamente cadastrado e associado ao centro de custo "Matriz" do workspace correspondente.
- **Dashboard Stats**: Estatísticas precisas separadas por operadora (Claro/Vivo) e faturas TXT.

## Ferramentas de Manutenção e Teste

### Testes de API e Banco de Dados
Localizadas em `backend/tools/`:
- **Database Check**: `node backend/tools/db-check.js`
  - Verifica a conexão e compara a quantidade de linhas cadastradas vs. linhas encontradas nas faturas.
- **API Tester**: `node backend/tools/api-tester.js`
  - Testa as rotas de login, workspaces e geração de relatórios. (Requer servidor ligado).

### Backup Automático Diário
Sistema de backup inteligente baseado em Docker (não requer pg_dump instalado no Windows):
- **Backup Manual**: Execute `.\run_backup.bat` na raiz do projeto.
- **Configuração de Tarefa Diária**: 
  1. Clique com o botão direito em `.\setup_backup.bat`.
  2. Selecione **"Executar como Administrador"**.
  3. Uma tarefa chamada "NexflowDailyBackup" será criada no Agendador de Tarefas do Windows para rodar todo dia às 03:00.
- **Recursos**:
  - Garante que o container Docker do banco está ligado antes do backup.
  - Limpeza automática: Mantém apenas os **últimos 7 dias** de backup na pasta `/backups`.

## Seed de Dados (Teleen Consultoria)

Para popular o banco com dados de teste específicos para a Teleen Consultoria (incluindo importação do Mongo para o Postgres), execute:

```bash
node backend/seed_teleen_full.js
```
