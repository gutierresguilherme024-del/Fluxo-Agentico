# ANÁLISE DETALHADA - Por que o Jarvis Não Funciona em Produção

**Data:** 08/03/2026
**Projeto:** GLM Studio - Fluxo Agentico
**URL de Produção:** https://glm-studio-br.vercel.app/
**Status:** ❌ NÃO FUNCIONANDO

---

## 📋 Resumo Executivo

Seu aplicativo **não funciona em produção** pelos seguintes motivos principais:

1. ❌ **CORS Policy Violation** - Requisições diretas do navegador bloqueadas
2. ❌ **API Keys Expostas no Frontend** - Chaves de API em variáveis VITE_
3. ❌ **Agente Python não está sendo usado** - Chat.tsx ignora o agente criado
4. ❌ **Falta de Proxy no Servidor** - Server.ts existe mas não é utilizado
5. ❌ **Configuração Vite incompleta** - Sem proxy para requisições locais
6. ❌ **Vercel não consegue iniciar agente Python** - Falta configuração de serverless functions

---

## 🔴 PROBLEMA #1: CORS Policy Violation

### O Erro
Quando você abre o site em produção e tenta falar com o Jarvis, o navegador bloqueia:
```
Access to XMLHttpRequest at 'https://api.anthropic.com/v1/messages' from origin
'https://glm-studio-br.vercel.app' has been blocked by CORS policy.
```

### Por que acontece
**FILE:** `src/components/Chat.tsx` (linha 130) e `src/components/VoiceAgent.tsx` (linha 86)

```typescript
// ❌ ERRADO - Chamada direta do navegador
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': anthropicKey,  // 🔒 API Key exposta!
  },
  // ...
})
```

### Por que não funciona em produção
- ✅ Em **desenvolvimento local** (localhost:3000): Vite permite requisições cross-origin
- ❌ Em **produção no Vercel**: O navegador bloqueia requisições para domínios diferentes
- ❌ API Anthropic **NÃO retorna headers CORS** para requisições do navegador
- ⚠️ Mesmo se retornasse, **API keys nunca devem estar no frontend**

### Solução
**Usar proxy reverso no servidor Express (server.ts)**

---

## 🔓 PROBLEMA #2: API Keys Expostas no Frontend

### O Risco
- **VITE_ANTHROPIC_API_KEY** - Exposta no navegador
- **VITE_NVIDIA_API_KEY** - Exposta no navegador
- **Qualquer pessoa** pode ver essas chaves abrindo o DevTools (F12)

### Localização do Problema
```typescript
// ❌ BAD - Arquivo: src/components/Chat.tsx (linha 122)
const anthropicKey = (import.meta.env as any).VITE_ANTHROPIC_API_KEY || '';

// ❌ BAD - Arquivo: src/components/VoiceAgent.tsx (linha 20)
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
```

### Por que é um problema
1. Qualquer pessoa pode clonar sua API key do navegador
2. Podem usar sua conta e você será cobrado
3. Podem acessar dados privados via sua API key
4. É contra a política de todos os provedores de API

### Impacto
- 💰 Risco de cobranças não autorizadas
- 🔐 Risco de segurança crítico
- 🚫 Violação de ToS do Anthropic e NVIDIA

---

## 🤖 PROBLEMA #3: Agente Python Não Está Sendo Utilizado

### O que foi criado
Você criou um **agente Python completo** em:
```
agent/
├── main.py          (FastAPI server na porta 8000)
├── graph.py         (LangGraph orchestration)
├── memory.py        (Persistência com ChromaDB)
├── tools.py         (Ferramentas do agente)
└── config.py        (Configurações)
```

### O problema
**Chat.tsx e VoiceAgent.tsx NÃO estão usando o agente Python!**

Em vez disso, estão chamando diretamente:
- `https://api.anthropic.com/v1/messages` (Claude API)
- `https://integrate.api.nvidia.com/v1/chat/completions` (NVIDIA GLM)

### Por que deveria estar usando o agente
O agente Python oferece:
1. ✅ Voice input/output (STT/TTS)
2. ✅ Persistência de memória (ChromaDB)
3. ✅ Múltiplos modelos de IA (fallback)
4. ✅ Integração com Supabase
5. ✅ Orquestração de ferramentas via LangGraph
6. ✅ Segurança (API keys no backend)

