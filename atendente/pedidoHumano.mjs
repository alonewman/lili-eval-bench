
export function textoDoPedido(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function padroesDePedidoHumano() {
  const quem = "(?:(?:um|uma|o|a|algum|alguma)\\s+)?(?:pessoa|alguem|atendente|humano|humana|ser humano|secretaria|secretario|equipe|funcionari[oa])";
  const quero = "(?:eu\\s+)?(?:quero|queria|gostaria de|preciso|precisava|posso|podia|poderia)";
  return [
    new RegExp(`\\b${quero}\\s+(?:falar|conversar)\\s+com\\s+${quem}\\b`),
    /\b(?:eu\s+)?(?:quero|queria|gostaria de|preciso de)\s+(?:um |uma |o |a )?(?:atendente|humano|atendimento humano|pessoa da (?:equipe|escola|secretaria)|alguem da (?:equipe|escola|secretaria))\b/,
    new RegExp(`\\bme\\s+(?:passa|passe|transfere|transfira|encaminha|encaminhe)\\s+(?:pra|para)\\s+${quem}\\b`),
    new RegExp(`\\b(?:pode|podem|poderia|consegue)\\s+me\\s+(?:passar|transferir|encaminhar)\\s+(?:pra|para)\\s+${quem}\\b`),
    /\b(?:me\s+chama|chama|chame|chamem)\s+(?:alguem|um atendente|uma pessoa|a equipe|a secretaria)\b/,
    /\bme\s+(?:liga|ligue|liguem|ligar)\b/,
    /\b(?:liga|ligue|liguem)\s+(?:pra|para)\s+mim\b/,
    /^(?:atendente|humano)(?:\s+(?:por favor|pfv|pf|pls))?[\s.!?]*$/,
  ];
}

export function frasePergunta(frase) {
  return /^(?:e\s+)?(?:qual|quais|quando|que horas|como|onde|quem|quanto|quantos|quantas|voces tem|vcs tem|tem|existe|ha)\b/.test(frase);
}

export function ocasiaoFutura(trecho) {
  return /\b(?:na visita|no dia da visita|quando|amanha|depois|mais tarde|outro dia|semana que vem|mes que vem|na reuniao|(?:na|no) (?:segunda|terca|quarta|quinta|sexta|sabado))\b/.test(trecho);
}

export function pedidoDeHumano(texto) {
  const frases = textoDoPedido(texto).split(/(?<=[.!?;\n])/).map((f) => f.trim()).filter(Boolean);
  for (const pedaco of frases) {
    const pergunta = pedaco.endsWith("?");
    const frase = pedaco.replace(/[.!?;\s]+$/, "");
    if (!frase || frasePergunta(frase)) continue;
    if (/\bem casa\b|\bcom (?:meu|minha) (?:marido|esposa|mulher|familia)\b/.test(frase)) continue;
    for (const re of padroesDePedidoHumano()) {
      const m = re.exec(frase);
      if (!m) continue;
      const antes = frase.slice(0, m.index);
      if (/\b(?:nao|nem|sem|nunca|ninguem|depois|mais tarde|outro dia|amanha)\b/.test(antes.slice(antes.lastIndexOf(",") + 1))) continue;
      const resto = frase.slice(m.index + m[0].length).split(",")[0]
        .replace(/[^a-z0-9 ]+/g, " ").replace(/\b(?:por favor|pfv|pf)\b/g, " ").trim();
      if (/\bnao$/.test(resto)) continue;
      if ((pergunta || /^(?:eu\s+)?(?:posso|podia|poderia)\b/.test(m[0])) && ocasiaoFutura(frase.slice(m.index + m[0].length))) continue;
      return true;
    }
  }
  return false;
}
