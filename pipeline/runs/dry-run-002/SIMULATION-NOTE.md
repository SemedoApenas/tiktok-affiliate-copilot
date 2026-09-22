# dry-run-002 — SIMULATED, NO EXTERNAL API CALL

Este diretório é uma execução **estrutural e simulada** da pipeline completa Fase 18: produto → research → strategy → script → creative plan → Creatify job → resultado Creatify → QA → publicação TikTok → métricas → performance analysis → creative iteration.

**Nenhuma chamada de rede real foi feita para produzir qualquer artefato aqui.** Todo campo que representaria uma resposta de uma API externa (Creatify, TikTok) está marcado explicitamente com `"_simulation": "SIMULATED — NOT REAL — NO EXTERNAL API CALL"` no próprio JSON, e os valores (IDs, URLs, métricas) são inventados para fins de teste estrutural — nunca devem ser tratados como dado real por nenhum agente ou humano lendo este diretório depois.

Produto usado: **fictício**, "LumiFlex — Luminária de Mesa Articulada USB-C" — diferente do produto fictício do `dry-run-001` (NebulaBrisa, ciclo Higgsfield/Fase 14-15), para não misturar os dois históricos. Nenhum dos dois é um produto real; nenhum deve ser usado como input de uma execução real.

Propósito: provar que os schemas e o formato de dado entre etapas (Fase 16-18: provider-agnostic + Creatify + TikTok) se encaixam de ponta a ponta, antes de qualquer configuração real de credenciais.

Artefatos, na ordem do fluxo:
1. `product.json`
2. `research.json`
3. `strategy.json`
4. `script.json`
5. `creative-plan.json`
6. `generation-plan.json` (aprovação humana **simulada**)
7. `creatify-job.json` — SIMULATED
8. `asset-manifest.json` — SIMULATED (retorno do Creatify)
9. `qa-report.json`
10. `tiktok-publication.json` — SIMULATED (aprovação de publicação **simulada** + resultado simulado)
11. `metrics.json` — SIMULATED
12. `experiment.json` — análise do `performance-analysis-agent` (simulada)
13. `experiment-002-proposal.json` — nova rodada proposta pelo `creative-iteration-agent` (simulada)
14. `log.json` — log de eventos cobrindo toda a execução, cada entrada marcada como simulação