### Comparação
```
❌ ATUAL:
Chat.tsx/VoiceAgent.tsx → Anthropic API / NVIDIA API ❌ CORS, Expõe Keys

✅ DEVERIA SER:
Chat.tsx/VoiceAgent.tsx → Server.ts (Proxy) → Agent Python (FastAPI) → APIs Externas
```

---

## 🚫 PROBLEMA #4: Server.ts Não Está Sendo Usado

### O que existe
**FILE:** `server.ts` (arquivo raiz do projeto)

O servidor Express foi criado mas está sendo ignorado em produção.

### Por que não está funcionando
1. **Em desenvolvimento local**: Você roda `npm run dev` que inicia Vite
   - Vite não roda o `server.ts`
   - Não há um servidor Express ativo

2. **Em produção (Vercel)**: O `server.ts` não é executado
   - Vercel não sabe que deve rodar um servidor Node
   - Falta configuração em `vercel.json`

### Localização do Problema
**FILE:** `vercel.json` (vazio ou incompleto)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
  // ❌ FALTA: configuração do servidor Express
}
```

### Solução
Configurar Vercel para rodar `server.ts` como serverless function

---

## 🔗 PROBLEMA #5: Sem Proxy Configurado no Vite

### O Problema
**FILE:** `vite.config.ts`

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // ❌ FALTA: proxy configuration
  server: {
    // Não há proxy para /api/agent/*
  }
})
```

### O que falta
```typescript
// ✅ CORRETO - Deveria ter:
server: {
  proxy: {
    '/api/agent': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/agent/, '')
    }
  }
}
```

### Impacto
- Chat.tsx não consegue chamar `/api/agent/chat`
- VoiceAgent.tsx não consegue chamar `/api/voice/*`
- Mesmo que tentasse, chegaria em um servidor que não existe

---

## ⚙️ PROBLEMA #6: Vercel Não Consegue Rodar Agente Python

### O Grande Problema
**Vercel roda código JavaScript/TypeScript apenas.**
Python **não é suportado** no Vercel.

### Por que o agente Python não funciona em produção
```
Computer: É impossível rodar Python no Vercel
Você: Mas criei um agente Python...
Computer: Sim, você criou. Mas Vercel não roda Python.
           Você precisa rodar em outro lugar.
```

### Soluções
O agente Python **precisa rodando em outro servidor:**

**Opção 1: Railway** ✅ Recomendado
- Suporta Python
- Fácil deploy (git push)
- Integração com GitHub
- Preço: ~$5/mês

**Opção 2: Heroku**
- Suporta Python
- Free tier foi removido
- Preço: ~$7/mês

**Opção 3: AWS Lambda + Serverless**
- Complexo de configurar
- Requer serverless framework
- Pode ser caro

**Opção 4: Docker + Qualquer hospedagem**
- Dockerfile está pronto em `agent/Dockerfile`
- Digital Ocean, AWS ECS, Google Cloud Run, etc

### Status Atual
❌ Agente Python está **criado localmente**
❌ Agente **não está deployado em lugar nenhum**
❌ Vercel **não consegue rodá-lo**

---

## 📊 Diagrama: O que está acontecendo AGORA

```
Usuário → Browser            ❌ CORS BLOCKED
              ↓
         glm-studio-br.vercel.app (Vite/React)
              ↓
         Chat.tsx/VoiceAgent.tsx
              ↓
         Tentativa de fetch direto
              ↓
         https://api.anthropic.com  ❌ BLOCKED BY BROWSER
         https://integrate.api.nvidia.com  ❌ BLOCKED BY BROWSER
```

---

## 📊 Diagrama: O que DEVERIA estar acontecendo

```
Usuário → Browser
              ↓
         glm-studio-br.vercel.app (Vercel)
              ↓
         Chat.tsx/VoiceAgent.tsx
              ↓
         fetch('/api/agent/chat')
              ↓
         Vercel Serverless Function (server.ts)
              ↓
         Proxy reverso
              ↓
         Railway Agent Python:8000
              ↓
         Claude API / NVIDIA API
              ↓
         Resposta segura ao usuário ✅
```

