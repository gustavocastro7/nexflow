@echo off
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%"

echo ==================================================
echo Nexflow: Hybrid Development Mode
echo ==================================================

:: 1. Start Ngrok if needed
echo.
echo [1/4] Checking Ngrok status...
docker ps --filter "name=ngrok" --filter "status=running" --format "{{.Names}}" | findstr /X "ngrok" > nul
IF %ERRORLEVEL% NEQ 0 (
    echo Ngrok is not running. Starting...
    docker compose -f "..\ngrok\docker-compose.ngrok.yml" up -d
) ELSE (
    echo Ngrok is already running.
)

echo Waiting 5 seconds...
timeout /t 5 /nobreak > nul

:: 2. Run Ngrok update script
echo.
echo [2/4] Updating Ngrok routes...
IF EXIST "..\ngrok\_update_ngrok.bat" (
    pushd "..\ngrok"
    call "_update_ngrok.bat"
    popd
) ELSE (
    echo Warning: ..\ngrok\_update_ngrok.bat not found.
)

echo Waiting 5 seconds...
timeout /t 5 /nobreak > nul

:: 3. Start Backend and Postgres in Docker
echo.
echo [3/4] Starting Backend and Postgres in Docker...
docker compose up -d postgres backend
IF %ERRORLEVEL% NEQ 0 (
    echo Error: docker compose up failed.
    popd
    exit /b %ERRORLEVEL%
)

echo Waiting 5 seconds...
timeout /t 5 /nobreak > nul

:: 4. Start Frontend locally
echo.
echo [4/4] Starting Frontend locally (npm run dev)...
IF EXIST "frontend" (
    cd /d "frontend"
    start cmd /k "npm run dev"
    cd ..
) ELSE (
    echo Error: frontend directory not found.
)

echo.
echo All services are starting up.
echo Returning to initial terminal...
popd
