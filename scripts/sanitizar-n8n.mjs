#!/usr/bin/env node
// Sanitiza workflows exportados do n8n para publicação e confere o resultado.
//
//   node scripts/sanitizar-n8n.mjs --entrada <pasta-com-os-json> [--saida n8n] [--nomes <arquivo>]
//   node scripts/sanitizar-n8n.mjs --verificar [--saida n8n] [--entrada <pasta>] [--nomes <arquivo>]
//
// --nomes: arquivo "termo real => substituto", uma troca por linha, mantido FORA do repositório.
// Padrão: ~/.sanitizar/nomes.txt (se existir). Determinístico: mesma entrada, mesma saída. Não usa rede.
// --verificar falha (código 1) se sobrar qualquer padrão sensível, se a estrutura for inválida ou, com
// --entrada, se a estrutura (nós, tipos, versões, conexões) divergir do original.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export const ARQUIVOS = ["lili-escolas.json", "enviar-whatsapp.json", "regua-visita.json", "coletor-custo.json"];

export function lerNomes(arquivo) {
  if (!arquivo || !fs.existsSync(arquivo)) return [];
  return fs
    .readFileSync(arquivo, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("=>"))
    .map((l) => l.split("=>").map((p) => p.trim()))
    .sort((a, b) => b[0].length - a[0].length);
}

export function uuidFalso(n) {
  return `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}

const RE_UUID = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g;
const RE_URL = /https?:\/\/[^\s"'`)<>\\]+/g;

function semComentarios(codigo) {
  return String(codigo)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !/^\s*\/\//.test(l))
    .join("\n");
}

export function trocarNomes(texto, nomes) {
  let s = String(texto);
  for (const [real, novo] of nomes) s = s.split(real).join(novo);
  return s;
}

// Limpa um texto livre (código, nota, parâmetro). `ctx.uuids` mantém a numeração estável.
export function limparTexto(texto, { nomes = [], ctx = { uuids: new Map() }, codigo = false } = {}) {
  let s = codigo ? semComentarios(texto) : String(texto);
  s = trocarNomes(s, nomes);
  s = s.replace(RE_URL, (url) => {
    try {
      const u = new URL(url);
      return `https://example.invalid${u.hostname.startsWith("api.openai") ? u.pathname : ""}`;
    } catch {
      return "https://example.invalid";
    }
  });
  s = s.replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "IP_EXEMPLO");
  s = s.replace(RE_UUID, (u) => {
    if (/^0{8}-0{4}-0{4}-0{4}-\d{12}$/.test(u)) return u;
    if (!ctx.uuids.has(u.toLowerCase())) ctx.uuids.set(u.toLowerCase(), uuidFalso(ctx.uuids.size + 1000));
    return ctx.uuids.get(u.toLowerCase());
  });
  s = s.replace(/\d{10,}(?:-\d+)?@g\.us/g, "GRUPO_EXEMPLO@g.us");
  s = s.replace(/120363\d{6,}/g, "GRUPO_EXEMPLO");
  s = s.replace(/\+?55\s?\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/g, "+00 00 00000-0000");
  s = s.replace(/\b55\d{10,11}\b/g, "+00 00 00000-0000");
  s = s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, (m) => (m.endsWith("@g.us") ? m : "email@example.invalid"));
  s = s.replace(/\beyJ[\w-]{10,}(?:\.[\w-]+){0,2}/g, "TOKEN_REMOVIDO");
  s = s.replace(/\b(?:sk-|ghp_|AKIA)[\w-]{8,}/g, "TOKEN_REMOVIDO");
  s = s.replace(/\b[A-Za-z0-9+/]{40,}={0,2}/g, "TOKEN_REMOVIDO");
  return s;
}

function limparValor(valor, chave, opts) {
  if (typeof valor === "string") return limparTexto(valor, { ...opts, codigo: chave === "jsCode" || chave === "code" });
  if (Array.isArray(valor)) return valor.map((v) => limparValor(v, chave, opts));
  if (valor && typeof valor === "object") {
    const novo = {};
    for (const [k, v] of Object.entries(valor)) novo[k] = limparValor(v, k, opts);
    return novo;
  }
  return valor;
}

