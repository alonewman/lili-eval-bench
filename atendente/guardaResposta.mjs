

export function textoNormal(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function frasesAfirmativas(texto) {
  return String(texto ?? "")
    .replace(/P&/g, "\n")
    .split(/(?<=[.!?\n])\s*/)
    .map((f) => f.trim())
    .filter((f) => f && !f.endsWith("?"));
}

export function prometePassarConversa(n) {
  const destino = "(equipe|alguem|atendente|pessoa|secretaria|time|consultor)";
  if (/\b(vou|irei|vamos|ja vou|ja)\s+(te\s+|lhe\s+)?passar a conversa\b/.test(n)) return true;
  if (/\bpassei a conversa\b/.test(n)) return true;
  const entrega = "(passar|passei|encaminhar|encaminhei|transferir|transferi)";
  const passaConteudo = new RegExp(`\\b(passar|encaminhar|transferir)\\s+(o|a|os|as|te\\s+o|te\\s+a|lhe\\s+o|lhe\\s+a)\\s+(contato|contatos|informacao|informacoes|dado|dados|numero|telefone)\\b`);
  if (new RegExp(`\\b${entrega}\\b[^.!?]{0,50}\\b(para|pra)\\s+(a\\s+|o\\s+|um\\s+|uma\\s+)?${destino}\\b`).test(n) && !passaConteudo.test(n)) return true;
  if (new RegExp(`\\b(vou|irei|vamos|ja vou)\\s+(chamar|acionar)\\b[^.!?]{0,40}\\b${destino}\\b`).test(n)) return true;
  if (/\b(vou|irei)\s+(chama|passa|encaminha|aciona|avisa)-?(los|las|lo|la)\b/.test(n)) return true;
  if (new RegExp(`\\b(ja\\s+)?(chamei|acionei|encaminhei|transferi)\\b[^.!?]{0,40}\\b${destino}\\b`).test(n)) return true;
  if (new RegExp(`\\b(vou|irei|vamos|ja vou)\\s+pedir\\b[^.!?]{0,40}\\b(para|pra)\\s+(a\\s+|o\\s+|um\\s+|uma\\s+)?${destino}\\b`).test(n)) return true;
  if (new RegExp(`\\b(vou|irei|vamos|ja vou|ja)?\\s*(avisar|avisei)\\b[^.!?]{0,30}\\b${destino}\\b`).test(n)) {
    if (/\b(falar|responde|continuar|retornar|entrar em contato)\b/.test(n)) return true;
    if (!/\b(da escola|para (te |lhe )?receber|recepcao|visita|contato|informac)\b/.test(n)) return true;
  }
  const quem = "(alguem da equipe|a equipe|um atendente|uma pessoa da equipe)";
  if (new RegExp(`\\b${quem}\\s+(vai|ira|ja vai)\\s+(continuar|falar|entrar em contato|te responder|responder|retornar)\\b`).test(n)) return true;
  if (new RegExp(`\\b${quem}\\s+(vai|ira|ja vai)\\s+(te atender|atender)\\b`).test(n) && !/\b(recepcao|portaria|visita)\b/.test(n)) return true;
  return false;
}

export function falaDeChamarEquipe(texto, fraseDoBloco) {
  const frase = textoNormal(fraseDoBloco).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  for (const f of frasesAfirmativas(texto)) {
    const n = textoNormal(f);
    const limpa = n.replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
    if (/\b(se (voce )?(quiser|preferir|desejar|achar melhor)|caso (voce )?(queira|prefira|deseje))\b/.test(n)) continue;
    if (frase && frase.length >= 12 && limpa.includes(frase)) return true;
    if (/\bnao\b/.test(n)) continue;
    if (prometePassarConversa(n)) return true;
  }
  return false;
}

export function afirmaVisita(texto) {
  let achou = "";
  for (const f of frasesAfirmativas(texto)) {
    const n = textoNormal(f);
    if (/\bnao\b|\bainda\b|\bpara (marcar|agendar|confirmar)\b|\bprecis/.test(n)) continue;
    const verbo = "(foi|esta|ficou|ja esta|segue|continua|estara)";
    if (new RegExp(`\\bvisita\\b[^.!?]{0,80}\\b${verbo}\\s+(\\w+\\s+)?cancelad|\\bcancelei\\b|\\bvisita cancelada\\b`).test(n)) return "cancelada";
    if (new RegExp(`\\bvisita\\b[^.!?]{0,80}\\b${verbo}\\s+(\\w+\\s+)?(remarcad|reagendad)|\\b(remarquei|reagendei)\\b|\\bvisita (remarcada|reagendada)\\b`).test(n)) {
      achou = "remarcada";
      continue;
    }
    if (new RegExp(`\\bvisita\\b[^.!?]{0,80}\\b${verbo}\\s+(\\w+\\s+)?(marcad|agendad|confirmad)|\\b(marquei|agendei|confirmei)\\b[^.!?]{0,60}\\bvisita\\b|\\bvisita (marcada|agendada|confirmada)\\b`).test(n)) {
      if (!achou) achou = "marcada";
    }
  }
  return achou;
}

export function saidaDaFerramenta(observacao) {
  let valor = observacao;
  for (let i = 0; i < 3 && typeof valor === "string"; i += 1) {
    const t = valor.trim();
    if (!t.startsWith("{") && !t.startsWith("[")) return null;
    try { valor = JSON.parse(t); } catch (e) { return null; }
  }
  if (Array.isArray(valor)) valor = valor[0];
  if (valor && typeof valor === "object" && valor.response !== undefined && valor.ok === undefined) return saidaDaFerramenta(valor.response);
  return valor && typeof valor === "object" ? valor : null;
}

export function ferramentasDoTurno(passos) {
  const turno = { humano: false, marcou: false, remarcou: false, cancelou: false, visitas: null };
  for (const passo of Array.isArray(passos) ? passos : []) {
    const nome = textoNormal(passo?.action?.tool).replace(/ /g, "_");
    const saida = saidaDaFerramenta(passo?.observation);
    if (!saida) continue;
    if (nome === "precisa_de_humano" && saida.ok === true && saida.humano_id) turno.humano = true;
    if (nome === "marcar_visita" && saida.ok === true && saida.visita_id) turno.marcou = true;
    if (nome === "remarcar_visita" && saida.ok === true) turno.remarcou = true;
    if (nome === "cancelar_visita" && saida.ok === true) turno.cancelou = true;
    if (nome === "buscar_visita" && saida.ok === true && Array.isArray(saida.visitas)) {
      turno.visitas = [...(turno.visitas || []), ...saida.visitas];
    }
    if (nome === "marcar_visita" && saida.ok === false && saida.motivo === "ja_tem_visita" && saida.visita) {
      turno.visitas = [...(turno.visitas || []), saida.visita];
    }
  }
  return turno;
}

export function decidirConferencia(entrada) {
  const texto = String(entrada?.texto ?? "");
  const turno = ferramentasDoTurno(entrada?.passos);
  const acoes = [];
  const promete = falaDeChamarEquipe(texto, entrada?.fraseEquipe);
  const pedido = !turno.humano && !promete && entrada?.pedeHumano === true;
  if (!turno.humano && (promete || pedido)) acoes.push("humano");
  const visita = afirmaVisita(texto);
  if (visita === "cancelada" && !turno.cancelou) acoes.push("visita");
  if ((visita === "marcada" || visita === "remarcada") && !turno.marcou && !turno.remarcou) {
    if (!(turno.visitas && turno.visitas.length)) acoes.push("visita");
  }
  return { acoes, visita, visitasDoTurno: turno.visitas, ...(pedido ? { pedido: true } : {}) };
}

export function cortarNaPalavra(texto, limite) {
  const t = String(texto ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= limite) return t;
  const corte = t.slice(0, limite);
  const espaco = corte.lastIndexOf(" ");
  return `${(espaco > limite / 2 ? corte.slice(0, espaco) : corte).trimEnd()}…`;
}

export function fraseDaEquipe(frase) {
  const f = String(frase ?? "").replace(/\s+/g, " ").trim();
  return f || "Vou chamar alguém da equipe para continuar com você. 💬";
}

export function textoEquipeJaChamada(pedido) {
  const p = cortarNaPalavra(String(pedido ?? "").replace(/[<>]/g, " "), 80);
  return p
    ? `Sua conversa já está com a equipe da escola, por causa do seu pedido (${p}), e alguém vai continuar com você por aqui. 💬`
    : "Sua conversa já está com a equipe da escola, e alguém vai continuar com você por aqui. 💬";
}

export function textoVisitaConferida(tipo, visitas) {
  const lista = Array.isArray(visitas) ? visitas.filter((v) => v && typeof v === "object") : null;
  const rotulo = (v) => String(v?.rotulo || v?.local || "").replace(/\s+/g, " ").trim();
  if (lista === null) {
    return tipo === "cancelada"
      ? "Não consegui confirmar o cancelamento agora. Pode me mandar de novo, por favor?"
      : "Não consegui confirmar a visita agora. Pode me dizer de novo o dia e o horário que você prefere?";
  }
  const comRotulo = lista.filter((v) => rotulo(v));
  if (tipo === "cancelada") {
    if (!comRotulo.length) return "Não encontrei visita marcada para você. Posso ajudar em mais algo?";
    return `Sua visita de ${rotulo(comRotulo[0])} continua marcada. Quer mesmo cancelar?`;
  }
  if (!comRotulo.length) return "Ainda não há visita marcada para você. Qual dia e horário você prefere?";
  if (comRotulo.length === 1) return `Sua visita já está marcada para ${rotulo(comRotulo[0])}. 😊 Posso ajudar em mais algo?`;
  return `Você tem visitas marcadas para ${comRotulo.map(rotulo).join(" e ")}. Posso ajudar em mais algo?`;
}

export function corpoDaRpc(resposta) {
  if (!resposta || typeof resposta !== "object") return null;
  const corpo = Object.prototype.hasOwnProperty.call(resposta, "statusCode") ? resposta.body : resposta;
  if (resposta.statusCode !== undefined && (resposta.statusCode < 200 || resposta.statusCode >= 300)) return null;
  const lido = saidaDaFerramenta(corpo);
  return lido && typeof lido === "object" ? lido : null;
}

export function prometeEnvioDeAnexo(n) {
  if (/\bnao\b/.test(n)) return false;
  const coisa = "(arquivo|anexo|pdf|tabela|imagem|foto|documento|planilha)";
  if (/\bem anexo\b/.test(n)) return true;
  if (new RegExp(`\\bsegue\\b[^\\n]{0,40}\\b${coisa}\\b`).test(n)) return true;
  const envio = "(encaminhei|encaminhou|encaminhamos|encaminhad[oa]s?|enviei|enviou|enviamos|enviad[oa]s?|mandei|mandou|mandamos|te mando|te envio|te encaminho|vou enviar|vou mandar|vou encaminhar|irei enviar|irei mandar|estou enviando|ja enviei|ja mandei)";
  if (new RegExp(`\\b(?:${envio})\\b`).test(n) && new RegExp(`\\b${coisa}\\b`).test(n)) return true;
  if (/\bja foi disponibilizad[oa]\b/.test(n)) return true;
  if (/\bdisponibilizei\b/.test(n)) return true;
  const curta = n.replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  if (!curta || curta.length > 48) return false;
  if (!/\b(enviei|encaminhei|mandei|vou enviar|vou mandar|te mando|foi enviad[oa]|foi encaminhad[oa])\b/.test(curta)) return false;
  const resto = curta
    .replace(/\b(encaminhei|enviei|mandei|vou enviar|vou mandar|te mando|foi enviad[oa]|foi encaminhad[oa]|eu|ja|foi|o|a|os|as|um|uma|tambem|aqui|pra|para|voce|lhe|te|sim|ok|pronto)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return resto.length === 0;
}

export function textoSemPromessaDeAnexo(texto) {
  function frasesComMarca(paragrafo) {
    const protegido = String(paragrafo ?? "").replace(/(\d)\.(\d)/g, "$1\u0000$2");
    const frases = [];
    for (const parte of protegido.split(/(?<=[.!?\n])\s*/)) {
      const pedaco = parte.trim().replace(/\u0000/g, ".");
      if (!pedaco) continue;
      const soMarca = !/[\p{L}\p{N}]/u.test(pedaco);
      if (soMarca && frases.length) frases[frases.length - 1] += ` ${pedaco}`;
      else frases.push(pedaco);
    }
    return frases;
  }

  function ehPerguntaDeAnexo(frase) {
    const base = String(frase ?? "").replace(/(?:[\s\p{Extended_Pictographic}\uFE0F\u200D])+$/u, "");
    return base.endsWith("?");
  }

  const original = String(texto ?? "");
  const marca = "P" + "&";
  const tinhaPe = original.includes(marca);
  const bruto = tinhaPe ? original.replaceAll(marca, "\n\n") : original;
  let tirou = false;
  const ficou = bruto.split(/\n[ \t]*\n/).map((paragrafo) => {
    const frases = frasesComMarca(paragrafo);
    const mantidas = [];
    let tirouAqui = false;
    for (const frase of frases) {
      if (!ehPerguntaDeAnexo(frase) && prometeEnvioDeAnexo(textoNormal(frase))) {
        tirouAqui = true;
        continue;
      }
      mantidas.push(frase);
    }
    if (!tirouAqui) return paragrafo;
    tirou = true;
    return mantidas.join(" ").replace(/ {2,}/g, " ").trim();
  });
  if (!tirou) return original;
  return ficou.filter((p) => p.trim()).join(tinhaPe ? ` ${marca} ` : "\n\n").trim();
}

export function ofertaDeEquipe(n) {
  if (/\b(contato|telefone|numero|whatsapp|email|informac)/.test(n)) return false;
  const destino = "(equipe|alguem|atendente|pessoa|secretaria|time|consultor|humano)";
  if (new RegExp(`\\b(quer|queria|gostaria|prefere|deseja)\\s+que\\s+eu\\s+(te\\s+|lhe\\s+)?(chame|chamasse|passe|passasse|encaminhe|encaminhasse|transfira|transferisse|acione|peca)\\b[^?]{0,60}\\b${destino}\\b`).test(n)) return true;
  return new RegExp(`\\b(posso|devo)\\s+(te\\s+|lhe\\s+)?(chamar|passar|encaminhar|transferir|acionar|pedir)\\b[^?]{0,60}\\b${destino}\\b`).test(n);
}

export function textoSemOfertaDeEquipeNoFim(texto) {
  const t = String(texto ?? "").trim();
  const m = /(^|[.!?\n]\s*|P&\s*)((?:(?!P&)[^.!?\n])*\?)[\s\p{Extended_Pictographic}️‍]*$/u.exec(t);
  if (!m || !ofertaDeEquipe(textoNormal(m[2]))) return t;
  return t.slice(0, m.index + m[1].length).replace(/\s*P&\s*$/, "").trim();
}

export function textoConferido(entrada) {
  const e = entrada || {};
  const decisao = e.decisao || { acoes: [] };
  let texto = String(e.texto ?? "");
  const motivos = [];
  if (decisao.acoes.includes("humano")) {
    const h = e.humano;
    if (h && h.ok === true && h.novo === false) {
      texto = textoEquipeJaChamada(e.pedidoEquipe);
      motivos.push("equipe_ja_chamada");
    } else if (h && h.ok === true && decisao.pedido) {
      const frase = fraseDaEquipe(e.fraseEquipe);
      const resto = textoSemOfertaDeEquipeNoFim(texto);
      texto = resto ? `${resto}\n\n${frase}` : frase;
      motivos.push("equipe_chamada_pelo_pedido");
    } else if (h && h.ok === true) {
      motivos.push("equipe_chamada_pela_guarda");
    } else if (e.jaChamada) {
      texto = textoEquipeJaChamada(e.pedidoEquipe);
      motivos.push("equipe_ja_chamada_sem_rpc");
    } else {
      motivos.push(decisao.pedido ? "pedido_humano_nao_registrado" : "equipe_nao_chamada");
    }
  }
  if (decisao.acoes.includes("visita") && !motivos.includes("equipe_ja_chamada") && !motivos.includes("equipe_ja_chamada_sem_rpc")) {
    texto = textoVisitaConferida(decisao.visita, e.visitas);
    motivos.push(`visita_${decisao.visita}_sem_ferramenta`);
  }
  const semAnexo = textoSemPromessaDeAnexo(texto);
  if (semAnexo !== texto) {
    texto = semAnexo;
    motivos.push("anexo_sem_envio");
  }
  return { texto, motivos };
}

export function estadoDaEquipe(entrada) {
  const e = entrada || {};
  const dados = e.dados && typeof e.dados === "object" ? e.dados : {};
  const campo = String(dados.equipe ?? "").trim();
  if (/^chamada\b/i.test(campo)) {
    const m = /pedido:\s*(.+)$/i.exec(campo);
    return { chamada: true, pedido: m ? m[1].trim() : "" };
  }
  const partes = String(e.memoriaCurta ?? "").split(/\n(?=(?:Família|Lili): )/);
  let estado = { chamada: false, pedido: "" };
  const daFamilia = [];
  for (const parte of partes) {
    const m = /^(Família|Lili): ([\s\S]*)$/.exec(parte.trim());
    if (!m) continue;
    if (m[1] === "Família") daFamilia.push(m[2].replace(/\s+/g, " ").trim());
    else if (falaDeChamarEquipe(m[2], e.fraseEquipe) && daFamilia.length) {
      const ultima = daFamilia[daFamilia.length - 1];
      const t = textoNormal(ultima).replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
      const aceite = t.split(" ").length <= 7 && /^(sim|pode|ok|okay|claro|isso|quero|por favor|beleza|tudo bem|certo|pode ser|aceito)\b/.test(t);
      const curta = aceite && daFamilia.length > 1;
      estado = { chamada: true, pedido: curta ? `${daFamilia[daFamilia.length - 2]} / ${ultima}` : ultima };
    } else if (falaDeChamarEquipe(m[2], e.fraseEquipe)) estado = { chamada: true, pedido: "" };
  }
  return estado;
}

export function padroesDeVazamento() {
  return [
    /\bto=(?:functions|multi_tool_use)\.[\w.-]*/gi,
    /<\|[a-z_]+\|>/gi,
    /<\/?(?:response|tool_call|tool_response|function_call|function_results?|tool_result)\b[^>]*>/gi,
    /\b(?:functions|multi_tool_use)\.[A-Za-z_][\w-]*/g,
    /\b(?:hor[_a]rios_livres|re?marcar_visita|cancelar_visita|buscar_visita|mem[_o]ria_longa_(?:gravar|ler)|atualizar_ficha|precisa_de_humano)\b/gi,
  ];
}

export function fimDoJson(texto, abre) {
  let nivel = 0;
  let emTexto = false;
  for (let i = abre; i < texto.length; i += 1) {
    const c = texto[i];
    if (emTexto) {
      if (c === "\\") i += 1;
      else if (c === '"') emTexto = false;
    } else if (c === '"') emTexto = true;
    else if (c === "{") nivel += 1;
    else if (c === "}") {
      nivel -= 1;
      if (nivel === 0) return i;
    }
  }
  return -1;
}

export function semJsonDeFerramenta(texto) {
  const t = String(texto ?? "");
  let saida = "";
  let i = 0;
  while (i < t.length) {
    const abre = t.indexOf("{", i);
    if (abre < 0) {
      saida += t.slice(i);
      break;
    }
    const fecha = fimDoJson(t, abre);
    const trecho = fecha < 0 ? t.slice(abre) : t.slice(abre, fecha + 1);
    if (/"p_[a-z0-9_]+"\s*:/i.test(trecho)) {
      saida += `${t.slice(i, abre)} `;
      i = fecha < 0 ? t.length : fecha + 1;
    } else {
      saida += t.slice(i, abre + 1);
      i = abre + 1;
    }
  }
  return saida;
}

export function vazamentoDeFerramenta(texto) {
  const t = String(texto ?? "");
  if (semJsonDeFerramenta(t) !== t) return true;
  return padroesDeVazamento().some((re) => new RegExp(re.source, re.flags.replace("g", "")).test(t));
}

export function limparVazamento(texto) {
  const original = String(texto ?? "");
  if (!vazamentoDeFerramenta(original)) return { texto: original, vazou: false };
  let t = semJsonDeFerramenta(original);
  for (const re of padroesDeVazamento()) t = t.replace(re, " ");
  t = t.replace(/```[a-z]*\s*```/gi, " ");
  const linhas = t.split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim().replace(/^[\s.…:;,]+/, "").replace(/\s+([.,!?])/g, "$1").trim())
    .filter((l) => /[\p{L}\p{N}]/u.test(l));
  const limpo = linhas.join("\n").trim();
  return { texto: /[\p{L}\p{N}]/u.test(limpo.replace(/P&/g, "")) ? limpo : "", vazou: true };
}

export function textoVazamentoVazio() {
  return "Desculpe, tive um problema aqui. Pode me mandar sua última mensagem de novo, por favor?";
}


export function assuntoDoPedido(mensagem) {
  const n = textoNormal(mensagem);
  if (/\b(desconto|descontos|bolsa|bolsas|abatimento|negociar|negociacao|mais barat[oa]|baixar o valor|reduzir o valor|condicao especial)\b/.test(n)) return "desconto";
  return "";
}

export function motivoDaGuarda(mensagem, pedido) {
  const m = cortarNaPalavra(String(mensagem ?? "").replace(/[\u0000-\u001f\u007f]+/g, " "), 200);
  const assunto = assuntoDoPedido(m);
  const porque = pedido ? "a família pediu para falar com uma pessoa da equipe" : "a Lili disse à família que chamaria a equipe";
  const base = `${assunto ? `${assunto}; ` : ""}${porque}`;
  const frase = base.charAt(0).toUpperCase() + base.slice(1);
  return m ? `${frase}. Última mensagem da família: ${m}` : `${frase}.`;
}
