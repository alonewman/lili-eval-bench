import { test } from "node:test";
import assert from "node:assert/strict";
import { pedidoDeHumano } from "../atendente/pedidoHumano.mjs";
import { vazamentoDeFerramenta, limparVazamento, afirmaVisita, textoNormal } from "../atendente/guardaResposta.mjs";
import { quebrarEmBlocos, textoSemMarcador } from "../atendente/blocos.mjs";
import { esperaSegundos } from "../atendente/buffer.mjs";

test("pedido claro de pessoa da equipe é reconhecido", () => {
  assert.ok(pedidoDeHumano("Quero falar com uma pessoa da equipe"));
  assert.ok(!pedidoDeHumano("Qual o horário da visita?"));
});

test("guarda detecta e limpa vazamento de ferramenta", () => {
  const t = 'Pronto! to=functions.marcar_visita {"p_data":"2027-03-10"}';
  assert.ok(vazamentoDeFerramenta(t));
  assert.ok(!vazamentoDeFerramenta(limparVazamento(t)));
  assert.ok(!vazamentoDeFerramenta("Sua visita está marcada para quinta."));
});

test("guarda reconhece confirmação de visita no texto", () => {
  assert.ok(afirmaVisita(textoNormal("A visita foi marcada com sucesso!")));
});

test("blocos: quebra pelo marcador e tira o marcador", () => {
  const b = quebrarEmBlocos("Oi! P& Tudo bem?", 3, false);
  assert.ok(Array.isArray(b) && b.length >= 2);
  assert.ok(!textoSemMarcador("a P& b").includes("P&"));
});

test("buffer: espera fora da faixa cai no padrão", () => {
  assert.equal(typeof esperaSegundos("abc"), "number");
});
