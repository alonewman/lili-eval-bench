import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { rodarBancada } from "../bench/executar.mjs";
import { criarReplay } from "../bench/adaptadores/replay.mjs";
import { roteirosDaEscola } from "../bench/avaliar.mjs";
import { gerar } from "../scripts/gerar-gravacoes.mjs";

const escola = JSON.parse(fs.readFileSync("fixtures/escola-ficticia.json", "utf8"));
const roteiros = roteirosDaEscola(JSON.parse(fs.readFileSync("bench/roteiros/roteiros.json", "utf8")), escola.nome);

test("50 roteiros, 38 críticos, ids únicos", () => {
  assert.equal(roteiros.length, 50);
  assert.equal(roteiros.filter((r) => r.critico).length, 38);
  assert.equal(new Set(roteiros.map((r) => r.id)).size, 50);
});

test("gravações no disco são as geradas (determinístico)", () => {
  for (const modelo of ["gpt-4o", "candidato-A", "candidato-B"]) {
    for (const g of gerar(roteiros, modelo)) {
      const disco = JSON.parse(fs.readFileSync(`fixtures/gravacoes/${modelo}/${String(g.id).padStart(2, "0")}.json`, "utf8"));
      assert.deepEqual(disco, g);
    }
  }
});

test("replay: candidato-B reprova por R13 e R33; candidato-A é escolhido", async () => {
  const r = await rodarBancada({ roteiros, modelos: ["gpt-4o", "candidato-A", "candidato-B"], rodadas: 2, adaptador: criarReplay() });
  const b = r.relatorios.find((x) => x.modelo === "candidato-B");
  assert.equal(b.passa, false);
  assert.deepEqual(r.detalhes["candidato-B"].filter((x) => x.julgamento === "falha").map((x) => x.id), [13, 33]);
  assert.equal(r.escolha.escolhido, "candidato-A");
});
