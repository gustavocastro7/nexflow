@echo off
cd /d "%~dp0backend"
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado. Verifique se esta instalado.
    exit /b 1
)
if not exist "node_modules" (
    echo [ERRO] node_modules nao encontrado. Execute npm install primeiro.
    exit /b 1
)
node tools/daily-backup.js
if %errorlevel% neq 0 (
    echo [ERRO] Backup falhou. Verifique o log em backups\backup.log
    exit /b 1
)
