#!/usr/bin/env node
// Gera as gravações SINTÉTICAS do modo replay a partir dos roteiros: para cada turno, um "observado" que
// cumpre os critérios, e depois defeitos plantados de propósito por modelo (para o relatório ter reprovação).
// Nada aqui veio de conversa real. Uso: node scripts/gerar-gravacoes.mjs
import fs from "node:fs";
import path from "node:path";
import { roteirosDaEscola } from "../bench/avaliar.mjs";

const primeiro = (item) => (Array.isArray(item) ? item[0] : item);

export function observadoIdeal(turno) {
  const trechos = (turno.contem ?? []).map(primeiro).map(String);
  const ordem = (turno.ordem ?? []).map(primeiro).map(String);
  let envios;
  if (ordem.length || Number.isInteger(turno.blocosMinimo) || Number.isInteger(turno.blocosMaximo)) {
    const minimo = Math.max(turno.blocosMinimo ?? 1, ordem.length || 1);
    envios = ordem.length ? ordem.slice() : ["Certo."];
    while (envios.length < minimo) envios.push("Certo.");
    if (Number.isInteger(turno.blocosMaximo)) envios = envios.slice(0, Math.max(1, turno.blocosMaximo));
    envios[envios.length - 1] += ` ${trechos.join(" ")}`;
  }
  const output = envios ? envios.join("\n\n") : `${trechos.join(" ")}`.trim() || "Certo.";
  const obs = { output, tools: (turno.ferramentas ?? []).slice(), memoriaLida: true, avisosEquipe: [], guarda: [] };
  if (envios) obs.envios = envios;
  if (turno.audio) obs.transcricao = "transcrição sintética do áudio";
  if (turno.avisaEquipe || turno.avisoContem?.length) {
    const resumo = (turno.avisoContem ?? []).join(" / ") || "família pediu atendimento";
    obs.avisosEquipe.push(`Precisa de atendimento humano: +00 00 00000-0000\nResumo da conversa: ${resumo}`);
  }
  if (turno.memoria) obs.memoria = { ...turno.memoria };
  if (Number.isInteger(turno.visitasNoMaximo)) obs.visitasAtivas = Math.min(1, turno.visitasNoMaximo);
  return obs;
}

// Defeitos plantados. "ultimo" = último turno do roteiro.
export const DEFEITOS = {
  "gpt-4o": [{ id: 21, tipo: "faltaTexto" }],
  "candidato-A": [{ id: 21, tipo: "faltaTexto" }, { id: 1, tipo: "faltaTexto" }],
  "candidato-B": [
    { id: 13, tipo: "vazamento" },
    { id: 33, tipo: "humanoSemAviso" },
    { id: 1, tipo: "faltaTexto" },
    { id: 3, tipo: "faltaTexto" },
    { id: 21, tipo: "faltaTexto" },
  ],
};

export function aplicarDefeito(obs, tipo, turno) {
  const o = structuredClone(obs);
  if (tipo === "vazamento") o.output += ' to=functions.marcar_visita {"p_data":"2027-03-10"}';
  if (tipo === "humanoSemAviso") {
    o.output += " Vou chamar a equipe para você.";
    o.avisosEquipe = [];
    o.tools = o.tools.filter((t) => t !== "Precisa de humano");
  }
  if (tipo === "faltaTexto") o.output = "Certo.";
  if (o.envios) o.envios = [o.output];
  return o;
}

export function gerar(roteiros, modelo) {
  const defeitos = DEFEITOS[modelo] ?? [];
  return roteiros.map((r) => {
    const turnos = r.turnos.map((t) => observadoIdeal(t));
    for (const d of defeitos.filter((x) => x.id === r.id)) {
      const alvo = d.tipo === "humanoSemAviso" ? r.turnos.findIndex((t) => t.avisaEquipe) : r.turnos.length - 1;
      const i = alvo < 0 ? r.turnos.length - 1 : alvo;
      turnos[i] = aplicarDefeito(turnos[i], d.tipo, r.turnos[i]);
    }
    return { id: r.id, modelo, sintetico: true, turnos };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const escola = JSON.parse(fs.readFileSync("fixtures/escola-ficticia.json", "utf8"));
  const roteiros = roteirosDaEscola(JSON.parse(fs.readFileSync("bench/roteiros/roteiros.json", "utf8")), escola.nome);
  for (const modelo of Object.keys(DEFEITOS)) {
    const dir = path.join("fixtures/gravacoes", modelo);
    fs.mkdirSync(dir, { recursive: true });
    for (const g of gerar(roteiros, modelo)) fs.writeFileSync(path.join(dir, `${String(g.id).padStart(2, "0")}.json`), JSON.stringify(g, null, 2) + "\n");
  }
  console.log("gravações sintéticas geradas");
}
