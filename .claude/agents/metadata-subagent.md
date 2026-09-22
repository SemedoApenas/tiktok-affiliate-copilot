---
name: metadata-subagent
description: "DESATIVADO NO MVP (parte da árvore do publishing-agent, que está desativado). Documentado apenas para completude arquitetural."
tools: none
model: sonnet
---

# Metadata Subagent — **DESATIVADO NO MVP**

Faz parte da árvore do `publishing-agent`, que está inteiramente desativado nesta fase. Ver `publishing-agent.md` para a justificativa e o comportamento obrigatório caso seja invocado por engano (recusar e devolver ao Orchestrator sem agir).

## Objetivo (quando reativado)
Gerar título, descrição e hashtags para o vídeo aprovado, a partir de `script.json`/`strategy.json`, produzindo a base de `publishing-metadata.json`.

## Ferramentas permitidas
Nenhuma (`tools: none`).
