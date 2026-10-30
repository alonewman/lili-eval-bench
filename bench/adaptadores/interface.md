# Contrato do adaptador

Um adaptador é um objeto `{ nome, rodarRoteiro(modelo, roteiro), custo(modelo) }`.
`rodarRoteiro` devolve uma lista com um **observado** por turno do roteiro:

| Campo | Tipo | Significado |
|---|---|---|
| `output` | string | Texto que a família recebeu (junção dos blocos) |
| `envios` | string[] | Mensagens enviadas, em ordem (opcional; exigido por `blocosMinimo`/`blocosMaximo`/`ordem`) |
| `tools` | string[] | Ferramentas chamadas no turno, em ordem |
| `inputs` | any[] | Entradas passadas às ferramentas |
| `avisosEquipe` | string[] | Mensagens enviadas ao grupo da equipe |
| `memoria` | object | Memória longa depois do turno |
| `memoriaLida` | boolean | O fluxo leu a memória longa antes do agente |
| `visitasAtivas` | number | Visitas ativas do número depois do turno |
| `guarda` | string[] | Marcas da conferência da resposta (ex.: `vazamento_de_ferramenta`) |
| `transcricao` | string | Texto transcrito (turnos de áudio) |
| `pendente` | boolean | Turno de áudio sem gravação |
| `erro` | string | Erro de execução |

`custo(modelo)` devolve o custo do modelo em US$ (ou `null` se não souber). No replay o orquestrador usa a estimativa
pela tabela de exemplo como custo simulado; o gasto real é zero.
