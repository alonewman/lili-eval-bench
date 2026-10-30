
export const JANELA_CONTINGENCIA_S = 6 * 60 * 60;

export function nosComContingencia() {
  return [
    "Ler mensagem",
    "Ler mensagem de novo",
    "Ler contexto",
    "Pausa da equipe",
    "Marcar humano",
    ...nosQueResponderiam(),
  ];
}

export const NO_EXIGIR_MODELO = "Exigir modelo";

export function nosQueResponderiam() {
  return [
    "Garantir lead",
    "Baixar áudio",
    "Transcrever",
    "Registrar áudio",
    "Guarda no buffer",
    "Lê o buffer",
    "Limpa o buffer",
    "Exigir modelo", // literal: esta função é colada no nó sem as constantes (ver NO_EXIGIR_MODELO)
    "Agente",
  ];
}

export function ehUuidEscola(valor) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(valor ?? ""));
}

export function ultimoExecutado(nomes, executou) {
  let ultimo = "";
  for (const nome of Array.isArray(nomes) ? nomes : []) {
    if (executou(nome)) ultimo = nome;
  }
  return ultimo;
}

export function textoDoErro(erro) {
  if (erro == null) return "";
  if (typeof erro === "string") return erro.slice(0, 300);
  if (typeof erro !== "object") return String(erro).slice(0, 300);
  const partes = [];
  for (const campo of ["httpCode", "message", "description"]) {
    const valor = erro[campo];
    if ((typeof valor === "string" || typeof valor === "number") && String(valor).trim()) partes.push(String(valor).trim());
  }
  return partes.join(" | ").slice(0, 300);
}

export function eh401(erro) {
  const httpCode = erro && typeof erro === "object" ? String(erro.httpCode ?? erro.statusCode ?? "") : "";
  if (httpCode === "401") return true;
  return /\b401\b|authorization failed|jwt expired/i.test(textoDoErro(erro));
}

export function contextoConfiavel(ctx) {
  return Boolean(ctx && typeof ctx === "object"
    && ctx.ok === true
    && ctx.error === undefined
    && ehUuidEscola(ctx.school_id)
    && typeof ctx.modo_simulacao === "boolean"
    && Array.isArray(ctx.modo_teste_numeros));
}

export function telefoneConfiavel(mensagem) {
  if (!mensagem || typeof mensagem !== "object" || mensagem.ok !== true || mensagem.grupo === true) return "";
  const tel = String(mensagem.telefone ?? "").trim();
  return /^\d{8,20}$/.test(tel) ? tel : "";
}

export function chaveContingencia(schoolId, telefone) {
  const escola = String(schoolId ?? "").trim().toLowerCase();
  const tel = String(telefone ?? "").trim();
  if (!ehUuidEscola(escola) || !/^\d{8,20}$/.test(tel)) return "";
  return `lili:${escola}:contingencia:${tel}`;
}

export function decidirContingencia(entrada) {
  const falhou = String(entrada?.falhou ?? "");
  const corpo = entrada?.entrada && typeof entrada.entrada === "object" ? entrada.entrada : {};
  const ctx = entrada?.contexto;
  const escolaCtx = contextoConfiavel(ctx) ? String(ctx.school_id).toLowerCase() : "";
  const escolaEntrada = ehUuidEscola(corpo.school_id) ? String(corpo.school_id).toLowerCase() : "";
  const base = {
    enviar: false,
    motivo: "",
    no_falhou: falhou || "desconhecido",
    erro: textoDoErro(entrada?.erro),
    banco_401: eh401(entrada?.erro),
    message_id: String(corpo.message_id ?? "").slice(0, 200),
    school_id_evento: escolaCtx || escolaEntrada || null,
    school_id: "",
    telefone: "",
  };
  const nao = (motivo) => ({ ...base, motivo });
  if (!escolaCtx) return nao("contexto_desconhecido");
  if (escolaEntrada && escolaEntrada !== escolaCtx) return nao("escola_divergente");
  const tel = telefoneConfiavel(entrada?.mensagem);
  if (!tel) return nao("telefone_desconhecido");
  if (!nosQueResponderiam().includes(falhou)) return nao("fora_do_atendimento");
  if (entrada?.respostaSaiu === true) return nao("resposta_ja_saiu");
  if (String(entrada?.portao?.acao ?? "") !== "atender") return nao("portao_nao_atende");
  const lista = ctx.modo_teste_numeros.map(String);
  if ((ctx.modo_simulacao || lista.length > 0) && !lista.includes(tel)) return nao("fora_da_lista");
  return { ...base, enviar: true, motivo: "ok", school_id: escolaCtx, telefone: tel };
}

export function contingenciaUmaVez(decisao, saidaRedis) {
  if (!decisao || decisao.enviar !== true) return { ...(decisao ?? {}), enviar: false };
  const chave = chaveContingencia(decisao.school_id, decisao.telefone);
  const valor = saidaRedis && typeof saidaRedis === "object" && chave ? Number(saidaRedis[chave]) : NaN;
  if (valor === 1) return { ...decisao, enviar: true, motivo: "ok", chave };
  if (Number.isFinite(valor) && valor > 1) return { ...decisao, enviar: false, motivo: "ja_enviada_na_janela", chave };
  return { ...decisao, enviar: false, motivo: "trava_indisponivel", chave };
}

export function resumoDaFalha(decisao, envio, execucaoId) {
  const d = decisao && typeof decisao === "object" ? decisao : {};
  let contingencia = "nao_enviada";
  if (envio && typeof envio === "object") contingencia = envio.error === undefined ? "entregue_a_saida" : "falhou_na_saida";
  const frase = {
    nao_enviada: `sem mensagem à família (${d.motivo || "desconhecido"})`,
    entregue_a_saida: "contingência entregue à saída (ela decide real, simulado ou bloqueado)",
    falhou_na_saida: `a saída falhou ao mandar a contingência: ${textoDoErro(envio && envio.error)}`,
  }[contingencia];
  const no = d.no_falhou || "desconhecido";
  const mensagem = `Lili (escolas): falhou "${no}"${d.banco_401 ? " (banco 401)" : ""}: ${d.erro || "sem detalhe"}. ${frase}.`;
  return {
    evento: {
      p_school_id: d.school_id_evento || null,
      p_nivel: "erro",
      p_mensagem: mensagem.slice(0, 900),
      p_operacao: "lili-escolas",
      p_contexto: {
        no: no,
        motivo: d.motivo || "",
        contingencia,
        banco_401: d.banco_401 === true,
        message_id: d.message_id || "",
        execucao_id: String(execucaoId ?? ""),
      },
    },
    contingencia,
    erro_execucao: mensagem.slice(0, 900),
  };
}
