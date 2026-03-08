"""
FastAPI — Servidor do Agente de Voz Autônomo (SoulForge)
Endpoints: /chat, /voice/input, /voice/output, /memory, /health
"""
import os
import io
import json
import asyncio
import tempfile
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from config import HOST, PORT
from graph import VoiceAgent
from memory import AgentMemory

# ─── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="SoulForge Voice Agent API",
    description="Agente de Voz Autônomo com memória persistente e voz natural",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Cache de agentes (evita recriar a cada request) ─────────────────────────
_agents: dict[str, VoiceAgent] = {}

def get_agent(agent_id: str, soul: str, user_id: str) -> VoiceAgent:
    key = f"{agent_id}_{user_id}"
    if key not in _agents:
        _agents[key] = VoiceAgent(agent_id=agent_id, soul=soul, user_id=user_id)
    return _agents[key]


# ─── Modelos de Request ────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    agent_id: str
    soul: str = "Você é um assistente de voz inteligente. Responda sempre em português do Brasil de forma clara e natural."
    user_id: str = "default"
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    agent_id: str
    user_id: str
    timestamp: str
    memories_used: int = 0

class MemoryRequest(BaseModel):
    user_id: str
    content: str
    agent_id: str = "default"

class ResetRequest(BaseModel):
    agent_id: str
    user_id: str


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "online",
        "service": "SoulForge Voice Agent",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Envia uma mensagem de texto ao agente e recebe uma resposta inteligente"""
    try:
        agent = get_agent(req.agent_id, req.soul, req.user_id)
        
        # Buscar quantas memórias serão usadas
        memory = AgentMemory(req.agent_id)
        memories = memory.search_memories(req.user_id, req.message, limit=5)
        
        response_text = await agent.chat(req.message)
        
        return ChatResponse(
            response=response_text,
            agent_id=req.agent_id,
            user_id=req.user_id,
            timestamp=datetime.now().isoformat(),
            memories_used=len(memories)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/voice/input")
async def voice_input(
    agent_id: str = "default",
    soul: str = "Você é um assistente de voz. Responda em português do Brasil.",
    user_id: str = "default",
    audio: UploadFile = File(...)
):
    """Recebe áudio, transcreve com Whisper e retorna resposta em texto + áudio TTS"""
    try:
        # Salvar áudio temporariamente
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Transcrever com Whisper
        try:
            from voice.stt import transcribe_audio
            transcription = transcribe_audio(tmp_path)
        except ImportError:
            transcription = "Whisper não instalado. Envie texto via /chat"
        finally:
            os.unlink(tmp_path)

        if not transcription or len(transcription.strip()) < 2:
            raise HTTPException(status_code=400, detail="Não foi possível transcrever o áudio")

        # Processsar com o agente
        agent = get_agent(agent_id, soul, user_id)
        response_text = await agent.chat(transcription)

        # Gerar áudio TTS
        try:
            from voice.tts import synthesize_speech
            audio_bytes = synthesize_speech(response_text)
            
            return StreamingResponse(
                io.BytesIO(audio_bytes),
                media_type="audio/wav",
                headers={
                    "X-Transcription": transcription,
                    "X-Response-Text": response_text[:200]
                }
            )
        except ImportError:
            # Se TTS não disponível, retorna JSON com texto
            return JSONResponse({
                "transcription": transcription,
                "response": response_text,
                "tts_available": False
            })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/memory/{agent_id}/{user_id}")
async def get_memories(agent_id: str, user_id: str):
    """Retorna todas as memórias de um usuário para um agente"""
    memory = AgentMemory(agent_id=agent_id)
    memories = memory.get_all_memories(user_id=user_id)
    return {"agent_id": agent_id, "user_id": user_id, "memories": memories, "count": len(memories)}


@app.post("/memory")
async def add_memory(req: MemoryRequest):
    """Adiciona manualmente uma memória para um usuário"""
    memory = AgentMemory(agent_id=req.agent_id)
    memory.add_memory(user_id=req.user_id, content=req.content)
    return {"success": True, "message": f"Memória salva: '{req.content}'"}


@app.delete("/memory/{agent_id}/{user_id}")
async def clear_memories(agent_id: str, user_id: str):
    """Limpa todas as memórias de um usuário (CUIDADO!)"""
    try:
        import chromadb
        from config import CHROMA_PATH
        client = chromadb.PersistentClient(path=CHROMA_PATH)
        client.delete_collection(f"agent_{agent_id}_memory")
        return {"success": True, "message": "Memórias apagadas"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reset")
async def reset_conversation(req: ResetRequest):
    """Limpa o histórico da conversa atual (memória longa permanece)"""
    key = f"{req.agent_id}_{req.user_id}"
    if key in _agents:
        _agents[key].reset_conversation()
    return {"success": True, "message": "Conversa reiniciada"}


@app.get("/agents")
async def list_active_agents():
    """Lista agentes carregados em memória no momento"""
    return {
        "active_agents": list(_agents.keys()),
        "count": len(_agents)
    }


# ─── Inicialização ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print("[AGENT] SoulForge Voice Agent iniciando...")
    print(f"[SERVER] Servidor em: http://localhost:{PORT}")
    print(f"[DOCS] Docs em: http://localhost:{PORT}/docs")
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
