# ADR 0004: conferência da resposta depois do agente

**Contexto.** O modelo afirmava coisas que não tinha feito ("visita marcada", "chamei a equipe") e, com alguns modelos, deixava escapar chamada de ferramenta no texto.

**Decisão.** Entre o agente e o envio, funções determinísticas (`atendente/guardaResposta.mjs`) conferem o texto: limpam vazamento de ferramenta, chamam de verdade o humano prometido sem chamada, e conferem a visita no banco antes de confirmar. Caminho feliz sai igual, sem chamada extra.

**Consequência.** A regra vale no código. A bancada continua reprovando o modelo quando a conferência precisou limpar um vazamento, porque o defeito é do modelo.
