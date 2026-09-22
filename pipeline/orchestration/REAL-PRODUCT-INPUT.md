# Input do Primeiro Produto Real — Guia para o Usuário

Este documento explica o que fornecer para iniciar uma execução real da pipeline (não um dry-run). Criado na Fase 15, antes de qualquer produto real ter sido definido. Nenhum produto real é escolhido ou inventado por este documento.

## 1. O que você precisa fornecer

Um `product.json` real, preenchido a partir do template em `pipeline/product.template.json`, com dados verdadeiros e verificáveis do produto que você quer divulgar — nunca dados fictícios, estimados ou "prováveis".

## 2. Formato esperado

Um arquivo JSON conforme `pipeline/schemas/product.schema.json`, salvo em `pipeline/runs/<run_id>/product.json` (siga o padrão de `pipeline/runs/dry-run-001/` para nomear o `run_id`, mas use um nome que deixe claro que não é um dry-run, ex.: `run-001`).

## 3. Informações obrigatórias (exigidas pelo schema)

- `product.name` — nome real do produto.
- `product.category` — categoria real.
- `product.description` — descrição real e verificável.
- `product.price.amount` e `product.price.currency` — preço real, moeda em código de 3 letras (ex.: `BRL`).
- `schema_version` (sempre `"1.0.0"`), `project_id`, `created_at`, `status` (só pode ser `"complete"` — preencha por último, depois de revisar tudo).

## 4. Informações opcionais (suportadas pelo schema, mas não obrigatórias)

- `product.key_features` — lista de características/benefícios reais.
- `product.reference_images` — caminhos/URLs de imagens reais do produto, se houver.
- `product.tiktok_shop_url` — URL real do anúncio/listing, se já existir.
- `product.offer.discount_code` / `product.offer.promotion_deadline` — apenas se houver uma oferta real; caso contrário, deixe `null`. Nunca invente cupom ou prazo.

## 5. Informações que você pode querer fornecer, mas que o schema atual NÃO tem campo dedicado

Identificadas na auditoria da Fase 15 como lacunas do `product.schema.json` (registradas para avaliação futura, não corrigidas automaticamente nesta fase):

- Público-alvo já conhecido (se você já sabe quem compra, em vez de deixar o `research-agent` inferir do zero).
- Restrições de uso/venda (ex.: regulatórias, de plataforma).
- Claims permitidos (afirmações que você autoriza o roteiro a fazer).
- Claims proibidos (afirmações que o roteiro nunca deve fazer, mesmo que pareçam plausíveis).

Enquanto o schema não for estendido, comunique esses pontos diretamente ao humano que vai revisar `strategy.json` e `script.json` antes de cada aprovação — eles não fazem parte do contrato formal `product.json` ainda, então nenhum agente é obrigado a respeitá-los automaticamente a partir do JSON.

## 6. O que acontece quando uma informação não existe

Os agentes **não inventam fatos** sobre o produto. Quando uma informação não é fornecida e não pode ser pesquisada com confiança (ex.: preço de mercado da concorrência, dado demográfico oficial), o agente responsável marca isso explicitamente como lacuna (`research.json.status: partial` + `gaps`) em vez de especular como se fosse fato — foi exatamente o comportamento observado no dry-run-001.

## 7. Como claims devem ser tratados

Nenhum agente deve afirmar no roteiro algo que não esteja sustentado por `product.json` (dados reais) ou por `research.json` (pesquisa com fonte citada). Preço, desconto, prazo de oferta e prova social só podem aparecer no roteiro se vierem de dado real — nunca de suposição do agente. Isso já é regra ativa em `strategy-agent.md` e `script-writer-subagent.md`.

## 8. Onde o pipeline começa

`pipeline/orchestration/FLOW.md`: o pipeline começa em `product.json` (fornecido pelo humano) → `research-agent`. Nenhum agente principal roda antes de `product.json` existir com `status: complete`.

## 9. Onde ocorre o primeiro gate humano

Depois de `creative-plan.json` estar completo e `generation-plan.json` ser produzido pelo `creatify-production-agent` (Fase 17 — substitui o antigo `higgsfield-production-agent`, removido na Fase 16), com `status: awaiting_approval` e `approval: null`. Este é o único gate obrigatório antes de qualquer geração paga — ver `pipeline/policies/POLICIES.md` §1 (`REQUIRE_GENERATION_APPROVAL`).

## 10. Nenhuma geração paga ocorre automaticamente

Mesmo com `product.json` real e todo o restante do pipeline completo, nenhuma chamada ao Creatify ocorre sem uma aprovação humana explícita preenchendo `generation-plan.json.approval.approved_by` e `approval.approved_at`. Essa decisão nunca é tomada por um agente.
