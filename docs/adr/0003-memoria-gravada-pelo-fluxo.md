# ADR 0003: memória longa gravada pelo fluxo, não pelo modelo

**Contexto.** No incidente de 19/10 o atendente pediu de novo dados já dados. A memória só era gravada quando o modelo chamava a ferramenta, e às vezes ele não chamava.

**Decisão.** O fluxo lê a memória longa antes do agente e a entrega no prompt; depois do turno, o fluxo grava. O modelo não precisa lembrar de chamar nada.

**Consequência.** A coleta deixa de depender do humor do modelo. A bancada cobra a leitura (`memoriaLida`) e o conteúdo (`memoria`). Custo: mais uma leitura e uma escrita por turno.
