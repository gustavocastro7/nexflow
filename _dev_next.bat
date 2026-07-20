@echo off
set "SCRIPT_DIR=%~dp0"

echo ==========================================
echo  Nexflow - Dev Stack (Next.js + MongoDB Atlas)
echo ==========================================
echo.

:: Start Next.js (DB is remote via MONGODB_URI in .env)
echo Starting Next.js (port 3000)...
start "Nexflow Next.js" cmd /k "cd /d %SCRIPT_DIR% && echo Next.js starting on :3000... && npm run dev"
echo.
echo ==========================================
echo  Dev stack is starting up!
echo  App:  http://localhost:3000
echo  DB:   MongoDB Atlas (see MONGODB_URI in .env)
echo ==========================================
echo.
echo  Close the terminal window to stop.
echo.
