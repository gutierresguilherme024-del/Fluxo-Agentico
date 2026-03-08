# Quick Start - Jarvis em Producao

> Resumo ultra-rapido do que fazer para colocar o Jarvis em producao

## 1. Setup Inicial (5 min)

```bash
# Coloque suas chaves de API no .env
# Depois:
npm install

# Windows:
start-dev.bat

# Mac/Linux:
chmod +x start-dev.sh && ./start-dev.sh
```

## 2. Teste Local (3 min)

```bash
# Agente Python esta rodando em: http://localhost:8000/docs
# Frontend React esta rodando em: http://localhost:3000
# Teste a integracao antes de fazer deploy
```

## 3. Deploy no Vercel (5 min)

```bash
npm install -g vercel
vercel login
vercel deploy --prod
```

## 4. Deploy do Agente (5 min)

Escolha UMA opcao:

### Railway (Recomendado)
```bash
npm install -g @railway/cli
railway login
cd agent
railway init
railway up
```

### Heroku
```bash
heroku login
heroku create seu-agente-name
git push heroku main
```

### Docker
```bash
docker build -t jarvis -f agent/Dockerfile .
docker push seu-registry/jarvis:latest
```

## 5. Configurar Variaveis de Ambiente

**Vercel Dashboard → Settings → Environment Variables**

Adicione:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_NVIDIA_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Agent (Railway/Heroku)**

Adicione:
- `NVIDIA_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`

## 6. Update Agent URL

Em `server.ts` linha 14:
```typescript
const PYTHON_AGENT_URL = process.env.PYTHON_AGENT_URL || "https://seu-agent.railway.app";
```

## ✅ Pronto!

Seu Jarvis esta agora em PRODUCAO!

- Frontend: https://seu-projeto.vercel.app
- Agente: https://seu-agent.railway.app/docs

## 📱 Troubleshooting

| Problema | Solucao |
|----------|---------|
| `ModuleNotFoundError` | `cd agent && python -m venv venv && source venv/bin/activate && pip install -r requirements-base.txt` |
| Agente offline | Verifique logs: `railway logs` ou `vercel logs` |
| CORS error | Adicione seu dominio em server.ts CORS config |
| Build erro Vite | `rm -rf dist node_modules && npm install && npm run build` |

Ver PRODUCTION_SETUP.md para guia completo.
