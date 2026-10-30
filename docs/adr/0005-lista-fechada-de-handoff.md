# ADR 0005: lista fechada de passagem para humano

**Contexto.** "Chame a equipe quando precisar" fazia o modelo prometer humano por educação, sem chamar, ou chamar sem motivo.

**Decisão.** Só gatilhos definidos chamam humano (pedido explícito de pessoa, reclamação, bolsa/desconto, dado sensível, responsável de aluno atual, duas tentativas sem resposta). Um pedido claro de pessoa é reconhecido também no código (`atendente/pedidoHumano.mjs`). O aviso à equipe é reivindicado antes de enviar, para sair uma vez só, e precisa trazer o resumo com os dados que a família deu.

**Consequência.** Menos falsos avisos e nenhuma promessa vazia. A bancada cobra que o aviso exista (`avisaEquipe`) e tenha os dados (`avisoContem`).
