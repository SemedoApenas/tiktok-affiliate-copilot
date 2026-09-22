# Arquitetura TikTok — Publicação e Métricas (Fase 18)

Este documento cobre as duas integrações TikTok que a Fase 17 identificou como **completamente separadas da Creatify**: publicação orgânica (TikTok Content Posting API) e métricas (TikTok Display/Business/Research API). Nenhuma das duas foi implementada — este documento é o contrato técnico para quando forem.

Classificação usada em todo o documento (vocabulário desta fase):

`CONFIRMED` · `NOT CONFIRMED` · `NOT SUPPORTED` · `REQUIRES HUMAN CONFIGURATION`

Fontes primárias: `developers.tiktok.com` (Content Posting API, Login Kit, Scopes Reference, Display API), `business-api.tiktok.com`/`ads.tiktok.com` (TikTok API for Business). Nenhuma chamada real foi feita a nenhuma dessas APIs.

---

## 1. Visão geral

```
CREATIFY (geração — ver CREATIFY-ARCHITECTURE.md)
  → vídeo final aprovado (qa-report.status: approved)
  → HUMAN PUBLICATION APPROVAL (gate separado da aprovação de geração)
  → TikTok Content Posting API (publishing-agent → tiktok-publishing-subagent, DESATIVADO)
  → tiktok-publication.json
  → TikTok Display/Business API (coleta de métricas — NENHUM agente ativo ainda)
  → metrics.json
  → performance-analysis-agent → creative-iteration-agent
```

## 2. TikTok Content Posting API — Direct Post

| Item | Status | Detalhe |
|---|---|---|
| Nome oficial | CONFIRMED | "Content Posting API — Direct Post" (`developers.tiktok.com`) |
| Existência de endpoint de criação de post de vídeo | CONFIRMED | Documentado; **path/método HTTP literal não capturado** nesta pesquisa (lido via resumo de conteúdo da página, não inspeção bruta) — NOT CONFIRMED em nível de string exata, reconfirmar antes de qualquer implementação real |
| Autenticação | CONFIRMED | OAuth 2.0 de usuário — não é autenticação de app-só |
| Escopo necessário | CONFIRMED | `video.publish` — "Publica vídeos diretamente do seu app para o TikTok (sem rascunho)" |
| App TikTok Developer necessário | CONFIRMED | `client_key`/`client_secret` próprios do projeto — REQUIRES HUMAN CONFIGURATION (registro em `developers.tiktok.com`, não existe hoje) |
| Revisão/auditoria para alcance público | CONFIRMED | "Apps não auditados só podem publicar em modo privado." Erro documentado: `unaudited_client_can_only_post_to_private_accounts`. Processo de auditoria é institucional (revisão da TikTok), não automatizável por um agente — REQUIRES HUMAN CONFIGURATION |
| Diferença modo privado vs. público | CONFIRMED | `privacy_level` aceita `PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS`, `FOLLOWER_OF_CREATOR`, `SELF_ONLY`; só `SELF_ONLY` funciona antes da auditoria |
| Upload por arquivo | CONFIRMED | `source_info.source = "FILE_UPLOAD"`, com `video_size`/`chunk_size`/`total_chunk_count` |
| Upload por URL | CONFIRMED | `source_info.source = "PULL_FROM_URL"`, com `video_url` — o vídeo precisa estar acessível publicamente por URL (o `output_url` do Creatify serviria diretamente, em princípio — NOT CONFIRMED que a TikTok aceite qualquer URL externa sem restrição de domínio) |
| Limites de tamanho de arquivo/formato/duração | NOT CONFIRMED | A documentação referencia um "Media Transfer Guide" separado, não lido nesta fase |
| Polling / status da publicação | NOT CONFIRMED (parcial) | Existe uma página "Get Post Status" referenciada na navegação; conteúdo detalhado (valores de status exatos) não capturado nesta pesquisa |
| Campos de post | CONFIRMED | `title` (máx. 2200 runes UTF-16), `disable_duet`, `disable_stitch`, `disable_comment`, `video_cover_timestamp_ms`, `brand_content_toggle`, `brand_organic_toggle`, `is_aigc` |
| Disclosure de conteúdo gerado por IA | CONFIRMED | Campo `is_aigc` existe — deve ser `true` para todo vídeo desta pipeline |
| Relação com TikTok Shop | NOT SUPPORTED | Nenhum parâmetro ou modo específico de TikTok Shop encontrado na documentação da Direct Post API |
| Automação depois da aprovação do app | CONFIRMED (em princípio) | Uma vez o app auditado e o usuário autorizado via OAuth, a documentação descreve publicação programática sem intervenção manual por post — mas a aprovação do app em si nunca é automatizável |

## 3. Content Sharing Guidelines

Existe uma página oficial separada ("Content Sharing Guidelines") com regras de conformidade de conteúdo — não lida em detalhe nesta fase. **REQUIRES HUMAN CONFIGURATION/REVIEW** antes de qualquer publicação real, para garantir que o conteúdo gerado (vídeo de produto, disclosure de IA, claims) respeita essas regras.

## 4. Escopos OAuth (TikTok for Developers — Login Kit)

CONFIRMED, tabela consolidada da página `tiktok-api-scopes`:

