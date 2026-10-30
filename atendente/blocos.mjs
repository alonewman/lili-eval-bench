
export function limiteDeBlocos() {
  return 4;
}

export function ehItemDeLista(linha) {
  return /^\s*(?:[-•*]|\d{1,2}[.)])\s+\S/.test(String(linha ?? ""));
}

export function abreLista(bloco) {
  const linhas = String(bloco ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const ultima = linhas[linhas.length - 1] || "";
  return ehItemDeLista(ultima) || /:$/.test(ultima);
}

export function quebrarEmBlocos(texto, limite, linhaEmBranco) {
  const original = String(texto ?? "");
  const bruto = linhaEmBranco === true ? original.replace(/\r?\n[ \t]*\r?\n\s*/g, "P&") : original;
  if (!bruto.includes("P&")) return [original];
  const max = Number.isInteger(limite) && limite > 0 ? limite : limiteDeBlocos();
  const juntos = [];
  for (const parte of bruto.split("P&").map((p) => p.trim()).filter(Boolean)) {
    const anterior = juntos[juntos.length - 1];
    if (anterior !== undefined && ehItemDeLista(parte.split("\n")[0]) && abreLista(anterior)) {
      juntos[juntos.length - 1] = `${anterior}\n${parte}`;
    } else {
      juntos.push(parte);
    }
  }
  if (!juntos.length) return [""];
  if (juntos.length <= max) return juntos;
  return [...juntos.slice(0, max - 1), juntos.slice(max - 1).join("\n\n")];
}

export function textoSemMarcador(texto) {
  return quebrarEmBlocos(texto, 1)[0];
}

export function ehFechamento(bloco) {
  const n = String(bloco ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (!n || n.length > 80) return false;
  if (/\bposso ajudar\b/.test(n)) return true;
  if (/\b(mais algo|algo mais)\b/.test(n)) return true;
  if (/\bmais alguma (coisa|informacao|duvida|pergunta)\b/.test(n)) return true;
  return false;
}

export function ordenarSaidaComAnexo(blocosEntrada, anexos) {
  function frasesDoBloco(bloco) {
    const protegido = String(bloco ?? "").replace(/(\d)\.(\d)/g, "$1\u0000$2");
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

  const lista = (Array.isArray(blocosEntrada) ? blocosEntrada : [String(blocosEntrada ?? "")]).map((b) => String(b ?? ""));
  const arquivos = (Array.isArray(anexos) ? anexos : []).filter((a) => a && a.item_id);
  if (!arquivos.length) {
    const textos = lista.length ? lista : [""];
    return textos.map((bloco, indice) => ({ tipo: "texto", bloco, indice, total: textos.length }));
  }
  const conteudo = [];
  const fechamentos = [];
  for (const bloco of lista) {
    const frases = frasesDoBloco(bloco);
    if (!frases.length) continue;
    let i = frases.length;
    const finais = [];
    while (i > 0 && ehFechamento(frases[i - 1])) {
      finais.unshift(frases[i - 1]);
      i -= 1;
    }
    if (!finais.length) {
      if (bloco.trim()) conteudo.push(bloco);
      continue;
    }
    const corpo = frases.slice(0, i).join(" ").trim();
    if (corpo) conteudo.push(corpo);
    fechamentos.push(...finais);
  }
  const itens = [
    ...conteudo.map((bloco) => ({ tipo: "texto", bloco })),
    ...arquivos.map((a) => ({
      tipo: "anexo",
      bloco: "",
      item_id: String(a.item_id),
      nome: String(a.nome ?? ""),
      mime: String(a.mime ?? ""),
      mediatype: a.mediatype === "document" || a.mediatype === "image" ? a.mediatype : "",
      categoria: String(a.categoria ?? ""),
      item: String(a.item ?? ""),
    })),
    ...fechamentos.map((bloco) => ({ tipo: "texto", bloco })),
  ];
  if (!itens.length) return [{ tipo: "texto", bloco: "", indice: 0, total: 1 }];
  return itens.map((item, indice) => ({ ...item, indice, total: itens.length }));
}
