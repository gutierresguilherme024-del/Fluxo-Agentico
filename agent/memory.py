"""
Memória persistente com mem0 + ChromaDB + Supabase
"""
import os
import json
from datetime import datetime
from typing import Optional
from config import CHROMA_PATH, SUPABASE_URL, SUPABASE_KEY

try:
    import chromadb
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False

try:
    from supabase import create_client
    SUPABASE_AVAILABLE = bool(SUPABASE_URL and SUPABASE_KEY)
except ImportError:
    SUPABASE_AVAILABLE = False


class AgentMemory:
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self._init_chroma()
        self._init_supabase()

    def _init_chroma(self):
        if not CHROMA_AVAILABLE:
            self.chroma_collection = None
            return
            
        try:
            import signal
            from config import CHROMA_INITIALIZATION_TIMEOUT
            
            def timeout_handler(signum, frame):
                raise TimeoutError("ChromaDB initialization timeout")
            
            # Set timeout
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(CHROMA_INITIALIZATION_TIMEOUT)  # 30s default
            
            os.makedirs(CHROMA_PATH, exist_ok=True)
            self.chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
            self.chroma_collection = self.chroma_client.get_or_create_collection(
                name=f"agent_{self.agent_id}_memory",
                metadata={"hnsw:space": "cosine"}
            )
            
            signal.alarm(0)  # Cancel timeout
            print("[MEMORY] ChromaDB initialized successfully")
            
        except TimeoutError:
            print("⚠️ [MEMORY] ChromaDB initialization timeout - running without vector memory")
            self.chroma_collection = None
        except Exception as e:
            print(f"⚠️ [MEMORY] ChromaDB initialization failed: {e} - running without vector memory")
            self.chroma_collection = None

    def _init_supabase(self):
        if not SUPABASE_AVAILABLE:
            self.supabase = None
            return
        self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    def add_memory(self, user_id: str, content: str, metadata: dict = None):
        """Salva uma memória no ChromaDB"""
        if not self.chroma_collection:
            return

        mem_id = f"{user_id}_{datetime.now().timestamp()}"
        meta = {"user_id": user_id, "timestamp": datetime.now().isoformat(), **(metadata or {})}
        
        self.chroma_collection.add(
            documents=[content],
            ids=[mem_id],
            metadatas=[meta]
        )

    def search_memories(self, user_id: str, query: str, limit: int = 5) -> list[str]:
        """Busca memórias relevantes por similaridade semântica"""
        if not self.chroma_collection:
            return []

        try:
            results = self.chroma_collection.query(
                query_texts=[query],
                n_results=min(limit, self.chroma_collection.count()),
                where={"user_id": user_id}
            )
            return results["documents"][0] if results["documents"] else []
        except Exception:
            return []

    def get_all_memories(self, user_id: str) -> list[dict]:
        """Retorna todas as memórias de um usuário"""
        if not self.chroma_collection:
            return []

        try:
            results = self.chroma_collection.get(where={"user_id": user_id})
            memories = []
            for doc, meta in zip(results["documents"], results["metadatas"]):
                memories.append({"content": doc, "timestamp": meta.get("timestamp", ""), "user_id": user_id})
            return sorted(memories, key=lambda x: x["timestamp"], reverse=True)
        except Exception:
            return []

    def save_conversation_to_supabase(self, user_id: str, agent_id: str, messages: list):
        """Salva o histórico da conversa no Supabase"""
        if not self.supabase:
            return

        try:
            self.supabase.table("conversations").insert({
                "user_id": user_id,
                "agent_id": agent_id,
                "messages": json.dumps(messages),
                "created_at": datetime.now().isoformat()
            }).execute()
        except Exception as e:
            # ERRO DETECTADO: Logar imediatamente para auditoria em vez de silenciar
            print(f"[CRITICAL ERROR] Falha ao persistir conversa no Supabase: {str(e)}")
            # Em produção, você deveria ter um sistema de retry ou DLQ aqui

    def get_conversation_history(self, user_id: str, agent_id: str, limit: int = 10) -> list:
        """Recupera histórico de conversas do Supabase"""
        if not self.supabase:
            return []

        try:
            result = self.supabase.table("conversations")\
                .select("messages, created_at")\
                .eq("user_id", user_id)\
                .eq("agent_id", agent_id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            
            return [{"messages": json.loads(r["messages"]), "created_at": r["created_at"]} for r in result.data]
        except Exception:
            return []
