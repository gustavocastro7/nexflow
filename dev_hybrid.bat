@echo off
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%"

echo ==================================================
echo Nexflow: Hybrid Development Mode
echo (Backend/Postgres in Docker, Frontend Locally)
echo ==================================================

:: 1. Reset Docker Environment
echo.
echo [1/3] Resetting Docker Compose...
docker compose down
IF %ERRORLEVEL% NEQ 0 (
    echo Error: docker compose down failed.
    exit /b %ERRORLEVEL%
)

:: 2. Start only Backend and Postgres in Docker
echo.
echo [2/3] Starting Backend and Postgres in Docker...
docker compose up -d postgres backend
IF %ERRORLEVEL% NEQ 0 (
    echo Error: docker compose up failed.
    exit /b %ERRORLEVEL%
)


:: 3. Start Frontend locally
echo.
echo [3/3] Starting Frontend locally (npm run dev)...
echo Host: http://localhost:8085
echo.

cd /d "frontend"
start cmd /k "npm run dev"
popd
