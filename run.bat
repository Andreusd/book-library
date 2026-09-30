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

:: Handle dev mode vs production launcher
if /i "%~1"=="dev" goto :dev_mode

echo Abrindo navegador em http://127.0.0.1:8000 ...
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8000

echo Iniciando servidor FastAPI...
python -m uvicorn server.main:app --host 127.0.0.1 --port 8000 --reload
pause
exit /b 0

:dev_mode
echo Iniciando em Modo Desenvolvimento [Vite + FastAPI]...
start "Client Vite Dev" cmd /k "cd client && bun run dev"
timeout /t 2 /nobreak >nul
start "" http://localhost:5173
echo Iniciando servidor FastAPI...
python -m uvicorn server.main:app --host 127.0.0.1 --port 8000 --reload
exit /b 0
