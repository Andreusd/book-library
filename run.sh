#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================================"
echo "        Iniciando Biblioteca Digital de Livros"
echo "========================================================"
echo ""

# Ensure virtualenv exists
if [ ! -d ".venv" ]; then
    echo "Criando ambiente virtual Python..."
    python3 -m venv .venv
    source .venv/bin/activate
    echo "Instalando dependencias do backend..."
    pip install -r server/requirements.txt
else
    source .venv/bin/activate
fi

# Ensure client production build exists
if [ ! -f "client/dist/index.html" ]; then
    echo "Compilando frontend para producao..."
    cd client
    if command -v bun &> /dev/null; then
        bun install && bun run build
    else
        npm install && npm run build
    fi
    cd ..
fi

# Detect LAN IP
LAN_IP=$(python3 -c "import socket; s=socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); print(s.getsockname()[0]); s.close()" 2>/dev/null || echo "")

echo "========================================================"
echo "        Biblioteca Digital pronta!"
echo "  - Local [este PC]:            http://localhost:8000"
if [ -n "$LAN_IP" ]; then
    echo "  - Rede [outros dispositivos]: http://$LAN_IP:8000"
fi
echo "========================================================"
echo ""

# Open browser if DISPLAY/browser available
if command -v xdg-open &> /dev/null && [ -n "$DISPLAY" ]; then
    xdg-open "http://localhost:8000" >/dev/null 2>&1 &
fi

exec python3 -m uvicorn server.main:app --host 0.0.0.0 --port 8000
