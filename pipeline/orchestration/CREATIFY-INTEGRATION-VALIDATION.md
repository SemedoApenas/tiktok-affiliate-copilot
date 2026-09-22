# Creatify Integration — Validation Report (Fase 17, Auditoria Real)

Esta é uma auditoria investigativa, não uma fase de produção. Nenhuma chamada real foi feita a nenhuma API paga. Todo dado abaixo é rotulado com um dos status:

`CONFIRMADO DOCUMENTALMENTE` · `CONFIRMADO EMPIRICAMENTE` · `PARCIALMENTE CONFIRMADO` · `NÃO CONFIRMADO` · `NÃO DISPONÍVEL` · `NÃO TESTADO`

Fontes primárias usadas: `docs.creatify.ai` (incluindo o índice `docs.creatify.ai/llms.txt`), `creatify.ai/features/media-buyer`, `developers.tiktok.com` (Content Posting API), `business-api.tiktok.com`/documentação de Business/Display API. Fontes de terceiros (artigos de preço, o projeto `TSavo/creatify-mcp`) são citadas apenas como "TERCEIRO" e nunca tratadas como fonte primária.

---

## 1. Executive Summary

Nenhuma credencial Creatify está configurada neste ambiente (`CREATIFY_API_ID`/`CREATIFY_API_KEY` ausentes — verificado, não impresso). Por isso, **nenhum teste empírico foi possível nesta fase** — toda a validação é documental. A pesquisa aprofundada desta fase (mais completa que a da Fase 17 anterior, que só havia confirmado a família `link_to_videos`) encontrou um catálogo de API muito maior do que o documentado até então, incluindo um endpoint de saldo de créditos real e a família `product_to_videos` — provavelmente mais adequada ao caso de uso deste projeto (produto → vídeo) do que `link_to_videos`. A descoberta mais importante desta fase é sobre publicação: **a Creatify não publica nada organicamente em nenhuma plataforma** (confirmado: a única integração de plataforma que a Creatify oferece é "AI Media Buyer", exclusivamente para anúncios pagos). A publicação orgânica no TikTok é tecnicamente possível, mas via uma API **completamente separada e não relacionada à Creatify** — a TikTok Content Posting API (Direct Post), que exige registro de app próprio, OAuth por usuário e um processo de auditoria da TikTok antes de permitir posts públicos. Métricas têm o mesmo padrão: existem APIs oficiais da TikTok (Display API, Business API), mas nenhuma integração foi construída, e nenhuma delas depende da Creatify.

## 2. API Oficial Creatify

**Base URL:** `https://api.creatify.ai` — CONFIRMADO DOCUMENTALMENTE.
**Autenticação:** headers `X-API-ID` + `X-API-KEY` — CONFIRMADO DOCUMENTALMENTE.

### Endpoints confirmados (catálogo completo encontrado em `docs.creatify.ai/llms.txt`, nesta fase — mais completo que o levantado na Fase 17 anterior)

