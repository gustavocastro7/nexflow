@echo off
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "COMPOSE_FILE=%SCRIPT_DIR%docker-compose.yml"

:MENU
cls
echo ==================================================
echo   Nexflow Control Panel
echo ==================================================
echo.
echo  [1] Up       - Build ^& start app container
echo  [2] Down     - Stop app container
echo  [3] Restart  - Rebuild and restart app container
echo  [4] Logs     - Follow app logs
echo  [5] Status   - Show container status
echo  [6] Seed     - Seed database (MongoDB Atlas)
echo  [7] Dev      - Start Next.js dev server
echo  [8] Exit
echo.
set /p "choice=Enter your choice: "

if "%choice%"=="1" goto UP
if "%choice%"=="2" goto DOWN
if "%choice%"=="3" goto RESTART
if "%choice%"=="4" goto LOGS
if "%choice%"=="5" goto STATUS
if "%choice%"=="6" goto SEED
if "%choice%"=="7" goto DEV
if "%choice%"=="8" exit /b 0

echo Invalid choice.
timeout /t 2 /nobreak > nul
goto MENU

:UP
echo.
echo Building and starting app container...
docker compose -f "%COMPOSE_FILE%" up -d --build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start.
    pause
    goto MENU
)
echo App running on localhost:3002
pause
goto MENU

:DOWN
echo.
echo Stopping app container...
docker compose -f "%COMPOSE_FILE%" down
pause
goto MENU

:RESTART
echo.
echo Restarting app container...
docker compose -f "%COMPOSE_FILE%" down
docker compose -f "%COMPOSE_FILE%" up -d --build
echo Done.
pause
goto MENU

:LOGS
echo.
echo Press Ctrl+C to stop following logs.
docker compose -f "%COMPOSE_FILE%" logs -f
pause
goto MENU

:STATUS
echo.
docker compose -f "%COMPOSE_FILE%" ps --format "table {{.Name}}\t{{.State}}\t{{.Status}}"
pause
goto MENU

:SEED
echo.
echo Running database seed...
cd /d "%SCRIPT_DIR%"
node scripts/seed.mjs
echo.
pause
goto MENU

:DEV
echo.
echo Starting Next.js dev server...
start "" cmd /c "%SCRIPT_DIR%_dev_next.bat"
echo Dev server starting...
pause
goto MENU
