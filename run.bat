@echo off
title Digital Library - Biblioteca Digital
echo ========================================================
echo         Iniciando Biblioteca Digital de Livros
echo ========================================================
echo.
echo Abrindo navegador em http://127.0.0.1:8000 ...
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8000

echo Iniciando servidor FastAPI...
python -m uvicorn server.main:app --host 127.0.0.1 --port 8000 --reload
pause