| Escopo | Concede | Relevante para |
|---|---|---|
| `user.info.basic` | open_id, avatar, display name (default de todo app Login Kit) | Identificar a conta conectada |
| `user.info.profile` | bio, links de perfil, status de verificação | Não usado nesta pipeline |
| `user.info.stats` | contagens agregadas da conta: likes, seguidores, seguindo, nº de vídeos | Métrica de conta, não de vídeo individual |
| `video.publish` | publicar vídeo diretamente (sem rascunho) | **Publicação — usado pelo `tiktok-publishing-subagent`** |
| `video.upload` | enviar como rascunho para o usuário editar/postar manualmente no app | Alternativa mais "segura" (menos autônoma) — não usada por padrão nesta arquitetura |
| `video.list` | ler vídeos públicos já postados pela conta | **Base para tentar métricas — ver seção 5** |
| `local.product.manage` / `local.shop.manage` / `local.voucher.manage` | gestão de produto/loja local | Estes escopos aparecem sob "Local Services" na documentação — **NOT CONFIRMED** que tenham qualquer relação com TikTok Shop e-commerce (nome sugere "negócios locais", não "loja de e-commerce"); não usar sem confirmação adicional |
| Escopos de "Data Portability"/"Research" | exportação de dados do usuário / dados públicos para pesquisa | Não relevantes para esta pipeline |

## 5. TikTok Metrics — matriz de fontes

| Métrica | API | Confirmada? | Requer OAuth? | Requer aprovação? | Observação |
|---|---|---|---|---|---|
| Metadados do vídeo (id, título, descrição, duração, capa, link) | Display API (`POST /v2/video/list/`, `POST /v2/video/query/`) | CONFIRMED | Sim, `video.list` | REQUIRES HUMAN CONFIGURATION (app + aprovação de produto "Login Kit"/"TikTok API") | **Nenhum campo de engajamento (views/likes/comments/shares) confirmado nestes dois endpoints na documentação consultada** |
| views, likes, comments, shares por vídeo | TikTok Research API (`research-api-specs-query-*`) | CONFIRMED (existência dos campos) | Sim | REQUIRES HUMAN CONFIGURATION — acesso à Research API é tipicamente restrito a pesquisadores/instituições qualificadas, não um app comercial comum | **Não assumir que este projeto se qualifica para acesso à Research API** — não investigado se uma operação comercial de TikTok Shop se qualifica |
| reach, watch time, completion rate, impression sources, audience countries (agregado, orgânico+pago) | TikTok API for Business — "Organic API" (`business-api.tiktok.com`, `/business/video/list/`) | CONFIRMED (existência) | Sim, conta TikTok Business Center | REQUIRES HUMAN CONFIGURATION — precisa de conta Business Center, não apenas um app Developer | Campos avançados só populados depois do vídeo estar ativo por >7 dias (achado da Fase 17, reconfirmado) |
| user.info.stats (agregado de conta: likes/seguidores/vídeos) | Login Kit `user.info.stats` | CONFIRMED | Sim | REQUIRES HUMAN CONFIGURATION | Métrica de conta, não isola performance por vídeo/experimento |
| GMV, product clicks, orders (TikTok Shop) | TikTok Shop Partner Center — seção "Analytics" | NOT CONFIRMED | Provavelmente sim (Seller Center) | REQUIRES HUMAN CONFIGURATION | Existência da seção confirmada; detalhe de métricas/endpoints não investigado nesta fase |
| CTR, conversions, CPA, ROAS | TikTok Ads (Marketing API) / Creatify AI Media Buyer | CONFIRMED (existe, contexto de mídia paga) | Sim | REQUIRES HUMAN CONFIGURATION | Fora do escopo orgânico deste projeto |

**Conclusão prática:** o caminho mais realista para métricas por-vídeo confiáveis de conteúdo orgânico publicado por este projeto é a **TikTok API for Business, produto "Organic API"** — não a Research API (acesso restrito) nem o Display API padrão (sem engajamento confirmado nos campos documentados consultados). Isso não foi testado nem configurado.

## 6. TikTok Shop

Confirmada a existência de `partner.tiktokshop.com` (Partner Center), com Developer Guide, API Reference, Webhooks, Analytics. **NOT CONFIRMED**: publicação de vídeo de produto via essa API. Tratar como investigação em aberto — não assumir capacidade nem ausência dela até uma leitura direta do Partner Center.

## 7. Segurança

- Nenhum token de acesso (`TIKTOK_ACCESS_TOKEN`, `TIKTOK_REFRESH_TOKEN`) é armazenado em nenhum arquivo deste repositório — apenas uma referência não-secreta em `platform-account.json.token_reference` (ver schema).
- `client_secret` do app TikTok Developer nunca entra em nenhum artefato do pipeline.
- `platform-account.json.app_review_status` começa em `"unaudited"` por padrão — nenhum agente pode assumir `"approved"` sem uma fonte humana confirmando isso.

## 8. Limitações desta pesquisa

- Path/método HTTP literal do endpoint de criação de post não capturado (só o comportamento/campos).
- Limites de tamanho/formato de vídeo não capturados (Media Transfer Guide não lido).
- Vocabulário exato de status de publicação (polling) não capturado em detalhe.
- Requisitos de qualificação para a Research API não investigados.
- TikTok Shop: capacidade de publicação de vídeo de produto não investigada em profundidade.

## 9. Configuração

Ver `pipeline/orchestration/TIKTOK-SETUP.md`.
