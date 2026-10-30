-- Funções de exemplo, escritas do zero. Ideia: a regra fica no banco, não no modelo.

-- Marca visita; se já existe uma ativa para o telefone, devolve a existente em vez de duplicar.
create or replace function marcar_visita(p_escola text, p_telefone text, p_inicio timestamptz)
returns table (visita_id bigint, ja_existia boolean)
language plpgsql as $$
declare v_escola bigint;
begin
  select id into v_escola from escolas where slug = p_escola;
  if v_escola is null then raise exception 'escola inexistente'; end if;
  if p_inicio < now() then raise exception 'data no passado'; end if;
  if extract(isodow from p_inicio) > 5 or p_inicio::time < '08:00' or p_inicio::time > '16:00' then
    raise exception 'fora do horário de visitas';
  end if;
  return query
    select v.id, true from visitas v
    where v.escola_id = v_escola and v.telefone = p_telefone and v.situacao in ('agendada', 'reagendada');
  if found then return; end if;
  return query
    insert into visitas (escola_id, telefone, inicio) values (v_escola, p_telefone, p_inicio)
    returning id, false;
end $$;

-- Lê a memória longa; o fluxo chama ANTES do agente, sem depender de o modelo pedir.
create or replace function ler_memoria(p_escola text, p_telefone text)
returns table (resumo text, dados jsonb)
language sql stable as $$
  select m.resumo, m.dados from memoria_familia m
  join escolas e on e.id = m.escola_id
  where e.slug = p_escola and m.telefone = p_telefone
$$;

-- Grava a memória longa; o fluxo chama DEPOIS do turno (mescla os dados novos).
create or replace function gravar_memoria(p_escola text, p_telefone text, p_resumo text, p_dados jsonb)
returns void language sql as $$
  insert into memoria_familia (escola_id, telefone, resumo, dados)
  select id, p_telefone, left(p_resumo, 2000), p_dados from escolas where slug = p_escola
  on conflict (escola_id, telefone) do update
    set resumo = excluded.resumo, dados = memoria_familia.dados || excluded.dados, atualizado = now()
$$;
