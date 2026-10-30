
export function decidirPortao(entrada) {
  const mensagem = entrada?.mensagem ?? {};
  const contexto = entrada?.contexto ?? {};
  const telefone = String(mensagem.telefone ?? "");
  const avisos = Array.isArray(contexto?.regras?.aviso_whatsapp) ? contexto.regras.aviso_whatsapp : [];

  if (mensagem.ok !== true) {
    return { acao: "parar", motivo: mensagem.motivo || "erro" };
  }
  if (mensagem.grupo === true) return { acao: "ignorar", motivo: "grupo" };
  if (mensagem.telefone_valido === false || !/^[1-9][0-9]{7,14}$/.test(telefone)) {
    return { acao: "parar", motivo: "telefone_desconhecido" };
  }
  if (avisos.includes(telefone)) return { acao: "ignorar", motivo: "equipe" };
  if (mensagem.from_me === true) return { acao: "pausar", motivo: "equipe_celular" };
  if (mensagem.pausada === true) return { acao: "parar", motivo: "pausada" };
  if (mensagem.atrasada === true || mensagem.status === "atrasada") {
    return { acao: "humano", motivo: "atrasada" };
  }

  const lista = Array.isArray(contexto.modo_teste_numeros) ? contexto.modo_teste_numeros : [];
  const simulacao = contexto.modo_simulacao !== false;
  const naLista = lista.includes(telefone);
  if ((simulacao || lista.length > 0) && !naLista) return { acao: "parar", motivo: "fora_da_lista" };
  if (!simulacao && (contexto.pronta !== true || contexto.lili_ativa !== true)) {
    return { acao: "humano", motivo: "nao_pronta" };
  }
  return { acao: "atender", motivo: "ok" };
}
