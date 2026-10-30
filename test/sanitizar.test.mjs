import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { sanitizarWorkflow, varrer, validarEstrutura, compararEstrutura, ARQUIVOS, limparTexto } from "../scripts/sanitizar-n8n.mjs";

const UUID = ["1b4e28ba", "2d1b", "4c3f", "9a7e", "8b2c3d4e5f60"].join("-");
const original = {
  name: "Fluxo da Escola Real",
  nodes: [
    { id: UUID, name: "Entrada Escola Real", type: "n8n-nodes-base.webhook", typeVersion: 2, position: [0, 0], webhookId: UUID, parameters: { path: "caminho-real" } },
    {
      id: "x2", name: "Chamar API", type: "n8n-nodes-base.httpRequest", typeVersion: 4, position: [200, 0],
      credentials: { redis: { id: "abc123", name: "Redis da Escola Real" } },
      parameters: { url: "https://projeto.exemplo-real.com/rest/v1/rpc", jsCode: "// Escola Real, tel 5511987654321\nconst g = '120363012345678901@g.us';" },
    },
  ],
  connections: { "Entrada Escola Real": { main: [[{ node: "Chamar API", type: "main", index: 0 }]] } },
  pinData: { x: 1 },
};
const nomes = [["Escola Real", "Escola Exemplo"]];

test("sanitiza ids, credenciais, URLs, telefones, grupos e nomes, sem mudar a estrutura", () => {
  const s = sanitizarWorkflow(original, { nomes });
  const texto = JSON.stringify(s);
  assert.deepEqual(varrer(texto, nomes), []);
  assert.deepEqual(validarEstrutura(s), []);
  assert.deepEqual(compararEstrutura(original, s), []);
  assert.equal(s.pinData, undefined);
  assert.equal(s.nodes[1].credentials.redis.id, "CREDENCIAL_REDIS");
  assert.equal(s.connections["Entrada Escola Exemplo"].main[0][0].node, "Chamar API");
});

test("varredura acha o que sobrou", () => {
  const achados = varrer(`https://x.com ${UUID} 5511987654321 sk-abcdefghijklmnop`, []);
  assert.ok(achados.length >= 4);
});

test("determinístico", () => {
  assert.equal(JSON.stringify(sanitizarWorkflow(original, { nomes })), JSON.stringify(sanitizarWorkflow(original, { nomes })));
  assert.equal(limparTexto(UUID), limparTexto(UUID).replace(/x/, "x"));
});

test("os 4 workflows publicados passam na varredura e na validação", () => {
  for (const f of ARQUIVOS) {
    const texto = fs.readFileSync(`n8n/${f}`, "utf8");
    const wf = JSON.parse(texto);
    assert.deepEqual(varrer(texto), [], f);
    assert.deepEqual(validarEstrutura(wf), [], f);
    for (const n of wf.nodes) for (const c of Object.values(n.credentials ?? {})) assert.match(c.id, /^CREDENCIAL_/);
    const usadas = new Set(texto.match(/\benv\.[A-Z_0-9]{3,}/g)?.map((x) => x.slice(4)) ?? []);
    const exemplo = fs.readFileSync("n8n/.env.exemplo", "utf8");
    for (const v of usadas) assert.ok(exemplo.includes(`${v}=`), `falta ${v} em .env.exemplo`);
  }
});
