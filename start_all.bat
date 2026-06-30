@echo off
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "COMPOSE_FILE=%SCRIPT_DIR%docker-compose.yml"

echo ==========================================
echo  Nexflow - Start All Services
echo ==========================================

echo.
echo [1/1] Starting Docker services...
docker compose -f "%COMPOSE_FILE%" up -d

if %errorlevel% neq 0 (
    echo [ERROR] Failed to start services.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo  ALL SERVICES RUNNING
echo  Backend:  http://localhost:3100
echo  Frontend: http://localhost:8085
echo ==========================================
echo.
echo  Use _ctrl.bat for logs, stop, and more.
echo.

popd
