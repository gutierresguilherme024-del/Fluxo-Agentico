@echo off
REM Script de inicialização do Jarvis em desenvolvimento local (Windows)

setlocal enabledelayedexpansion

echo.
echo 🚀 Iniciando Jarvis (Desenvolvimento)...
echo.

REM Verificar se Node.js está instalado
where /q node
if errorlevel 1 (
    echo ❌ Node.js nao encontrado. Instale em: https://nodejs.org
    pause
    exit /b 1
)

REM Verificar se Python está instalado
where /q python
if errorlevel 1 (
    echo ❌ Python nao encontrado. Instale Python 3.12+
    pause
    exit /b 1
)

REM Carregar .env
if not exist .env (
    echo ⚠️  Arquivo .env nao encontrado. Criando a partir do example...
    copy .env.example .env
    echo 📝 Por favor, edite .env com suas chaves de API
    pause
)

REM Instalar dependências Node se necessário
if not exist frontend\node_modules (
    echo 📦 Instalando dependências Node...
    cd frontend
    call npm install
    cd ..
)

REM Instalar dependências Python se necessário
if not exist agent\.dependencies-installed (
    echo 📦 Instalando dependências Python...
    cd agent
    python -m pip install -r requirements.txt
    type nul > .dependencies-installed
    cd ..
)

REM Iniciar agente Python em background
echo 🤖 Iniciando Agente Python (porta 8000)...
start "Agente Python" cmd /k "cd agent && python main.py"

REM Dar tempo pro Python agent iniciar
timeout /t 3 /nobreak

REM Testar conexão com agente Python
echo 🔗 Testando conexao com agente...
curl.exe -s http://localhost:8000/health >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ Agente Python online
) else (
    echo ⚠️  Agente Python pode estar offline
)

REM Iniciar frontend
echo 🎨 Iniciando Frontend (porta 5173)...
cd frontend
call npm run dev

pause
