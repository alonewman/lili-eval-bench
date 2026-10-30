import { test } from "node:test";
import assert from "node:assert/strict";
import { estimarCusto, recusarSeAcimaDoTeto, TETO_USD } from "../bench/custo.mjs";

test("estimativa: turnos x rodadas x modelos", () => {
  const e = estimarCusto({ roteiros: [{ turnos: [{}, {}] }], modelos: ["candidato-A"], rodadas: 2 });
  assert.equal(e.turnos, 2);
  assert.ok(Math.abs(e.total - 4 * ((16400 * 0.4 + 150 * 1.6) / 1e6)) < 1e-12);
});

test("teto: recusa acima de US$ 20 sem confirmação", () => {
  assert.equal(TETO_USD, 20);
  assert.throws(() => recusarSeAcimaDoTeto(20.01), /confirmar-gasto/);
  assert.equal(recusarSeAcimaDoTeto(20.01, { confirmar: true }), 20.01);
  assert.equal(recusarSeAcimaDoTeto(5), 5);
});

test("preço ausente falha alto", () => {
  assert.throws(() => estimarCusto({ roteiros: [], modelos: ["desconhecido"] }), /preço ausente/);
});
