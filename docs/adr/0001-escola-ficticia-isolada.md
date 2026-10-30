# ADR 0001: escola fictícia isolada para a bancada

**Contexto.** A bancada roda o fluxo de verdade, com banco e ferramentas. Rodar numa escola real arriscaria mandar mensagem a famílias, marcar visitas e sujar relatórios.

**Decisão.** A bancada só roda numa escola fictícia marcada como "em simulação", sem número de WhatsApp ligado, com números de teste fictícios (no máximo 10). O banco recusa (trava) gravar envio real para uma escola em simulação; a limpeza dos dados da rodada fica em `try/finally`.

**Consequência.** Dá para rodar a bancada a qualquer hora sem risco a famílias. Custo: manter a escola fictícia parecida com as reais (séries, valores, horários). Neste repositório, a escola fictícia é `fixtures/escola-ficticia.json`.

Trecho genérico da ideia:
```sql
-- recusa envio real quando a escola está em simulação
create or replace function trava_envio() returns trigger language plpgsql as $$
begin
  if (select modo_simulacao from escolas where id = new.escola_id) then
    raise exception 'escola em simulação: envio real bloqueado';
  end if;
  return new;
end $$;
```
