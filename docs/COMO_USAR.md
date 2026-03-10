# Como Usar Jarvis - Guia Rápido

## 🚀 Iniciar Tudo (Windows)

1. **Navegue até a pasta do projeto:**

   ```
   cd C:\Users\Guilherme\Desktop\Produto novo
   ```

2. **Execute o script oficial de inicialização:**

   ```
   start-dev.bat
   ```

   Compatibilidade legada:

   ```
   START_JARVIS.bat
   ```

   (`START_JARVIS.bat` agora é apenas um wrapper para `start-dev.bat`)

   Isso abrirá **2 janelas novas**:
   - ✅ Uma com o **Agente Python** (porta 8000)
   - ✅ Uma com o **Frontend React** (porta 5173)

3. **Abra no navegador:**
   - http://localhost:5173

## 🎯 O que Funcionará Agora

- ✅ Chat com o Jarvis
- ✅ Enviar mensagens
- ✅ Receber respostas do agente
- ✅ Integração com Supabase

## ⚠️ Se der Erro "Failed to fetch"

**Causa:** Agente Python não está funcionando

**Solução:**

1. Verifique se a janela "JARVIS - Agent Python" está aberta
2. Se não estiver, execute manualmente:
   ```bash
   cd agent
   python main.py
   ```
3. Você deve ver: `INFO:     Uvicorn running on http://0.0.0.0:8000`
4. Volte ao navegador e recarregue (F5)

## 🔍 URLs Importantes

| O que        | URL                          | Para que                        |
| ------------ | ---------------------------- | ------------------------------- |
| Frontend     | http://localhost:5173        | Usar o Jarvis                   |
| Agent API    | http://localhost:8000        | Chamar agente via API           |
| Documentação | http://localhost:8000/docs   | Ver endpoints                   |
| Health Check | http://localhost:8000/health | Verificar se agente está online |

## 📝 Teste Manual (Opcional)

Se quiser testar o agente direto sem o frontend:

```bash
# 1. Abra um navegador em:
http://localhost:8000/docs

# 2. Clique em "POST /chat"
# 3. Clique em "Try it out"
# 4. Preencha com:
{
  "agent_id": "default",
  "soul": "Voce eh um assistente inteligente",
  "user_id": "default",
  "message": "Oi Jarvis!"
}

# 5. Clique em "Execute"
```

## 🆚 Comparação: Desenvolvimento vs Produção

|          | Desenvolvimento (Local)                            | Produção                      |
| -------- | -------------------------------------------------- | ----------------------------- |
| Frontend | http://localhost:5173                              | https://seusite.vercel.app    |
| Agent    | http://localhost:8000                              | https://seu-agent.railway.app |
| Database | Supabase (cloud)                                   | Supabase (cloud)              |
| Iniciar  | start-dev.bat (Windows) / start-dev.sh (Linux/Mac) | Automático (Vercel + Railway) |

## ✅ Checklist Antes de Usar

- [x] Arquivo .env existe na raiz
- [x] Python 3.12+ instalado
- [x] Node.js instalado
- [x] Dependencias instaladas (pip + npm)
- [x] Portas 5173 e 8000 livres

## 🆘 Troubleshooting

| Problema                   | Verificação                                                 |
| -------------------------- | ----------------------------------------------------------- |
| "Port 5173 already in use" | `lsof -i :5173` (Mac/Linux) ou feche outro app usando porta |
| "Python not found"         | `python --version` ou instale de python.org                 |
| "CORS error"               | Agente Python está offline, veja acima                      |
| "Cannot find module X"     | Use `npm install` ou `pip install -r requirements-base.txt` |

## 💡 Proximos Passos

Depois de testar localmente:

1. **Deploy Frontend** → Vercel
2. **Deploy Agent** → Railway
3. **Atualizar URLs** em server.ts
4. **Configurar variáveis de ambiente**

Ver `PRODUCTION_SETUP.md` para instruções completas.

---

**Dúvidas?** Abra a console do navegador (F12) para ver os erros reais!