| Família | Método/path confirmado literalmente | Custo (CONFIRMADO/billing.md) | Status |
|---|---|---|---|
| Link-to-Video | `POST /api/link_to_videos/`, `GET /api/link_to_videos/{id}/`, `POST /api/links/`, `PUT /api/links/{id}/` | 5 créditos/30s (padrão); preview 1 crédito/30s; render 4 créditos/30s | CONFIRMADO DOCUMENTALMENTE (path exato) |
| Product-to-Video | `POST /api/product_to_videos/gen_image/`, `POST /api/product_to_videos/{id}/gen_video/`, `GET /api/product_to_videos/{id}/`, + `regen_image/`/`regen_video/` | 2 créditos/imagem ou 10 créditos/30s (vídeo) — segundo billing.md | CONFIRMADO DOCUMENTALMENTE (path exato) — **família mais próxima do caso de uso deste projeto** |
| Workspace / Créditos | `GET /api-reference/workspace/get-remainingcredits` | não teria custo (não afirmado explicitamente) | CONFIRMADO DOCUMENTALMENTE que o endpoint existe; retorno exato não verificado |
| Aurora (avatar de imagem) | Create/Get task (path exato não capturado nesta sessão, só a existência e o custo) | 1 crédito/s (v1), 0.5 crédito/s (fast) | PARCIALMENTE CONFIRMADO |
| Boreal (text-to-video) | idem | 1 crédito/10s@720p, 3/10s@1080p, 12/10s@2K | PARCIALMENTE CONFIRMADO |
| AI Avatar / Lipsync v1 e v2 | idem | 5 créditos/30s; preview 1/30s; render 4/30s | PARCIALMENTE CONFIRMADO |
| Custom Avatars (BYOA) | Create/list/delete (processamento de 1-2 dias) | não informado | PARCIALMENTE CONFIRMADO |
| Custom Templates | Create/preview/render | 5 créditos/30s; preview 1/30s; render 4/30s | PARCIALMENTE CONFIRMADO |
| AI Generation (endpoint unificado) | Create task + get models/schemas | não informado | PARCIALMENTE CONFIRMADO — pode ser o endpoint recomendado pela Creatify hoje em vez de escolher família manualmente; não investigado a fundo nesta fase |
| Ad Clone | Create/get | não informado | PARCIALMENTE CONFIRMADO |
| Text-to-Speech | Generate/get | 1 crédito/30s | CONFIRMADO DOCUMENTALMENTE (existência+custo), path exato não capturado |
| IAB Images / HTML Interactive Ads | Create/list/get | 2 créditos/request; 10 créditos/ad | PARCIALMENTE CONFIRMADO |
| AI Scripts | Generate/get | 1 crédito/request | PARCIALMENTE CONFIRMADO |
| Voices / Music | Get/clone/delete | não informado | PARCIALMENTE CONFIRMADO |
| AI Shorts | Create/preview/render | 5 créditos/30s; preview 1/30s; render 4/30s | PARCIALMENTE CONFIRMADO |
| AI Editing | Create/preview/render | 5 créditos/30s; preview 1/30s; render 4/30s | PARCIALMENTE CONFIRMADO |

### Geração
Padrão assíncrono confirmado, mas **o vocabulário de status NÃO é uniforme entre famílias** — achado novo desta fase: `link_to_videos` usa `pending → in_queue → running → done/failed`; `product_to_videos` usa uma máquina de estados diferente: `initializing → image_generating → image_generated → video_generating → video_generated`. **Correção recomendada:** `creatify-job.schema.json.provider_status` (Fase 17 anterior) assume o vocabulário de `link_to_videos` como se fosse universal — isso é uma divergência real (ver seção 13).

### Polling
CONFIRMADO — `GET .../{id}/` em toda família observada.

### Webhook
`webhook_url` como parâmetro opcional em pelo menos `link_to_videos` e `product_to_videos` — CONFIRMADO DOCUMENTALMENTE ao nível de parâmetro. Uma página dedicada de documentação de webhook (formato de payload, autenticação/assinatura do callback, proteção contra spoofing) **NÃO foi encontrada** no índice de documentação (`llms.txt` explicitamente aponta a ausência) — NÃO CONFIRMADO em nível de segurança/formato.

## 3. Teste Empírico

**Executado: NÃO.**
**Motivo:** `CREATIFY_API_ID` e `CREATIFY_API_KEY` estão **ausentes** deste ambiente (verificado via variável de ambiente, nunca impresso). Sem credenciais, nenhuma chamada — nem sequer o "Get Remaining Credits", que não exige geração — pôde ser tentada.
**Autorização humana:** não solicitada, porque não havia nada a autorizar (sem credenciais, não existe decisão de "gastar crédito" a ser tomada ainda).
**Custo:** N/A.
**Resultado:** N/A. Esta fase permanece 100% documental para tudo que envolveria uma chamada real.

## 4. Geração de Vídeo

- **Via API oficial:** CONFIRMADO DOCUMENTALMENTE que é possível (múltiplas famílias, ver seção 2). **NÃO TESTADO** empiricamente.
- **Via MCP:** único servidor existente é `TSavo/creatify-mcp`, terceiro, não oficial — reconfirmado nesta fase, nenhuma mudança em relação à Fase 17 anterior. NÃO CONFIRMADO como oficial, NÃO TESTADO, NÃO instalado.
- **Endpoint recomendado para o caso de uso deste projeto (produto → vídeo curto):** `product_to_videos` (input = URL de imagem do produto) é mais direto do que `link_to_videos` (que exige criar um "link" primeiro, pensado para páginas de produto/URLs de e-commerce completas). Nenhum dos dois foi testado.

## 5. Publicação no TikTok

