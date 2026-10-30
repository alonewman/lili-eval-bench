#!/usr/bin/env node
// Orquestrador: estimar → (recusar acima do teto) → rodar cada modelo x rodadas → julgar → relatório.
//   npm run bench                         # replay (padrão): gravações sintéticas, sem chave, US$ 0
//   npm run bench -- --so 13,33           # só alguns roteiros
//   npm run bench -- --real --modelos gpt-4.1-mini [--confirmar-gasto]   # opcional, usa OPENAI_API_KEY
import fs from "node:fs";
import path from "node:path";
import { roteirosDaEscola, avaliarTurno, julgarRoteiro, juntarRodadas, avaliarModelo, escolherModelo } from "./avaliar.mjs";
import { estimarCusto, recusarSeAcimaDoTeto, RODADAS, PRECOS_EXEMPLO } from "./custo.mjs";
import { criarReplay } from "./adaptadores/replay.mjs";

export const MODELOS_REPLAY = ["gpt-4o", "candidato-A", "candidato-B"];

export function lerArgs(argv) {
  const v = (f) => {
    const j = argv.find((a) => a.startsWith(`${f}=`));
    if (j) return j.slice(f.length + 1);
    return argv.includes(f) ? argv[argv.indexOf(f) + 1] : undefined;
  };
  const so = v("--so");
  return {
    real: argv.includes("--real"),
    confirmarGasto: argv.includes("--confirmar-gasto"),
    modelos: v("--modelos")?.split(",").map((m) => m.trim()).filter(Boolean),
    rodadas: v("--rodadas") ? Number(v("--rodadas")) : RODADAS,
    so: so ? so.split(",").map(Number).filter(Number.isInteger) : null,
    out: v("--out") ?? "relatorios/ultimo",
  };
}

export async function rodarBancada({ roteiros, modelos, rodadas, adaptador, precos = PRECOS_EXEMPLO, confirmarGasto = false }) {
  const estimativa = estimarCusto({ roteiros, precos, modelos, rodadas });
  if (adaptador.nome !== "replay") recusarSeAcimaDoTeto(estimativa.total, { confirmar: confirmarGasto });
  const relatorios = [];
  const detalhes = {};
  for (const modelo of modelos) {
    const porRodada = [];
    for (let r = 0; r < rodadas; r += 1) {
      const julgados = [];
      for (const roteiro of roteiros) {
        const observados = await adaptador.rodarRoteiro(modelo, roteiro);
        const turnos = roteiro.turnos.map((t, i) => avaliarTurno(t, observados[i] ?? { erro: "turno sem observado" }));
        const julgamento = julgarRoteiro(roteiro, turnos);
        julgados.push({ id: roteiro.id, nome: roteiro.nome, critico: roteiro.critico, julgamento, falhas: turnos.flatMap((t) => t.falhas) });
      }
      porRodada.push({ roteiros: julgados });
    }
    const juntos = juntarRodadas(porRodada);
    // Replay: o "custo" usado na escolha é a estimativa por tabela de exemplo (simulado); o gasto real é US$ 0.
    const custo = adaptador.nome === "replay" ? estimativa.modelos.find((m) => m.modelo === modelo).total : adaptador.custo(modelo);
    relatorios.push(avaliarModelo({ modelo, roteiros: juntos, custoReal: custo }));
    detalhes[modelo] = porRodada[porRodada.length - 1].roteiros.filter((x) => x.julgamento !== "ok");
  }
  return { estimativa, relatorios, escolha: escolherModelo(relatorios), detalhes };
}

const usd = (n) => (n == null ? "—" : `US$ ${Number(n).toFixed(2)}`);

export function relatorioMarkdown({ estimativa, relatorios, escolha, detalhes }, { modo }) {
  const l = [
    `# Relatório da bancada (${modo})`,
    "",
    modo === "replay" ? "> Ilustrativo: gravações sintéticas, gasto real US$ 0. O custo abaixo é simulado pela tabela de exemplo." : "> Modo real.",
    "",
    `Estimativa de teto: ${usd(estimativa.total)} (teto ${usd(estimativa.teto)}), ${estimativa.turnos} turnos x ${estimativa.rodadas} rodadas.`,
    "",
    "| Modelo | Críticos em falha | Avisos | Pendentes | Custo | Resultado |",
    "|---|---|---|---|---|---|",
  ];
  for (const r of relatorios) {
    const falhas = (detalhes[r.modelo] ?? []).filter((x) => x.julgamento === "falha").map((x) => `R${x.id}`);
    const avisos = (detalhes[r.modelo] ?? []).filter((x) => x.julgamento === "aviso").length;
    const res = r.modelo === "gpt-4o" ? "régua" : r.passa ? "passa" : `reprova: ${r.motivo}`;
    l.push(`| ${r.modelo} | ${falhas.length}${falhas.length ? ` (${falhas.join(", ")})` : ""} | ${avisos} | ${r.pendentes ?? 0} | ${usd(r.custoReal)} | ${res} |`);
  }
  l.push("", `**Escolhido:** ${escolha.escolhido ?? "nenhum"} (${escolha.motivo})`, "", "## Roteiros que não passaram", "");
  for (const [modelo, lista] of Object.entries(detalhes)) {
    for (const x of lista) l.push(`- ${modelo} · R${x.id} ${x.nome} → ${x.julgamento}: ${x.falhas.slice(0, 3).join("; ")}`);
  }
  return l.join("\n") + "\n";
}

export async function main(argv = process.argv.slice(2)) {
  const a = lerArgs(argv);
  let roteiros = JSON.parse(fs.readFileSync("bench/roteiros/roteiros.json", "utf8"));
  const escola = JSON.parse(fs.readFileSync("fixtures/escola-ficticia.json", "utf8"));
  roteiros = roteirosDaEscola(roteiros, escola.nome);
  if (a.so) roteiros = roteiros.filter((r) => a.so.includes(r.id));
  let adaptador;
  let modelos = a.modelos ?? MODELOS_REPLAY;
  if (a.real) {
    const { criarOpenAI } = await import("./adaptadores/openai.mjs");
    adaptador = criarOpenAI({ chave: process.env.OPENAI_API_KEY });
    if (!a.modelos) throw new Error("no modo real, passe --modelos");
  } else adaptador = criarReplay();
  const resultado = await rodarBancada({ roteiros, modelos, rodadas: a.rodadas, adaptador, confirmarGasto: a.confirmarGasto });
  const md = relatorioMarkdown(resultado, { modo: adaptador.nome });
  fs.mkdirSync(path.dirname(a.out), { recursive: true });
  fs.writeFileSync(`${a.out}.md`, md);
  fs.writeFileSync(`${a.out}.json`, JSON.stringify(resultado, null, 2) + "\n");
  console.log(md);
  console.log(`relatório gravado em ${a.out}.md e ${a.out}.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exitCode = 1; });
