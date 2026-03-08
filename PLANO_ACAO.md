# PLANO DE AÇÃO: Corrigir o Jarvis em Produção

## 🎯 Objetivo Final
Fazer o Jarvis funcionar em produção na página: https://glm-studio-br.vercel.app/

## 📋 Pré-requisitos
- ✅ Agente Python criado (existe em `agent/`)
- ✅ Server.ts criado (existe na raiz)
- ✅ Componentes criados (Chat.tsx, VoiceAgent.tsx)
- ⏳ Deployment do agente Python (FALTA)
- ⏳ Configuração correta (FALTA)

---

## FASE 1: Deploy do Agente Python em Railway (30 minutos)

### Passo 1.1: Criar conta no Railway
```bash
# Acesse: https://railway.app/
# Faça login com GitHub
# Connect seu repositório: https://github.com/gutierresguilherme024-del/Fluxo-Agentico
```

### Passo 1.2: Deploy do Agente
```bash
# Na pasta raiz do projeto
cd Fluxo-Clone

# Railway vai detectar:
# ✅ Dockerfile em /agent/Dockerfile
# ✅ requirements.txt em /agent/requirements.txt

# Ir para Railway dashboard
# Criar novo projeto
# Selecionar repositório GitHub
# Apontar root directory para: /agent
# Deploy automático ao fazer push
```

### Passo 1.3: Conseguir URL do Agente
Depois do deploy, você terá uma URL como:
```
https://seu-agente-name.up.railway.app
```

**Guarde essa URL!** Você vai precisar dela.

### Passo 1.4: Testar API do Agente
```bash
# Abra no navegador:
https://seu-agente-name.up.railway.app/docs

# Você deve ver a documentação Swagger
# Se ver, agente está online ✅
```

---

## FASE 2: Corrigir Chat.tsx (20 minutos)

### Passo 2.1: Abrir arquivo
**FILE:** `src/components/Chat.tsx`

### Passo 2.2: Substituir função `handleSend`
A função atual (linhas ~115-205) está:
- ❌ Chamando API direto (CORS error)
- ❌ Expondo API key

Deve ser:
- ✅ Chamando `/api/agent/chat` (proxy)
- ✅ Nenhuma API key exposta

### Exemplo de mudança:
```typescript
// ❌ ANTES (não funciona em produção)
const response = await fetch('https://api.anthropic.com/v1/messages', {
  headers: {
    'x-api-key': anthropicKey,
  }
})

// ✅ DEPOIS (funciona em produção)
const response = await fetch('/api/agent/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    agent_id: agent?.id || 'default',
    soul: agent?.soul || 'You are a helpful assistant',
    user_id: 'user123',
    message: input,
  })
})

const data = await response.json();
const aiContent = data.response || data.content;
```

### Passo 2.3: Remover imports desnecessários
```typescript
// ❌ REMOVER
import { GoogleGenAI } from '@google/genai';

// ❌ REMOVER
const anthropicKey = (import.meta.env as any).VITE_ANTHROPIC_API_KEY || '';
```

---

## FASE 3: Corrigir VoiceAgent.tsx (20 minutos)

### Passo 3.1: Mesmo processo que Phase 2
**FILE:** `src/components/VoiceAgent.tsx`

Função `sendMessageToClaude` (linhas ~66-105):
- ❌ Chamada direta para Anthropic
- ✅ Deve chamar `/api/voice/chat`

### Mudança:
```typescript
// ❌ ANTES
const response = await fetch('https://api.anthropic.com/v1/messages', {
  headers: { 'x-api-key': ANTHROPIC_API_KEY }
})

// ✅ DEPOIS
const response = await fetch('/api/voice/chat', {
  method: 'POST',
  body: JSON.stringify({
    agent_id: agent?.id || 'default',
    message: userText,
  })
})
```

---

## FASE 4: Configurar Server.ts (15 minutos)

### Passo 4.1: Atualizar PYTHON_AGENT_URL
**FILE:** `server.ts` (linha ~14)

```typescript
// Em desenvolvimento local
const PYTHON_AGENT_URL = process.env.PYTHON_AGENT_URL || "http://localhost:8000";

// Em Vercel, será configurado como variável de ambiente
// PYTHON_AGENT_URL=https://seu-agente-name.up.railway.app
```

### Passo 4.2: Verificar rotas de proxy
Verificar se as rotas `/api/agent/*` e `/api/voice/*` estão corretas:

```typescript
// Route 1: Agent Chat
app.all("/api/agent/*", (req, res) => {
  const targetPath = req.path.replace("/api/agent", "") || "/";
  proxyToPythonAgent(req, res, targetPath);
});

// Route 2: Voice
app.all("/api/voice/*", (req, res) => {
  const targetPath = "/voice" + (req.path.replace("/api/voice", "") || "/");
  proxyToPythonAgent(req, res, targetPath);
});
```

✅ Verificar se estão lá!

---

## FASE 5: Configurar Vercel (20 minutos)

### Passo 5.1: Adicionar variáveis de ambiente
Ir para: **Vercel Dashboard → Seu Projeto → Settings → Environment Variables**