| Investigação | Status |
|---|---|
| A. Creatify API — publicar vídeo diretamente | **NÃO DISPONÍVEL.** Nenhum endpoint de publicação em nenhuma família do catálogo (seção 2). |
| B. Creatify interface (produto/dashboard) | **NÃO DISPONÍVEL** para publicação orgânica — só "AI Media Buyer" (anúncios pagos), confirmado explicitamente na página oficial `creatify.ai/features/media-buyer`: "conecta contas de anúncio, audita gasto, constrói e lança campanhas" — é gestão de mídia paga, não postagem orgânica. Nenhuma menção a TikTok Shop nessa página. |
| C. Integração TikTok dentro da Creatify | **NÃO DISPONÍVEL** para orgânico; **CONFIRMADO** para conexão de conta de anúncios (AI Media Buyer). |
| D. TikTok Content Posting API (Direct Post) | **CONFIRMADO DOCUMENTALMENTE** — API oficial da própria TikTok (`developers.tiktok.com`), **totalmente independente da Creatify**. Publica vídeo diretamente na conta do usuário programaticamente. Requer: app TikTok Developer próprio (`client_key`/`client_secret`), OAuth do usuário com escopo `video.publish`, e **auditoria da TikTok** antes de permitir posts públicos — apps não auditados só conseguem postar em modo privado (`unaudited_client_can_only_post_to_private_accounts`). |
| E. TikTok Shop API — publicação de vídeo | **NÃO CONFIRMADO.** `partner.tiktokshop.com` (Partner Center) documenta APIs de loja/produto/analytics/webhooks, mas esta pesquisa não confirmou um endpoint específico de "publicar vídeo de produto". Requer investigação direta adicional no Partner Center antes de qualquer afirmação. |
| F. Publicação orgânica (conclusão) | **DEPENDE DE TERCEIRO** — tecnicamente possível, mas exclusivamente via um app TikTok Developer próprio, registrado e (para alcance público) auditado pela TikTok. Nada disso existe hoje neste projeto (`CLAUDE.md` já registrava "Integração com TikTok API: OFF, não existe, não foi desenhada" — confirmado permanecer verdadeiro). |
| G. Publicação de anúncios pagos | **CONFIRMADO DISPONÍVEL** via Creatify AI Media Buyer, mas fora do escopo desta pipeline (que é sobre conteúdo orgânico) e não investigado a fundo (não é objetivo do projeto tal como definido em `CLAUDE.md`). |

**Não foi tentado nenhum contorno.** `publishing-agent` permanece `tools: none`.

## 6. TikTok Shop

Confirmado que existe uma API dedicada (`partner.tiktokshop.com`), com seções para Shops, categorias de produto, e Analytics. **NÃO CONFIRMADO** nesta sessão: (a) se há um endpoint de publicação de vídeo de produto especificamente, (b) requisitos de conta de vendedor/seller center para acessá-la, (c) se essa API tem qualquer relação com a Creatify (não encontrada nenhuma menção cruzada em nenhuma das duas documentações). Tratar como uma terceira integração completamente separada, não pesquisada em profundidade — próximo passo recomendado (seção 18).

## 7. Métricas

| Métrica | Fonte | API | Status |
|---|---|---|---|
| views, likes, comments, shares, (saves em alguns casos) | conta própria do usuário | TikTok Display API | CONFIRMADO DOCUMENTALMENTE — leitura, requer OAuth por usuário, só a própria conta, não permite monitorar concorrentes |
| views totais (orgânico + pago combinados), reach, watch time, completion rate, impression sources, audience countries | conta de negócio | TikTok Business API (`/business/video/list/`) | CONFIRMADO DOCUMENTALMENTE — campos avançados só disponíveis após o vídeo estar ativo por >7 dias |
| GMV, product clicks, orders, TikTok Shop analytics | TikTok Shop Partner Center | NÃO CONFIRMADO nesta sessão — existência da seção "Analytics" confirmada, detalhe de métricas não investigado |
| CTR, conversions, CPA, ROAS (ads) | TikTok Ads / Creatify AI Media Buyer | disponível apenas no contexto de mídia paga, não de vídeo orgânico | CONFIRMADO DISPONÍVEL, mas fora do escopo orgânico deste projeto |

Nenhuma dessas APIs de métricas tem qualquer relação com a Creatify — são integrações TikTok separadas, nenhuma construída neste projeto.

## 8. Performance Loop

```
PRODUTO → RESEARCH → STRATEGY → SCRIPT → CREATIVE → CREATIFY → VIDEO → TIKTOK → METRICS → PERFORMANCE ANALYSIS → CREATIVE ITERATION → CREATIFY → NOVO VIDEO
```

