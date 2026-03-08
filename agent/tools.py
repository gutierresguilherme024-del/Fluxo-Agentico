"""
Ferramentas disponíveis para o agente usar durante o raciocínio LangGraph
"""
from typing import Optional
from memory import AgentMemory


def create_tools(memory: AgentMemory, user_id: str):
    """Cria as ferramentas que o agente pode usar"""

    def save_memory(fact: str) -> str:
        """Salva um fato importante sobre o usuário na memória de longo prazo."""
        memory.add_memory(user_id=user_id, content=fact, metadata={"type": "fact"})
        return f"✅ Memória salva: '{fact}'"

    def search_memory(query: str) -> str:
        """Busca informações relevantes na memória do usuário."""
        memories = memory.search_memories(user_id=user_id, query=query, limit=5)
        if not memories:
            return "Nenhuma memória relevante encontrada."
        return "Memórias relevantes:\n" + "\n".join(f"- {m}" for m in memories)

    def get_current_time() -> str:
        """Retorna a data e hora atual."""
        from datetime import datetime
        now = datetime.now()
        return now.strftime("Hoje é %A, %d de %B de %Y, às %H:%M")

    def calculate(expression: str) -> str:
        """Realiza cálculos matemáticos simples."""
        try:
            result = eval(expression, {"__builtins__": {}}, {})
            return f"Resultado: {result}"
        except Exception as e:
            return f"Erro no cálculo: {str(e)}"

    return {
        "save_memory": save_memory,
        "search_memory": search_memory,
        "get_current_time": get_current_time,
        "calculate": calculate,
    }


TOOL_DESCRIPTIONS = """
Você tem acesso às seguintes ferramentas. Use-as quando necessário:

1. save_memory(fact: str) → Salva um fato importante sobre o usuário para lembrar depois
   Exemplo: save_memory("O usuário se chama Guilherme e mora no Brasil")

2. search_memory(query: str) → Busca informações que você já sabe sobre o usuário
   Exemplo: search_memory("nome e preferências do usuário")

3. get_current_time() → Retorna data e hora atual

4. calculate(expression: str) → Faz cálculos matemáticos
   Exemplo: calculate("150 * 0.1")

Para usar uma ferramenta, responda com o formato exato:
[TOOL: nome_da_ferramenta] argumento aqui [/TOOL]
"""
