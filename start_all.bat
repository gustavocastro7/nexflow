@echo off
set "SCRIPT_DIR=%~dp0"
set "COMPOSE_FILE=%SCRIPT_DIR%docker-compose.yml"

echo ==========================================
echo  Nexflow - Start Database
echo ==========================================

echo.
echo Starting MySQL...
docker compose -f "%COMPOSE_FILE%" up -d
if errorlevel 1 (
    echo [ERROR] Failed to start.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo  MySQL Running on localhost:3306
echo  Run 'npm run dev' to start Next.js
echo ==========================================
echo.