| Seta | Status |
|---|---|
| PRODUTO → RESEARCH → STRATEGY → SCRIPT → CREATIVE | CONFIRMADO (agentes implementados, testados estruturalmente em dry-run-001, não com produto real) |
| CREATIVE → CREATIFY | PARCIAL — `generation-plan.json`/`creative-plan.json` provider-agnostic implementados; geração real NÃO TESTADA (sem credenciais) |
| CREATIFY → VIDEO | PARCIAL — tecnicamente confirmado que a API entrega `generated_video_url`; NÃO TESTADO |
| VIDEO → TIKTOK | PARCIAL — tecnicamente possível via TikTok Content Posting API, mas exige integração própria (app+auditoria) não construída; `publishing-agent` desativado por decisão |
| TIKTOK → METRICS | PARCIAL — APIs oficiais existem (Display/Business API), nenhuma integração construída |
| METRICS → PERFORMANCE ANALYSIS | IMPOSSÍVEL COM AS FERRAMENTAS ATUAIS — `performance-analysis-agent` só lê `metrics.json`, que nunca será populado sem a seta anterior |
| PERFORMANCE ANALYSIS → CREATIVE ITERATION → CREATIFY (novo ciclo) | PARCIAL — agentes implementados estruturalmente, mas dependem de todas as setas anteriores funcionarem primeiro |

## 9. Claude como Orchestrator

| Componente | Classificação |
|---|---|
| Research/Strategy/Script/Creative (planejamento) | AUTOMATIZÁVEL AGORA — sem dependência externa, já implementado |
| Creatify (geração) | AUTOMATIZÁVEL COM CONFIGURAÇÃO — precisa de `CREATIFY_API_ID`/`CREATIFY_API_KEY` (ausentes hoje) |
| QA técnico (ffprobe) | AUTOMATIZÁVEL AGORA, uma vez que exista um vídeo para inspecionar |
| Publicação TikTok | DEPENDE DE API EXTERNA + APROVAÇÃO HUMANA — precisa de app TikTok Developer próprio, OAuth por conta, auditoria da TikTok |
| Métricas | DEPENDE DE API EXTERNA — precisa da mesma integração TikTok da linha acima, ainda não construída |
| Performance Analysis / Creative Iteration | AUTOMATIZÁVEL COM CONFIGURAÇÃO, mas só depois que Métricas existir de verdade |

## 10. MCP

Reconfirmado nesta fase, sem mudança: **nenhum MCP oficial da Creatify existe.** Único disponível: `TSavo/creatify-mcp`, terceiro. Não instalado, não executado, nenhuma permissão concedida nesta fase — tratado apenas como alternativa futura documentada em `CREATIFY-ARCHITECTURE.md` secao 4 e `CREATIFY-SETUP.md` secao 3.

## 11. Skills

Confirmado (`.agents/skills/` e `.claude/skills/` inspecionados nesta fase): **12 skills, todas `remotion-*`.** Nenhuma skill Creatify oficial disponível no ambiente. Nenhuma foi instalada ou inventada nesta fase.

Skills Remotion potencialmente úteis para pós-produção: `remotion-captions` (legendas), `remotion-render`/`remotion-studio` (render/preview), `remotion-multimedia` (duração/dimensões de vídeo — útil para QA leve), `remotion-markup` (composição/overlays) — todas já documentadas como opcionais em `remotion-production-agent.md`.

## 12. Remotion

Não removido, não executado nesta fase. Continua classificado como pós-produção **opcional**: útil se a Creatify entregar um clipe que precise de legendas customizadas, overlays de texto, ou junção de múltiplos clipes; dispensável se a família de endpoint usada (ex.: `product_to_videos`) já entregar um vídeo final pronto no formato esperado.

## 13. Custos

**Correção importante encontrada nesta fase:** a Fase 17 anterior citou preços de planos (`Starter $39/100 créditos`, `Pro $99/300 créditos`) de uma fonte de **TERCEIRO** (artigo de blog) sem rotular claramente como tal. A pesquisa desta fase encontrou os planos **OFICIAIS de API** em `docs.creatify.ai/billing.md`:

