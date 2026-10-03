@echo off
setlocal
title Digital Library - Biblioteca Digital

echo ========================================================
echo         Iniciando Biblioteca Digital de Livros
echo ========================================================
echo.

:: Ensure Bun is available in PATH
where bun >nul 2>nul
if %errorlevel% equ 0 goto :bun_ready

if exist "%USERPROFILE%\.bun\bin\bun.exe" (
    set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
    goto :bun_ready
)

echo Bun nao foi detectado no sistema.
echo Instalando Bun via script oficial...
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm bun.sh/install.ps1 | iex"
if exist "%USERPROFILE%\.bun\bin\bun.exe" (
    set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
    echo Bun instalado com sucesso!
) else (
    echo AVISO: Falha ao instalar Bun. Continuando se possivel.
)

:bun_ready

:: Verify client dependencies
if not exist "client\node_modules" (
    echo Instalando dependencias do frontend com Bun...
    pushd client
    call bun install
    popd
)

:: Verify client production build
if not exist "client\dist\index.html" (
    echo Compilando frontend para producao com Bun...
    pushd client
    call bun run build
    popd
)

:: Detect LAN IP address for local network access
set "LAN_IP="
for /f "tokens=*" %%a in ('python -c "import socket; s=socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); print(s.getsockname()[0]); s.close()" 2^>nul') do set "LAN_IP=%%a"

:: Handle dev mode vs production launcher
if /i "%~1"=="dev" goto :dev_mode

echo ========================================================
echo         Biblioteca Digital pronta!
echo   - Local [este PC]:            http://localhost:8000
if defined LAN_IP echo   - Rede [outros dispositivos]: http://%LAN_IP%:8000
echo ========================================================
echo.
echo Abrindo navegador em http://localhost:8000 ...
ping -n 3 127.0.0.1 >nul
start "" http://localhost:8000

echo Iniciando servidor FastAPI (acessivel na rede local)...
python -m uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload
pause
exit /b 0

:dev_mode
echo ========================================================
echo    Modo Desenvolvimento [Vite + FastAPI]
echo   - Local [este PC]:            http://localhost:5173
if defined LAN_IP echo   - Rede [outros dispositivos]: http://%LAN_IP%:5173
echo ========================================================
echo.
start "Client Vite Dev" cmd /k "cd client && bun run dev"
ping -n 3 127.0.0.1 >nul
start "" http://localhost:5173
echo Iniciando servidor FastAPI (acessivel na rede local)...
python -m uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload
exit /b 0

