# Arquitetura Creatify — TikTok Shop Video AI (Fase 17)

Este documento descreve como o Creatify se encaixa na pipeline depois da migração da Fase 17 (que sucede a Fase 16, de remoção do Higgsfield). Ele distingue explicitamente, para cada afirmação técnica:

- **CONFIRMADO PELA DOCUMENTAÇÃO** — verificado nesta sessão contra `docs.creatify.ai` / `creatify.mintlify.app` / `creatify.ai` (fontes oficiais).
- **IMPLEMENTADO NO PROJETO** — existe como agente/schema/documento neste repositório.
- **TESTADO** — foi executado de verdade contra a API real.
- **NÃO TESTADO** — implementado, mas nunca executado contra a API real.
- **NÃO CONFIRMADO** — mencionado em fontes de terceiros/marketing, mas não verificado na documentação oficial.

Nenhuma chamada real ao Creatify foi feita durante a criação deste documento ou da Fase 17 como um todo. Ver seção 18 (Configuração) e o relatório final da Fase 17 para o status de cada item.

---

## 1. Visão geral

```
Claude (cérebro/orquestrador)
  Research → Product Intelligence (dentro do research-agent)
  → Strategy → Script → Creative Brief (creative-plan.json, provider-agnostic)
  → HUMAN APPROVAL (generation-plan.json, geração paga)
  → Creatify (motor de geração)
  → [Remotion — pós-produção OPCIONAL]
  → QA
  → HUMAN APPROVAL (vídeo)
  → Publishing (DESATIVADO — ver secao 10)
  → Metrics (DEFERRED — ver secao 11)
  → Performance Analysis → Creative Iteration → novo experimento
```

O Creatify substitui o Higgsfield como motor de geração pago. A diferença arquitetural central em relação à Fase 15/16 é a **camada de abstração de provider** (secao 3): nenhum agente de research/strategy/script/creative conhece detalhes do Creatify. Só `creatify-production-agent` e `creatify-generation-subagent` conhecem.

## 2. Agentes

Ver `CLAUDE.md` para a lista completa. Novos nesta fase: `creatify-production-agent`, `creatify-generation-subagent`, `performance-analysis-agent`, `creative-iteration-agent`. Todos os demais (research/strategy/script/creative/remotion/qa/orchestrator) foram preservados e adaptados pontualmente — nenhum foi reescrito do zero.

## 3. Subagentes

`creatify-generation-subagent` é o único subagente com acesso técnico real ao Creatify (API ou MCP de terceiros). `asset-validation-subagent` continua genérico (ffprobe), reativado com o Creatify como chamador. Nenhum subagente de research/strategy/script/creative foi modificado para conhecer o Creatify — essa separação é deliberada (ver `creative-agent.md`).

## 4. Creatify MCP

**NÃO CONFIRMADO como oficial.** A documentação oficial (`docs.creatify.ai/api-documentation/`) não menciona MCP em nenhum lugar verificado nesta sessão. O único servidor MCP encontrado é `github.com/TSavo/creatify-mcp`:

- Projeto de terceiros, independente, não afiliado à Creatify (sem endosso encontrado da empresa).
- Licença MIT, mantenedor individual ("T Savo").
- Embrulha a API pública do Creatify usando as credenciais do próprio usuário (`CREATIFY_API_ID`, `CREATIFY_API_KEY` como variáveis de ambiente do servidor MCP).
- Expõe 12+ ferramentas, incluindo (nomes exatos do README do projeto, não inventados): `create_avatar_video`, `create_url_to_video`, `generate_text_to_speech`, `create_multi_avatar_conversation`, `create_custom_template_video`, `create_ai_edited_video`, `create_ai_shorts`, `generate_ai_script`, `create_custom_avatar`, `manage_music`, `create_advanced_lipsync`, `get_video_status`, `how_to_use`.

**Decisão de arquitetura:** este projeto trata o Modo A (MCP) como um modo assistido/opcional, nunca como a integração padrão de automação, e sempre rotulado como não-oficial em `creatify-job.schema.json.integration_mode: "mcp_unofficial"`. Se a Creatify publicar um MCP oficial no futuro, este documento deve ser atualizado antes de qualquer agente assumir isso.

## 5. Creatify API (Modo B — padrão)

