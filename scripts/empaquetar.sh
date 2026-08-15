#!/usr/bin/env bash
# Compila y empaqueta el frontend para subir al servidor.
#
#   ./scripts/empaquetar.sh                → para servir en la raíz del dominio
#   ./scripts/empaquetar.sh /pedidos/      → para servir en un subdirectorio
#
# Deja boston-pedidos.tar.gz listo para copiar.
set -euo pipefail

BASE="${1:-/}"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ/frontend"

echo "→ Verificando antes de compilar…"
npx tsc -p tsconfig.app.json --noEmit
npx vitest run --silent
npm run lint

echo "→ Compilando con base '$BASE'…"
rm -rf dist
BASE_URL="$BASE" npm run build

# macOS mete archivos ._* en cualquier tar. En el servidor no molestan a un
# sitio estático, pero ensucian y en otros despliegues han roto cosas.
echo "→ Limpiando archivos de macOS…"
find dist -name "._*" -delete
find dist -name ".DS_Store" -delete

cd "$RAIZ"
rm -f boston-pedidos.tar.gz
# --no-xattrs y COPYFILE_DISABLE evitan que se regeneren al empaquetar.
COPYFILE_DISABLE=1 tar --no-xattrs -czf boston-pedidos.tar.gz -C frontend/dist .

echo
echo "✓ boston-pedidos.tar.gz  ($(du -h boston-pedidos.tar.gz | cut -f1))"
echo
echo "En el servidor:"
echo "  mkdir -p /ruta/del/sitio && tar -xzf boston-pedidos.tar.gz -C /ruta/del/sitio"
echo
echo "Y configurar el fallback de SPA: ver docs/DESPLIEGUE.md"
