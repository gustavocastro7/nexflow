@echo off
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%"

echo ==========================================
echo Nexflow Docker Environment Launcher
echo ==========================================

:: 1. Docker Setup and Check
echo.
echo [1/3] Checking Docker...
where docker-compose >nul 2>&1
if %ERRORLEVEL%==0 (
  set "DC=docker-compose"
) else (
  docker compose version >nul 2>&1
  if %ERRORLEVEL%==0 (
    set "DC=docker compose"
  ) else (
    echo [!] Docker not found. Please ensure Docker Desktop is running.
    pause
    exit /b 1
  )
)

:: 2. Setup Modules (Optional but good for IDE intelligence)
echo.
echo [2/3] Checking Local Dependencies (node_modules)...
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd /d "%SCRIPT_DIR%backend"
    call npm install --silent
    cd /d "%SCRIPT_DIR%"
)
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd /d "%SCRIPT_DIR%frontend"
    call npm install --silent
    cd /d "%SCRIPT_DIR%"
)

:: 3. Start Docker Environment
echo.
echo [3/3] Restarting Docker Services (Clean Start)...
%DC% -f "docker-compose.yml" down
%DC% -f "docker-compose.yml" up -d --build

if %ERRORLEVEL% NEQ 0 (
  echo [!] Failed to start Docker containers.
  pause
  exit /b 1
)

echo.
echo ==========================================
echo DOCKER SYSTEMS RUNNING
echo Backend:  http://localhost:3100
echo Frontend: http://localhost:8087
echo ==========================================
echo.
echo Containers are running in detached mode.
echo Use 'docker compose logs -f' to follow logs.
echo.

popd