**CONFIRMADO PELA DOCUMENTAÇÃO:**
- Base URL: `https://api.creatify.ai`.
- Autenticação: headers `X-API-ID` e `X-API-KEY`.
- Padrão assíncrono create→poll: `POST` cria job (`status: pending`), `GET .../{id}/` consulta progresso; `webhook_url` opcional para notificação assíncrona.
- Vocabulário de status observado: `pending`, `in_queue`, `running`, `failed`, `done`.
- Família de endpoint com método+path totalmente confirmados nesta sessão:
  - `POST /api/links/` — cria um link (extração de metadados de uma URL de produto).
  - `PUT /api/links/{id}/` — atualiza metadados do link.
  - `POST /api/link_to_videos/` — gera vídeo a partir de um link já criado.
  - `GET /api/link_to_videos/{id}/` — consulta status/resultado.

**Documentado, mas NÃO verificado endpoint a endpoint nesta sessão** (existem como categorias na navegação da documentação, método/path exatos não confirmados): Avatares/lipsync, geração de voz (TTS), AI Shorts, AI Editing. Antes de qualquer agente usar uma dessas famílias, `creatify-generation-subagent` deve confirmar o método/path exato em `docs.creatify.ai` — nunca assumir pelo padrão de `link_to_videos`.

## 6. Provider abstraction

Este projeto **não tem código de aplicação executável** para geração de vídeo (todo o restante da pipeline também é agentes de prompt + schemas JSON, não uma aplicação TypeScript compilada). Por isso, a abstração `video-generation-provider` pedida na Fase 17 é implementada como **contrato documental + de schema**, não como uma interface de código:

- O "contrato" é `pipeline/schemas/generation-plan.schema.json` + `pipeline/schemas/asset-manifest.schema.json` — ambos provider-agnostic, sem nenhum campo específico do Creatify.
- O provider concreto (`CreatifyProvider`) é a combinação de `creatify-production-agent` + `creatify-generation-subagent` + `pipeline/schemas/creatify-job.schema.json` (schema que SÓ este par de agentes lê/escreve).
- Um provider futuro (`OutroProvider`) substituiria apenas esse par de agentes + um novo `outro-job.schema.json`, sem exigir nenhuma mudança em research/strategy/script/creative/remotion/qa.
- Implementar isso como uma interface TypeScript real seria prematuro: não há aplicação rodando essa lógica hoje, e criar código não-testado só por completude contradiz a regra da Fase 17 de não inventar capacidade. Se/quando o projeto ganhar uma camada de aplicação real (ex.: para automação em fila, seção 5 modo B em escala), essa interface deve ser implementada em código nesse momento, usando este contrato de schema como especificação.

## 7. Geração

Fluxo técnico completo (Modo B): `creative-plan.json` aprovado → `creatify-production-agent` monta `generation-plan.json` (`status: awaiting_approval`) → **aprovação humana explícita** → `creatify-generation-subagent` chama a API (create → poll → done/failed) → registra `creatify-job.json` por chamada → `asset-validation-subagent` valida tecnicamente → `creatify-production-agent` consolida `asset-manifest.json`.

**Status: NÃO TESTADO.** Nenhuma chamada real foi feita durante a Fase 17.

## 8. QA

`qa-agent` e seus 3 subagentes foram preservados sem reescrita — já eram genéricos (ffprobe/inspeção visual/checklist TikTok), não assumiam Higgsfield nem Remotion como única fonte. Ajuste desta fase: `qa-agent.md` agora aceita `asset-manifest.json` como entrada alternativa a `video-manifest.json`, para o caso em que o Remotion for pulado (Creatify entrega vídeo final pronto).

## 9. Custos

**CONFIRMADO PELA DOCUMENTAÇÃO/pesquisa:** cobrança em créditos, variável por modelo/endpoint. Valores observados nesta sessão (fonte: `docs.creatify.ai`, página do endpoint `link_to_videos`, mais artigos de terceiros para contexto de plano — tratar os últimos como referência, não como fonte primária de preço):
- Modelo "Standard": ~5 créditos por 30s.
- "Aurora v1": ~1 crédito por segundo.
- "Aurora v1 Fast": ~0.5 crédito por segundo.
- "Boreal": ~10 créditos por 30s.
- Plano gratuito: 10 créditos. Planos pagos (Starter/Pro) mencionados por fontes de terceiros — **NÃO CONFIRMADO** o valor exato/atual em `docs.creatify.ai` diretamente; confirmar no painel da conta antes de qualquer aprovação de orçamento real.

**Regra do projeto (herdada do modelo Higgsfield, não específica de provider):** `MAX_GENERATION_ATTEMPTS = 1` por asset por rodada de aprovação; `MAX_RETRIES = 2` para falha técnica. `creatify-production-agent` nunca deve assumir "1 vídeo = X créditos fixo" — sempre citar a tarifa do modelo usado e, se não confirmada, marcar `credits_estimate_basis` como não confirmado em vez de estimar.

