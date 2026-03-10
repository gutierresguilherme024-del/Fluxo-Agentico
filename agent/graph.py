import re
import httpx
import anthropic
from typing import TypedDict, Annotated, Optional
from config import NVIDIA_API_KEY, NVIDIA_BASE_URL, LLM_MODEL, ANTHROPIC_API_KEY
from memory import AgentMemory
from tools import create_tools, TOOL_DESCRIPTIONS


class AgentState(TypedDict):
    user_id: str
    agent_id: str
    soul: str          # System prompt / personalidade do agente
    messages: list     # Histórico da conversa
    memories: list     # Memórias relevantes carregadas
    tool_result: Optional[str]
    final_response: Optional[str]
    iteration: int     # Para evitar loops infinitos


class VoiceAgent:
    def __init__(self, agent_id: str, soul: str, user_id: str = "default"):
        self.agent_id = agent_id
        self.soul = soul
        self.user_id = user_id
        self.memory = AgentMemory(agent_id=agent_id)
        self.tools = create_tools(self.memory, user_id)
        self.conversation_history = []

    def _build_system_prompt(self, memories: list[str]) -> str:
        memory_section = ""
        if memories:
            memory_section = "\n\n## O que você já sabe sobre este usuário:\n" + "\n".join(f"- {m}" for m in memories)

        return f"""{self.soul}

## Instruções gerais:
- Você é um Agente de Voz Autônomo. Suas respostas serão convertidas em fala, então escreva de forma natural, conversacional e em português do Brasil.
- Seja direto e conciso. Evite bullet points, markdown ou formatação que não soe bem em voz alta.
- Se o usuário mencionar algo importante sobre ele (nome, preferência, fato), salve na memória automaticamente.
{TOOL_DESCRIPTIONS}
{memory_section}"""

    async def _call_llm(self, messages: list) -> str:
        """Chama o LLM (Prioriza Anthropic Claude e tenta NVIDIA GLM como fallback real)"""
        
        errors = []
        
        # 1. Tentar Anthropic Claude
        if ANTHROPIC_API_KEY:
            print(f"[LLM] Tentando Anthropic Claude (Agente {self.agent_id})...")
            try:
                client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
                
                system_msg = messages[0]["content"] if messages[0]["role"] == "system" else ""
                anthropic_messages = [m for m in messages if m["role"] != "system"]
                
                response = await client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=1024,
                    system=system_msg,
                    messages=anthropic_messages,
                    temperature=0.7
                )
                return response.content[0].text
            except Exception as e:
                err_msg = f"Anthropic falhou: {str(e)}"
                print(f"[LLM ERROR] {err_msg}")
                errors.append(err_msg)

        # 2. Tentar NVIDIA GLM (Fallback ou Principal)
        if NVIDIA_API_KEY:
            print(f"[LLM] Usando Fallback NVIDIA GLM (Agente {self.agent_id})...")
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        f"{NVIDIA_BASE_URL}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {NVIDIA_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": LLM_MODEL,
                            "messages": messages,
                            "temperature": 0.7,
                            "max_tokens": 1024,
                        }
                    )
                    # Fornecer erro detalhado se falhar
                    if response.status_code != 200:
                        raise ValueError(f"HTTP {response.status_code}: {response.text}")
                        
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
            except Exception as e:
                err_msg = f"NVIDIA GLM falhou: {str(e)}"
                print(f"[LLM ERROR] {err_msg}")
                errors.append(err_msg)
        
        # 3. Se chegou aqui, nada funcionou
        if not errors:
            raise ValueError("Configuração Inválida: Nenhuma chave de API (Anthropic/NVIDIA) foi encontrada no ambiente.")
        
        raise ValueError(f"Falha Total na Conexão com IA. Diagnóstico: {' | '.join(errors)}")

    def _extract_tool_call(self, text: str) -> tuple[Optional[str], Optional[str], str]:
        """Extrai chamada de ferramenta do texto do LLM"""
        pattern = r'\[TOOL:\s*(\w+)\]\s*(.*?)\s*\[/TOOL\]'
        match = re.search(pattern, text, re.DOTALL)
        if match:
            tool_name = match.group(1)
            tool_arg = match.group(2).strip()
            clean_text = text[:match.start()].strip() + text[match.end():].strip()
            return tool_name, tool_arg, clean_text
        return None, None, text

    async def chat(self, user_message: str, external_messages: Optional[list] = None) -> str:
        """Processa uma mensagem do usuário e retorna a resposta"""
        # 1. Buscar memórias relevantes
        memories = self.memory.search_memories(
            user_id=self.user_id, 
            query=user_message, 
            limit=5
        )

        # 2. Montar sistema de mensagens
        system_prompt = self._build_system_prompt(memories)
        
        messages = [{"role": "system", "content": system_prompt}]
        
        # Adicionar histórico recente (últimas 10 trocas)
        for msg in self.conversation_history[-20:]:
            messages.append(msg)

        # Permite injetar histórico vindo do frontend sem quebrar compatibilidade.
        if external_messages:
            for msg in external_messages[-20:]:
                role = msg.get("role") if isinstance(msg, dict) else None
                content = msg.get("content") if isinstance(msg, dict) else None
                if role in {"user", "assistant", "system"} and isinstance(content, str) and content.strip():
                    if role != "system":
                        messages.append({"role": role, "content": content})
        
        messages.append({"role": "user", "content": user_message})

        # 3. Loop de raciocínio (com suporte a ferramentas)
        max_iterations = 3
        tool_results = []

        for i in range(max_iterations):
            response_text = await self._call_llm(messages)
            
            # Verificar se o agente quer usar uma ferramenta
            tool_name, tool_arg, clean_response = self._extract_tool_call(response_text)
            
            if tool_name and tool_name in self.tools:
                # Executar ferramenta
                tool_result = self.tools[tool_name](tool_arg)
                tool_results.append(f"[{tool_name}({tool_arg})] → {tool_result}")
                
                # Adicionar resultado ao contexto e continuar
                messages.append({"role": "assistant", "content": response_text})
                messages.append({"role": "user", "content": f"[Resultado da ferramenta {tool_name}]: {tool_result}\n\nContinue com sua resposta ao usuário."})
            else:
                # Resposta final
                final_response = clean_response
                break
        else:
            final_response = response_text

        # 4. Atualizar histórico
        self.conversation_history.append({"role": "user", "content": user_message})
        self.conversation_history.append({"role": "assistant", "content": final_response})

        # 5. Salvar conversa no Supabase (async, não bloqueia)
        try:
            self.memory.save_conversation_to_supabase(
                user_id=self.user_id,
                agent_id=self.agent_id,
                messages=[
                    {"role": "user", "content": user_message},
                    {"role": "assistant", "content": final_response}
                ]
            )
        except Exception:
            pass

        return final_response

    def reset_conversation(self):
        """Limpa o histórico da conversa atual (memória de longo prazo permanece)"""
        self.conversation_history = []
