# Fluxo de Orquestração — TikTok Shop Video AI

```
INPUT (product.json, fornecido pelo humano)
  ↓
RESEARCH        → research-agent            → research.json (inclui product intelligence)
  ↓
STRATEGY        → strategy-agent            → strategy.json
  ↓
SCRIPT          → script-agent              → script.json
  ↓
CREATIVE        → creative-agent            → creative-plan.json (creative brief provider-agnostic)
  ↓
GERAÇÃO DE ASSETS → creatify-production-agent
                    1. → generation-plan.json      (sem custo, sem gerar nada)
                    2. ⏸ PAUSA — aguarda aprovação humana explícita
                    3. → asset-manifest.json        (só depois de aprovado; NÃO TESTADO
                       contra a API real — ver pipeline/orchestration/CREATIFY-ARCHITECTURE.md)
  ↓
REMOTION        → remotion-production-agent → video-manifest.json
                  (OPCIONAL: só roda se o vídeo do Creatify precisar de composição/
                  overlay adicional; se não, o Orchestrator pula direto para QA
                  lendo asset-manifest.json)
  ↓
QA              → qa-agent                  → qa-report.json
  ↓
HUMAN APPROVAL  ⏸ PAUSA — decisão humana (aprovar/rejeitar/pedir correção)
  ↓
PUBLISHING      → publishing-agent — **DESATIVADO, este passo não executa**
  ↓
METRICS         → NÃO IMPLEMENTADO (sem integração de analytics de nenhuma plataforma)
  ↓
PERFORMANCE ANALYSIS → creative-iteration-agent → novo experiment.json (loop separado,
                        entre vídeos, não faz parte da execução de um único vídeo)
```

## Regras do Orchestrator em cada transição

1. **Validar pré-condição:** o artefato de entrada da etapa existe e tem `status` compatível (`complete`/`approved`, nunca `error`/`draft` sem tratamento) antes de chamar o próximo agente.
2. **Chamar o próximo agente** apenas na ordem acima — nenhuma etapa pode ser pulada (exceto Remotion, explicitamente opcional), nenhum agente principal chama outro agente principal diretamente (todos reportam ao Orchestrator).
3. **Validar o output** recebido contra o schema correspondente em `pipeline/schemas/` antes de aceitar como concluído.
4. **Bloquear avanço** se o contrato for inválido — devolve ao agente de origem, não tenta corrigir o JSON por conta própria.
5. **Retry controlado:** no máximo o limite definido por agente (2 ciclos internos de escrita/QA no Script Agent e no Creative Agent; `MAX_RETRIES=2` para falha técnica de geração no Creatify Production Agent — ver `pipeline/policies/POLICIES.md`). Esgotado o limite, para e reporta ao humano.
6. **Registrar erros e decisões** em `pipeline/runs/<run_id>/log.json`, como entradas conformes a `pipeline/schemas/log-entry.schema.json` — uma entrada por evento relevante (chamada de agente, retorno, validação de contrato, retry, consulta de skill, gate de aprovação, chamada a provider, coleta de métrica), não apenas por erro.
7. **Nunca executar operação cara sem autorização:** a única pausa obrigatória de aprovação humana antes de qualquer geração paga é entre `generation-plan.json` e a geração real no Creatify. A segunda pausa (HUMAN APPROVAL, após QA) decide se o vídeo está bom — **não** decide publicação, porque o Publishing Agent está desativado; o pipeline termina aí até que publicação seja desenhada de verdade.

## Pontos de pausa obrigatória (não automatizáveis)

- **Antes da geração Creatify:** `generation-plan.json` → humano aprova ou rejeita explicitamente. Sem essa aprovação, o Orchestrator nunca chama `creatify-generation-subagent`.
- **Antes de qualquer render pesado do Remotion (quando usado):** o Orchestrator confirma que não há outro processo pesado em andamento e que a RAM livre é suficiente (ver `pipeline/policies/POLICIES.md`, seção 2).
- **Após o QA:** `qa-report.json` vai para aprovação humana. Aprovação de vídeo ≠ aprovação de publicação — são decisões diferentes, e a de publicação não está disponível (Publishing desativado).

## Decisão Remotion sim/não

O Orchestrator decide se a etapa Remotion roda com base em `asset-manifest.json`: se o Creatify já entregou um único arquivo de vídeo final no aspect ratio/duração/formato exigidos por `creative-plan.json`, o Remotion pode ser pulado e o QA lê `asset-manifest.json` diretamente. Se for necessário compor múltiplos clipes, adicionar legendas customizadas, ou qualquer overlay, o Remotion roda normalmente. Essa decisão nunca é tomada pelo `remotion-production-agent` sozinho — é uma validação de pré-condição do Orchestrator.

## Loop de performance (fora do fluxo de um único vídeo)

Depois que Publishing e Metrics existirem de fato (nenhum dos dois está implementado nesta fase), o `performance-analysis-agent` lê `metrics.json`/`experiment.json`, e o `creative-iteration-agent` propõe um novo `experiment.json`. Esse loop roda entre produções, não dentro do fluxo linear de um vídeo — não bloqueia nem é bloqueado pelo fluxo acima.

## Fora de escopo (documentado, não ativo)

`PUBLISHING` e `METRICS` estão no diagrama para completude, mas não são executados pelo Orchestrator nesta fase — `publishing-agent` está com `tools: none` e instrução de recusa (ver `.claude/agents/publishing-agent.md`); não existe nenhuma integração de coleta de métricas implementada (ver `pipeline/orchestration/CREATIFY-ARCHITECTURE.md` secao 11).