export function sanitizarWorkflow(wf, { nomes = [] } = {}) {
  const ctx = { uuids: new Map() };
  const opts = { nomes, ctx };
  const mapaNomes = {};
  const nodes = (wf.nodes ?? []).map((n, i) => {
    const nome = limparTexto(n.name, opts);
    mapaNomes[n.name] = nome;
    const novo = { ...n, name: nome, id: uuidFalso(i + 1) };
    if (n.webhookId) novo.webhookId = uuidFalso(500 + i);
    if (n.credentials) {
      novo.credentials = Object.fromEntries(
        Object.keys(n.credentials).map((tipo) => [tipo, { id: `CREDENCIAL_${tipo.toUpperCase()}`, name: `${tipo} (configure)` }]),
      );
    }
    let p = limparValor(n.parameters ?? {}, "parameters", opts);
    if (n.type === "n8n-nodes-base.webhook" && typeof p.path === "string") p = { ...p, path: `exemplo-${i + 1}` };
    if (p.workflowId && typeof p.workflowId === "object") p = { ...p, workflowId: { ...p.workflowId, value: "__WF_ENVIAR_WHATSAPP__" } };
    novo.parameters = p;
    return novo;
  });
  const connections = {};
  for (const [origem, saidas] of Object.entries(wf.connections ?? {})) {
    connections[mapaNomes[origem] ?? limparTexto(origem, opts)] = limparValor(
      JSON.parse(JSON.stringify(saidas, (k, v) => (k === "node" ? mapaNomes[v] ?? v : v))),
      "connections",
      { ...opts, nomes: [] },
    );
  }
  return {
    name: limparTexto(wf.name, opts),
    active: false,
    settings: { executionOrder: wf.settings?.executionOrder ?? "v1", timezone: "America/Sao_Paulo" },
    nodes,
    connections,
  };
}

