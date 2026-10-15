@echo off
setlocal
echo ========================================================
echo   Configurando Uzi Library para iniciar no boot do Windows
echo ========================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
pushd "%ROOT_DIR%"
set "ROOT_DIR=%CD%"
popd

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_LAUNCHER=%ROOT_DIR%\scripts\run_hidden.vbs"
set "BAT_LAUNCHER=%ROOT_DIR%\run.bat"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\UziLibrary.lnk"

echo Criando atalho na pasta de Inicializacao do Windows:
echo %SHORTCUT_PATH%

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$s = $ws.CreateShortcut('%SHORTCUT_PATH%'); " ^
  "$s.TargetPath = 'wscript.exe'; " ^
  "$s.Arguments = '\"%VBS_LAUNCHER%\" \"%BAT_LAUNCHER%\"'; " ^
  "$s.WorkingDirectory = '%ROOT_DIR%'; " ^
  "$s.IconLocation = '%ROOT_DIR%\icons\uzi-library.ico, 0'; " ^
  "$s.Description = 'Uzi Library Web Service & Tray Indicator'; " ^
  "$s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo.
    echo [SUCESSO] Uzi Library configurada para iniciar automaticamente com o Windows!
    echo O icone aparecera na bandeja do sistema (proximo ao relogio).
) else (
    echo.
    echo [ERRO] Nao foi possivel criar o atalho de inicializacao.
)

echo.
pause
