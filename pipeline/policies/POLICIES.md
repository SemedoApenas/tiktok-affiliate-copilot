# Políticas Conceituais da Pipeline — TikTok Shop Video AI

Este documento é a fonte única das políticas de custo, hardware e segurança que todo agente/subagente deve respeitar. Nenhum agente deve reimplementar estes números com valores diferentes — eles referenciam este arquivo.

## 1. Controle de custo (geração paga) — DEFERRED — Creatify migration phase

**Status (Fase 16):** a Higgsfield foi desacoplada da arquitetura (agentes e skills removidos — ver relatório da Fase 16). Os números concretos abaixo (10 créditos, workspace `Private`) eram específicos da Higgsfield e não se aplicam a nenhum motor ativo hoje. O princípio geral — nenhuma geração paga sem aprovação humana explícita, tentativas limitadas — permanece válido e deve ser reimplementado com os números reais do motor substituto (Creatify) quando essa integração for feita. Nada nesta seção deve ser tratado como configuração ativa até lá.

Texto original (histórico, para referência ao redesenhar):

A Higgsfield cobrava créditos por geração. O workspace usado no dry-run (`Private`, plano free) tinha **10 créditos** — extremamente limitado. Por isso:

| Parâmetro | Valor conceitual | Significado |
|---|---|---|
| `MAX_GENERATION_ATTEMPTS` | **1 por asset por ciclo de aprovação** | Cada asset (imagem/vídeo/áudio) só pode ser gerado uma vez por rodada de aprovação humana. Gerar de novo exige uma nova aprovação explícita, não é automático. |
| `MAX_RETRIES` | **2 falhas técnicas por asset** (erro de API, timeout, job travado) | Falha técnica (não falha de qualidade) pode ser reexecutada até 2 vezes automaticamente. Na 3ª falha, o Higgsfield Production Agent PARA e devolve ao Orchestrator com erro — nunca tenta indefinidamente. |
| `REQUIRE_GENERATION_APPROVAL` | **true, sempre, sem exceção no MVP** | Nenhuma chamada que gere conteúdo (`generate create`, `product-photoshoot create`, `soul-id create`, `marketplace-cards create`, etc.) pode ser executada sem um sinal explícito de aprovação humana anexado à chamada. Isso não é um default configurável pelo agente — é uma regra que o Asset Generation Subagent verifica antes de qualquer chamada. |

Regras adicionais:
- O número esperado de gerações (quantos assets, quais modelos, custo estimado em créditos) deve estar **completo no `generation-plan.json`** antes de qualquer aprovação ser solicitada — nunca se decide "quantas gerações" durante a execução.
- Falha de geração **nunca** dispara nova geração automática. Falha aciona apenas: log do erro + retorno ao Orchestrator. Uma nova tentativa é sempre uma decisão nova, não uma continuação automática.
- Créditos são finitos e não-recuperáveis — o Asset Generation Subagent deve reportar o custo estimado (em créditos) de cada asset planejado antes de pedir aprovação.

## 2. Limitação de hardware

Máquina: RAM ~7,7 GB, GPU RTX 2050 4 GB VRAM.

- **Concorrência do Remotion:** sempre `--concurrency 1` (ou equivalente sequencial). Nunca renderizar duas composições/segmentos ao mesmo tempo.
- **Chromium:** no máximo uma instância do Chromium do Remotion aberta por vez. Nunca abrir `remotion studio` e rodar um `remotion render` simultaneamente.
- **Geração pesada fica na nuvem:** toda geração de imagem/vídeo/áudio deve ser feita na nuvem, nunca localmente. A máquina local só compõe, valida e faz QA técnico leve (ffprobe). (Fase 16: motor de nuvem específico — Higgsfield — removido; regra geral mantida para o motor substituto, DEFERRED — Creatify migration phase.)
- **Processos simultâneos:** nenhum agente deve iniciar um processo pesado (render, bundle, generate) enquanto outro processo pesado do mesmo tipo já estiver em execução. O Orchestrator é responsável por serializar essas chamadas entre agentes.
- Antes de qualquer render, verificar RAM livre; se estiver criticamente baixa (ex.: <500 MB), o agente deve pausar e reportar em vez de insistir.

## 3. Segurança

- Nenhum agente executa scripts baixados de rede sem revisão humana prévia.
- Nenhum download externo (binários, repositórios, pacotes) é iniciado por um agente por conta própria — apenas como parte de um passo já autorizado pelo usuário (ex.: instalação de skill oficial já aprovada). Nenhum agente baixa e executa conteúdo de origem não verificada.
- Nenhum agente instala dependências novas sem autorização explícita do usuário.
- Nenhuma chamada de geração paga sem aprovação explícita (ver seção 1 — DEFERRED — Creatify migration phase, sem motor ativo nesta fase).
- Nenhum agente deve imprimir, logar ou escrever em qualquer `.json` de projeto tokens, chaves de API, cookies ou credenciais.
- Nenhuma publicação automática no TikTok durante o MVP — o Publishing Agent está desativado por definição (ver `publishing-agent.md`).
- Nenhum comando destrutivo (deletar arquivos, sobrescrever configs) sem confirmação explícita do usuário.
- **Histórico (Fase 16 — removido):** até a Fase 16, `.claude/settings.json` definia `permissions.ask` para `Bash(higgsfield *)`, `Bash(higgs *)` e `Bash(hf *)`, e uma superfície reduzida de 3 skills Higgsfield estava instalada no projeto. Ambos foram removidos junto com o desacoplamento do Higgsfield (agentes, skills e essa regra de permissão não têm mais função — não há mais nenhum comando `higgsfield`/`higgs`/`hf` que um agente deste projeto possa tentar executar). Quando o motor substituto (Creatify) for integrado, uma proteção estrutural equivalente (gate de confirmação humana em `settings.json` para os comandos daquele CLI) deve ser recriada — **DEFERRED — Creatify migration phase**.

## 4. QA

- Todo QA (técnico, visual, formato TikTok) é somente-leitura: nenhum subagente de QA corrige, regenera ou re-renderiza — apenas mede e reporta.
- Uma falha de QA nunca dispara automaticamente uma nova geração paga ou um novo render Remotion. O QA aponta qual agente anterior deve agir; a decisão de agir é do Orchestrator/humano.
- QA nunca aprova publicação — aprova apenas o vídeo em si (ver `qa-report.schema.json`); a aprovação de publicação é um gate humano separado, hoje sem destino (Publishing desativado).

## 5. Referência cruzada

Qualquer agente cujo prompt mencione limites de custo, hardware ou segurança deve citar este arquivo (`pipeline/policies/POLICIES.md`) em vez de repetir os números — evita divergência entre agentes.
