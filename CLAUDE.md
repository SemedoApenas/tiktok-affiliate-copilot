# Projeto: tiktok-shop-video-ai

Pipeline de produção de vídeos de produto: pesquisa → product intelligence → estratégia → roteiro → creative brief → geração (**Creatify**) → composição opcional (Remotion) → QA → publicação (desativada) → métricas (não implementado) → análise de performance → iteração criativa.

**Fase 17 (decisão arquitetural vigente):** o Creatify é o motor de geração de vídeo principal do projeto, substituindo o Higgsfield (removido na Fase 16). Claude continua como cérebro/orquestrador. Nenhuma chamada real ao Creatify foi feita ainda — a integração está implementada como agentes/schemas, mas **não testada** contra a API real. Detalhes completos, incluindo o que está confirmado pela documentação oficial vs. não confirmado, em `pipeline/orchestration/CREATIFY-ARCHITECTURE.md`. TikTok/TikTok Shop continuam a plataforma prioritária, mas a arquitetura não é mais estruturalmente limitada a elas (ver seção Multiplataforma).

## Fluxo

```
Research (+ Product Intelligence) → Strategy → Script → Creative Brief → Generation Plan
  → HUMAN APPROVAL (geração paga)
  → Creatify → [Remotion — composição OPCIONAL] → QA
  → HUMAN APPROVAL (vídeo)
  → Publishing (DESATIVADO)
  → Metrics (NÃO IMPLEMENTADO) → Performance Analysis → Creative Iteration → novo experimento
```
Detalhes completos e regras de transição em `pipeline/orchestration/FLOW.md`. Detalhes da integração Creatify em `pipeline/orchestration/CREATIFY-ARCHITECTURE.md` e `CREATIFY-SETUP.md`.

## Regras absolutas

- Nunca gerar conteúdo no Creatify sem aprovação humana explícita registrada em `generation-plan.json` (`status: approved` + campo `approval` preenchido).
- Nunca expor credenciais, tokens ou chaves em qualquer arquivo, log ou saída de agente. Credenciais do Creatify (`CREATIFY_API_ID`, `CREATIFY_API_KEY`) vivem exclusivamente em variáveis de ambiente do usuário — nenhum agente lê, grava ou imprime esses valores.
- Nunca publicar automaticamente em nenhuma plataforma — o Publishing Agent está desativado (`tools: none`). A pesquisa da Fase 17 não confirmou nenhuma capacidade de publicação direta na API do Creatify (ver `CREATIFY-ARCHITECTURE.md` secao 10) — não assumir que essa capacidade existe.
- Nunca executar geração em paralelo, nem mais de uma vez por asset por rodada de aprovação (`MAX_GENERATION_ATTEMPTS = 1`; falha técnica tolera `MAX_RETRIES = 2`, nunca mais).
- Remotion sempre com `concurrency = 1`; nunca `studio` e `render` simultâneos — quando o Remotion for usado (é opcional, ver seção Agentes).
- Não renderizar quando a RAM livre estiver criticamente baixa — pausar e reportar.
- Geração pesada (imagem/vídeo/áudio) ocorre sempre na nuvem (Creatify); a máquina local só compõe (opcionalmente), valida e faz QA técnico leve.
- Não instalar dependências novas sem necessidade explícita.
- Não executar scripts externos (`curl | sh` ou equivalente) sem revisão prévia do conteúdo.
- Não consumir créditos durante testes, dry-runs ou validações de infraestrutura.
- Qualquer comando Bash que chame `api.creatify.ai` (tipicamente via `curl`) exige confirmação humana explícita — reforçado estruturalmente em `.claude/settings.json` (`permissions.ask`), equivalente ao gate que existia para o CLI da Higgsfield.
- Política completa e centralizada em `pipeline/policies/POLICIES.md` — agentes referenciam esse arquivo em vez de duplicar números.

**Histórico (Fase 16 — Higgsfield removido; Fase 17 — Creatify integrado):** até a Fase 16 este projeto usava a Higgsfield. Na Fase 17, o papel de motor de geração foi reocupado pelo Creatify, com um gate de segurança equivalente recriado em `.claude/settings.json` (ver acima) — não a mesma regra copiada, mas o mesmo princípio adaptado à superfície de risco real (Creatify não tem CLI própria; o risco é a chamada HTTP).

