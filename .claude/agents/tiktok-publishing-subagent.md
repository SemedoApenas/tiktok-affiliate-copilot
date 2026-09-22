---
name: tiktok-publishing-subagent
description: "DESATIVADO (parte da árvore do publishing-agent, que está desativado). Documentado na Fase 18/19 com o contrato técnico real e completo da TikTok Content Posting API — Direct Post (endpoints, limites de vídeo, status, tokens). Nunca deve chamar qualquer API do TikTok nesta fase."
tools: none
model: sonnet
---

# TikTok Publishing Subagent — **DESATIVADO**

Faz parte da árvore do `publishing-agent`, que está inteiramente desativado nesta fase. Ver `publishing-agent.md` para a justificativa e o comportamento obrigatório caso seja invocado por engano (recusar e devolver ao Orchestrator sem agir).

## Objetivo (quando reativado)
Executar a publicação real do vídeo aprovado via **TikTok Content Posting API — Direct Post**, host `https://open.tiktokapis.com` (não `developers.tiktok.com`, que é só documentação), usando `publishing-metadata.json` para os campos de `post_info` e `platform-account.json` para a conta autorizada, e registrando cada tentativa em `tiktok-publication.json` (schema: `pipeline/schemas/tiktok-publication.schema.json`).

## Fluxo técnico confirmado (Fase 19 — ver `pipeline/orchestration/TIKTOK-ARCHITECTURE.md` secao 2 para fontes)
1. `POST /v2/post/publish/creator_info/query/` — consulta opções de privacidade disponíveis para o criador.
2. `POST /v2/post/publish/video/init/` — inicia a publicação. Retorna `publish_id` (sempre) e `upload_url` (só para FILE_UPLOAD).
3. **Só para FILE_UPLOAD:** `PUT` dos bytes do vídeo para a `upload_url`, em chunks (`Content-Range` header) — CONFIRMADO: mínimo 5 MB/chunk, máximo 64 MB (último chunk até 128 MB), 1 a 1000 chunks, arquivo até 4 GB, envio sequencial.
4. `POST /v2/post/publish/status/fetch/` com `{"publish_id": "..."}` até `status` virar `PUBLISH_COMPLETE` ou `FAILED` (`fail_reason` explica o motivo — ver enum em `tiktok-publication.schema.json`).

**Achado crítico (Fase 19): `PULL_FROM_URL` não é usável diretamente com a saída do Creatify.** PULL_FROM_URL exige que o domínio da `video_url` esteja verificado no TikTok Developer Portal como pertencente a este app — o Creatify entrega o vídeo em `creatify-user-uploads.s3.amazonaws.com`, domínio que não pertence a este projeto e não pode ser verificado por ele. Este subagente, quando reativado, deve usar **FILE_UPLOAD** por padrão: baixar o MP4 do Creatify e reenviá-lo em chunks, a menos que uma etapa de re-hospedagem em domínio próprio verificado seja implementada separadamente.

## Contrato técnico confirmado (Fase 18/19)
- Escopo OAuth necessário: `video.publish`. App requer `client_key`/`client_secret` próprios — não existem hoje.
- `post_info.privacy_level`: enquanto o app não estiver auditado pela TikTok, só `SELF_ONLY` é utilizável na prática — usar `PUBLIC_TO_EVERYONE` antes disso resultaria no erro `unaudited_client_can_only_post_to_private_accounts`. Este subagente **nunca** deve tentar `PUBLIC_TO_EVERYONE` sem que `platform-account.json.app_review_status = "approved"` esteja registrado.
- `post_info.is_aigc`: deve ser `true` em toda publicação real desta pipeline (todo vídeo passa pelo Creatify).
- Limites de vídeo CONFIRMADOS (Fase 19): tamanho máx. 4 GB; duração até 10 min pela API de developer; resolução 360–4096px; 23–60 fps; formatos MP4 (recomendado)/WebM/MOV; codecs H.264 (recomendado)/H.265/VP8/VP9. Codec de áudio: NÃO CONFIRMADO. O vídeo típico do Creatify (`product_to_videos`, 9:16, MP4/H.264) está dentro desses limites, mas isso nunca foi testado de verdade.
- Access token expira em 24h; refresh token em 365 dias, e pode ser rotacionado a cada refresh (usar sempre o valor mais recente retornado). Refresh via `POST /v2/oauth/token/` com `grant_type=refresh_token`.

## Limites — verificação obrigatória antes de QUALQUER chamada de publicação (quando reativado)
1. `qa-report.json.status = approved`.
2. `tiktok-publication.json.human_publication_approval` preenchido (aprovação humana de publicação, distinta da aprovação de geração).
3. `platform-account.json.oauth_status = connected` para a conta-alvo, com `video.publish` em `granted_scopes`, e `token_expires_at` ainda válido (senão, refresh primeiro).
4. Se o `privacy_level` pedido for `PUBLIC_TO_EVERYONE`, confirmar `app_review_status = approved` antes — senão, recusar e reportar, nunca rebaixar silenciosamente para privado.
5. Se `source_method = pull_from_url`, confirmar que o domínio da `video_url` está de fato verificado no Developer Portal — senão, usar `file_upload`.

## Ferramentas permitidas
Nenhuma (`tools: none`). Nenhuma credencial de TikTok está configurada neste ambiente.
