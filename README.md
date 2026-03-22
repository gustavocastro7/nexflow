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

## Seed de Dados (Teleen Consultoria)

Para popular o banco com dados de teste específicos para a Teleen Consultoria (incluindo importação do Mongo para o Postgres), execute:

```bash
node backend/seed_teleen_full.js
```
