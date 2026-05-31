@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  Nexflow - Build Test Site (Hostinger)
echo ========================================
echo.

set ROOT=%~dp0..
set SITE=%~dp0
set TMP=%SITE%\tmp_test_site

:: Step 1 - Clean temp folder
echo [1/2] Preparando pasta temporaria...
if exist "%TMP%" rmdir /s /q "%TMP%"
mkdir "%TMP%"
echo.

:: Step 2 - Copy files
echo [2/2] Copiando arquivos...

copy /y "%SITE%server.js" "%TMP%\" >nul
copy /y "%SITE%package.json" "%TMP%\" >nul
if exist "%SITE%.env.example" copy /y "%SITE%.env.example" "%TMP%\.env.example" >nul

echo.
echo Compactando...
if exist "%SITE%test-site.zip" del /f "%SITE%test-site.zip"
powershell -Command "& {Compress-Archive -Path '%TMP%\*' -DestinationPath '%SITE%test-site.zip' -Force}"

:: Clean temp
if exist "%TMP%" rmdir /s /q "%TMP%"

echo.
echo ========================================
echo  Deploy gerado: deploy\test-site\test-site.zip
echo ========================================
echo.
echo  Tamanho:
for %%A in ("%SITE%test-site.zip") do echo  %%~zA bytes
echo.
echo  Instrucoes:
echo  1. Acesse Hostinger ^> Node.js Hosting
echo  2. Envie o test-site.zip
echo  3. Configure PORT se necessario (default 3000)
echo  4. O Hostinger rodara npm install + npm start
echo  5. Nao precisa configurar banco de dados
echo  6. Sem dependencias externas (http nativo)
echo.

endlocal
