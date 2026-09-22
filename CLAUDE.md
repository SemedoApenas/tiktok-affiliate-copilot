# Projeto: tiktok-shop-video-ai

Pipeline de produção de vídeos de produto para TikTok Shop: pesquisa → estratégia → roteiro → planejamento visual → geração (Higgsfield) → composição (Remotion) → QA → publicação (desativada no MVP).

## Fluxo

```
Research → Strategy → Script → Creative → Generation Plan
  → HUMAN APPROVAL (geração paga)
  → Higgsfield → Remotion → QA
  → HUMAN APPROVAL (vídeo)
  → Publishing (DESATIVADO no MVP)
```
Detalhes completos e regras de transição em `pipeline/orchestration/FLOW.md`.

## Regras absolutas

- Nunca gerar conteúdo na Higgsfield sem aprovação humana explícita registrada em `generation-plan.json` (`status: approved` + campo `approval` preenchido).
- Nunca expor credenciais, tokens ou chaves em qualquer arquivo, log ou saída de agente.
- Nunca ler `~/.config/higgsfield/credentials.json` — é gerenciado exclusivamente pelo CLI da Higgsfield.
- Nunca publicar automaticamente no TikTok — o Publishing Agent está desativado (`tools: none`).
- Nunca executar geração em paralelo, nem mais de uma vez por asset por rodada de aprovação (`MAX_GENERATION_ATTEMPTS = 1`; falha técnica tolera `MAX_RETRIES = 2`, nunca mais).
- Remotion sempre com `concurrency = 1`; nunca `studio` e `render` simultâneos.
- Não renderizar quando a RAM livre estiver criticamente baixa — pausar e reportar.
- Geração pesada (imagem/vídeo/áudio) ocorre sempre na nuvem (Higgsfield); a máquina local só compõe, valida e faz QA técnico leve.
- Não instalar dependências novas sem necessidade explícita.
- Não executar scripts externos (`curl | sh` ou equivalente) sem revisão prévia do conteúdo.
- Não consumir créditos durante testes, dry-runs ou validações de infraestrutura.
- Qualquer comando Bash que comece com `higgsfield`, `higgs` ou `hf` exige confirmação humana explícita — reforçado estruturalmente em `.claude/settings.json` (`permissions.ask`), não apenas por instrução em prompt.
- Política completa e centralizada em `pipeline/policies/POLICIES.md` — agentes referenciam esse arquivo em vez de duplicar números.

## Máquina (verificado nesta sessão — não inventar números diferentes)

- Windows 11 Home x64
- CPU Intel Core i5-13420H | RAM ~7.7 GB | GPU NVIDIA RTX 2050 4 GB VRAM
- Node.js 24.20.0 | npm/npx 11.19.0 | Bun 1.4.2
- Python 3.13.15
- Git 2.55.0 | Git LFS 3.7.1
- FFmpeg/FFprobe 9.0.2 (Gyan.FFmpeg, via winget)
- Remotion 4.0.526 (template `--blank`, criado via `bun create video`)
- Higgsfield CLI 1.1.26 (instalado via `npm install -g @higgsfield/cli`, autenticado — conta `pedrosemedo10@outlook.com`, workspace `Private`, plano free, 10 créditos)

RAM é o recurso mais restrito da máquina — todo agente de composição/render deve assumir baixa concorrência por padrão.

## Estrutura

```
.claude/
  agents/           23 definições de agente/subagente (ver seção Agentes)
  skills/           12 skills Remotion + 3 skills Higgsfield (generate, product-photoshoot, youtube-thumbnail)
  settings.json     regra de permissão Bash(higgsfield*/higgs*/hf*) = ask

.agents/skills/     cópia universal das mesmas skills (formato cross-agent do skills.sh)

pipeline/
  schemas/          10 JSON Schemas — contrato entre cada etapa
  policies/         POLICIES.md — fonte central de custo/hardware/segurança
  orchestration/     FLOW.md — fluxo detalhado e regras do Orchestrator
  runs/             logs de execução (vazio — pipeline ainda não rodou)

src/                composição Remotion (placeholder do template, ainda não 9:16)
public/             assets estáticos do Remotion
```

## Agentes

**Ativos no MVP:**
- `orchestrator` — coordena o fluxo, valida contratos, nunca gera/renderiza/publica.
- `research-agent` — pesquisa produto/audiência/criativo → `research.json`.
- `strategy-agent` — ângulo de venda + CTA → `strategy.json`.
- `script-agent` (+ `script-writer-subagent`, `script-qa-subagent`) — roteiro revisado → `script.json`.
- `creative-agent` (+ `shot-list-subagent`, `higgsfield-prompt-subagent`, `continuity-subagent`) — plano visual, sem gerar nada → `creative-plan.json`.
- `higgsfield-production-agent` (+ `asset-generation-subagent`, `asset-validation-subagent`) — único ramo autorizado a gastar créditos, sempre sob aprovação → `generation-plan.json` / `asset-manifest.json`.
- `remotion-production-agent` (+ `composition-subagent`, `caption-subagent`) — composição 9:16, concorrência 1 → `video-manifest.json`.
- `qa-agent` (+ `technical-qa-subagent`, `visual-qa-subagent`, `tiktok-format-qa-subagent`) — QA somente-leitura → `qa-report.json`.

**Desativados no MVP (`tools: none`, documentados por completude):**
- `publishing-agent`, `metadata-subagent`, `tiktok-publishing-subagent`.

## Segurança — separação de ferramentas

- **Sem Bash (impossibilidade estrutural de gerar/renderizar):** `research-agent`, `strategy-agent`, `script-agent` e seus subagentes, `creative-agent` e seus subagentes, `caption-subagent`, `visual-qa-subagent`, `tiktok-format-qa-subagent`.
- **Com Bash (para `ffprobe`/Remotion CLI, nunca para Higgsfield por instrução — reforçado pela regra `ask` em `settings.json`):** `asset-validation-subagent`, `composition-subagent`, `remotion-production-agent`, `qa-agent`, `technical-qa-subagent`.
- **Único subagente autorizado a gerar conteúdo pago:** `asset-generation-subagent` (`Bash` + `Skill`), e só quando `generation-plan.json` tem `status: approved` com aprovação humana explícita.
- **Desativados:** `tools: none` — incapacidade estrutural de agir, não apenas instrução.

## Estado do MVP

- Publishing: **OFF** (`tools: none`).
- Integração com TikTok API/TikTok Shop API: **OFF** (não existe, não foi desenhada).
- Automação de publicação: **nenhuma**.
- Pipeline real: **nunca executada** — nenhum `product.json` de produto real foi criado; nenhuma geração, render ou publicação ocorreu até agora.
