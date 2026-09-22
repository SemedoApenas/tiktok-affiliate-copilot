# Arquitetura TikTok — Publicação e Métricas (Fase 18-19)

Este documento cobre as duas integrações TikTok que a Fase 17 identificou como **completamente separadas da Creatify**: publicação orgânica (TikTok Content Posting API) e métricas (TikTok Display/Business/Research API). Nenhuma das duas foi implementada — este documento é o contrato técnico para quando forem. **Fase 19** fechou a especificação técnica da publicação (endpoints exatos, limites de vídeo, vocabulário de status, ciclo de vida de token) e investigou TikTok Shop mais a fundo.

Classificação usada em todo o documento (vocabulário da Fase 19 — substitui o vocabulário mais simples da Fase 18):

`CONFIRMED` · `PARTIALLY CONFIRMED` · `THIRD-PARTY ONLY` · `NOT CONFIRMED` · `NOT APPLICABLE` · (nunca `CONFIRMED BY IMPLEMENTATION` nesta fase — nenhuma chamada real foi autorizada)

Fontes primárias: `developers.tiktok.com` (host de documentação) e `open.tiktokapis.com` (**host real da API** — distinto do domínio de documentação, achado da Fase 19), `partner.tiktokshop.com` (TikTok Shop Partner Center — parcialmente inacessível a fetch direto nesta sessão, ver seção 6). Nenhuma chamada real foi feita a nenhuma dessas APIs.

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

## 2. TikTok Content Posting API — Direct Post (fluxo completo, Fase 19)

**Host real da API: `https://open.tiktokapis.com`** (não `developers.tiktok.com`, que é só o domínio de documentação — achado da Fase 19).

### 2.1 Passo a passo confirmado

| Passo | Endpoint | Status |
|---|---|---|
| 1. Consultar opções de privacidade/criador | `POST https://open.tiktokapis.com/v2/post/publish/creator_info/query/` | CONFIRMED |
| 2. Iniciar publicação de vídeo | `POST https://open.tiktokapis.com/v2/post/publish/video/init/` | CONFIRMED |
| 3. (só FILE_UPLOAD) Enviar os bytes do vídeo | `PUT` para a `upload_url` retornada pelo passo 2, com header `Content-Range` | CONFIRMED |
| 4. Consultar status | `POST https://open.tiktokapis.com/v2/post/publish/status/fetch/`, body `{"publish_id": "..."}` | CONFIRMED |

### 2.2 Corpo da requisição de init (passo 2) — CONFIRMED, campos literais

```json
{
  "post_info": {
    "title": "string (max 2200 UTF-16 runes)",
    "privacy_level": "PUBLIC_TO_EVERYONE | MUTUAL_FOLLOW_FRIENDS | FOLLOWER_OF_CREATOR | SELF_ONLY",
    "disable_duet": false,
    "disable_comment": false,
    "disable_stitch": false,
    "video_cover_timestamp_ms": 1000,
    "is_aigc": true
  },
  "source_info": {
    "source": "FILE_UPLOAD",
    "video_size": 0,
    "chunk_size": 0,
    "total_chunk_count": 0
  }
}
```
Para `PULL_FROM_URL`, `source_info` vira `{"source": "PULL_FROM_URL", "video_url": "https://..."}`. A resposta retorna `publish_id` (sempre) e `upload_url` (só para FILE_UPLOAD).

### 2.3 Achado crítico — PULL_FROM_URL exige verificação de domínio (Fase 19)

CONFIRMED: para usar `PULL_FROM_URL`, o domínio/prefixo da `video_url` precisa estar **verificado no TikTok Developer Portal** (meta tag `tiktok-developers-site-verification` ou registro DNS) como pertencente ao app publicador. Regras adicionais confirmadas: a URL deve usar HTTPS, não pode redirecionar, e o download tem timeout de **1 hora** a partir do início.

