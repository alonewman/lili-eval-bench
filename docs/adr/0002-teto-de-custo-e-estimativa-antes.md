# ADR 0002: estimar antes de gastar, com teto

**Contexto.** Uma rodada completa (50 roteiros x 2 rodadas x vários modelos) custa dinheiro de API. Um erro de parâmetro pode multiplicar o gasto.

**Decisão.** O orquestrador sempre calcula uma estimativa de teto (tokens fixos por turno, sem cache) antes de chamar qualquer modelo. Acima de US$ 20 recusa, a menos que se passe `--confirmar-gasto`.

**Consequência.** Nenhuma rodada surpreende no custo. A estimativa é pessimista de propósito, então às vezes recusa uma rodada que caberia. O modo replay não gasta nada.
