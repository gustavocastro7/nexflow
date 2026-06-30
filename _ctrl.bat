@echo off
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "FRONTEND_PORT=8085"
set "FRONTEND_URL=http://localhost:%FRONTEND_PORT%"
set "COMPOSE_FILE=%SCRIPT_DIR%docker-compose.yml"

:MENU
cls
echo ==================================================
echo   Nexflow Control Panel
echo ==================================================
echo.
echo  [1] Up       - Start all services
echo  [2] Down     - Stop all services
echo  [3] Restart  - Rebuild and restart
echo  [4] Logs     - Follow container logs
echo  [5] Status   - Show container status
echo  [6] Open     - Open frontend (%FRONTEND_URL%)
echo  [7] Backup   - Run backup now
echo  [8] Exit
echo.
set /p "choice=Enter your choice: "

if "%choice%"=="1" goto UP
if "%choice%"=="2" goto DOWN
if "%choice%"=="3" goto RESTART
if "%choice%"=="4" goto LOGS
if "%choice%"=="5" goto STATUS
if "%choice%"=="6" goto OPEN
if "%choice%"=="7" goto BACKUP
if "%choice%"=="8" exit /b 0

echo Invalid choice.
timeout /t 2 /nobreak > nul
goto MENU

:UP
echo.
echo Starting all services...
docker compose -f "%COMPOSE_FILE%" up -d
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start services.
    pause
    goto MENU
)
echo.
echo Services started:
docker compose -f "%COMPOSE_FILE%" ps --format "table {{.Name}}\t{{.Status}}"
echo.
echo Frontend: %FRONTEND_URL%
echo Backend:  http://localhost:3100
pause
goto MENU

:DOWN
echo.
echo Stopping all services...
docker compose -f "%COMPOSE_FILE%" down
if %errorlevel% neq 0 (
    echo [ERROR] Failed to stop services.
)
pause
goto MENU

:RESTART
echo.
echo Rebuilding and restarting...
docker compose -f "%COMPOSE_FILE%" down
docker compose -f "%COMPOSE_FILE%" up -d --build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to restart services.
    pause
    goto MENU
)
echo Done.
pause
goto MENU

:LOGS
echo.
echo Press Ctrl+C to stop following logs.
echo.
docker compose -f "%COMPOSE_FILE%" logs -f
pause
goto MENU

:STATUS
echo.
docker compose -f "%COMPOSE_FILE%" ps --format "table {{.Name}}\t{{.State}}\t{{.Status}}"
echo.
pause
goto MENU

:OPEN
echo Opening frontend...
start "" "%FRONTEND_URL%"
goto MENU

:BACKUP
echo.
cd /d "%SCRIPT_DIR%backend"
if not exist "node_modules" (
    echo [ERROR] node_modules not found. Run npm install first.
    pause
    goto MENU
)
node tools/daily-backup.js
echo.
pause
goto MENU
