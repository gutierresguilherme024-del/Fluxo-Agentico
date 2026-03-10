# Fluxo Agentico

Estrutura principal do projeto:

- `frontend/` - app React/Vite
- `agent/` - serviço Python/FastAPI
- `docker-compose.yml` - orquestração local dos serviços
- `docs/` - documentação operacional do projeto

## Rodar local (scripts)

Windows:

```bat
start-dev.bat
```

Linux/Mac:

```bash
chmod +x start-dev.sh
./start-dev.sh
```

Compatibilidade legada no Windows:

```bat
START_JARVIS.bat
```

## Rodar local (Docker)

```bash
docker compose up --build
```

Serviços:

- Frontend: `http://localhost:5173`
- Agent API: `http://localhost:8000`
- Agent Docs: `http://localhost:8000/docs`

## Documentação

- [Quick Start](docs/QUICKSTART.md)
- [Como Usar](docs/COMO_USAR.md)
- [Production Setup](docs/PRODUCTION_SETUP.md)
- [Resumo de Deployment](docs/RESUMO_DEPLOYMENT.md)