**Consequência direta para este projeto:** o `generated_video_url` que o Creatify retorna é hospedado em `creatify-user-uploads.s3.amazonaws.com` — um domínio que pertence à Creatify, não a este projeto, e que portanto **não pode ser verificado por nós**. Isso significa que `PULL_FROM_URL` apontando diretamente para a saída do Creatify **NÃO é um caminho viável** sem uma etapa intermediária. As duas alternativas reais:
1. **FILE_UPLOAD** (recomendado): baixar o MP4 do Creatify e reenviá-lo em chunks para a `upload_url` do TikTok — não depende de nenhum domínio verificado.
2. Re-hospedar o vídeo do Creatify em um domínio/bucket próprio, verificado no Developer Portal, e então usar PULL_FROM_URL — mais infraestrutura, sem vantagem clara sobre a opção 1 para este caso de uso.

### 2.4 Status de publicação (Get Post Status) — CONFIRMED, vocabulário literal

| Valor | Significado |
|---|---|
| `PROCESSING_UPLOAD` | Só para FILE_UPLOAD — upload em andamento |
| `PROCESSING_DOWNLOAD` | Só para PULL_FROM_URL — download pela TikTok em andamento |
| `SEND_TO_USER_INBOX` | Só no fluxo de rascunho (`video.upload`, não usado nesta arquitetura) |
| `PUBLISH_COMPLETE` | Sucesso |
| `FAILED` | Falhou — ver `fail_reason` |

Campos de resposta confirmados: `status`, `fail_reason`, `publicaly_available_post_id` (grafia literal da API, com erro de digitação — só preenchido se público E aprovado pela moderação), `uploaded_bytes`, `downloaded_bytes`.

Valores confirmados de `fail_reason`: `file_format_check_failed`, `duration_check_failed`, `picture_size_check_failed`, `internal`, `video_pull_failed`, `photo_pull_failed`, `spam_risk`, `spam_risk_too_many_posts`, `auth_removed`.

### 2.5 Requisitos de vídeo (Media Transfer Guide) — CONFIRMED

| Parâmetro | Valor |
|---|---|
| Tamanho máximo de arquivo | 4 GB |
| Chunk (FILE_UPLOAD) | mínimo 5 MB, máximo 64 MB (último chunk até 128 MB), 1 a 1000 chunks, upload sequencial |
| Duração | padrão 3 min para todo criador; alguns criadores têm acesso estendido a 5/10 min; **o limite que a API de developer aceita enviar é 10 minutos** |
| Resolução | mínimo 360px, máximo 4096px (largura e altura) |
| Frame rate | 23–60 fps |
| Formatos de vídeo | MP4 (recomendado), WebM, MOV |
| Codecs de vídeo | H.264 (recomendado), H.265, VP8, VP9 |
| Codec de áudio | NOT CONFIRMED — não documentado no Media Transfer Guide consultado |
| MIME type | NOT CONFIRMED explicitamente como campo de requisição — inferido do formato de arquivo aceito |

O vídeo produzido pelo Creatify (`product_to_videos`, 9:16, tipicamente alguns segundos a poucos minutos, H.264/MP4) está dentro de todos esses limites confirmados — nenhuma conversão adicional parece necessária, mas isso não foi testado.

### 2.6 Escopo, auditoria, TikTok Shop

| Item | Status | Detalhe |
|---|---|---|
| Escopo necessário | CONFIRMED | `video.publish` |
| App TikTok Developer necessário | CONFIRMED | `client_key`/`client_secret` próprios — REQUIRES HUMAN CONFIGURATION, não existe hoje |
| Revisão/auditoria para alcance público | CONFIRMED | Apps não auditados só publicam `SELF_ONLY`; erro `unaudited_client_can_only_post_to_private_accounts` |
| Disclosure de conteúdo gerado por IA | CONFIRMED | `is_aigc: true` — obrigatório para todo vídeo desta pipeline |
| Relação com TikTok Shop | NOT CONFIRMED (revisado) | Nenhum parâmetro de TikTok Shop na Direct Post API em si; ver seção 6 para a API de Shoppable Video, que é uma família **diferente** |
| Automação após auditoria | CONFIRMED (em princípio) | Uma vez auditado e autorizado via OAuth, a publicação é programática sem intervenção manual por post — mas a auditoria em si nunca é automatizável |

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

### 4.1 Ciclo de vida do token (CONFIRMED, Fase 19)

