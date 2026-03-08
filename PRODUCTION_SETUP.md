# Setup de Produção - Jarvis Agent

## 📋 Pré-requisitos

- Node.js 18+
- Python 3.12+
- Vercel CLI (`npm i -g vercel`)
- Git
- Docker (opcional, para testes locais)

## 🚀 Deployment no Vercel

### 1. Preparar Variáveis de Ambiente

Adicione as seguintes variáveis no painel do Vercel:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_NVIDIA_API_KEY=your_nvidia_key
VITE_NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
VITE_LLM_MODEL=z-ai/glm4.7
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_key (opcional)
```

### 2. Build do Frontend

```bash
npm install
npm run build
```

### Deploy Frontend

```bash
vercel deploy --prod
```

## 🐳 Deploy do Agente Python

O agente Python pode ser deployado de várias formas:

### Opção A: Railway (Recomendado para FastAPI)

```bash
# 1. Instale Railway CLI
npm i -g @railway/cli

# 2. Conecte ao Railway
railway login

# 3. Deploy
cd agent
railway init
railway up
```

### Opção B: Heroku (deprecado, mas ainda funciona)

```bash
# 1. Instale Heroku CLI
# 2. Conecte
heroku login

# 3. Crie app
heroku create seu-agente-name

# 4. Defina variáveis de ambiente
heroku config:set NVIDIA_API_KEY=xxx --app seu-agente-name

# 5. Deploy
cd agent
git push heroku main
```

### Opção C: Docker + Qualquer Hospedagem

```bash
# Build
docker build -t jarvis-agent:latest -f agent/Dockerfile .

# Teste localmente
docker run -p 8000:8000 -e NVIDIA_API_KEY=xxx jarvis-agent:latest

# Push para registro
docker tag jarvis-agent:latest seu-registry/jarvis-agent:latest
docker push seu-registry/jarvis-agent:latest
```

## 🔄 Atualizar a URL do Agente

No arquivo `server.ts`, altere a URL do agente:

```typescript
const PYTHON_AGENT_URL = process.env.PYTHON_AGENT_URL || "https://seu-agente-url.railway.app";
```

## 📝 Arquivo `.env` de Produção

Nunca commite seu `.env` de produção. Use as variáveis de ambiente do Vercel.

## ✅ Checklist de Deployment

- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Agente Python rodando em um servidor (Railway, Heroku, etc)
- [ ] URL do agente atualizada no `server.ts`
- [ ] Build local testado (`npm run build`)
- [ ] Testes de integração passando
- [ ] CORS configurado corretamente
- [ ] Logging ativado para debug em produção

## 🔍 Debug em Produção

```bash
# Ver logs do Vercel
vercel logs seu-projeto.vercel.app

# Ver logs do agente Python (Railway)
railway logs

# Testar endpoint do agente
curl https://seu-agente-url.railway.app/health
```

## 🚨 Segurança

- ✅ Nunca commite `.env` files
- ✅ Use variáveis de ambiente do Vercel
- ✅ Configure CORS apenas para seu domínio
- ✅ Rotacione chaves de API regularmente
- ✅ Use HTTPS em produção

