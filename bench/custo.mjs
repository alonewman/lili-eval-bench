// Estimativa de custo antes de gastar e teto. Os preços abaixo são de EXEMPLO (não são tabela oficial):
// troque pelos preços vigentes do seu provedor antes de usar o modo real.
export const TETO_USD = 20;
export const RODADAS = 2;
export const TOKENS_ENTRADA = 16400;
export const TOKENS_SAIDA = 150;
export const SEGUNDOS_AUDIO = 30;
export const MODELO_AUDIO = "transcricao-exemplo";

export const PRECOS_EXEMPLO = [
  { modelo: "gpt-4o", entrada_usd_1m: 2.5, saida_usd_1m: 10, vigente_desde: "exemplo" },
  { modelo: "candidato-A", entrada_usd_1m: 0.4, saida_usd_1m: 1.6, vigente_desde: "exemplo" },
  { modelo: "candidato-B", entrada_usd_1m: 0.1, saida_usd_1m: 0.5, vigente_desde: "exemplo" },
  { modelo: "transcricao-exemplo", audio_usd_min: 0.006, vigente_desde: "exemplo" },
];

export function precoDe(precos, modelo) {
  const lista = (precos ?? []).filter((p) => p.modelo === modelo);
  if (!lista.length) throw new Error(`preço ausente para ${modelo}`);
  return lista.slice().sort((a, b) => String(b.vigente_desde).localeCompare(String(a.vigente_desde)))[0];
}

export function custoChat(preco) {
  if (preco?.entrada_usd_1m == null || preco?.saida_usd_1m == null) throw new Error(`preço de chat ausente para ${preco?.modelo ?? "?"}`);
  return (TOKENS_ENTRADA * Number(preco.entrada_usd_1m) + TOKENS_SAIDA * Number(preco.saida_usd_1m)) / 1e6;
}

export function custoAudio(preco, segundos) {
  if (preco?.audio_usd_min == null) throw new Error(`preço de áudio ausente para ${preco?.modelo ?? "?"}`);
  return (Number(segundos) / 60) * Number(preco.audio_usd_min);
}

// Teto (sem cache): tokens fixos por turno x turnos x rodadas x modelos, mais o áudio.
export function estimarCusto({ roteiros, precos = PRECOS_EXEMPLO, modelos, rodadas = RODADAS } = {}) {
  if (!Number.isInteger(rodadas) || rodadas < 1) throw new Error("rodadas inválidas");
  if (!modelos?.length) throw new Error("nenhum modelo");
  const turnos = (roteiros ?? []).flatMap((r) => r.turnos ?? []);
  const chats = turnos.filter((t) => !t.audio);
  const audios = turnos.filter((t) => t.audio);
  const porModelo = modelos.map((modelo) => {
    const porTurno = custoChat(precoDe(precos, modelo));
    return { modelo, porTurno, turnos: chats.length, rodadas, total: porTurno * chats.length * rodadas };
  });
  const audioUnit = audios.length ? custoAudio(precoDe(precos, MODELO_AUDIO), SEGUNDOS_AUDIO) : 0;
  const audioTotal = audioUnit * audios.length * modelos.length * rodadas;
  const total = porModelo.reduce((s, m) => s + m.total, 0) + audioTotal;
  if (!Number.isFinite(total)) throw new Error("estimativa inválida");
  return { turnos: chats.length, audios: audios.length, rodadas, modelos: porModelo, audioTotal, total, teto: TETO_USD };
}

export function recusarSeAcimaDoTeto(total, { confirmar = false } = {}) {
  if (!Number.isFinite(total)) throw new Error("estimativa inválida");
  if (total > TETO_USD && !confirmar) {
    throw new Error(`Estimativa US$ ${total.toFixed(4)} passa de US$ ${TETO_USD}. Passe --confirmar-gasto para rodar mesmo assim.`);
  }
  return total;
}
