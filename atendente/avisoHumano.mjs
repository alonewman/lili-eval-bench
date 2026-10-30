
export function ehUuidHumano(valor) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(valor ?? ""));
}

export function objetosComOk(valor, achou) {
  const visto = new WeakSet();
  function visitar(no, profundidade) {
    if (profundidade > 12 || no == null) return;
    if (typeof no === "string") {
      const texto = no.trim();
      if (!texto.startsWith("{") && !texto.startsWith("[")) return;
      let lido;
      try { lido = JSON.parse(texto); } catch (e) { return; }
      visitar(lido, profundidade + 1);
      return;
    }
    if (typeof no !== "object" || visto.has(no)) return;
    visto.add(no);
    if (!Array.isArray(no) && Object.prototype.hasOwnProperty.call(no, "ok")) {
      achou(no);
      return;
    }
    const lista = Array.isArray(no) ? no : Object.values(no);
    for (const filho of lista) visitar(filho, profundidade + 1);
  }
  visitar(valor, 0);
}

export function humanosDaSaida(valor) {
  const achados = [];
  objetosComOk(valor, (no) => {
    const id = typeof no.humano_id === "string" ? no.humano_id.trim() : "";
    if (no.ok === true && no.precisa_avisar === true && ehUuidHumano(id)) achados.push({ ...no, humano_id: id.toLowerCase() });
  });
  return achados;
}

export function memoriaDaSaida(valor) {
  let memoria = null;
  objetosComOk(valor, (no) => {
    if (no.ok === true && (Object.prototype.hasOwnProperty.call(no, "resumo") || Object.prototype.hasOwnProperty.call(no, "dados"))) {
      memoria = { resumo: no.resumo ?? null, dados: no.dados && typeof no.dados === "object" ? no.dados : {} };
    }
  });
  return memoria;
}

export function saidasDaFerramenta(passos, nome) {
  if (!Array.isArray(passos)) return [];
  const alvo = String(nome ?? "").trim().toLowerCase();
  const nomes = [alvo, alvo.replace(/ /g, "_")];
  return passos
    .filter((p) => nomes.includes(String(p?.action?.tool ?? "").trim().toLowerCase()))
    .map((p) => p.observation);
}

export function linhaLimpa(texto, limite) {
  const limpo = String(texto ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  if (limpo.length <= limite) return limpo;
  return `${limpo.slice(0, Math.max(0, limite - 1)).trimEnd()}…`;
}

export function dadosEmTexto(dados) {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) return "";
  const partes = [];
  for (const [chave, valor] of Object.entries(dados)) {
    if (valor == null || valor === "" || typeof valor === "object") continue;
    partes.push(`${linhaLimpa(chave.replace(/_/g, " "), 40)}: ${linhaLimpa(valor, 80)}`);
    if (partes.length >= 8) break;
  }
  return partes.join("; ");
}

export function falasDaFamilia(memoriaCurta, quantas) {
  const falas = [];
  for (const parte of String(memoriaCurta ?? "").split(/\n(?=(?:Família|Lili): )/)) {
    const m = /^Família: ([\s\S]*)$/.exec(parte.trim());
    if (m && m[1].trim()) falas.push(linhaLimpa(m[1], 80));
  }
  return falas.slice(-(quantas || 4));
}

export function valorDoAviso(texto, limite) {
  return linhaLimpa(texto, limite)
    .replace(/([.,;:!?])\1+/g, "$1")
    .replace(/[\s.,;:]+$/u, "")
    .trim();
}

export function partesDoAvisoBanco(avisoTexto) {
  const texto = linhaLimpa(avisoTexto, 600);
  const m = /^Precisa de atendimento humano:?\s*([^\s.]*)\.?\s*(?:Motivo:\s*([\s\S]*))?$/i.exec(texto);
  if (!m) return { telefone: "", motivo: valorDoAviso(texto, 300), reconhecido: false };
  const motivo = String(m[2] ?? "").replace(/\s*Última mensagem da família:[\s\S]*$/i, "");
  return { telefone: m[1] || "", motivo: valorDoAviso(motivo, 300), reconhecido: true };
}

export function rotuloDoCampo(chave) {
  const mapa = {
    nome_responsavel: "Responsável",
    responsavel: "Responsável",
    nome_aluno: "Aluno",
    aluno: "Aluno",
    serie: "Série",
    serie_interesse: "Série",
    data_nascimento: "Nascimento",
    nascimento: "Nascimento",
    escola_anterior: "Escola anterior",
    anterior: "Escola anterior",
    visita: "Visita",
    coleta: "Coleta",
  };
  return mapa[String(chave ?? "").trim().toLowerCase()] || "";
}

