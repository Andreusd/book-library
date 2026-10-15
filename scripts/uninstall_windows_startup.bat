@echo off
setlocal
echo ========================================================
echo   Removendo Uzi Library da Inicializacao do Windows
echo ========================================================
echo.

set "SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\UziLibrary.lnk"

if exist "%SHORTCUT_PATH%" (
    del "%SHORTCUT_PATH%"
    echo [SUCESSO] Atalho de inicializacao removido com sucesso.
) else (
    echo [INFO] Nenhum atalho de inicializacao foi encontrado.
)

echo.
pause
