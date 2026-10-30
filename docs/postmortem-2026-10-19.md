# Post-mortem: 19/10/2026, atendente de uma escola de demonstração

> Reescrito do zero. Diálogos sintéticos; nenhum dado de família, escola ou execução real.

## Resumo
Num teste com uma escola de demonstração (modelo gpt-4o), o atendente:
1. pediu de novo dados que a família já tinha dado (o nome do estudante, por exemplo);
2. confirmou uma visita sem chamar a ferramenta de agendamento;
3. prometeu "chamar a equipe" sem acionar ninguém.

O prompt já proibia as três coisas. O problema era confiar no modelo para cumprir regras que o fluxo podia garantir.

## Como pareceu (sintético)
```
Família: Sou o Bruno, quero matricular o Tiago no 2º ano.
Lili:    Que bom, Bruno! Qual é o nome do estudante?          ← repetiu a pergunta
Família: Quero visitar na quinta às 9h.
Lili:    A visita foi marcada com sucesso!                     ← nenhuma ferramenta chamada
Família: Tem natação?
Lili:    Vou chamar a equipe para te ajudar com isso.          ← ninguém foi avisado
```

## Causa raiz
- A memória longa só era gravada se o modelo chamasse a ferramenta de memória. Às vezes não chamava.
- Não havia nada entre o agente e a família conferindo se o que o texto afirma aconteceu de fato.
- "Quando chamar humano" era uma regra aberta no prompt; o modelo prometia por educação.

## Correções (no mesmo dia)
- **Memória gravada pelo fluxo** (ADR 0003): lida antes do agente, gravada depois do turno.
- **Conferência da resposta** (ADR 0004): humano prometido sem ferramenta → o fluxo chama de verdade; visita afirmada sem ferramenta → o fluxo busca a visita real antes de responder.
- **Lista fechada de passagem para humano** (ADR 0005), com aviso que precisa existir de fato.
- **Checador** que garante que toda ferramenta citada no prompt está ligada ao agente.
- **Roteiros novos na bancada** para cada defeito (marcados "incidente 19/10" em `bench/roteiros/roteiros.json`).

## O que a bancada passou a pegar
Os critérios `memoriaLida`, `memoria`, `avisaEquipe`, `avisoContem`, `visitasNoMaximo` e o de vazamento de ferramenta
nasceram daqui ou de casos parecidos. Foi assim que, mais tarde, a bancada achou o vazamento de chamada de ferramenta
de um modelo candidato no roteiro R13 (ver README, "Resultados").

## Lições
- Regra que importa sai do prompt e vai para o fluxo.
- Conferir depois do agente é barato e determinístico.
- Todo incidente vira roteiro.
