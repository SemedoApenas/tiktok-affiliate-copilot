# Setup do Creatify — Guia para o Usuário

Este documento explica como conectar o Creatify a este projeto. Nenhuma credencial real é armazenada, lida ou inferida por nenhum agente — toda configuração abaixo é feita por você, fora do controle do Claude.

Ver `pipeline/orchestration/CREATIFY-ARCHITECTURE.md` para o que está confirmado/implementado/testado.

## 1. Pré-requisito: conta Creatify

Crie uma conta em `creatify.ai` (plano gratuito inclui 10 créditos, suficiente para validação sem gasto significativo). Habilite acesso à API na sua conta — a documentação oficial (`docs.creatify.ai`) descreve onde gerar as credenciais `X-API-ID` e `X-API-KEY` dentro do painel da sua conta.

## 2. Modo B — API direta (recomendado para automação)

### Variáveis de ambiente necessárias
```
CREATIFY_API_ID=<seu-api-id>
CREATIFY_API_KEY=<sua-api-key>
```

Defina-as no seu ambiente local (shell profile, gerenciador de secrets do SO, ou mecanismo equivalente) — **nunca** em um arquivo dentro deste repositório, nunca em `pipeline/**/*.json`, nunca em um prompt de agente.

### Como testar a conexão sem gerar conteúdo pago
A API do Creatify não documenta, até onde foi verificado nesta sessão, um endpoint de "ping"/health-check gratuito. Formas seguras de validar a configuração sem consumir créditos:
1. Confirmar que as variáveis de ambiente estão definidas (`echo $CREATIFY_API_ID` — nunca imprimir `CREATIFY_API_KEY` inteira em um terminal compartilhado/log).
2. Fazer uma chamada de **leitura** documentada como gratuita (ex.: "Get avatar"/"Get voices", se confirmado como não-cobrado na documentação atual — confirme isso em `docs.creatify.ai` antes, pois não foi verificado explicitamente nesta sessão se essas consultas têm custo).
3. Não fazer nenhuma chamada de criação (`POST /api/link_to_videos/` ou equivalente) até estar pronto para consumir créditos de verdade.

### Como testar geração real
Só depois de: (a) `generation-plan.json` aprovado por um humano com `approved_by`/`approved_at` preenchidos, (b) confirmação de que o saldo de créditos é suficiente (verificado no painel da Creatify, não assumido). O `creatify-generation-subagent` então executa create→poll conforme `CREATIFY-ARCHITECTURE.md` secao 5.

### Como verificar saldo/custos
Não foi confirmado nesta sessão se existe um endpoint de saldo de créditos na API pública. Até confirmação, verifique o saldo diretamente no painel web da Creatify antes de aprovar qualquer `generation-plan.json`.

### Como desconectar
Remova as variáveis de ambiente `CREATIFY_API_ID`/`CREATIFY_API_KEY` do seu ambiente. Nenhum arquivo deste projeto precisa ser alterado (nenhuma credencial é armazenada nele).

## 3. Modo A — Creatify MCP (opcional, terceiros, não oficial)

**Importante:** não existe MCP oficial da Creatify confirmado nesta sessão. O que existe é `github.com/TSavo/creatify-mcp`, um projeto independente. Use por sua conta e risco, e apenas se você mesmo decidir instalá-lo — nenhum agente deste projeto instala isso automaticamente.

Se você optar por configurá-lo:
1. Siga as instruções do próprio repositório (`github.com/TSavo/creatify-mcp`) para adicioná-lo como servidor MCP na sua configuração do Claude Desktop/Claude Code, usando as mesmas variáveis `CREATIFY_API_ID`/`CREATIFY_API_KEY`.
2. Use-o apenas em sessões assistidas por humano (prototipagem, revisão interativa) — não como caminho de automação desatendida.
3. Quando um agente deste projeto registrar uma chamada feita neste modo, ela aparecerá em `creatify-job.json` com `integration_mode: "mcp_unofficial"`.

## 4. Diferenças entre Modo A e Modo B

Não assumir que MCP e API expõem exatamente as mesmas capacidades:
- O MCP de terceiros expõe ferramentas de alto nível (`create_avatar_video`, `create_url_to_video`, etc.) que internamente chamam a mesma API pública — mas o conjunto de 12 ferramentas listado no README daquele projeto não foi, nesta sessão, comparado campo a campo com a API oficial.
- A API oficial permite qualquer automação programática (filas, polling assíncrono, webhooks); o MCP depende de uma sessão Claude ativa.
- Se uma capacidade for necessária e só existir em um dos dois modos, isso deve ser registrado explicitamente em `CREATIFY-ARCHITECTURE.md` antes de decidir qual modo usar para aquele caso.

## 5. Escopo desta fase

Nesta fase (Fase 17), nenhuma geração real foi executada e nenhuma credencial foi configurada pelo processo de migração. Este documento prepara a configuração para quando você decidir fazer o primeiro teste real, que deve seguir a sequência AUDIT → ADAPT → VALIDATE → DRY RUN → HUMAN REVIEW antes de qualquer geração paga.
