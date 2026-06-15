@echo off
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%"

:: --- Configuration ---
set "FRONTEND_PORT=8085"
set "FRONTEND_URL=http://localhost:%FRONTEND_PORT%"
set "NGROK_COMPOSE_FILE=..\ngrok\docker-compose.ngrok.yml"
set "NGROK_UPDATE_SCRIPT=..\ngrok\_update_ngrok.bat"
set "BACKEND_DIR=backend"
set "FRONTEND_DIR=frontend"

:MENU
cls
echo ==================================================
echo Nexflow Control Panel
echo ==================================================
echo.
echo [1] Up (Start all services)
echo [2] Down (Stop all services)
echo [3] Open Page (%FRONTEND_URL%)
echo [4] Rebuild (Docker images)
echo [5] Exit
echo.
set /p "choice=Enter your choice: "

if "%choice%"=="1" goto UP
if "%choice%"=="2" goto DOWN
if "%choice%"=="3" goto OPEN_PAGE
if "%choice%"=="4" goto REBUILD
if "%choice%"=="5" goto EXIT

echo Invalid choice. Press any key to continue...
pause > nul
goto MENU

:UP
echo Starting all services...
echo.

:: 1. Start Ngrok if needed
echo [1/4] Checking Ngrok status...
docker ps --filter "name=ngrok" --filter "status=running" --format "{{.Names}}" | findstr /X "ngrok" > nul
IF %ERRORLEVEL% NEQ 0 (
    echo Ngrok is not running. Starting...
    IF EXIST "%NGROK_COMPOSE_FILE%" (
        docker compose -f "%NGROK_COMPOSE_FILE%" up -d
        IF !ERRORLEVEL! NEQ 0 ( echo Error starting Ngrok. && goto MENU_ERROR )
    ) ELSE (
        echo Warning: Ngrok compose file "%NGROK_COMPOSE_FILE%" not found. Skipping Ngrok start.
    )
) ELSE (
    echo Ngrok is already running.
)
timeout /t 3 /nobreak > nul

:: 2. Run Ngrok update script
echo.
echo [2/4] Updating Ngrok routes...
IF EXIST "%NGROK_UPDATE_SCRIPT%" (
    pushd "..\ngrok"
    call "%NGROK_UPDATE_SCRIPT%"
    IF !ERRORLEVEL! NEQ 0 ( echo Warning: Ngrok update script failed. )
    popd
) ELSE (
    echo Warning: Ngrok update script "%NGROK_UPDATE_SCRIPT%" not found. Skipping.
)
timeout /t 3 /nobreak > nul

:: 3. Start all services in Docker
echo.
echo [3/3] Starting Backend, Postgres and Frontend in Docker...
docker compose up -d postgres backend frontend
IF %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to start services.
    goto MENU_ERROR
)

echo.
echo All services are starting up.
echo Returning to control panel...
goto MENU_ERROR

:DOWN
echo Stopping all services...
echo.
echo Stopping Backend and Postgres...
docker compose down postgres backend
IF %ERRORLEVEL% NEQ 0 ( echo Error stopping backend/postgres. )

:: Stop Ngrok if it was started by this script
IF EXIST "%NGROK_COMPOSE_FILE%" (
    echo Stopping Ngrok...
    docker compose -f "%NGROK_COMPOSE_FILE%" down
    IF !ERRORLEVEL! NEQ 0 ( echo Warning: Failed to stop Ngrok. )
)

:: Note: Frontend dev server started with 'start cmd /k' runs in its own window and won't be stopped by docker compose down.
:: The user will need to close that window manually.

echo.
echo All Docker services stopped.
echo Returning to control panel...
goto MENU_ERROR

:OPEN_PAGE
echo Opening frontend page...
echo.
start "" "%FRONTEND_URL%"
echo.
echo Returning to control panel...
goto MENU_ERROR

:REBUILD
echo Rebuilding Docker images...
echo.
:: Check if docker-compose.yml exists
IF NOT EXIST "docker-compose.yml" (
    echo Error: docker-compose.yml not found in the current directory.
    goto MENU_ERROR
)
docker compose build
IF %ERRORLEVEL% NEQ 0 (
    echo Error during Docker image rebuild.
    goto MENU_ERROR
)
echo.
echo Docker images rebuilt successfully.
echo Returning to control panel...
goto MENU_ERROR

:EXIT
echo Exiting Control Panel.
popd
exit /b 0

:MENU_ERROR
echo.
echo Press any key to return to the menu...
pause > nul
goto MENU
