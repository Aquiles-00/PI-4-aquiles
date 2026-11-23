#!/usr/bin/env bash

echo "======================================================================"
echo "         MP Consultoria - Portal de Serviços Financeiros"
echo "======================================================================"
echo ""

if ! command -v node &> /dev/null; then
    echo "[AVISO] Node.js não foi detectado neste sistema."
    echo "Abrindo o portal diretamente no seu navegador padrão..."
    if command -v xdg-open &> /dev/null; then
        xdg-open Abrir_Portal.html
    elif command -v open &> /dev/null; then
        open Abrir_Portal.html
    fi
    exit 0
fi

if [ ! -d "node_modules" ]; then
    echo "[1/3] Instalando dependências..."
    npm install
fi

if [ ! -f "data/financial_portal.sqlite" ]; then
    echo "[2/3] Inicializando banco de dados..."
    node src/database/seeds.js
fi

echo "[3/3] Iniciando servidor..."
echo ""
echo "Acesse: http://localhost:3000"
echo "Área do Cliente: http://localhost:3000/client_portal.html"
echo ""

(sleep 2 && (xdg-open http://localhost:3000 || open http://localhost:3000)) &

node src/server.js