| Plano | Créditos/mês | Preço | Fonte |
|---|---|---|---|
| API Starter | 500 | $99/mês | **OFICIAL** |
| API Pro | 2.000 | $299/mês | **OFICIAL** |
| API Enterprise | customizado | sob consulta | **OFICIAL** |
| (anterior) "Starter $39/100, Pro $99/300" | — | — | **TERCEIRO** — provavelmente refere-se aos planos do produto web (não-API), não ao acesso via API. Não usar esse número para orçar geração programática. |

Custo por operação (todos **OFICIAL**, `docs.creatify.ai/billing.md`): 5 créditos/30s (vídeo padrão), 1 crédito/s (Aurora), 0.5 crédito/s (Aurora Fast), 1 crédito/10s@720p / 3/10s@1080p / 12/10s@2K (Boreal), 1 crédito/30s (TTS), 1 crédito/request (AI Scripts), 2 créditos/imagem ou 10 créditos/30s (Product-to-Video), 2 créditos/request (IAB Images), 10 créditos/ad bem-sucedido (HTML Interactive Ads).

Rate limits: **NÃO CONFIRMADO** — não encontrados na documentação consultada.

Endpoint de saldo: **CONFIRMADO** que existe (`GET /api-reference/workspace/get-remainingcredits`); o formato exato da resposta não foi verificado nesta sessão.

## 14. Segurança

- `CREATIFY_API_ID`/`CREATIFY_API_KEY`: ausentes no ambiente, confirmado sem imprimir valores.
- Nenhuma chamada de rede real foi feita a `api.creatify.ai` nesta fase (o gate `Bash(curl *api.creatify.ai*)`/`Bash(curl *creatify*)` de `.claude/settings.json` nunca precisou disparar).
- Nenhum token/conta TikTok foi conectado ou consultado.
- Nenhum arquivo deste projeto foi alterado para armazenar credenciais.

## 15. Limitações

- Catálogo de endpoints Creatify agora muito mais completo do que documentado na Fase 17 anterior, mas ainda com paths exatos confirmados apenas para `link_to_videos` e `product_to_videos` — as demais famílias (Aurora, Boreal, Avatar/Lipsync v1/v2, Custom Avatars, Custom Templates, AI Generation unificado, Ad Clone, IAB Images, HTML Interactive Ads, AI Scripts, Voices, Music, AI Shorts, AI Editing) têm existência e custo confirmados, mas não o path literal — precisam de confirmação individual antes do primeiro uso real de cada uma.
- TikTok Shop API: existência confirmada, capacidade de publicar vídeo de produto **não confirmada** — requer investigação direta em `partner.tiktokshop.com`.
- Sem credenciais no ambiente, zero pode ser testado empiricamente nesta fase.

## 16. Gaps

1. Nenhuma credencial Creatify configurada — bloqueia qualquer teste real.
2. Nenhum app TikTok Developer registrado/auditado — bloqueia publicação orgânica.
3. Nenhuma integração TikTok Display/Business API construída — bloqueia coleta de métricas.
4. `creatify-job.schema.json` (Fase 17 anterior) assume um único vocabulário de status (`pending/in_queue/running/done/failed`) que não é universal entre famílias de endpoint Creatify — ver seção 2 e 13 (Arquitetura).
5. `creatify-job.schema.json.endpoint_family` (enum atual: `link_to_video`, `avatar_lipsync`, `ai_shorts`, `ai_editing`, `text_to_speech`, `other`) não cobre `product_to_video`, `aurora`, `boreal`, `custom_avatar`, `custom_template`, `ai_generation`, `ad_clone`, `iab_images`, `html_interactive_ads`, `ai_scripts` — enum incompleto frente ao catálogo real.
6. `POLICIES.md` §1 cita a figura de preço de terceiro sem rotular a fonte — inconsistente com a própria regra do projeto de distinguir OFICIAL/TERCEIRO.

## 17. Arquitetura Recomendada — divergências arquitetura vs. capacidade real

