# Setup do TikTok — Guia para o Usuário

Este documento explica o que seria necessário para conectar publicação e métricas do TikTok a este projeto. **Nada aqui foi configurado ou testado.** Nenhuma credencial real é armazenada, lida ou inferida por nenhum agente — toda configuração é feita por você, fora do controle do Claude.

Ver `pipeline/orchestration/TIKTOK-ARCHITECTURE.md` para o que está confirmado/não confirmado.

## 1. Pré-requisito: app TikTok Developer

Nenhum app TikTok Developer existe hoje para este projeto (confirmado em `CLAUDE.md`: "Integração com TikTok API: OFF, não existe, não foi desenhada"). Para publicação:

1. Criar uma conta em `developers.tiktok.com`.
2. Registrar um app, obtendo `client_key` e `client_secret`.
3. Adicionar o produto "Login Kit" (para OAuth de usuário) e "Content Posting API" (Direct Post) ao app.
4. Configurar as URLs de redirecionamento OAuth.
5. **Achado da Fase 19 — só necessário se optar por PULL_FROM_URL:** verificar um domínio/prefixo de URL próprio no Developer Portal (meta tag `tiktok-developers-site-verification` ou registro DNS). O vídeo do Creatify sai hospedado em `creatify-user-uploads.s3.amazonaws.com`, domínio que não pertence a este projeto — **essa URL não pode ser verificada por nós**, então PULL_FROM_URL direto da saída do Creatify não funciona. O caminho recomendado é **FILE_UPLOAD** (baixar o MP4 do Creatify e reenviar em chunks ao TikTok), que não exige nenhuma verificação de domínio.
6. **Etapa institucional, não técnica:** submeter o app para auditoria da TikTok antes de tentar publicar em `privacy_level: PUBLIC_TO_EVERYONE`. Até a auditoria ser aprovada, qualquer teste real só pode publicar em `SELF_ONLY` (privado).

## 2. Variáveis de ambiente necessárias (quando a publicação for implementada de verdade)

```
TIKTOK_CLIENT_KEY=<seu-client-key>
TIKTOK_CLIENT_SECRET=<seu-client-secret>
TIKTOK_ACCESS_TOKEN=<obtido via fluxo OAuth do usuário, não estático>
TIKTOK_REFRESH_TOKEN=<idem>
```

**Nunca** em arquivo do repositório, nunca em `pipeline/**/*.json`, nunca em prompt de agente. Diferente do Creatify (chave de API estática), o TikTok usa OAuth de usuário — `TIKTOK_ACCESS_TOKEN` expira em **24h** e precisa ser renovado via `TIKTOK_REFRESH_TOKEN` (válido por **365 dias**, e pode mudar a cada renovação — sempre usar o valor mais recente devolvido) chamando `POST https://open.tiktokapis.com/v2/oauth/token/` com `grant_type=refresh_token` (achados CONFIRMADOS da Fase 19). Isso é um fluxo, não uma chave fixa, e deve ser implementado com uma biblioteca OAuth adequada quando essa fase for construída — nenhum agente deste projeto deve tentar reimplementar OAuth manualmente por conta própria.

## 3. Escopos a solicitar

Confirmados em `TIKTOK-ARCHITECTURE.md` §4: `video.publish` (publicação), `user.info.basic` (identificação da conta), `video.list` (leitura de vídeos já postados — base para uma futura tentativa de métricas). Não solicitar escopos além do necessário.

## 4. Como testar sem publicar de verdade

Não foi confirmado nesta fase um endpoint de "dry-run" da Content Posting API. Formas seguras de progredir sem publicar:
1. Completar o fluxo OAuth e confirmar que um `access_token` válido foi obtido (isso sozinho não publica nada).
2. Se/quando implementado, testar primeiro com `privacy_level: SELF_ONLY` (o único que funciona antes da auditoria de qualquer forma) — ainda assim, isso **publica de verdade**, só que em modo privado. Não é um "modo de teste" isento — é uma publicação real visível apenas para o próprio usuário.
3. Não há como testar a Content Posting API sem criar um post real na conta autenticada, até onde esta pesquisa confirmou.

## 5. Métricas — o que configurar

Ver `TIKTOK-ARCHITECTURE.md` §5. O caminho mais provável (TikTok API for Business — Organic API) exige uma conta TikTok Business Center separada do app Developer usado para publicação — são cadastros diferentes. Nenhum dos dois existe hoje.

## 6. Como desconectar

Revogar a autorização do app na conta TikTok do usuário (Configurações → Apps conectados) e remover as variáveis de ambiente locais. Nenhum arquivo deste projeto precisa ser alterado.

## 7. Escopo desta fase

Nas Fases 18-19, nenhuma credencial TikTok foi configurada, nenhum app foi registrado, nenhum OAuth foi testado, nenhuma publicação ocorreu. Este documento existe para que, quando o usuário decidir avançar, o caminho técnico já esteja mapeado — sem repetir a pesquisa documental do zero.
