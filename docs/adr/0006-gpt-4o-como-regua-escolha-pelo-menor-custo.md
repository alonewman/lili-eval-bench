# ADR 0006: gpt-4o como régua; escolha pelo menor custo entre os aprovados

**Contexto.** Comparar modelos só por "qual parece melhor" leva a escolher o mais caro ou a trocar por um barato que quebra coisas.

**Decisão.** O gpt-4o roda como régua (referência de comportamento) e nunca é escolhido. Um candidato reprova com qualquer roteiro crítico em falha, com mais de 3 avisos ou com pendência. Entre os aprovados, ganha o de menor custo. Sem custo conhecido, a bancada não escolhe.

**Consequência.** A decisão é explicável e repetível: "passou nos 38 críticos e custa menos". A decisão final continua sendo de uma pessoa, com os dados na mão.