// Padrões genéricos que não podem sobrar. Termos reais (cliente, domínios, provedores, nomes) ficam só na lista
// externa (--nomes), para não aparecerem no repositório. Cada um devolve achados {padrao, trecho curto mascarado}.
export const PADROES = [
  ["colégio + nome próprio", /[Cc]ol[eé]gio\s+[A-ZÁÉÍÓÚ][a-zà-ú]/g],
  ["URL fora de example.invalid", /https?:\/\/(?!example\.invalid)[^\s"'`)]+/gi],
  ["IP", /\b\d{1,3}(?:\.\d{1,3}){3}\b/g],
  ["id de grupo WhatsApp", /\d{6,}(?:-\d+)?@g\.us|120363\d+/g],
  ["telefone", /\+55\s?\d|\b55\d{10,11}\b/g],
  ["e-mail", /[\w.+-]+@(?!example\.invalid|g\.us|users\.noreply\.github\.com)[\w-]+\.[a-z]{2,}/gi],
  ["UUID real", /\b(?!0{8}-0{4}-0{4}-0{4})[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi],
  ["string partida (id escondido)", /["'][a-z0-9]{5,}["']\s*\+\s*["'][a-z0-9]{8,}["']/g],
  ["chave", /\bsk-[\w-]{8,}|\beyJ[\w-]{10,}|\bAKIA[0-9A-Z]{12,}|\bghp_\w{20,}/g],
];

export function varrer(texto, nomes = []) {
  const achados = [];
  for (const [padrao, re] of PADROES) {
    for (const m of String(texto).matchAll(re)) achados.push({ padrao, trecho: m[0].slice(0, 4) + "…" });
  }
  for (const [real] of nomes) {
    if (real.length >= 4 && String(texto).includes(real)) achados.push({ padrao: "nome real da lista", trecho: real.slice(0, 2) + "…" });
  }
  return achados;
}

export function validarEstrutura(wf) {
  const erros = [];
  if (typeof wf?.name !== "string" || !wf.name) erros.push("sem name");
  if (!Array.isArray(wf?.nodes) || !wf.nodes.length) erros.push("sem nodes");
  const nomes = new Set();
  for (const n of wf?.nodes ?? []) {
    for (const campo of ["id", "name", "type", "typeVersion", "position", "parameters"]) {
      if (n[campo] === undefined) erros.push(`nó ${n.name ?? "?"} sem ${campo}`);
    }
    if (nomes.has(n.name)) erros.push(`nome de nó repetido: ${n.name}`);
    nomes.add(n.name);
    for (const campo of ["jsCode", "code"]) {
      const codigo = n.parameters?.[campo];
      if (typeof codigo !== "string") continue;
      try {
        new AsyncFunction(codigo);
      } catch (e) {
        erros.push(`código inválido em ${n.name}: ${e.message}`);
      }
    }
    for (const c of Object.values(n.credentials ?? {})) {
      if (!/^CREDENCIAL_[A-Z0-9_]+$/.test(String(c.id))) erros.push(`credencial com id real em ${n.name}`);
    }
  }
  for (const [origem, saidas] of Object.entries(wf?.connections ?? {})) {
    if (!nomes.has(origem)) erros.push(`conexão de nó inexistente: ${origem}`);
    JSON.stringify(saidas, (k, v) => {
      if (k === "node" && !nomes.has(v)) erros.push(`conexão para nó inexistente: ${v}`);
      return v;
    });
  }
  return erros;
}

// Assinatura estrutural: tipos/versões por posição e arestas por índice de nó.
export function assinatura(wf) {
  const idx = new Map((wf.nodes ?? []).map((n, i) => [n.name, i]));
  const arestas = [];
  for (const [origem, saidas] of Object.entries(wf.connections ?? {})) {
    for (const [tipo, listas] of Object.entries(saidas)) {
      (listas ?? []).forEach((lista, saida) =>
        (lista ?? []).forEach((c) => arestas.push(`${idx.get(origem)}:${tipo}:${saida}->${idx.get(c.node)}:${c.type}:${c.index}`)),
      );
    }
  }
  return {
    nos: (wf.nodes ?? []).map((n) => `${n.type}@${n.typeVersion}`),
    arestas: arestas.sort(),
  };
}

export function compararEstrutura(original, sanitizado) {
  const a = assinatura(original);
  const b = assinatura(sanitizado);
  const dif = [];
  if (a.nos.length !== b.nos.length) dif.push(`nós: ${a.nos.length} → ${b.nos.length}`);
  a.nos.forEach((t, i) => t !== b.nos[i] && dif.push(`nó ${i}: tipo/versão mudou`));
  if (JSON.stringify(a.arestas) !== JSON.stringify(b.arestas)) dif.push("conexões mudaram");
  return dif;
}

export function camposMudados(original, sanitizado) {
  const mudou = new Set();
  const andar = (x, y, caminho) => {
    if (typeof x !== "object" || x === null) {
      if (x !== y) mudou.add(caminho.replace(/\.\d+/g, "[]"));
      return;
    }
    for (const k of new Set([...Object.keys(x), ...Object.keys(y ?? {})])) andar(x[k], y?.[k], `${caminho}.${k}`);
  };
  (original.nodes ?? []).forEach((n, i) => andar(n, sanitizado.nodes?.[i], "node"));
  return [...mudou].sort();
}

function args(argv) {
  const v = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : undefined);
  const padraoNomes = path.join(os.homedir(), ".sanitizar", "nomes.txt");
  return { verificar: argv.includes("--verificar"), entrada: v("--entrada"), saida: v("--saida") ?? "n8n", nomes: v("--nomes") ?? padraoNomes };
}

export function main(argv = process.argv.slice(2)) {
  const a = args(argv);
  const nomes = lerNomes(a.nomes);
  let problemas = 0;
  const linhas = ["# Relatório de sanitização (gerado)", "", `Lista de nomes: ${nomes.length} termos (arquivo fora do repo).`, ""];
  if (!a.verificar) {
    if (!a.entrada) throw new Error("--entrada é obrigatório (ou use --verificar)");
    fs.mkdirSync(a.saida, { recursive: true });
    for (const f of ARQUIVOS) {
      const orig = JSON.parse(fs.readFileSync(path.join(a.entrada, f), "utf8"));
      const san = sanitizarWorkflow(orig, { nomes });
      fs.writeFileSync(path.join(a.saida, f), JSON.stringify(san, null, 2) + "\n");
      linhas.push(`## ${f}`, `- nós: ${san.nodes.length}`, `- campos alterados: ${camposMudados(orig, san).join(", ") || "nenhum"}`, "");
    }
    fs.writeFileSync(path.join(a.saida, "relatorio-sanitizacao.md"), linhas.join("\n") + "\n");
    console.log(`sanitizados ${ARQUIVOS.length} workflows em ${a.saida}`);
  }
  for (const f of ARQUIVOS) {
    const arq = path.join(a.saida, f);
    const texto = fs.readFileSync(arq, "utf8");
    const san = JSON.parse(texto);
    const achados = varrer(texto, nomes);
    const erros = validarEstrutura(san);
    let dif = [];
    if (a.entrada) dif = compararEstrutura(JSON.parse(fs.readFileSync(path.join(a.entrada, f), "utf8")), san);
    const total = achados.length + erros.length + dif.length;
    problemas += total;
    console.log(`${f}: ${san.nodes.length} nós, achados ${achados.length}, erros de estrutura ${erros.length}, diferenças ${a.entrada ? dif.length : "(sem original)"}`);
    for (const x of [...achados.map((y) => `${y.padrao} ${y.trecho}`), ...erros, ...dif].slice(0, 20)) console.log(`  - ${x}`);
  }
  if (problemas) {
    console.error(`FALHOU: ${problemas} problema(s)`);
    return 1;
  }
  console.log("ok: nada sensível encontrado e estrutura válida");
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
