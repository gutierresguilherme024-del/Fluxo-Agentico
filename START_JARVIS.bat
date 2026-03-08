@echo off
REM Script para iniciar Jarvis em desenvolvimento (Windows - CORRIGIDO)
REM Este script inicia AUTOMATICAMENTE:
REM 1. Agente Python (porta 8000)
REM 2. Frontend React/Vite (porta 3000)

setlocal enabledelayedexpansion

cls
echo.
echo ============================================================
echo  INICIALIZANDO JARVIS AGENT
echo ============================================================
echo.

REM Verificar se estamos no diretorio correto
if not exist agent\main.py (
    echo ERRO: Execute este script na raiz do projeto Jarvis
    echo.
    pause
    exit /b 1
)

REM Carregar .env se existir
if exist .env (
    echo [OK] Arquivo .env encontrado
) else (
    echo [AVISO] Arquivo .env nao encontrado
    echo Copie .env.example para .env e configure suas chaves de API
    echo.
)

REM Titulo das janelas
title JARVIS - Inicializando...

echo [STEP 1] Verificando dependencias...
where /q python > nul
if errorlevel 1 (
    echo [ERRO] Python nao encontrado
    echo Instale Python 3.12+ em https://www.python.org
    pause
    exit /b 1
)

where /q node > nul
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado
    echo Instale Node.js em https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Python e Node.js encontrados

echo.
echo [STEP 2] Instalando dependencias Python (se necessario)...
cd agent
python -m pip install -r requirements-base.txt --quiet > nul 2>&1
if errorlevel 1 (
    echo [AVISO] Erro ao instalar dependencias Python
    cd ..
) else (
    echo [OK] Dependencias Python prontas
    cd ..
)

echo.
echo [STEP 3] Iniciando Agente Python em nova janela (porta 8000)...
REM Inicia o agente em uma nova janela CMD
start "JARVIS - Agent Python" cmd /k "cd agent && python main.py"

REM Aguarda o agente iniciar
timeout /t 3 /nobreak > nul

echo [OK] Agente iniciado

echo.
echo [STEP 4] Instalando dependencias Node (se necessario)...
if not exist node_modules (
    echo Instalando npm packages...
    npm install --quiet > nul 2>&1
    if errorlevel 1 (
        echo [AVISO] Erro ao instalar npm packages
    ) else (
        echo [OK] Dependencias Node prontas
    )
) else (
    echo [OK] node_modules ja existe
)

echo.
echo [STEP 5] Iniciando Frontend em nova janela (porta 3000)...
start "JARVIS - Frontend React" cmd /k "npm run dev"

echo.
echo ============================================================
echo  JARVIS INICIADO COM SUCESSO!
echo ============================================================
echo.
echo Frontend:     http://localhost:3000
echo Agent API:    http://localhost:8000
echo Docs:         http://localhost:8000/docs
echo.
echo Aguardando inicializacao das janelas...
timeout /t 5 /nobreak > nul

cls
echo.
echo [OK] JARVIS esta rodando!
echo.
echo Abra seu navegador em: http://localhost:3000
echo.
echo Para parar tudo:
echo   - Feche esta janela (main)
echo   - Feche a janela "JARVIS - Agent Python"
echo   - Feche a janela "JARVIS - Frontend React"
echo.
pause
