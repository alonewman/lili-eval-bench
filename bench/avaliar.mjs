// Critérios da bancada: julgam o "observado" de cada turno, cada roteiro e cada modelo. Não chama rede.
import { vazamentoDeFerramenta } from "../atendente/guardaResposta.mjs";

export const MODELO_REGUA = "gpt-4o";
export const MARCA_ESCOLA = "{escola}";
export function semAcentoBancada(texto) {
  return String(texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function normTool(nome) {
  return String(nome ?? "").replace(/ /g, "_");
}

export function contemItem(output, item) {
  const texto = String(output ?? "").toLowerCase();
  const opcoes = Array.isArray(item) ? item : [item];
  return opcoes.some((s) => texto.includes(String(s).toLowerCase()));
}

function rotuloItem(item) {
  return Array.isArray(item) ? item.map(String).join(" | ") : String(item);
}

export const MARCADOR_BLOCO = "P&";

export function enviosDoTurno(observado) {
  if (Array.isArray(observado?.envios)) return observado.envios.map((e) => String(e ?? ""));
  return null;
}

export function juntarEnvios(envios) {
  return (envios ?? []).map((e) => String(e ?? "")).join("\n\n");
}

export function mensagemCom(envios, item, desde = 0) {
  for (let i = desde; i < (envios ?? []).length; i += 1) if (contemItem(envios[i], item)) return i;
  return -1;
}

export function falhasDosBlocos(turno, observado) {
  const falhas = [];
  const envios = enviosDoTurno(observado);
  const avisos = (observado?.avisosEquipe ?? []).map((a) => String(a ?? ""));
  if (avisos.some((a) => a.includes(MARCADOR_BLOCO))) falhas.push("aviso à equipe com P&");
  if (envios === null) {
    if (Number.isInteger(turno?.blocosMinimo) || Number.isInteger(turno?.blocosMaximo) || turno?.ordem?.length) {
      falhas.push("não li as mensagens do turno");
    }
    return falhas;
  }
  if (envios.some((e) => e.includes(MARCADOR_BLOCO))) falhas.push("mensagem com P&");
  if (envios.some((e) => !e.trim())) falhas.push("mensagem vazia");
  if (Number.isInteger(turno?.blocosMinimo) && envios.length < turno.blocosMinimo) {
    falhas.push(`${envios.length} mensagem(ns) (mínimo ${turno.blocosMinimo})`);
  }
  if (Number.isInteger(turno?.blocosMaximo) && envios.length > turno.blocosMaximo) {
    falhas.push(`${envios.length} mensagens (máximo ${turno.blocosMaximo})`);
  }
  let pos = 0;
  for (const item of turno?.ordem ?? []) {
    const i = mensagemCom(envios, item, pos);
    if (i < 0) {
      falhas.push(`fora de ordem: "${rotuloItem(item)}"`);
      break;
    }
    pos = i;
  }
  return falhas;
}

export function falhasDoAvisoHumano(aviso) {
  const falhas = [];
  const texto = String(aviso ?? "");
  if (/(?<!\.)\.\.(?!\.)/.test(texto)) falhas.push('aviso de humano com ".."');
  const rotulos = [...new Set(texto.split("\n").map((l) => (/^([^:]{1,40}):/.exec(l.trim()) || [])[1]).filter(Boolean))];
  const repetidos = rotulos.filter((r) => texto.split(`${r}:`).length > 2);
  if (repetidos.length) falhas.push(`aviso de humano com linha repetida: ${repetidos.join(", ")}`);
  return falhas;
}

export function avaliarTurno(turno, observado) {
  if (turno?.audio && observado?.pendente) return { falhas: [], pendente: true };
  const falhas = [];
  const output = String(observado?.output ?? "");
  const tools = (observado?.tools ?? []).map(normTool);
  const inputs = JSON.stringify(observado?.inputs ?? []);
  if (observado?.erro) falhas.push(`erro: ${String(observado.erro).slice(0, 200)}`);
  if (vazamentoDeFerramenta(output)) falhas.push("vazamento de chamada de ferramenta na mensagem");
  if ((observado?.guarda ?? []).includes("vazamento_de_ferramenta")) falhas.push("o Agente vazou chamada de ferramenta (a guarda limpou)");
  if (turno?.audio && !String(observado?.transcricao ?? "").trim()) falhas.push("sem transcrição do áudio");
  if (turno?.memoriaLida && observado?.memoriaLida !== true) falhas.push("o fluxo não leu a memória longa antes do Agente");
  if (turno?.avisaEquipe) {
    const avisos = (observado?.avisosEquipe ?? []).map((a) => String(a ?? ""));
    if (!avisos.some((a) => a.includes("Precisa de atendimento humano") && a.includes("Resumo da conversa"))) {
      falhas.push("a equipe não recebeu o aviso de humano com resumo");
    }
    for (const a of avisos.filter((x) => x.includes("Precisa de atendimento humano"))) falhas.push(...falhasDoAvisoHumano(a));
  }
  if (turno?.avisoContem?.length) {
    const avisos = (observado?.avisosEquipe ?? []).map((a) => semAcentoBancada(a));
    for (const s of turno.avisoContem) {
      if (!avisos.some((a) => a.includes(semAcentoBancada(s)))) falhas.push(`o aviso à equipe não tem "${s}"`);
    }
  }
  if (turno?.memoria && typeof turno.memoria === "object") {
    const dados = observado?.memoria && typeof observado.memoria === "object" ? observado.memoria : {};
    for (const [chave, valor] of Object.entries(turno.memoria)) {
      if (!semAcentoBancada(dados[chave]).includes(semAcentoBancada(valor))) falhas.push(`memória longa sem ${chave} "${valor}"`);
    }
  }
  if (Number.isInteger(turno?.visitasNoMaximo)) {
    const n = observado?.visitasAtivas;
    if (!Number.isInteger(n)) falhas.push("não li as visitas ativas do número");
    else if (n > turno.visitasNoMaximo) falhas.push(`${n} visitas ativas (máximo ${turno.visitasNoMaximo})`);
  }
  let pos = 0;
  for (const f of turno?.ferramentas ?? []) {
    const i = tools.indexOf(normTool(f), pos);
    if (i < 0) falhas.push(`não chamou ${f} (na ordem)`);
    else pos = i + 1;
  }
  for (const f of turno?.proibidas ?? []) if (tools.includes(normTool(f))) falhas.push(`chamou ${f}`);
  for (const s of turno?.contem ?? []) {
    if (!contemItem(output, s)) falhas.push(`faltou "${rotuloItem(s)}"`);
  }
  for (const s of turno?.naoContem ?? []) {
    if (output.toLowerCase().includes(String(s).toLowerCase())) falhas.push(`tem "${s}"`);
  }
  for (const s of turno?.entradasNaoContem ?? []) {
    if (inputs.includes(s)) falhas.push(`ferramenta recebeu "${s}"`);
  }
  falhas.push(...falhasDosBlocos(turno, observado));
  return { falhas, pendente: false };
}

export function julgarRoteiro(roteiro, turnos) {
  const reais = (turnos ?? []).filter((t) => !t.pendente);
  if (reais.some((t) => t.falhas?.length)) return roteiro?.critico ? "falha" : "aviso";
  if ((turnos ?? []).some((t) => t.pendente)) return "pendente";
  return "ok";
}

export function juntarRodadas(rodadas) {
  const porId = new Map();
  for (const rodada of rodadas ?? []) {
    for (const roteiro of rodada.roteiros ?? []) {
      const atual = porId.get(roteiro.id) ?? { id: roteiro.id, nome: roteiro.nome, critico: roteiro.critico, julgamento: "ok" };
      const ordem = { ok: 0, aviso: 1, pendente: 2, falha: 3 };
      if ((ordem[roteiro.julgamento] ?? 0) > (ordem[atual.julgamento] ?? 0)) atual.julgamento = roteiro.julgamento;
      porId.set(roteiro.id, atual);
    }
  }
  return [...porId.values()];
}

export const MOTIVO_SEM_AUDIO = "falta a transcrição do áudio (rode a bancada com --audio)";

export function avaliarModelo({ modelo, roteiros, custoReal = null }) {
  if (modelo === MODELO_REGUA) return { modelo, passa: false, motivo: "gpt-4o não pode ser escolhido", custoReal };
  const falhas = (roteiros ?? []).filter((r) => r.julgamento === "falha").length;
  const avisos = (roteiros ?? []).filter((r) => r.julgamento === "aviso").length;
  const pendentes = (roteiros ?? []).filter((r) => r.julgamento === "pendente").length;
  if (falhas > 0) return { modelo, passa: false, motivo: "há roteiro crítico reprovado", custoReal, falhas, avisos, pendentes };
  if (avisos > 3) return { modelo, passa: false, motivo: "mais de 3 avisos", custoReal, falhas, avisos, pendentes };
  if (pendentes > 0) return { modelo, passa: false, motivo: MOTIVO_SEM_AUDIO, custoReal, falhas, avisos, pendentes };
  return { modelo, passa: true, motivo: "passou nas duas rodadas", custoReal, falhas, avisos, pendentes };
}

// Escolha: entre os aprovados (a régua nunca), o de menor custo. Sem custo de algum aprovado, não escolhe.
export function escolherModelo(relatorios) {
  if ((relatorios ?? []).some((r) => (r.pendentes ?? 0) > 0)) return { escolhido: null, motivo: MOTIVO_SEM_AUDIO };
  const passam = (relatorios ?? []).filter((r) => r.passa && r.modelo !== MODELO_REGUA);
  if (!passam.length) return { escolhido: null, motivo: "nenhum modelo passou" };
  if (passam.some((r) => r.custoReal == null || !Number.isFinite(Number(r.custoReal)))) {
    return { escolhido: null, motivo: "falta o custo de algum modelo aprovado" };
  }
  const melhor = passam.slice().sort((a, b) => Number(a.custoReal) - Number(b.custoReal))[0];
  return { escolhido: melhor.modelo, motivo: "menor custo entre os que passaram" };
}
export function roteirosDaEscola(roteiros, nome) {
  const usa = JSON.stringify(roteiros ?? []).includes(MARCA_ESCOLA);
  if (!usa) return roteiros;
  if (typeof nome !== "string" || !nome.trim()) throw new Error("a escola da bancada não tem nome; os roteiros usam {escola}");
  const trocar = (item) => (Array.isArray(item) ? item.map(trocar) : typeof item === "string" ? item.split(MARCA_ESCOLA).join(nome) : item);
  return roteiros.map((r) => ({
    ...r,
    turnos: (r.turnos ?? []).map((t) => ({
      ...t,
      ...(t.contem ? { contem: t.contem.map(trocar) } : {}),
      ...(t.naoContem ? { naoContem: t.naoContem.map(trocar) } : {}),
    })),
  }));
}
