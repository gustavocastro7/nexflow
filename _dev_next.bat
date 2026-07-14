@echo off
set "SCRIPT_DIR=%~dp0"

echo ==========================================
echo  Nexflow - Dev Stack (Next.js + MySQL)
echo ==========================================
echo.

:: Step 1 - Start MySQL via Docker
echo [1/2] Starting MySQL...
docker compose -f "%SCRIPT_DIR%docker-compose.yml" up -d mysql
if %errorlevel% neq 0 (
    echo [WARN] Docker not available. Make sure MySQL is running manually.
) else (
    echo [OK] MySQL is running.
)
echo.

:: Step 2 - Start Next.js
echo [2/2] Starting Next.js (port 3000)...
start "Nexflow Next.js" cmd /k "cd /d %SCRIPT_DIR% && echo Next.js starting on :3000... && npm run dev"
echo.
echo ==========================================
echo  Dev stack is starting up!
echo  App:  http://localhost:3000
echo  DB:   localhost:3306 (MySQL)
echo ==========================================
echo.
echo  Close the terminal windows to stop.
echo.
