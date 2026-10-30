
export const ESPERA_PADRAO_S = 6;
export const ESPERA_MIN_S = 3;
export const ESPERA_MAX_S = 30;
export const PRAZO_PISO_MS = 120000;
export const MENSAGENS_NA_RAJADA = 20;

export const LEITURA_ESPERA = "$('Ler contexto').first().json.lili_espera_segundos";

export function esperaSegundos(valor) {
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isInteger(n) || n < 3 || n > 30) return 6;
  return n;
}

export function prazoDoBufferMs(espera) {
  const segundos = espera === undefined ? 6 : esperaSegundos(espera);
  return Math.max(120000, 20 * segundos * 1000);
}

export function expressaoEsperaSegundos(leitura) {
  return `={{ (() => { const n = Number(${leitura}); return Number.isInteger(n) && n >= ${ESPERA_MIN_S} && n <= ${ESPERA_MAX_S} ? n : ${ESPERA_PADRAO_S}; })() }}`;
}

export function expressaoPrazoSegundos(leitura) {
  return `={{ (() => { const n = Number(${leitura}); const espera = Number.isInteger(n) && n >= ${ESPERA_MIN_S} && n <= ${ESPERA_MAX_S} ? n : ${ESPERA_PADRAO_S}; return Math.max(${PRAZO_PISO_MS / 1000}, ${MENSAGENS_NA_RAJADA} * espera); })() }}`;
}

export function lerItemDoBuffer(bruto) {
  if (bruto && typeof bruto === "object") return bruto;
  if (typeof bruto !== "string") return null;
  try {
    const item = JSON.parse(bruto);
    return item && typeof item === "object" ? item : null;
  } catch (e) {
    return null;
  }
}

export function itemDentroDoPrazo(item, agora, prazoMs) {
  const ts = Number(item?.ts);
  const momento = Number(agora);
  const prazo = Number(prazoMs);
  if (!Number.isFinite(ts) || !Number.isFinite(momento) || !Number.isFinite(prazo)) return false;
  return momento - ts <= prazo;
}

export function textosDoBuffer(lista, agora, prazoMs) {
  const prazo = Number.isFinite(Number(prazoMs)) ? Number(prazoMs) : prazoDoBufferMs();
  const textos = [];
  for (const bruto of Array.isArray(lista) ? lista : []) {
    const item = lerItemDoBuffer(bruto);
    if (!itemDentroDoPrazo(item, agora, prazo)) continue;
    const texto = String(item.texto ?? "").trim();
    if (texto) textos.push(texto);
  }
  return textos;
}

export function textoParaOAgente(lista, agora, semTexto, prazoMs) {
  const juntos = textosDoBuffer(lista, agora, prazoMs).join("\n");
  return juntos || String(semTexto ?? "");
}

export function quantidadeARemover(lista) {
  return Array.isArray(lista) ? lista.length : 0;
}

export function listaDepoisDaLimpeza(lista, n) {
  const itens = Array.isArray(lista) ? lista : [];
  const qtd = Number.isInteger(n) && n > 0 ? n : 0;
  return itens.slice(qtd);
}

export function setDaListaSoExpira(value, keyType) {
  return keyType === "list" && typeof value === "string" && value.length === 0;
}

export function msDoWhatsapp(valor) {
  if (valor == null || valor === "") return null;
  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) return null;
    return valor < 1e12 ? Math.round(valor * 1000) : Math.round(valor);
  }
  const texto = String(valor).trim();
  if (/^[0-9]+$/.test(texto)) return msDoWhatsapp(Number(texto));
  const lido = Date.parse(texto);
  return Number.isFinite(lido) ? lido : null;
}

export function horaLida(valor) {
  return msDoWhatsapp(valor);
}

export function classificarBuffer(lista, agora, prazoMs, ultimoRespondido) {
  const prazo = Number.isFinite(Number(prazoMs)) ? Number(prazoMs) : prazoDoBufferMs();
  const ultimo = msDoWhatsapp(ultimoRespondido);
  const novos = [];
  const memoria = [];
  let hora = null;
  let responder = false;
  for (const bruto of Array.isArray(lista) ? lista : []) {
    const item = lerItemDoBuffer(bruto);
    if (!itemDentroDoPrazo(item, agora, prazo)) continue;
    const texto = String(item?.texto ?? "").trim();
    const wa = msDoWhatsapp(item?.wa);
    if (ultimo != null && wa != null && wa <= ultimo) {
      if (texto) memoria.push(texto);
      continue;
    }
    responder = true;
    if (texto) novos.push(texto);
    if (wa != null && (hora == null || wa > hora)) hora = wa;
  }
  return { novos, memoria, hora, responder };
}
