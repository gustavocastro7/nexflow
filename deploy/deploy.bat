@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  Nexflow - Build de Deploy Hostinger
echo ========================================
echo.

set ROOT=%~dp0..
set DEPLOY=%ROOT%\deploy
set TMP=%DEPLOY%\tmp_nexflow

:: Step 1 - Build frontend
echo [1/4] Build do frontend...
cd /d "%ROOT%\frontend"
call npm run build
if %errorlevel% neq 0 (
    echo ERRO: Frontend build falhou.
    exit /b 1
)
echo Frontend build concluido.
echo.

:: Step 2 - Clean temp folder
echo [2/4] Preparando pasta temporaria...
if exist "%TMP%" rmdir /s /q "%TMP%"
mkdir "%TMP%"
mkdir "%TMP%\src"
mkdir "%TMP%\public"
echo.

:: Step 3 - Copy files
echo [3/4] Copiando arquivos...

:: Backend core
xcopy /e /i /y "%ROOT%\backend\src" "%TMP%\src\" >nul
copy /y "%ROOT%\backend\server.js" "%TMP%\" >nul
copy /y "%ROOT%\backend\schema.sql" "%TMP%\" >nul
copy /y "%ROOT%\backend\package.json" "%TMP%\" >nul
copy /y "%ROOT%\backend\package-lock.json" "%TMP%\" >nul 2>nul

:: Seed scripts (uteis para manutencao)
copy /y "%ROOT%\backend\reset_and_seed.js" "%TMP%\" >nul 2>nul
copy /y "%ROOT%\backend\backfill_matriz.js" "%TMP%\" >nul 2>nul

:: Built frontend
xcopy /e /i /y "%ROOT%\frontend\dist\*" "%TMP%\public\" >nul

:: .env.example
copy /y "%DEPLOY%\.env.example" "%TMP%\.env.example" >nul

echo.
echo [4/4] Gerando nexflow.zip...

:: Remove old zip
if exist "%DEPLOY%\nexflow.zip" del /f "%DEPLOY%\nexflow.zip"

:: Create zip using PowerShell
powershell -Command "& {Compress-Archive -Path '%TMP%\*' -DestinationPath '%DEPLOY%\nexflow.zip' -Force}"

:: Clean temp
if exist "%TMP%" rmdir /s /q "%TMP%"

echo.
echo ========================================
echo  Deploy gerado: deploy\nexflow.zip
echo ========================================
echo.
echo  Tamanho:
for %%A in ("%DEPLOY%\nexflow.zip") do echo  %%~zA bytes
echo.
echo  Instrucoes:
echo  1. Acesse Hostinger ^> Node.js Hosting
echo  2. Envie o nexflow.zip
echo  3. Configure as variaveis de ambiente no painel:
echo     - DB_HOST, DB_NAME, DB_USER, DB_PASS
echo     - JWT_SECRET
echo     - ADMIN_EMAIL, ADMIN_PASSWORD (opcional)
echo  4. O Hostinger rodara npm install automaticamente
echo  5. A app iniciara com npm start
echo.

endlocal
