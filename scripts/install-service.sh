#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"

mkdir -p "$SYSTEMD_USER_DIR"

# Clean up legacy book-library.service if exists
if systemctl --user is-active --quiet book-library.service 2>/dev/null; then
    echo "Parando servico legado book-library.service..."
    systemctl --user stop book-library.service
fi
if systemctl --user is-enabled --quiet book-library.service 2>/dev/null; then
    echo "Desativando servico legado book-library.service..."
    systemctl --user disable book-library.service
fi
rm -f "$SYSTEMD_USER_DIR/book-library.service"

# Copy or link uzi-library.service
cp "$SCRIPT_DIR/uzi-library.service" "$SYSTEMD_USER_DIR/uzi-library.service"

echo "Recarregando daemon do systemd user..."
systemctl --user daemon-reload

echo "Habilitando uzi-library.service para iniciar com o computador..."
systemctl --user enable uzi-library.service

echo "Iniciando uzi-library.service..."
systemctl --user restart uzi-library.service

echo "=========================================================="
echo "  Uzi Library configurada com sucesso para boot no Linux!"
echo "  Status:"
systemctl --user status uzi-library.service --no-pager
echo "=========================================================="
