# Critérios de avaliação

## Por turno (`avaliarTurno`)
Cada item vira uma falha do turno:
- erro de execução;
- vazamento de chamada de ferramenta no texto, ou a conferência ter limpado um vazamento;
- turno de áudio sem transcrição;
- `memoriaLida`: o fluxo não leu a memória longa antes do agente;
- `avisaEquipe`: a equipe não recebeu "Precisa de atendimento humano" + "Resumo da conversa", ou o aviso tem defeito de formato;
- `avisoContem`: o aviso não traz os dados que a família deu;
- `memoria`: a memória longa gravada não tem a chave/valor esperado;
- `visitasNoMaximo`: mais visitas ativas que o permitido (pedido repetido não duplica);
- `ferramentas` (na ordem) e `proibidas`;
- `contem` / `naoContem` no texto (um item de `contem` pode ser lista de formas aceitas); `entradasNaoContem` nas entradas das ferramentas;
- `blocosMinimo` / `blocosMaximo` / `ordem` (mensagem dividida em blocos, sem marcador `P&` visível).

## Por roteiro (`julgarRoteiro`)
Alguma falha → `falha` se o roteiro é crítico, senão `aviso`; turno de áudio sem gravação → `pendente`; senão `ok`.
Entre rodadas vale o pior resultado (`juntarRodadas`).

## Por modelo (`avaliarModelo`) e escolha (`escolherModelo`)
- `gpt-4o` é a régua: roda para comparação e nunca é escolhido.
- Reprova com 1 roteiro crítico em falha, com mais de 3 avisos ou com pendência.
- Entre os aprovados, escolhe o de menor custo. Sem custo de algum aprovado, não escolhe.

## Custo (`bench/custo.mjs`)
Estimativa de teto por tabela, sem cache: 16.400 tokens de entrada e 150 de saída por turno, 30 s por áudio,
x turnos x rodadas x modelos. Teto de US$ 20: acima disso o modo real recusa sem `--confirmar-gasto`.
A tabela de preços do repositório é de exemplo; o modo replay custa US$ 0.

## Roteiros
50 roteiros (38 críticos) em `bench/roteiros/roteiros.json`, agrupados por `criterio` (início, coleta, valores, visita,
humano, memória, blocos, escopo, injeção etc.). Textos sintéticos: nomes, datas e escolas são fictícios.
Os roteiros marcados "incidente 19/10" e os "caso real N, reescrito" nasceram de falhas observadas e foram reescritos sem dados reais.