| Componente | Arquitetura atual | Capacidade real | Divergência | Correção recomendada |
|---|---|---|---|---|
| `creatify-job.schema.json.provider_status` | Enum único (`pending/in_queue/running/done/failed`) | Vocabulário varia por família (ex.: `product_to_videos` usa `initializing/image_generating/.../video_generated`) | Sim — enum não cobre todas as famílias | Tornar o campo `type: string` livre (documentado por família) em vez de enum fechado, ou adicionar um enum por família |
| `creatify-job.schema.json.endpoint_family` | 6 valores | Catálogo real tem ~17 famílias | Sim — enum incompleto | Expandir o enum (não urgente — só bloqueia se/quando uma família fora da lista for usada) |
| `creatify-production-agent.md` / `CREATIFY-ARCHITECTURE.md` §5 | Recomenda implicitamente `link_to_videos` como caminho principal (exemplo mais detalhado) | `product_to_videos` é mais direto para "produto → vídeo curto", o caso de uso real do projeto | Sim — não é um erro, mas uma omissão de uma opção melhor | Atualizar a documentação para apresentar `product_to_videos` como primeira opção a avaliar no primeiro teste real |
| `POLICIES.md` §1 (tabela de créditos) | Cita "Starter $39/100, Pro $99/300" sem rótulo de fonte | Números oficiais de API são $99/500 e $299/2.000 (planos diferentes: consumidor vs. API) | Sim | Corrigir a tabela citando a fonte oficial (`docs.creatify.ai/billing.md`) e rotular a cifra antiga como TERCEIRO/não aplicável a uso via API |
| `CREATIFY-SETUP.md` §2 ("Como verificar saldo/custos") | Diz que não foi confirmado se existe endpoint de saldo | Endpoint `get-remainingcredits` existe, confirmado nesta fase | Sim | Atualizar para apontar o endpoint real como forma de verificação de saldo/teste de autenticação sem custo (a confirmar se o próprio endpoint tem custo zero) |
| `publishing-agent.md` | Desativado, documentado como dependente de "motor substituto" | Publicação não depende da Creatify — depende de uma integração TikTok separada (app+OAuth+auditoria) | Não é uma divergência de arquitetura, é uma omissão de contexto | Ao reativar no futuro, `publishing-agent.md` deve descrever a TikTok Content Posting API diretamente, não tratar Creatify como possível fonte de publicação |
| `qa-agent.md`, `orchestrator.md`, `creative-agent.md`, `performance-analysis-agent.md`, `creative-iteration-agent.md` | — | — | Nenhuma divergência encontrada nesta auditoria | Nenhuma |

**Nenhuma dessas correções foi aplicada nesta fase** — são recomendações para uma próxima passada de documentação, conforme a regra de não modificar arquitetura "só porque encontrou uma melhoria".

## 18. Próximos Passos

1. (Documental, baixo risco) Corrigir as divergências da seção 17 em uma passada dedicada — nenhuma delas bloqueia nada, mas deixá-las aumenta o risco de um agente futuro assumir algo errado.
2. Investigar diretamente `partner.tiktokshop.com` para confirmar (ou não) publicação de vídeo de produto via TikTok Shop API.
3. Configurar `CREATIFY_API_ID`/`CREATIFY_API_KEY` (fora do controle deste agente — ação do usuário, ver `CREATIFY-SETUP.md`).
4. Primeiro teste real de baixo risco recomendado: `GET /api-reference/workspace/get-remainingcredits` (provavelmente sem custo, mas confirmar antes) para validar autenticação, **antes** de qualquer chamada de criação.
5. Se/quando o usuário quiser publicação orgânica real: abrir uma conta TikTok Developer, registrar um app, e iniciar o processo de auditoria da TikTok — isso é um projeto à parte, independente do Creatify.

---

## Matriz Final

