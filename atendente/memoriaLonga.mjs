

export function textoDeMemoria(valor, limite) {
  const bruto = typeof valor === "string" ? valor : JSON.stringify(valor ?? "");
  const limpo = String(bruto ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/<{2,}|>{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (limpo.length <= limite) return limpo;
  return `${limpo.slice(0, Math.max(0, limite - 1)).trimEnd()}…`;
}

export function memoriaLongaDaSaida(saida) {
  const item = Array.isArray(saida) ? saida[0] : saida;
  if (!item || typeof item !== "object" || item.ok !== true) return { lida: false, existe: false, resumo: "", dados: {} };
  const dados = item.dados && typeof item.dados === "object" && !Array.isArray(item.dados) ? item.dados : {};
  const resumo = typeof item.resumo === "string" ? item.resumo : "";
  const existe = item.existe === true && (resumo.trim() !== "" || Object.keys(dados).length > 0);
  return { lida: true, existe, resumo, dados };
}

export function textoMemoriaLonga(memoria) {
  if (!memoria?.lida) return "(não foi possível ler agora; use a conversa recente)";
  if (!memoria.existe) return "(vazia)";
  const limiteResumo = 2000;
  const limiteDados = 1500;
  const linhas = [];
  const resumo = textoDeMemoria(memoria.resumo, limiteResumo);
  if (resumo) linhas.push(`Resumo: ${resumo}`);
  const campos = Object.entries(memoria.dados ?? {})
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => `${textoDeMemoria(k, 60)}: ${textoDeMemoria(v, 300)}`);
  if (campos.length) linhas.push(`Dados: ${textoDeMemoria(campos.join("; "), limiteDados)}`);
  return linhas.length ? linhas.join("\n") : "(vazia)";
}

export function ehPrimeiraMensagem(memoriaCurta, memoria) {
  if (String(memoriaCurta ?? "").trim() !== "") return false;
  return !memoria?.existe;
}

export function linhaSituacao(primeira) {
  return primeira
    ? "Situação da conversa: primeira mensagem desta família. Cumprimente, apresente-se e peça o nome (item 6.1)."
    : "Situação da conversa: conversa em andamento. Não cumprimente nem se apresente de novo.";
}

export function linhaColeta(dados) {
  const d = dados && typeof dados === "object" && !Array.isArray(dados) ? dados : {};
  const campos = [
    ["nome_aluno", "nome do estudante"],
    ["data_nascimento", "data de nascimento"],
    ["escola_anterior", "escola anterior"],
    ["serie", "série de interesse"],
  ];
  const tem = (k) => d[k] !== null && d[k] !== undefined && String(d[k]).trim() !== "";
  const coleta = String(d.coleta ?? "").trim().toLowerCase();
  if (coleta === "terminou" || coleta === "recusou") return "";
  const feitos = campos.filter(([k]) => tem(k)).map(([, rotulo]) => rotulo);
  const faltam = campos.filter(([k]) => !tem(k)).map(([, rotulo]) => rotulo);
  if (!feitos.length || !faltam.length) return "";
  return `Coleta: já coletado: ${feitos.join(", ")}. Falta: ${faltam.join(", ")}. Próxima pergunta da coleta: ${faltam[0]}. Nunca pergunte de novo um campo já coletado.`;
}

export function linhaRespostaEscola(antes, depois) {
  const nova = String(depois?.escola_anterior ?? "").trim();
  const tinha = String(antes?.escola_anterior ?? "").trim();
  if (!nova || tinha.toLowerCase() === nova.toLowerCase()) return "";
  return `Escola anterior neste turno: ${nova}. A família respondeu a pergunta da escola atual ou anterior. Isso é dado da coleta, não é pedido sobre outra escola e não é fora do escopo. Aceite e siga para o próximo campo.`;
}

export function linhaEquipe(estado) {
  if (!estado?.chamada) return "";
  const pedido = textoDeMemoria(estado.pedido, 120);
  return `Equipe: já chamada nesta conversa${pedido ? ` (pedido da família: ${pedido})` : ""}. Não repita a frase de chamar a equipe. Se perguntarem por quê, explique em uma frase com esse pedido, sem inventar motivo. Novo caso da lista da seção 4: chame Precisa de humano de novo.`;
}
