// Adaptador OPCIONAL de modo real: um atendente local mínimo (prompt de exemplo + escola fictícia + ferramentas
// declaradas) chamando a API de chat da OpenAI com a chave do próprio usuário. Não reproduz o fluxo n8n:
// não grava memória, não manda aviso real e não tem buffer; serve para comparar texto e chamadas de ferramenta.
// O orquestrador estima e aplica o teto ANTES de chamar este adaptador.
import fs from "node:fs";

const FERRAMENTAS = ["Horários livres", "Marcar visita", "Remarcar visita", "Cancelar visita", "Buscar visita", "Precisa de humano", "Confirmar visita"];
const nomeFn = (n) => n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").toLowerCase();

export function criarOpenAI({ chave, base = "https://api.openai.com/v1", fetchFn = globalThis.fetch } = {}) {
  if (!chave) throw new Error("modo real precisa de OPENAI_API_KEY");
  const prompt = fs.readFileSync("atendente/prompt-base.exemplo.txt", "utf8");
  const escola = JSON.parse(fs.readFileSync("fixtures/escola-ficticia.json", "utf8"));
  const tools = FERRAMENTAS.map((n) => ({ type: "function", function: { name: nomeFn(n), description: n, parameters: { type: "object", properties: {}, additionalProperties: true } } }));
  const gasto = new Map();
  return {
    nome: "openai",
    async rodarRoteiro(modelo, roteiro) {
      const mensagens = [{ role: "system", content: `${prompt}\n\nDados da escola (fictícios): ${JSON.stringify(escola)}` }];
      const observados = [];
      for (const turno of roteiro.turnos) {
        mensagens.push({ role: "user", content: turno.audio ? "(áudio sem transcrição no modo real)" : turno.msg });
        const r = await fetchFn(`${base}/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${chave}` },
          body: JSON.stringify({ model: modelo, messages: mensagens, tools }),
        });
        if (!r.ok) { observados.push({ erro: `HTTP ${r.status}` }); continue; }
        const j = await r.json();
        const msg = j.choices?.[0]?.message ?? {};
        const chamadas = (msg.tool_calls ?? []).map((c) => FERRAMENTAS.find((n) => nomeFn(n) === c.function?.name) ?? c.function?.name);
        gasto.set(modelo, (gasto.get(modelo) ?? 0) + (j.usage?.total_tokens ?? 0));
        mensagens.push({ role: "assistant", content: msg.content ?? "" });
        observados.push({ output: msg.content ?? "", tools: chamadas, memoriaLida: true, avisosEquipe: [], pendente: Boolean(turno.audio) });
      }
      return observados;
    },
    // Sem tabela oficial aqui: devolve null e a escolha fica "falta o custo"; preencha com a sua tabela de preços.
    custo: () => null,
  };
}
