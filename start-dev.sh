#!/bin/bash
# Script de inicialização do Jarvis em desenvolvimento local

set -e

echo "🚀 Iniciando Jarvis (Desenvolvimento)..."

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale em: https://nodejs.org"
    exit 1
fi

# Verificar se Python está instalado
if ! command -v python &> /dev/null; then
    echo "❌ Python não encontrado. Instale Python 3.12+"
    exit 1
fi

# Carregar .env
if [ ! -f .env ]; then
    echo "⚠️  Arquivo .env não encontrado. Criando a partir do example..."
    cp .env.example .env
    echo "📝 Por favor, edite .env com suas chaves de API"
fi

# Instalar dependências Node se necessário
if [ ! -d "frontend/node_modules" ]; then
    echo "${BLUE}📦 Instalando dependências Node...${NC}"
    (cd frontend && npm install)
fi

# Instalar dependências Python se necessário
if [ ! -d "agent/venv" ] && [ ! -f "agent/.dependencies-installed" ]; then
    echo "${BLUE}📦 Instalando dependências Python...${NC}"
    python -m pip install -r agent/requirements.txt
    touch agent/.dependencies-installed
fi

# Iniciar agente Python em background
echo "${BLUE}🤖 Iniciando Agente Python (porta 8000)...${NC}"
cd agent
python main.py &
PYTHON_PID=$!
cd ..

# Cleanup ao sair
trap "kill $PYTHON_PID" EXIT

# Dar tempo pro Python agent iniciar
sleep 3

# Testar conexão com agente Python
echo "${BLUE}🔗 Testando conexão com agente...${NC}"
if curl -s http://localhost:8000/health > /dev/null; then
    echo "${GREEN}✅ Agente Python online${NC}"
else
    echo "${YELLOW}⚠️  Agente Python pode estar offline${NC}"
fi

# Iniciar frontend
echo "${BLUE}🎨 Iniciando Frontend (porta 5173)...${NC}"
(cd frontend && npm run dev)
