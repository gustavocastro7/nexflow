# Nexflow Project

SaaS platform with multi-tenancy by schema.

## Database Configurations

### PostgreSQL
*   **Connection:** `postgresql://nexflow_user:nexflow_password@localhost:5432/nexflow_db`
*   **Host:** `localhost`
*   **Port:** `5432`
*   **User:** `nexflow_user`
*   **Password:** `nexflow_password`
*   **Database:** `nexflow_db`

### Management Interface (pgAdmin)
*   **URL:** `http://localhost:5050`
*   **User:** `admin@nexflow.com`
*   **Password:** `admin_password`

### MongoDB
*   **Connection:** `mongodb://localhost:27017/nexflow_logs`
*   **Host:** `localhost`
*   **Port:** `27017`
*   **Database:** `nexflow_logs`
*   **Password:** (No password configured in the debug environment)

## Customer Logo (Workspace)

Each workspace (customer) can have a custom logo, displayed on the system sidebar.

- **Upload**: When creating or editing a workspace (menu Admin > Workspaces), there is a "Logo" field that accepts image uploads.
- **Storage**: The image is converted to base64 and stored directly in the database (`logo` column of the `workspaces` table).
- **Display**: The active workspace logo is displayed at the top of the sidebar. If the workspace does not have a logo, the default image (`/logo.jpg`) is used.
- **Removal**: It is possible to remove the logo at any time when editing the workspace.

## System Ports
*   **Backend:** `3000` (API & Swagger)
*   **Frontend:** `8080` (Vite Dev Server)
*   **PostgreSQL:** `5432`
*   **MongoDB:** `27017`
*   **pgAdmin:** `5050`

## Project Structure

- `/backend`: REST API in Node.js with Express and Sequelize.
- `/frontend`: SPA in React with Vite, TypeScript and Material UI.
- `/backups`: Directory where daily database backups are saved.
- `docker-compose.yml`: Orchestration for PostgreSQL, MongoDB and pgAdmin.

## How to Start the Unified Environment

To start the entire ecosystem (Databases via Docker, Backend and Frontend) in a single terminal, use the file:

```bash
.\start_all.bat
```

This script will:
1. Start PostgreSQL, MongoDB and pgAdmin containers via Docker Compose.
2. Install `backend` and `frontend` dependencies (if they don't exist).
3. Start the Backend server at `http://localhost:3000`.
4. Start the Frontend server at `http://localhost:8080`.
5. Keep all logs in the same terminal.

## Reporting Tools (New)

System reports have been updated to ensure 100% data visibility:
- **Phone Lines Report**: Now shows **all** phone numbers found in imported invoices, even those that have not yet been registered in the system.
- **Automatic Identification**: Uses the `original_user` field from the invoice as "Source Name" when there is no manually associated responsible party.
- **Default Cost Center (Headquarters)**: Every new workspace now comes with a default cost center called "Headquarters".
- **Auto-association**: When importing invoices, any new phone number is automatically registered and associated with the workspace's "Headquarters" cost center.
- **Dashboard Stats**: Precise statistics separated by operator (Claro/Vivo) and TXT invoices.

## Maintenance and Testing Tools

### API and Database Tests
Located in `backend/tools/`:
- **Database Check**: `node backend/tools/db-check.js`
  - Verifies connection and compares the quantity of registered lines vs. lines found in invoices.
- **API Tester**: `node backend/tools/api-tester.js`
  - Tests login, workspace and report generation routes. (Requires server to be running).

### Daily Automatic Backup
Intelligent backup system based on Docker (does not require pg_dump installed on Windows):
- **Manual Backup**: Run `.\run_backup.bat` in the project root.
- **Daily Task Setup**: 
  1. Right-click on `.\setup_backup.bat`.
  2. Select **"Run as Administrator"**.
  3. A task called "NexflowDailyBackup" will be created in the Windows Task Scheduler to run every day at 03:00.
- **Features**:
  - Ensures the database Docker container is running before backup.
  - Automatic cleanup: Keeps only the **last 7 days** of backups in the `/backups` folder.

## Data Seed (Teleen Consultoria)

To populate the database with test data specific to Teleen Consultoria (including Mongo to Postgres import), run:

```bash
node backend/seed_teleen_full.js
```
