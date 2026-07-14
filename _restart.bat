@echo off
set "SCRIPT_DIR=%~dp0"
set "COMPOSE_FILE=%SCRIPT_DIR%docker-compose.yml"

echo Stopping MySQL...
docker compose -f "%COMPOSE_FILE%" down
if errorlevel 1 exit /b 1

echo Starting MySQL...
docker compose -f "%COMPOSE_FILE%" up -d
if errorlevel 1 (
    echo [ERROR] Failed to restart.
    exit /b 1
)

echo MySQL is running on localhost:3306
