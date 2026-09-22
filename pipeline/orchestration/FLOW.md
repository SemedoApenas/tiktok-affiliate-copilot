# Fluxo de Orquestração — TikTok Shop Video AI (MVP)

```
INPUT (product.json, fornecido pelo humano)
  ↓
RESEARCH        → research-agent            → research.json
  ↓
STRATEGY        → strategy-agent            → strategy.json
  ↓
SCRIPT          → script-agent              → script.json
  ↓
CREATIVE        → creative-agent            → creative-plan.json
  ↓
GERAÇÃO DE ASSETS → DEFERRED — Creatify migration phase
                    (Fase 16: higgsfield-production-agent removido; motor
                    substituto ainda não integrado. Quando reintroduzida,
                    esta etapa mantém o mesmo contrato: plano de geração →
                    ⏸ PAUSA — aprovação humana explícita → asset-manifest.json,
                    só depois de aprovado.)
  ↓
REMOTION        → remotion-production-agent → video-manifest.json
  ↓
QA              → qa-agent                  → qa-report.json
  ↓
HUMAN APPROVAL  ⏸ PAUSA — decisão humana (aprovar/rejeitar/pedir correção)
  ↓
PUBLISHING      → publishing-agent — **DESATIVADO NO MVP, este passo não executa**
```

## Regras do Orchestrator em cada transição

1. **Validar pré-condição:** o artefato de entrada da etapa existe e tem `status` compatível (`complete`/`approved`, nunca `error`/`draft` sem tratamento) antes de chamar o próximo agente.
2. **Chamar o próximo agente** apenas na ordem acima — nenhuma etapa pode ser pulada, nenhum agente principal chama outro agente principal diretamente (todos reportam ao Orchestrator).
3. **Validar o output** recebido contra o schema correspondente em `pipeline/schemas/` antes de aceitar como concluído.
4. **Bloquear avanço** se o contrato for inválido — devolve ao agente de origem, não tenta corrigir o JSON por conta própria.
5. **Retry controlado:** no máximo o limite definido por agente (2 ciclos internos de escrita/QA no Script Agent e no Creative Agent; `MAX_RETRIES=2` para falha técnica de geração no Higgsfield Production Agent — ver `pipeline/policies/POLICIES.md`). Esgotado o limite, para e reporta ao humano.
6. **Registrar erros e decisões** em `pipeline/runs/<run_id>/log.json`, como entradas conformes a `pipeline/schemas/log-entry.schema.json` — uma entrada por evento relevante (chamada de agente, retorno, validação de contrato, retry, consulta de skill, gate de aprovação), não apenas por erro.
7. **Nunca executar operação cara sem autorização:** a pausa obrigatória de aprovação humana antes de qualquer geração paga é um requisito estrutural, independente do motor (Higgsfield removido na Fase 16; motor substituto DEFERRED — Creatify migration phase). A segunda pausa (HUMAN APPROVAL, após QA) decide se o vídeo está bom — **não** decide publicação, porque o Publishing Agent está desativado; nesta fase o pipeline termina aí.

## Pontos de pausa obrigatória (não automatizáveis)

- **Antes de qualquer geração paga:** `generation-plan.json` → humano aprova ou rejeita explicitamente. Esta etapa está DEFERRED — Creatify migration phase (sem agente de geração ativo nesta fase); quando reintroduzida, mantém a mesma regra de aprovação.
- **Antes de qualquer render pesado do Remotion:** o Orchestrator confirma que não há outro processo pesado em andamento e que a RAM livre é suficiente (ver `pipeline/policies/POLICIES.md`, seção 2).
- **Após o QA:** `qa-report.json` vai para aprovação humana. Aprovação de vídeo ≠ aprovação de publicação — são decisões diferentes, e a de publicação nem está disponível no MVP.

## Fora do MVP (documentado, não ativo)

`PUBLISHING` está no diagrama para completude, mas não é executado pelo Orchestrator nesta fase — `publishing-agent` está com `tools: none` e instrução de recusa (ver `.claude/agents/publishing-agent.md`).