---

## 🔢 Checklist: Problemas Confirmados

| # | Problema | Severidade | Status |
|---|----------|-----------|--------|
| 1 | CORS Policy Violation | 🔴 CRÍTICO | ❌ NÃO FUNCIONA |
| 2 | API Keys Expostas | 🔴 CRÍTICO | ❌ RISCO SEGURANÇA |
| 3 | Chat.tsx calls Anthropic directly | 🔴 CRÍTICO | ❌ ERRADO |
| 4 | VoiceAgent.tsx calls Anthropic directly | 🔴 CRÍTICO | ❌ ERRADO |
| 5 | Server.ts não é usado | 🟠 ALTA | ❌ IGNORADO |
| 6 | Vite sem proxy config | 🟠 ALTA | ❌ FALTA |
| 7 | Agente Python não deployado | 🟠 ALTA | ❌ LOCAL ONLY |
| 8 | Vercel.json incompleto | 🟠 ALTA | ❌ FALTA CONFIG |
| 9 | Falta PYTHON_AGENT_URL em produção | 🟡 MÉDIA | ❌ NÃO DEFINIDA |
| 10 | Nenhum tratamento de erro adequado | 🟡 MÉDIA | ❌ GENÉRICO |

---

## 💡 Resumo Visual: Por que não funciona

```
┌─────────────────────────────────────────────────────────────┐
│ Seu Aplicativo em Produção (glm-studio-br.vercel.app)      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  React/Vite Component (Chat.tsx, VoiceAgent.tsx)            │
│  ├─ Tenta chamar: https://api.anthropic.com                 │
│  ├─ Tenta chamar: https://integrate.api.nvidia.com          │
│  └─ Resultado: ❌ CORS BLOCKED                               │
│                                                               │
│  Server.ts (Express)                                         │
│  ├─ Existe: ✅                                               │
│  ├─ Rodando em Vercel: ❌                                    │
│  ├─ Proxy para Agente Python: ❌ NÃO CONFIGURADO            │
│  └─ Função: NENHUMA                                          │
│                                                               │
│  Agent Python (FastAPI)                                      │
│  ├─ Criado: ✅                                               │
│  ├─ Deployado em produção: ❌                                │
│  ├─ Sendo usado pelos componentes: ❌                        │
│  └─ Localização em produção: ???                             │
│                                                               │
│  Plano Correto vs Plano Atual                               │
│  ├─ ✅ React → Server.ts → Agent Python                     │
│  └─ ❌ React → API Externas (CORS bloqueado)                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Conclusão

Seu aplicativo falha porque:

1. **Falta segurança** - API keys expostas no navegador
2. **Falta arquitetura** - Requisições diretas em vez de proxy
3. **Falta deployment** - Agente Python criado mas não deployado
4. **Falta integração** - Components não usam o agente criado
5. **Falta configuração** - Vercel não sabe rodar o servidor

### O Servidor.ts foi criado (✅), mas:
- Não está rodando em Vercel
- Não está configurado para fazer proxy
- Não consegue alcançar o agente Python (que não está deployado)

### O Agente Python foi criado (✅), mas:
- Não está em produção
- Components não sabem que existe
- Vercel não consegueria rodá-lo mesmo

### Vercel.json foi criado (✅), mas:
- Não configura o servidor Node.js
- Não sabe onde está o agente Python remoto
- Não redireciona requisições para proxy

---

## ✅ Solução (Próximo Passo)

Você tem duas opções:

### OPÇÃO A: Usar proxy pelo server.ts
1. Deploy agente Python no Railway
2. Configurar server.ts para fazer proxy
3. Atualizar Chat.tsx e VoiceAgent.tsx para chamar `/api/agent/*`
4. Configurar Vercel para rodar server.ts

### OPÇÃO B: Usar abordagem serverless
1. Mover lógica de Chat para Vercel Serverless Functions
2. Deploy agente Python em outro lugar
3. Componentes chamam `/api/chat` (Vercel function)
4. Vercel function faz proxy para agente Python

**Recomendação:** OPÇÃO A (mais limpo e escalável)