Adicionar:
```env
PYTHON_AGENT_URL=https://seu-agente-name.up.railway.app
```

Adicionar outras opcionais:
```env
VITE_SUPABASE_URL=seu_url
VITE_SUPABASE_ANON_KEY=sua_key
```

### Passo 5.2: Atualizar vercel.json
**FILE:** `vercel.json`

Deve ter:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "server.ts"
    }
  ]
}
```

### Passo 5.3: Adicionar ou atualizar package.json
Certificar que tem:
```json
{
  "scripts": {
    "dev": "node server.ts",
    "build": "vite build"
  }
}
```

---

## FASE 6: Atualizar vite.config.ts (5 minutos)

**FILE:** `vite.config.ts`

Adicionar proxy para desenvolvimento local:

```typescript
export default defineConfig(({mode}) => {
  // ... código existente ...
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        }
      }
    }
  }
})
```

---

## FASE 7: Fazer Commit e Push (5 minutos)

```bash
# Estando na pasta Fluxo-Clone
cd C:\Users\Guilherme\Desktop\Fluxo-Clone

# Adicionar mudanças
git add -A

# Commit
git commit -m "fix(jarvis): Fix CORS issues and proxy requests through server.ts

- Update Chat.tsx to call /api/agent/chat instead of direct API
- Update VoiceAgent.tsx to call /api/voice/chat
- Remove exposed API keys from frontend
- Configure server.ts as proxy for Python Agent
- Add Vercel environment variables configuration
- Fix Vite config for local development proxy

The Jarvis Agent now correctly:
- Uses server.ts as proxy reverso
- Makes secure requests to Python Agent in Railway
- Exposes no API keys to frontend
- Handles CORS properly"

# Push
git push origin main
```

---

## ✅ Checklist de Deployment

### Antes de fazer push:
- [ ] Chat.tsx não chama mais API direta
- [ ] VoiceAgent.tsx não chama mais API direta
- [ ] Server.ts tem proxy configurado
- [ ] vercel.json está correto
- [ ] vite.config.ts tem proxy para dev
- [ ] Nenhuma VITE_*_API_KEY no código
- [ ] .env.example está atualizado

### Depois de fazer push:
- [ ] GitHub Actions passou (se configurado)
- [ ] Vercel começou o build
- [ ] Build do Vercel completou
- [ ] Deploy do Vercel foi bem-sucedido
- [ ] URL de produção está respondendo

### Depois de tudo isso:
- [ ] Agente Python está rodando no Railway
- [ ] URL do Railway responde em `/docs`
- [ ] Vercel configurado com PYTHON_AGENT_URL
- [ ] Site production no Vercel está online

### Teste final:
- [ ] Abrir https://glm-studio-br.vercel.app/
- [ ] Abrindo DevTools (F12) não vê nenhuma API key
- [ ] Digita mensagem no Jarvis
- [ ] Vê a requisição em Network → `/api/agent/chat`
- [ ] Agente responde ✅

---

## 🚨 Problemas Comuns During Implementation

### "Agent returns 404"
- Verificar URL do Railway em vercel.json
- Testar: `curl https://seu-agent.railway.app/health`
- Se não responde, agente não está deployado

### "CORS error still happening"
- Verificar se Chat.tsx realmente foi mudado
- Limpar cache do navegador (Ctrl+Shift+Delete)
- Verificar Network tab do DevTools para ver se chama `/api/agent`

### "Server timeout"
- Agent pode estar lento
- Aumentar timeout no proxy (default é 30s)
- Verificar logs no Railway dashboard

### "502 Bad Gateway"
- Server.ts pode estar com erro
- Verificar logs do Vercel
- Testar localmente: `npm run dev` e `python agent/main.py`

---

## 📊 Timeline Esperado

| Fase | Tarefa | Tempo | Status |
|------|--------|-------|--------|
| 1 | Deploy no Railway | 30min | ⏳ |
| 2 | Corrigir Chat.tsx | 20min | ⏳ |
| 3 | Corrigir VoiceAgent.tsx | 20min | ⏳ |
| 4 | Configurar Server.ts | 15min | ⏳ |
| 5 | Configurar Vercel | 20min | ⏳ |
| 6 | Atualizar Vite Config | 5min | ⏳ |
| 7 | Commit e Push | 5min | ⏳ |
| **TOTAL** | **Todas as fases** | **~2-3 horas** | ⏳ |

---

## 🎯 Resultado Final

Após completar esse plano:

```
✅ Jarvis funcionando em produção
✅ API keys seguras (no backend)
✅ CORS resolvido (proxy)
✅ Agente Python em Railway
✅ Vercel servindo React + Server.ts
✅ Chat funcionando na página
✅ Voice funcionando na página
✅ Banco de dados (Supabase) persiste dados
```

---

## Próximo Passo: Executar Fase 1

**Ir para:** https://railway.app/
**Login com:** GitHub
**Deploy agente em:** `/agent`

Quando terminar essa fase, avise que completou e passo para a Fase 2!