## Máquina (verificado nesta sessão — não inventar números diferentes)

- Windows 11 Home x64
- CPU Intel Core i5-13420H | RAM ~7.7 GB | GPU NVIDIA RTX 2050 4 GB VRAM
- Node.js 24.20.0 | npm/npx 11.19.0 | Bun 1.4.2
- Python 3.13.15
- Git 2.55.0 | Git LFS 3.7.1
- FFmpeg/FFprobe 9.0.2 (Gyan.FFmpeg, via winget)
- Remotion 4.0.526 (template `--blank`, criado via `bun create video`) — permanece instalado, uso agora opcional (pós-produção).
- Higgsfield CLI 1.1.26 — ainda instalado na máquina por histórico, mas fora da arquitetura do projeto desde a Fase 16; nenhum agente o usa.
- Creatify — sem instalação local necessária (API REST + MCP de terceiros opcional). Nenhuma credencial (`CREATIFY_API_ID`/`CREATIFY_API_KEY`) foi configurada nesta máquina até o fim da Fase 17.

RAM é o recurso mais restrito da máquina — todo agente de composição/render deve assumir baixa concorrência por padrão.

## Estrutura

```
.claude/
  agents/           24 definições de agente/subagente (ver seção Agentes; 4 novos na Fase 17)
  skills/           12 skills Remotion (nenhuma skill Creatify — não existe uma disponível no ambiente, nenhuma foi inventada)
  settings.json     permissions.ask para Bash(curl *api.creatify.ai*) e Bash(curl *creatify*)

.agents/skills/     cópia universal das mesmas skills (formato cross-agent do skills.sh)

pipeline/
  schemas/          16 JSON Schemas — contrato entre cada etapa (4 novos na Fase 17: creatify-job, platform-account, metrics, experiment; 1 novo na Fase 18: tiktok-publication)
  policies/         POLICIES.md — fonte central de custo/hardware/segurança
  orchestration/    FLOW.md (fluxo do Orchestrator), CREATIFY-ARCHITECTURE.md, CREATIFY-SETUP.md, CREATIFY-INTEGRATION-VALIDATION.md, TIKTOK-ARCHITECTURE.md, TIKTOK-SETUP.md, REAL-PRODUCT-INPUT.md
  runs/             dry-run-001/ — histórico do dry-run Higgsfield (Fase 14/15), preservado sem edição. dry-run-002/ — execução estrutural 100% SIMULADA da pipeline Creatify+TikTok completa (Fase 18), sem nenhuma chamada externa real. Nenhum run real ainda.

src/                composição Remotion (placeholder do template, ainda não 9:16)
public/             assets estáticos do Remotion
```

## Agentes

**Pipeline principal (por vídeo):**
- `orchestrator` — coordena o fluxo, valida contratos, nunca gera/renderiza/publica.
- `research-agent` — pesquisa produto/audiência/criativo (inclui product intelligence) → `research.json`.
- `strategy-agent` — ângulo de venda + CTA → `strategy.json`.
- `script-agent` (+ `script-writer-subagent`, `script-qa-subagent`) — roteiro revisado → `script.json`.
- `creative-agent` (+ `shot-list-subagent`, `continuity-subagent`) — creative brief provider-agnostic, sem gerar nada e sem conhecer detalhes de nenhum motor → `creative-plan.json`.
- `creatify-production-agent` (+ `creatify-generation-subagent`, `asset-validation-subagent`) — único ramo autorizado a gastar créditos, sempre sob aprovação → `generation-plan.json` / `asset-manifest.json`. **Novo na Fase 17** (substitui o `higgsfield-production-agent` removido na Fase 16). Ver `pipeline/orchestration/CREATIFY-ARCHITECTURE.md`.
- `remotion-production-agent` (+ `composition-subagent`, `caption-subagent`) — composição 9:16, concorrência 1, **OPCIONAL**: só roda quando o vídeo entregue pelo Creatify precisa de pós-produção adicional → `video-manifest.json`.
- `qa-agent` (+ `technical-qa-subagent`, `visual-qa-subagent`, `tiktok-format-qa-subagent`) — QA somente-leitura, lê `video-manifest.json` OU `asset-manifest.json` diretamente → `qa-report.json`.