| Capacidade | Status | Evidência | Observação |
|---|---|---|---|
| Claude → Creatify API | NÃO TESTADO | Sem credenciais no ambiente | Implementação existe (`creatify-generation-subagent`), nunca executada |
| Autenticação | NÃO TESTADO | `CREATIFY_API_ID`/`CREATIFY_API_KEY` ausentes | — |
| Criar job | NÃO TESTADO | — | Endpoints confirmados documentalmente (seção 2) |
| Polling | CONFIRMADO DOCUMENTALMENTE | `docs.creatify.ai` (`GET .../{id}/` em toda família observada) | Não testado empiricamente |
| Webhook | PARCIALMENTE CONFIRMADO | Parâmetro `webhook_url` documentado em pelo menos 2 famílias | Sem doc dedicada de segurança/formato |
| Gerar vídeo | NÃO TESTADO | — | Múltiplas famílias confirmadas documentalmente |
| Obter vídeo | NÃO TESTADO | — | Campo `generated_video_url` confirmado documentalmente |
| Gerar thumbnail | NÃO CONFIRMADO | — | Não encontrada menção explícita a thumbnail separado nesta pesquisa (fase anterior mencionou, não re-verificado a fundo) |
| Publicar TikTok organicamente | NÃO DISPONÍVEL (via Creatify) / DEPENDE DE TERCEIRO (via TikTok própria) | `creatify.ai/features/media-buyer` (só ads); `developers.tiktok.com` (Direct Post API, app próprio + auditoria) | Duas integrações completamente diferentes, nenhuma construída |
| Publicar TikTok Shop | NÃO CONFIRMADO | `partner.tiktokshop.com` existe, capacidade de vídeo não verificada | Requer investigação adicional |
| Publicar anúncio TikTok | CONFIRMADO DISPONÍVEL (fora do escopo orgânico) | Creatify AI Media Buyer | Não é objetivo deste projeto |
| Obter métricas TikTok | CONFIRMADO DISPONÍVEL (API existe) / NÃO IMPLEMENTADO (neste projeto) | TikTok Display API + Business API | Nenhuma integração construída |
| Obter métricas TikTok Shop | NÃO CONFIRMADO | Seção "Analytics" existe no Partner Center | Detalhe não investigado |
| Performance loop | PARCIALMENTE CONFIRMADO | Ver seção 8 | Quebrado na seta METRICS → ANALYSIS por falta de dados reais |
| Claude analisar métricas | CONFIRMADO (capacidade do agente) / NÃO TESTADO (com dados reais) | `performance-analysis-agent.md` | Nunca rodou com `metrics.json` real |
| Claude gerar nova estratégia | CONFIRMADO (capacidade do agente) | `creative-iteration-agent.md`, `strategy-agent.md` | Testado estruturalmente no dry-run-001 (Higgsfield, não Creatify) |
| Claude iniciar nova geração | CONFIRMADO (capacidade do agente) / NÃO TESTADO (execução real) | `creatify-production-agent.md` | Gate de aprovação humana intacto |

---

## Decisão Final da Fase

**A. É possível hoje usar Claude + Creatify para gerar vídeos automaticamente?**
Arquiteturalmente sim (agentes, schemas e gates existem); tecnicamente **NÃO CONFIRMADO EMPIRICAMENTE** — falta apenas credenciais configuradas pelo usuário para o primeiro teste real acontecer.

**B. É possível hoje usar Claude + Creatify + TikTok para publicar organicamente de forma automatizada?**
**NÃO.** A Creatify não oferece isso. Seria necessário construir, do zero, uma integração separada com a TikTok Content Posting API (app próprio, OAuth por conta, auditoria da TikTok) — trabalho não iniciado.

**C. É possível hoje coletar automaticamente métricas dos vídeos publicados?**
**NÃO.** As APIs existem (TikTok Display/Business API), mas nenhuma integração foi construída, e ela dependeria da mesma integração TikTok do item B já existir.

**D. É possível hoje construir um loop automatizado de criação → publicação → métricas → análise → nova criação?**
**NÃO, de ponta a ponta.** O trecho `criação` (Research → Creative → Creatify) está pronto estruturalmente, pendente só de credenciais. Os trechos `publicação` e `métricas` exigem uma integração TikTok separada, não iniciada. `análise → nova criação` está pronto estruturalmente mas não pode rodar sem dados reais dos trechos anteriores.

**E. Quais partes exigem intervenção humana?**
Configurar credenciais Creatify; aprovar cada `generation-plan.json` antes de gastar crédito; registrar e submeter um app à auditoria da TikTok (processo majoritariamente manual/institucional, não automatizável por um agente); decidir orçamento/plano de API Creatify.

**F. Quais APIs adicionais são necessárias?**
TikTok Content Posting API (Direct Post) para publicação orgânica; TikTok Display API e/ou Business API para métricas; TikTok Shop Partner Center API se o objetivo for especificamente TikTok Shop (não confirmado se cobre publicação de vídeo).

**G. Qual é o menor caminho técnico para uma primeira operação real?**
1. Usuário configura `CREATIFY_API_ID`/`CREATIFY_API_KEY`. 2. Testar `GET .../workspace/get-remainingcredits` (provavelmente sem custo) para validar autenticação. 3. Rodar o pipeline até `generation-plan.json` com um único asset via `product_to_videos` (menor custo/complexidade identificado). 4. Aprovação humana explícita. 5. Uma única chamada real de geração, sem publicação. Isso valida o trecho "criação" isoladamente, sem tocar em TikTok/publicação/métricas — que continuam como projetos separados a iniciar depois.
