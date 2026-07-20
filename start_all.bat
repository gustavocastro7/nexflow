@echo off
set "SCRIPT_DIR=%~dp0"

echo ==========================================
echo  Nexflow - Start Dev (Next.js + MongoDB Atlas)
echo ==========================================

echo.
echo Starting Next.js...
cd /d "%SCRIPT_DIR%"
call npm run dev
