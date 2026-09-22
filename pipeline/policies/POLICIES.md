# Políticas Conceituais da Pipeline — TikTok Shop Video AI

Este documento é a fonte única das políticas de custo, hardware e segurança que todo agente/subagente deve respeitar. Nenhum agente deve reimplementar estes números com valores diferentes — eles referenciam este arquivo.

## 1. Controle de custo (geração paga — Creatify, Fase 17)

**Status (Fase 17):** o Creatify é o motor de geração ativo. Os valores abaixo foram confirmados contra `docs.creatify.ai` e a página de preços do produto nesta sessão (ver `pipeline/orchestration/CREATIFY-ARCHITECTURE.md` secao 9 para a distinção entre confirmado/não confirmado) — nenhuma chamada real foi feita para validá-los na prática ainda.

| Parâmetro | Valor conceitual | Significado |
|---|---|---|
| `MAX_GENERATION_ATTEMPTS` | **1 por asset por ciclo de aprovação** | Cada asset (imagem/vídeo/áudio) só pode ser gerado uma vez por rodada de aprovação humana. Gerar de novo exige uma nova aprovação explícita, não é automático. Regra de projeto, independente do provider. |
| `MAX_RETRIES` | **2 falhas técnicas por asset** (erro de API, timeout, job travado) | Falha técnica (não falha de qualidade) pode ser reexecutada até 2 vezes automaticamente. Na 3ª falha, o Creatify Production Agent PARA e devolve ao Orchestrator com erro — nunca tenta indefinidamente. |
| `REQUIRE_GENERATION_APPROVAL` | **true, sempre, sem exceção** | Nenhuma chamada que gere conteúdo no Creatify (`POST /api/link_to_videos/` ou qualquer outro endpoint de criação) pode ser executada sem um sinal explícito de aprovação humana anexado à chamada. Isso não é um default configurável pelo agente — é uma regra que o `creatify-generation-subagent` verifica antes de qualquer chamada. |
| Créditos (Creatify) | **Cobrança por crédito, tarifa varia por modelo** — ex.: Standard ~5 créditos/30s, Aurora v1 ~1 crédito/s, Aurora v1 Fast ~0.5 crédito/s, Boreal ~10 créditos/30s (confirmado em `docs.creatify.ai` nesta sessão). Plano gratuito: 10 créditos. | Nunca assumir "1 vídeo = X créditos" fixo — o `creatify-production-agent` deve citar a tarifa do modelo usado em `credits_estimate_basis`, ou marcar como não confirmado se o modelo escolhido não tiver tarifa verificada. |

Regras adicionais:
- O número esperado de gerações (quantos assets, qual endpoint/modelo Creatify, custo estimado em créditos) deve estar **completo no `generation-plan.json`** antes de qualquer aprovação ser solicitada — nunca se decide "quantas gerações" durante a execução.
- Falha de geração **nunca** dispara nova geração automática. Falha aciona apenas: log do erro + retorno ao Orchestrator. Uma nova tentativa é sempre uma decisão nova, não uma continuação automática.
- Créditos são finitos e não-recuperáveis (rolling expiry de 2 meses, segundo fontes de terceiros — não confirmado na documentação oficial primária) — o `creatify-generation-subagent` deve reportar o custo estimado (em créditos) de cada asset planejado antes de pedir aprovação, e o custo real quando a API o expuser.
- Verificar saldo de créditos disponível no painel da conta Creatify antes de aprovar qualquer `generation-plan.json` — não foi confirmado nesta sessão se a API pública expõe um endpoint de consulta de saldo.

## 2. Limitação de hardware

Máquina: RAM ~7,7 GB, GPU RTX 2050 4 GB VRAM.

- **Concorrência do Remotion:** sempre `--concurrency 1` (ou equivalente sequencial). Nunca renderizar duas composições/segmentos ao mesmo tempo.
- **Chromium:** no máximo uma instância do Chromium do Remotion aberta por vez. Nunca abrir `remotion studio` e rodar um `remotion render` simultaneamente.
- **Geração pesada fica na nuvem:** toda geração de imagem/vídeo/áudio é feita pela API do Creatify (nuvem), nunca localmente. A máquina local só compõe (opcionalmente, via Remotion), valida e faz QA técnico leve (ffprobe).
- **Processos simultâneos:** nenhum agente deve iniciar um processo pesado (render, bundle, generate) enquanto outro processo pesado do mesmo tipo já estiver em execução. O Orchestrator é responsável por serializar essas chamadas entre agentes.
- Antes de qualquer render, verificar RAM livre; se estiver criticamente baixa (ex.: <500 MB), o agente deve pausar e reportar em vez de insistir.

## 3. Segurança

- Nenhum agente executa scripts baixados de rede sem revisão humana prévia.
- Nenhum download externo (binários, repositórios, pacotes) é iniciado por um agente por conta própria — apenas como parte de um passo já autorizado pelo usuário (ex.: instalação de skill oficial já aprovada). Nenhum agente baixa e executa conteúdo de origem não verificada.
- Nenhum agente instala dependências novas sem autorização explícita do usuário.
- Nenhuma chamada de geração paga ao Creatify sem aprovação explícita (ver seção 1).
- Nenhum agente deve imprimir, logar ou escrever em qualquer `.json` de projeto tokens, chaves de API, cookies ou credenciais. Credenciais do Creatify (`CREATIFY_API_ID`/`CREATIFY_API_KEY`) vivem exclusivamente em variáveis de ambiente do usuário — nenhum agente as lê de arquivo nem as grava em lugar nenhum (ver `pipeline/orchestration/CREATIFY-SETUP.md`).
- Nenhuma publicação automática em nenhuma plataforma — o Publishing Agent está desativado por definição (ver `publishing-agent.md`); a pesquisa da Fase 17 não confirmou capacidade de publicação direta via Creatify.
- Nenhum comando destrutivo (deletar arquivos, sobrescrever configs) sem confirmação explícita do usuário.
- **Proteção estrutural (não apenas instrução) — Fase 17:** `.claude/settings.json` define `permissions.ask` para `Bash(curl *api.creatify.ai*)` e `Bash(curl *creatify*)` — qualquer comando Bash que atinja o domínio da API do Creatify exige confirmação humana explícita antes de executar, independente de qual agente tentou chamá-lo. Isso substitui o gate equivalente que existia para `higgsfield`/`higgs`/`hf` até a Fase 16 (removido porque nenhum agente restante usava mais esses comandos) — a Creatify não tem CLI própria, então o gate mira a superfície de risco real (chamada HTTP), não um binário. **Limitação conhecida:** mesma limitação já registrada para o gate anterior — é um prefixo/padrão de comando, não um sandbox por ferramenta; não impede um agente com `Bash` de tentar digitar o comando, apenas garante que a execução para nesse ponto até um humano confirmar.

## 4. QA

- Todo QA (técnico, visual, formato TikTok) é somente-leitura: nenhum subagente de QA corrige, regenera ou re-renderiza — apenas mede e reporta.
- Uma falha de QA nunca dispara automaticamente uma nova geração paga ou um novo render Remotion. O QA aponta qual agente anterior deve agir; a decisão de agir é do Orchestrator/humano.
- QA nunca aprova publicação — aprova apenas o vídeo em si (ver `qa-report.schema.json`); a aprovação de publicação é um gate humano separado, hoje sem destino (Publishing desativado).

## 5. Referência cruzada

Qualquer agente cujo prompt mencione limites de custo, hardware ou segurança deve citar este arquivo (`pipeline/policies/POLICIES.md`) em vez de repetir os números — evita divergência entre agentes.
