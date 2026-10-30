// Adaptador padrão: lê o "observado" gravado (sintético) de fixtures/gravacoes/<modelo>/<id>.json. Custo zero.
import fs from "node:fs";
import path from "node:path";

export function criarReplay({ pasta = "fixtures/gravacoes" } = {}) {
  return {
    nome: "replay",
    async rodarRoteiro(modelo, roteiro) {
      const arq = path.join(pasta, modelo, `${String(roteiro.id).padStart(2, "0")}.json`);
      if (!fs.existsSync(arq)) throw new Error(`sem gravação para ${modelo} no roteiro ${roteiro.id}`);
      return JSON.parse(fs.readFileSync(arq, "utf8")).turnos;
    },
    custo: () => 0,
  };
}
