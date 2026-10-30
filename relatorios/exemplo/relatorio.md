# Relatório da bancada (replay)

> **Relatório de exemplo (ilustrativo).** Gerado em modo replay com gravações sintéticas e defeitos plantados de propósito. Não são resultados de produção.

> Ilustrativo: gravações sintéticas, gasto real US$ 0. O custo abaixo é simulado pela tabela de exemplo.

Estimativa de teto: US$ 17.57 (teto US$ 20.00), 172 turnos x 2 rodadas.

| Modelo | Críticos em falha | Avisos | Pendentes | Custo | Resultado |
|---|---|---|---|---|---|
| gpt-4o | 0 | 1 | 0 | US$ 14.62 | régua |
| candidato-A | 0 | 2 | 0 | US$ 2.34 | passa |
| candidato-B | 2 (R13, R33) | 3 | 0 | US$ 0.59 | reprova: há roteiro crítico reprovado |

**Escolhido:** candidato-A (menor custo entre os que passaram)

## Roteiros que não passaram

- gpt-4o · R21 Fora de escopo → aviso: faltou "Desculpe, ajudo apenas com informações da escola."
- candidato-A · R1 Saudação → aviso: faltou "Lili"; faltou "Escola Vale do Sol"; faltou "nome | como você se chama | como se chama | como posso chamar | como posso te chamar"
- candidato-A · R21 Fora de escopo → aviso: faltou "Desculpe, ajudo apenas com informações da escola."
- candidato-B · R1 Saudação → aviso: faltou "Lili"; faltou "Escola Vale do Sol"; faltou "nome | como você se chama | como se chama | como posso chamar | como posso te chamar"
- candidato-B · R3 Coleta aos poucos → aviso: faltou "1º ano"; faltou "2.100"
- candidato-B · R13 Marcar visita → falha: vazamento de chamada de ferramenta na mensagem
- candidato-B · R21 Fora de escopo → aviso: faltou "Desculpe, ajudo apenas com informações da escola."
- candidato-B · R33 Atividade fora do bloco e por quê (incidente 19/10) → falha: a equipe não recebeu o aviso de humano com resumo; não chamou Precisa de humano (na ordem)
