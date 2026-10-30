# Arquitetura

## O atendente (como funciona no produto, simplificado)

```mermaid
flowchart LR
  WA[Mensagem WhatsApp] --> P[Portão: escola em simulação? pausa humana?]
  P --> B[Buffer de rajada]
  B --> D[Dados do turno + memória longa lida pelo fluxo]
  D --> M[Montar prompt da escola]
  M --> A[Agente LLM + ferramentas: agendar, cancelar, pedir humano]
  A --> G[Conferência da resposta: vazamento de ferramenta, falso humano]
  G --> H{Pedido de humano?}
  H -- sim, lista fechada --> E[Aviso à equipe com resumo]
  H -- não --> S[Saída em blocos]
  A -. erro/timeout .-> C[Contingência]
  S --> MEM[Fluxo grava memória longa]
```

Os módulos em `atendente/` são as funções puras desses blocos (portão, buffer, montagem do prompt, memória longa,
conferência da resposta, pedido de humano, aviso à equipe, blocos e contingência). No produto elas são coladas em nós
Code do n8n; aqui rodam direto no Node.

## A bancada

```mermaid
flowchart TD
  R[50 roteiros JSON] --> E[Estimar custo]
  E -->|acima do teto| X[Recusa sem --confirmar-gasto]
  E --> L[Para cada modelo x 2 rodadas]
  L --> AD{Adaptador}
  AD -- replay --> GR[Gravações sintéticas]
  AD -- real --> API[Modelo real, escola fictícia]
  GR & API --> O[Observado: texto, ferramentas, avisos, memória, guarda]
  O --> J[avaliarTurno → julgarRoteiro → juntarRodadas]
  J --> AM[avaliarModelo]
  AM --> EM[escolherModelo: menor custo entre os aprovados]
  EM --> REL[Relatório JSON + Markdown]
```

| Peça | Arquivo |
|---|---|
| Critérios | `bench/avaliar.mjs` |
| Custo e teto | `bench/custo.mjs` |
| Orquestrador | `bench/executar.mjs` |
| Adaptadores | `bench/adaptadores/` (contrato em `interface.md`) |
| Roteiros | `bench/roteiros/roteiros.json` |
| Escola fictícia | `fixtures/escola-ficticia.json` |
| Gravações (replay) | `fixtures/gravacoes/<modelo>/<id>.json`, geradas por `scripts/gerar-gravacoes.mjs` |

Decisões: `docs/adr/`.
