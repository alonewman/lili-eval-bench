import { test } from "node:test";
import assert from "node:assert/strict";
import { avaliarTurno, julgarRoteiro, juntarRodadas, avaliarModelo, escolherModelo, contemItem, roteirosDaEscola } from "../bench/avaliar.mjs";

test("contemItem aceita lista de sinônimos", () => {
  assert.ok(contemItem("Como você se chama?", ["nome", "como você se chama"]));
  assert.ok(!contemItem("Olá", ["nome"]));
});

test("vazamento de chamada de ferramenta reprova o turno (caso R13)", () => {
  const r = avaliarTurno({ ferramentas: [] }, { output: 'Marcado! to=functions.marcar_visita {"p_data":"x"}' });
  assert.ok(r.falhas.some((f) => f.includes("vazamento")));
});

test("guarda que limpou vazamento também reprova", () => {
  const r = avaliarTurno({}, { output: "ok", guarda: ["vazamento_de_ferramenta"] });
  assert.equal(r.falhas.length, 1);
});

test("pedido de humano exige aviso real com resumo", () => {
  const turno = { avisaEquipe: true, ferramentas: ["Precisa de humano"] };
  assert.ok(avaliarTurno(turno, { output: "Vou chamar a equipe.", tools: [] }).falhas.length >= 2);
  const ok = avaliarTurno(turno, {
    output: "Já avisei a equipe.",
    tools: ["Precisa_de_humano"],
    avisosEquipe: ["Precisa de atendimento humano: +00\nResumo da conversa: quer bolsa"],
  });
  assert.deepEqual(ok.falhas, []);
});

test("memória longa e visitas duplicadas", () => {
  const t = { memoria: { aluno: "Tiago" }, visitasNoMaximo: 1, memoriaLida: true };
  const r = avaliarTurno(t, { output: "", memoria: { aluno: "tiago moraes" }, visitasAtivas: 2, memoriaLida: true });
  assert.deepEqual(r.falhas, ["2 visitas ativas (máximo 1)"]);
});

test("ferramentas na ordem e proibidas", () => {
  const r = avaliarTurno({ ferramentas: ["Horários livres", "Marcar visita"], proibidas: ["Cancelar visita"] }, { output: "", tools: ["Marcar_visita", "Horários_livres", "Cancelar_visita"] });
  assert.ok(r.falhas.includes("não chamou Marcar visita (na ordem)"));
  assert.ok(r.falhas.includes("chamou Cancelar visita"));
});

test("blocos: mínimo e marcador P&", () => {
  const r = avaliarTurno({ blocosMinimo: 2 }, { output: "a", envios: ["a P& b"] });
  assert.ok(r.falhas.some((f) => f.includes("P&")));
  assert.ok(r.falhas.some((f) => f.includes("mínimo 2")));
});

test("julgamento por roteiro, pior rodada e escolha pelo menor custo", () => {
  assert.equal(julgarRoteiro({ critico: true }, [{ falhas: ["x"] }]), "falha");
  assert.equal(julgarRoteiro({ critico: false }, [{ falhas: ["x"] }]), "aviso");
  assert.equal(julgarRoteiro({}, [{ falhas: [], pendente: true }]), "pendente");
  const j = juntarRodadas([{ roteiros: [{ id: 1, julgamento: "ok" }] }, { roteiros: [{ id: 1, julgamento: "aviso" }] }]);
  assert.equal(j[0].julgamento, "aviso");
  const quatroAvisos = Array.from({ length: 4 }, (_, i) => ({ id: i, julgamento: "aviso" }));
  assert.equal(avaliarModelo({ modelo: "m", roteiros: quatroAvisos }).passa, false);
  assert.equal(avaliarModelo({ modelo: "gpt-4o", roteiros: [] }).passa, false);
  const e = escolherModelo([
    { modelo: "gpt-4o", passa: false, custoReal: 1 },
    { modelo: "a", passa: true, custoReal: 3 },
    { modelo: "b", passa: true, custoReal: 2 },
    { modelo: "c", passa: false, custoReal: 0.1 },
  ]);
  assert.equal(e.escolhido, "b");
  assert.equal(escolherModelo([{ modelo: "a", passa: true, custoReal: null }]).escolhido, null);
});

test("{escola} é trocado pelo nome da escola fictícia", () => {
  const r = roteirosDaEscola([{ turnos: [{ contem: ["{escola}"] }] }], "Escola X");
  assert.deepEqual(r[0].turnos[0].contem, ["Escola X"]);
});
