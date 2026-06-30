@echo off
set "SCRIPT_DIR=%~dp0"
set "COMPOSE_FILE=%SCRIPT_DIR%docker-compose.yml"

echo Stopping services...
docker compose -f "%COMPOSE_FILE%" down
if %errorlevel% neq 0 exit /b 1

echo Rebuilding and starting...
docker compose -f "%COMPOSE_FILE%" up -d --build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to restart.
    exit /b 1
)

echo Done.