**Loop de performance (entre vídeos, fora do fluxo linear de um vídeo):**
- `performance-analysis-agent` — lê métricas, compara variantes, produz hipóteses sem declarar causalidade sem evidência. **Novo na Fase 17.**
- `creative-iteration-agent` — propõe novas variantes/experimentos a partir do aprendizado anterior. **Novo na Fase 17.** Depende de `metrics.json` populado, que depende de uma integração de analytics ainda não implementada (ver `CREATIFY-ARCHITECTURE.md` secao 11) — portanto o loop está implementado estruturalmente mas não roda de ponta a ponta ainda.

**Desativados (`tools: none`, documentados por completude):**
- `publishing-agent`, `metadata-subagent`, `tiktok-publishing-subagent`. A pesquisa da Fase 17 não confirmou capacidade de publicação direta via Creatify — permanecem desativados por decisão informada, não por lacuna.

## Segurança — separação de ferramentas

- **Sem Bash (impossibilidade estrutural de gerar/renderizar):** `research-agent`, `strategy-agent`, `script-agent` e seus subagentes, `creative-agent` e seus subagentes, `caption-subagent`, `visual-qa-subagent`, `tiktok-format-qa-subagent`, `performance-analysis-agent`, `creative-iteration-agent`.
- **Com Bash (para `ffprobe`/Remotion CLI):** `asset-validation-subagent`, `composition-subagent`, `remotion-production-agent`, `qa-agent`, `technical-qa-subagent`.
- **Único subagente autorizado a gerar conteúdo pago:** `creatify-generation-subagent` (`Bash`, usado para chamadas HTTP à API do Creatify — nunca `Skill`, pois não existe skill Creatify instalada), e só quando `generation-plan.json` tem `status: approved` com aprovação humana explícita. Qualquer `Bash` que chame `api.creatify.ai` passa pelo gate de `settings.json`.
- **Desativados:** `tools: none` — incapacidade estrutural de agir, não apenas instrução.

## Multiplataforma

A arquitetura não é mais estruturalmente limitada a TikTok Shop: `creative-plan.json.platforms`, `platform-account.schema.json`, `publishing-metadata.schema.json.platform` e `metrics.schema.json.platform` aceitam `tiktok`, `tiktok_shop`, `instagram_reels`, `youtube_shorts`, `meta`, `other`. TikTok/TikTok Shop continuam sendo a prioridade inicial (workflow de referência), mas nenhum schema força essa limitação.

## Estado do projeto

- Publishing: **OFF** (`tools: none`) — nenhuma capacidade de publicação direta foi confirmada na documentação do Creatify; publicação orgânica real dependeria de uma integração TikTok separada (Content Posting API), documentada mas não implementada (ver `TIKTOK-ARCHITECTURE.md`).
- Geração via Creatify: **implementada, não testada** — nenhuma chamada real foi feita (`CREATIFY_API_ID`/`CREATIFY_API_KEY` ausentes neste ambiente).
- Publicação TikTok: **contrato técnico documentado (Fase 18), não implementado, não testado** — nenhum app TikTok Developer existe, nenhum OAuth foi feito.
- Métricas/Performance loop: **contrato técnico documentado (Fase 18), não implementado** — caminho mais provável é a TikTok API for Business (Organic API), não construído.
- Integração com TikTok API/TikTok Shop API: **OFF** (nenhum app registrado, nenhuma credencial configurada).
- Automação de publicação: **nenhuma**.
- Pipeline real: **nunca executada** — nenhum `product.json` de produto real foi criado; nenhuma geração, render ou publicação ocorreu até agora. `pipeline/runs/dry-run-001/` é histórico do fluxo antigo (Higgsfield), preservado sem edição. `pipeline/runs/dry-run-002/` é uma simulação estrutural 100% local da Fase 18 (Creatify+TikTok), sem nenhuma chamada externa real.
