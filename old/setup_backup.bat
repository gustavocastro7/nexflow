
@echo off
set "TASK_NAME=NexflowDailyBackup"
set "BATCH_PATH=%~dp0run_backup.bat"

echo ===================================================
echo   Nexflow Daily Backup Task Setup
echo ===================================================
echo.
echo This will schedule a daily database backup at 03:00 AM.
echo The task will ensure Docker is running before backup.
echo.

:: Check for administrative privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running with administrative privileges.
) else (
    echo [ERROR] Please run this script as Administrator to schedule the task!
    pause
    exit /b 1
)

:: Create the task
echo Creating task: %TASK_NAME%...
schtasks /create /tn "%TASK_NAME%" /tr "\"%BATCH_PATH%\"" /sc daily /st 03:00 /f

if %errorLevel% == 0 (
    echo.
    echo ✅ SUCCESS: Task scheduled successfully!
    echo You can find it in Task Scheduler as "%TASK_NAME%".
    echo.
    echo To test it now, run: schtasks /run /tn "%TASK_NAME%"
) else (
    echo.
    echo ❌ FAILED: Could not create the task.
)

echo.
pause
