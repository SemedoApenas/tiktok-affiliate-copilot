# Políticas Conceituais da Pipeline — TikTok Shop Video AI

Este documento é a fonte única das políticas de custo, hardware e segurança que todo agente/subagente deve respeitar. Nenhum agente deve reimplementar estes números com valores diferentes — eles referenciam este arquivo.

## 1. Controle de custo (Higgsfield)

A Higgsfield cobra créditos por geração. O workspace atual (`Private`, plano free) tem **10 créditos** — extremamente limitado. Por isso:

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
- **Geração pesada fica na nuvem:** toda geração de imagem/vídeo/áudio é feita pela API da Higgsfield (nuvem), nunca localmente. A máquina local só compõe, valida e faz QA técnico leve (ffprobe).
- **Processos simultâneos:** nenhum agente deve iniciar um processo pesado (render, bundle, generate) enquanto outro processo pesado do mesmo tipo já estiver em execução. O Orchestrator é responsável por serializar essas chamadas entre agentes.
- Antes de qualquer render, verificar RAM livre; se estiver criticamente baixa (ex.: <500 MB), o agente deve pausar e reportar em vez de insistir.

## 3. Segurança

- Nenhum agente executa scripts baixados de rede sem revisão humana prévia (mesmo princípio já aplicado na instalação do CLI Higgsfield).
- Nenhum download externo (binários, repositórios, pacotes) é iniciado por um agente por conta própria — apenas como parte de um passo já autorizado pelo usuário (ex.: instalação de skill oficial já aprovada). Nenhum agente baixa e executa conteúdo de origem não verificada.
- Nenhum agente instala dependências novas sem autorização explícita do usuário.
- Nenhuma chamada paga (Higgsfield) sem aprovação explícita (ver seção 1).
- Nenhum agente deve imprimir, logar ou escrever em qualquer `.json` de projeto tokens, chaves de API, cookies ou credenciais. Credenciais vivem exclusivamente em `~/.config/higgsfield/credentials.json`, gerenciadas pelo próprio CLI — nenhum agente lê ou copia esse arquivo.
- Nenhuma publicação automática no TikTok durante o MVP — o Publishing Agent está desativado por definição (ver `publishing-agent.md`).
- Nenhum comando destrutivo (deletar arquivos, sobrescrever configs) sem confirmação explícita do usuário.
- **Proteção estrutural (não apenas instrução):** `.claude/settings.json` (escopo de projeto) define `permissions.ask` para `Bash(higgsfield *)`, `Bash(higgs *)` e `Bash(hf *)` — qualquer comando Bash que comece com esses binários exige confirmação humana explícita antes de executar, independente de qual agente tentou chamá-lo. Isso vale inclusive para comandos somente-leitura (`--version`, `account status`) — a fricção extra é intencional dado o número limitado de créditos. **Limitação conhecida:** este é o mecanismo mais forte que o Claude Code oferece hoje para isso (prefixo de comando, não um sandbox por ferramenta); não impede um agente com `Bash` de tentar digitar o comando — apenas garante que a execução para nesse ponto até um humano confirmar.
- **Superfície de skills reduzida:** apenas 3 das 8 skills oficiais da Higgsfield (`higgsfield-generate`, `higgsfield-product-photoshoot`, `higgsfield-youtube-thumbnail`) estão instaladas dentro deste projeto (`tiktok-shop-video-ai/.claude/skills/`), conforme prioridade do MVP. As outras 5 (`brandkit`, `marketplace-cards`, `video-explainer`, `websites`, `soul-id`) permanecem apenas no diretório pai (`CODE/.claude/skills/`) e, por não estarem no diretório do projeto, **não são descobertas** por uma sessão do Claude Code iniciada aqui — confirmado empiricamente, não assumido.

## 4. QA

- Todo QA (técnico, visual, formato TikTok) é somente-leitura: nenhum subagente de QA corrige, regenera ou re-renderiza — apenas mede e reporta.
- Uma falha de QA nunca dispara automaticamente uma nova geração Higgsfield ou um novo render Remotion. O QA aponta qual agente anterior deve agir; a decisão de agir é do Orchestrator/humano.
- QA nunca aprova publicação — aprova apenas o vídeo em si (ver `qa-report.schema.json`); a aprovação de publicação é um gate humano separado, hoje sem destino (Publishing desativado).

## 5. Referência cruzada

Qualquer agente cujo prompt mencione limites de custo, hardware ou segurança deve citar este arquivo (`pipeline/policies/POLICIES.md`) em vez de repetir os números — evita divergência entre agentes.