export function ordemDosRotulos() {
  return ["Responsável", "Aluno", "Série", "Nascimento", "Escola anterior", "Visita", "Coleta"];
}

export function linhasDaFicha(fontes) {
  const valores = new Map();
  const extras = [];
  for (const fonte of Array.isArray(fontes) ? fontes : []) {
    if (!fonte || typeof fonte !== "object" || Array.isArray(fonte)) continue;
    for (const [chave, valor] of Object.entries(fonte)) {
      if (chave === "equipe" || valor == null || typeof valor === "object") continue;
      const v = valorDoAviso(valor, 80);
      if (!v) continue;
      const rotulo = rotuloDoCampo(chave);
      if (rotulo) {
        if (!valores.has(rotulo)) valores.set(rotulo, v);
        continue;
      }
      const livre = valorDoAviso(chave.replace(/_/g, " "), 40);
      const nome = livre ? livre.charAt(0).toUpperCase() + livre.slice(1) : "";
      if (nome && !extras.some((x) => x[0] === nome) && extras.length < 4) extras.push([nome, v]);
    }
  }
  const linhas = ordemDosRotulos().filter((r) => valores.has(r)).map((r) => `${r}: ${valores.get(r)}`);
  return [...linhas, ...extras.map(([nome, v]) => `${nome}: ${v}`)];
}

export function textoAvisoHumano(humano, extra = {}) {
  const banco = partesDoAvisoBanco(humano?.aviso_texto);
  const tel = valorDoAviso(extra.telefone, 20) || banco.telefone;
  const linhas = [`Precisa de atendimento humano${tel ? `: ${tel}` : ""}`];
  if (banco.motivo) linhas.push(`${banco.reconhecido ? "Motivo" : "Do banco"}: ${banco.motivo}`);
  const dadosMemoria = extra.memoria?.dados && typeof extra.memoria.dados === "object" ? extra.memoria.dados : {};
  const dadosTurno = extra.dadosTurno && typeof extra.dadosTurno === "object" ? extra.dadosTurno : {};
  const daMensagem = extra.daMensagem && typeof extra.daMensagem === "object" ? extra.daMensagem : {};
  const ficha = linhasDaFicha([dadosTurno, dadosMemoria, daMensagem]);
  linhas.push(...ficha);
  const pedido = valorDoAviso(extra.pedido || extra.mensagem, 300);
  if (pedido) linhas.push(`Pedido da família: ${pedido}`);
  let resumo = valorDoAviso(extra.memoria?.resumo, 400);
  if (!resumo) {
    const atual = linhaLimpa(extra.mensagem, 80);
    const falas = falasDaFamilia(extra.conversa, 5).filter((f) => f !== atual && !pedido.includes(f)).slice(-4);
    if (falas.length) resumo = `sem resumo gravado; a família escreveu: ${falas.map((f) => valorDoAviso(f, 80)).join(" / ")}`;
    else if (ficha.length) resumo = "sem resumo gravado; dados da ficha acima";
  }
  linhas.push(`Resumo da conversa: ${resumo || "a família ainda não passou os dados da ficha"}`);
  return linhas.join("\n");
}

export function avisosDeHumano(saidas, extra = {}) {
  const vistos = new Set();
  const avisos = [];
  for (const humano of humanosDaSaida(saidas)) {
    if (vistos.has(humano.humano_id)) continue;
    vistos.add(humano.humano_id);
    avisos.push({ humano_id: humano.humano_id, conteudo: textoAvisoHumano(humano, extra) });
  }
  return avisos;
}

export function chaveAvisoHumano(schoolId, humanoId) {
  const escola = String(schoolId ?? "").trim().toLowerCase();
  const humano = String(humanoId ?? "").trim().toLowerCase();
  if (!ehUuidHumano(escola) || !ehUuidHumano(humano)) return "";
  return `lili:${escola}:aviso-humano:${humano}`;
}

export function avisosHumanoPrimeiraVez(avisos, saidasRedis, schoolId) {
  const contagem = new Map();
  for (const saida of Array.isArray(saidasRedis) ? saidasRedis : []) {
    if (!saida || typeof saida !== "object") continue;
    for (const [chave, valor] of Object.entries(saida)) contagem.set(chave, Number(valor));
  }
  const vistos = new Set();
  const out = [];
  for (const aviso of Array.isArray(avisos) ? avisos : []) {
    const chave = chaveAvisoHumano(schoolId, aviso?.humano_id);
    if (!chave || vistos.has(chave) || contagem.get(chave) !== 1) continue;
    vistos.add(chave);
    out.push({ ...aviso, chave });
  }
  return out;
}
