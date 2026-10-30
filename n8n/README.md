# Workflows n8n (sanitizados)

Gerados por `node scripts/sanitizar-n8n.mjs --entrada <pasta-original>` e conferidos por
`npm run sanitizar:verificar` (varredura de padrões sensíveis + validação de estrutura; com `--entrada`, também compara
nós, tipos, versões e conexões com o original).

## Importar num n8n local (opcional; não é preciso para `npm run bench`)
1. Suba um n8n descartável, por exemplo `docker run -it --rm -p 5678:5678 docker.n8n.io/n8nio/n8n`.
2. Copie `.env.exemplo` para `.env`, preencha com os seus valores e passe as variáveis ao container.
3. Importe `enviar-whatsapp.json` primeiro e anote o id; troque `__WF_ENVIAR_WHATSAPP__` nos outros pelo id.
4. Crie as credenciais `redis` e `openAiApi` e associe-as nos nós marcados `CREDENCIAL_*`.
5. Os caminhos dos webhooks viraram `exemplo-N`; ajuste se quiser.
6. URLs literais viraram `https://example.invalid` (a de transcrição manteve o caminho da API): ajuste para o seu provedor.

O fluxo espera um banco com as funções chamadas pelos nós HTTP. Elas não estão no repositório; `exemplos/sql/` mostra
a ideia com tabelas sintéticas.
