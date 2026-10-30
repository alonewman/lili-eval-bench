-- Exemplo escrito do zero, com tabelas sintéticas. Não é o esquema de nenhum sistema em produção.
-- Roda em qualquer Postgres 14+: psql -f exemplos/sql/01-tabelas.sql
create table if not exists escolas (
  id            bigint generated always as identity primary key,
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nome          text not null,
  modo_simulacao boolean not null default true
);

create table if not exists visitas (
  id         bigint generated always as identity primary key,
  escola_id  bigint not null references escolas(id),
  telefone   text not null,                -- na bancada, sempre número fictício
  inicio     timestamptz not null,
  situacao   text not null default 'agendada' check (situacao in ('agendada', 'reagendada', 'cancelada'))
);
-- Trava: no máximo uma visita ativa por escola e telefone (pedido repetido não duplica).
create unique index if not exists visitas_uma_ativa
  on visitas (escola_id, telefone) where situacao in ('agendada', 'reagendada');

create table if not exists memoria_familia (
  escola_id  bigint not null references escolas(id),
  telefone   text not null,
  resumo     text not null default '' check (length(resumo) <= 2000),
  dados      jsonb not null default '{}'::jsonb,
  atualizado timestamptz not null default now(),
  primary key (escola_id, telefone)
);

insert into escolas (slug, nome) values ('escola-ficticia', 'Escola Vale do Sol') on conflict do nothing;