## 10. Publicação

**NÃO CONFIRMADO.** A documentação oficial da API (`docs.creatify.ai`) não expõe nenhum endpoint de publicação direta em rede social — a API entrega apenas arquivo de vídeo e thumbnail. Existe uma feature de produto chamada "AI Media Buyer" (`creatify.ai/features/media-buyer`) com "integração one-click" a Meta, Google Ads, TikTok, Snap Ads, AppLovin, OpenAI Ads, Shopify e GA4 — mas isso é sobre **conectar contas de mídia paga para rodar anúncios**, um conceito diferente de "publicar um post orgânico via API", e não foi verificado em nível de endpoint/permissão nesta sessão.

**Decisão de arquitetura:** `publishing-agent` continua com `tools: none`, desativado. Os schemas `publishing-metadata.schema.json` e `platform-account.schema.json` foram criados/adaptados para estarem prontos estruturalmente, mas `publish_capability` tem `not_confirmed` como valor padrão seguro — nenhum agente pode assumir `publish_supported` sem uma fonte documentada em `capability_source`.

## 11. Métricas

**NÃO IMPLEMENTADO.** Nenhuma integração de analytics (TikTok Analytics, Meta Insights, YouTube Analytics, etc.) foi pesquisada ou construída nesta fase — está fora do escopo desta migração (que é sobre o motor de geração, não sobre analytics). `pipeline/schemas/metrics.schema.json` existe como contrato de dados para quando essa integração for feita; todo campo é `null` até então, e o status `unavailable` deve ser usado explicitamente em vez de omitir o artefato.

## 12. Performance loop

`performance-analysis-agent` e `creative-iteration-agent` (novos, `NÃO TESTADO`) implementam o loop conceitual `video → métricas → análise → aprendizado → novo criativo`, consumindo `experiment.schema.json`. Ambos dependem de `metrics.json` populado, que por sua vez depende da integração da seção 11 — ou seja, o loop está **implementado estruturalmente mas não pode rodar de ponta a ponta** até a coleta de métricas existir.

## 13. Gates (aprovações humanas)

Preservados e expandidos:
- **Gate 1** — aprovação de `generation-plan.json` antes de qualquer chamada Creatify (igual ao antigo gate Higgsfield).
- **Gate 2** — aprovação de vídeo após QA (já existia).
- **Gate 3** — aprovação de publicação, separada da aprovação de vídeo (já existia no schema, nunca ativa porque Publishing está desativado).
- Nenhum gate foi removido ou enfraquecido "porque o Creatify torna mais simples", conforme exigido.

## 14. Segurança

- Nenhuma credencial Creatify é lida, armazenada ou impressa por nenhum agente. `CREATIFY_API_ID`/`CREATIFY_API_KEY` vivem exclusivamente em variáveis de ambiente do usuário — ver `CREATIFY-SETUP.md`.
- `.claude/settings.json` adiciona `permissions.ask` para `Bash(curl *api.creatify.ai*)` e `Bash(curl *creatify*)` — gate estrutural equivalente ao que existia para `higgsfield`/`higgs`/`hf`, adaptado ao fato de que o Creatify não tem CLI própria (a superfície de risco é a chamada HTTP, não um binário).
- Nenhuma skill Creatify foi instalada ou inventada (não existe uma disponível no ambiente).

## 15. Retries

`MAX_GENERATION_ATTEMPTS = 1`, `MAX_RETRIES = 2` (falha técnica apenas) — preservados de POLICIES.md, agora expressos em `generation-plan.schema.json` e `creatify-job.schema.json` de forma provider-agnostic.

## 16. Limitações conhecidas

- Só uma família de endpoint Creatify (`link_to_videos`) tem método/path 100% confirmados; as demais precisam de verificação antes do primeiro uso real.
- Nenhum MCP oficial existe; o único disponível é de terceiros e não deve ser tratado como suportado pela Creatify.
- Nenhuma capacidade de publicação direta foi confirmada.
- Nenhuma integração de métricas/analytics existe.
- O valor exato de créditos por plano pago não foi confirmado na fonte primária (só o custo por modelo/endpoint foi).

## 17. Dependências

Nenhuma dependência nova foi instalada no projeto (`package.json` inalterado). A integração Creatify, quando testada de verdade, dependerá de: uma conta Creatify com API habilitada (`CREATIFY_API_ID`/`CREATIFY_API_KEY`) e, opcionalmente, do servidor MCP de terceiros `TSavo/creatify-mcp` se o usuário decidir usar o Modo A.

## 18. Configuração

Ver `pipeline/orchestration/CREATIFY-SETUP.md`.
