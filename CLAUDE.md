# Projeto: tiktok-shop-video-ai

Pipeline de produção de vídeos de produto para TikTok Shop: pesquisa → estratégia → roteiro → planejamento visual → geração (motor **DEFERRED — Creatify migration phase**, ver Fase 16 abaixo) → composição (Remotion) → QA → publicação (desativada no MVP).

**Fase 16 (decisão arquitetural vigente):** a Higgsfield foi removida da arquitetura — não é mais o motor de geração do projeto. O motor futuro será o Creatify, mas a integração Claude ↔ Creatify ainda **não foi implementada** (fica para uma fase posterior). Claude continua como orquestrador/cérebro do sistema. Publicação e analytics também permanecem para fases futuras.

## Fluxo

```
Research → Strategy → Script → Creative → Generation Plan
  → HUMAN APPROVAL (geração paga)
  → [motor de geração: DEFERRED — Creatify migration phase] → Remotion → QA
  → HUMAN APPROVAL (vídeo)
  → Publishing (DESATIVADO no MVP)
```
Detalhes completos e regras de transição em `pipeline/orchestration/FLOW.md`.

## Regras absolutas

- Nunca gerar conteúdo em nenhum motor de geração pago sem aprovação humana explícita registrada em `generation-plan.json` (`status: approved` + campo `approval` preenchido). **DEFERRED — Creatify migration phase:** não há motor de geração ativo nesta fase (Higgsfield removido na Fase 16); esta regra se aplica a qualquer motor futuro.
- Nunca expor credenciais, tokens ou chaves em qualquer arquivo, log ou saída de agente.
- Nunca publicar automaticamente no TikTok — o Publishing Agent está desativado (`tools: none`).
- Nunca executar geração em paralelo, nem mais de uma vez por asset por rodada de aprovação (`MAX_GENERATION_ATTEMPTS = 1`; falha técnica tolera `MAX_RETRIES = 2`, nunca mais) — regra a reaplicar quando o motor substituto for integrado.
- Remotion sempre com `concurrency = 1`; nunca `studio` e `render` simultâneos.
- Não renderizar quando a RAM livre estiver criticamente baixa — pausar e reportar.
- Geração pesada (imagem/vídeo/áudio) ocorre sempre na nuvem, nunca localmente; a máquina local só compõe, valida e faz QA técnico leve.
- Não instalar dependências novas sem necessidade explícita.
- Não executar scripts externos (`curl | sh` ou equivalente) sem revisão prévia do conteúdo.
- Não consumir créditos durante testes, dry-runs ou validações de infraestrutura.
- Política completa e centralizada em `pipeline/policies/POLICIES.md` — agentes referenciam esse arquivo em vez de duplicar números.

**Histórico (Fase 16 — removido):** até a Fase 16 este projeto usava a Higgsfield como motor de geração. As regras específicas dela foram removidas desta lista (nunca ler `~/.config/higgsfield/credentials.json`; gate de confirmação Bash para `higgsfield`/`higgs`/`hf` em `.claude/settings.json`) porque os agentes/skills que as tornavam relevantes foram desinstalados — ver relatório da Fase 16. Quando o motor substituto (Creatify) for integrado, uma proteção estrutural equivalente deve ser recriada.

## Máquina (verificado nesta sessão — não inventar números diferentes)

- Windows 11 Home x64
- CPU Intel Core i5-13420H | RAM ~7.7 GB | GPU NVIDIA RTX 2050 4 GB VRAM
- Node.js 24.20.0 | npm/npx 11.19.0 | Bun 1.4.2
- Python 3.13.15
- Git 2.55.0 | Git LFS 3.7.1
- FFmpeg/FFprobe 9.0.2 (Gyan.FFmpeg, via winget)
- Remotion 4.0.526 (template `--blank`, criado via `bun create video`)
- Higgsfield CLI 1.1.26 — **instalado na máquina, mas não faz mais parte da arquitetura do projeto** (removido na Fase 16; a autenticação/workspace registrados em sessões anteriores não são mais usados por nenhum agente deste projeto). O motor de geração futuro (Creatify) ainda não está instalado — DEFERRED — Creatify migration phase.

RAM é o recurso mais restrito da máquina — todo agente de composição/render deve assumir baixa concorrência por padrão.

## Estrutura

```
.claude/
  agents/           20 definições de agente/subagente (ver seção Agentes; 3 exclusivas do Higgsfield removidas na Fase 16)
  skills/           12 skills Remotion (3 skills Higgsfield removidas na Fase 16)
  settings.json     sem regras de permissão específicas nesta fase (regra Bash(higgsfield*/higgs*/hf*) removida na Fase 16 — sem componente que a use)

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
- `creative-agent` (+ `shot-list-subagent`, `continuity-subagent`) — plano visual, sem gerar nada → `creative-plan.json`. (Tradução de shot em prompt/modelo de geração concreto: **DEFERRED — Creatify migration phase**, subagente removido na Fase 16.)
- **Motor de geração paga (Higgsfield):** removido na Fase 16 — não há mais um agente principal neste papel. `asset-validation-subagent` (validação técnica via `ffprobe`, função genérica) foi preservado sem chamador ativo. A reintrodução deste ramo com o motor substituto (Creatify) é **DEFERRED — Creatify migration phase**.
- `remotion-production-agent` (+ `composition-subagent`, `caption-subagent`) — composição 9:16, concorrência 1 → `video-manifest.json`.
- `qa-agent` (+ `technical-qa-subagent`, `visual-qa-subagent`, `tiktok-format-qa-subagent`) — QA somente-leitura → `qa-report.json`.

**Desativados no MVP (`tools: none`, documentados por completude):**
- `publishing-agent`, `metadata-subagent`, `tiktok-publishing-subagent`.

## Segurança — separação de ferramentas

- **Sem Bash (impossibilidade estrutural de gerar/renderizar):** `research-agent`, `strategy-agent`, `script-agent` e seus subagentes, `creative-agent` e seus subagentes, `caption-subagent`, `visual-qa-subagent`, `tiktok-format-qa-subagent`.
- **Com Bash (para `ffprobe`/Remotion CLI):** `asset-validation-subagent`, `composition-subagent`, `remotion-production-agent`, `qa-agent`, `technical-qa-subagent`.
- **Motor de geração paga:** nenhum subagente ativo nesta fase (o único que tinha `Bash` para esse fim, `asset-generation-subagent`, era exclusivo da Higgsfield e foi removido na Fase 16). Quando o motor substituto for integrado, o mesmo princípio se aplica: só um subagente dedicado, com `Bash`, pode gerar conteúdo pago, e só com `generation-plan.json` em `status: approved` e aprovação humana explícita — **DEFERRED — Creatify migration phase**.
- **Desativados:** `tools: none` — incapacidade estrutural de agir, não apenas instrução.

## Estado do MVP

- Publishing: **OFF** (`tools: none`).
- Integração com TikTok API/TikTok Shop API: **OFF** (não existe, não foi desenhada).
- Automação de publicação: **nenhuma**.
- Pipeline real: **nunca executada** — nenhum `product.json` de produto real foi criado; nenhuma geração, render ou publicação ocorreu até agora.
