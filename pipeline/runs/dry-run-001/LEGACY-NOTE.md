# legacy_higgsfield_dry_run

Este diretório (`pipeline/runs/dry-run-001/`) documenta um dry-run de validação estrutural feito nas Fases 13–15, usando o produto fictício "Mini Umidificador Portátil USB NebulaBrisa" e o antigo motor de geração Higgsfield (removido na Fase 16).

**Não editar os artefatos existentes neste diretório.** Eles são histórico de auditoria — provam que o fluxo Research → Strategy → Script → Creative → Generation Plan funcionava estruturalmente antes da migração para o Creatify (Fase 17), incluindo os gates de aprovação e os ciclos de auditoria de continuidade/custo.

Este arquivo é uma adição da Fase 17 (nenhum arquivo pré-existente neste diretório foi alterado) apenas para marcar explicitamente o diretório como `legacy_higgsfield_dry_run`, conforme decisão de não inventar uma estrutura de archive/legacy mais complexa que não existia antes.

Não reutilizar:
- o produto fictício como produto real;
- `generation-plan.json` (schema Higgsfield específico, incompatível com o schema provider-agnostic atual);
- `shot-list-with-prompts.json` (contém `higgsfield_model` por shot, conceito removido de `creative-plan.schema.json` na Fase 17).

Um novo dry-run com o Creatify, quando feito, deve viver em um diretório próprio (ex.: `pipeline/runs/dry-run-002/`), nunca sobrescrevendo este.