| Item | Valor |
|---|---|
| `access_token` — validade | 86.400s (24h) |
| `refresh_token` — validade | 31.536.000s (365 dias) |
| Rotação de `refresh_token` | Sim — cada refresh pode retornar um `refresh_token` novo; o app deve sempre usar o valor mais recente retornado, não o que enviou |
| Endpoint de refresh | `POST https://open.tiktokapis.com/v2/oauth/token/` com `grant_type=refresh_token` (mesmo endpoint da emissão inicial) |
| O que acontece se o `refresh_token` expirar (365 dias sem uso) | NOT CONFIRMED — a documentação consultada não especifica; presumir que exige nova autorização OAuth completa do usuário até confirmação em contrário |
| Armazenamento recomendado | "Tokens devem ser armazenados e gerenciados no lado do servidor" — CONFIRMED. Nunca em arquivo do repositório, nunca em log (ver seção 7) |

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

Confirmada a existência de `partner.tiktokshop.com` (Partner Center), com Developer Guide, API Reference, Webhooks, Analytics. **Duas tentativas de leitura direta das páginas relevantes (`tts-api-concepts-overview`, `shoppable-video`) nesta fase retornaram conteúdo truncado/não renderizado** — registrado como `NOT VERIFIED — AUTHENTICATION REQUIRED` seria impreciso (não parece ser um muro de autenticação, mas uma limitação de renderização/paginação do fetch usado); tratar como **NOT VERIFIED — CONTENT NOT DIRECTLY ACCESSIBLE nesta sessão**, não como ausência de capacidade.

Uma busca (não uma leitura direta da página oficial) indicou a existência de uma família de endpoints chamada "Shoppable Video" dentro da **Affiliate Creator API** do TikTok Shop, com dois passos: upload de arquivo e depois "post" do vídeo shoppable. Como isso veio de um resumo de busca e não de inspeção direta da documentação oficial, é classificado como **THIRD-PARTY ONLY / PARTIALLY CONFIRMED** — não usar esses nomes de endpoint em nenhuma implementação real sem primeiro confirmá-los por leitura direta de `partner.tiktokshop.com`. Ponto crítico já identificável mesmo sem essa confirmação: essa API parece ser **autorizada contra uma conta de criador/afiliado** ("Affiliate Creator API"), não contra uma conta de vendedor comum — ou seja, mesmo que confirmada, pode não ser o caminho certo para "o vendedor publica o vídeo do próprio produto" sem também operar como criador/afiliado.

**Conclusão da Fase 19:** existe fumaça de uma API de Shoppable Video na TikTok Shop, mas nada suficientemente confirmado para desenhar uma integração real. A rota "produto TikTok Shop → vídeo Creatify → publicação vinculada ao produto → métricas de venda" permanece **NOT CONFIRMED** como um todo — a única rota com contrato técnico 100% fechado nesta fase é a publicação orgânica genérica via Direct Post (seção 2), que não vincula o post a um produto do TikTok Shop.

## 7. Segurança

- Nenhum token de acesso (`TIKTOK_ACCESS_TOKEN`, `TIKTOK_REFRESH_TOKEN`) é armazenado em nenhum arquivo deste repositório — apenas uma referência não-secreta em `platform-account.json.token_reference` (ver schema).
- `client_secret` do app TikTok Developer nunca entra em nenhum artefato do pipeline.
- `platform-account.json.app_review_status` começa em `"unaudited"` por padrão — nenhum agente pode assumir `"approved"` sem uma fonte humana confirmando isso.

## 8. Limitações desta pesquisa (atualizado Fase 19)

Fechado nesta fase: paths exatos dos 4 endpoints do fluxo Direct Post, limites de vídeo (Media Transfer Guide), vocabulário de status/erro, ciclo de vida de token.

Ainda em aberto:
- Requisitos de qualificação para a Research API não investigados (quem pode pedir acesso).
- TikTok Shop / Shoppable Video: só THIRD-PARTY ONLY, não confirmado por leitura direta da documentação oficial (Partner Center não renderizou completamente nesta sessão).
- Codec de áudio aceito pela Content Posting API não documentado.
- Comportamento exato após expiração do `refresh_token` (365 dias) não documentado.
- Se `GET /api/remaining_credits/` da Creatify (achado da Fase 19, ver `CREATIFY-SETUP.md`) consome créditos — não afirmado nem negado pela documentação.

## 9. Configuração

Ver `pipeline/orchestration/TIKTOK-SETUP.md`.
