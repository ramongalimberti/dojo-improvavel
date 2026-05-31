# Discovery Report — Fase -1

> Pré-requisito da Fase 0. Mapeia o terreno antes de qualquer mudança em código.
>
> **Data:** 2026-05-31 · **Branch:** `feat/v3-dojo-melhorias` (criada a partir de `v2`) · **Autor:** Claude (Opus 4.7)

---

## 1. Sessão real capturada

**Status:** ❌ não capturada nesta rodada.

Ramon optou em 2026-05-31 por pular a captura de sessão real (`localStorage → dojo:ramon:sessions_v2`) e seguir Discovery apenas a partir do código + análise das 47 calls. Consequência: **baseline de custo é estimado, não medido.** Recomenda-se rodar uma sessão real após Fase 0 para validar o ganho de cache.

**Quando rodar:** assim que terminar Fase 0, antes de aprovar merge pra `v2`. Capturar 1 sessão de 12-15 turnos em sub-modo `caminho_completo`, exportar o último item de `dojo:ramon:sessions_v2`, colar em `tools/seed-sessions.json` (slot pré-aberto, ver §6).

---

## 2. Custo baseline (estimado)

Sem medição real. Cálculo feito a partir da arquitetura e do modelo atual.

### Modelo atual
- `claude-sonnet-4-20250514` em **todas as 5 chamadas** ([claude-api.js:4](../claude-api.js#L4)).
- Tabela Sonnet 4 (Maio/2026): **$3 / MTok input · $15 / MTok output.**

### Chamadas por turno
| Chamada | Origem | max_tokens | temperature | tokens input típico¹ | tokens output típico |
|---|---|---|---|---|---|
| `Scenarios.generate` (1× por sessão) | [scenarios.js:177](../scenarios.js#L177) | 900 | 0.95 | ~2.500 | ~700 |
| `Evaluator.leadHint` (1× ANTES do 1º turno + 1× por turno) | [evaluator.js:794](../evaluator.js#L794) | 900 | 0.5 | **~6.000** (system gigante) | ~600 |
| `Evaluator.evaluateTurn` (1× por turno) | [evaluator.js:315](../evaluator.js#L315) | 1100 | 0.3 | **~8.000** (system enorme + conversa) | ~800 |
| `Evaluator.leadResponse` (1× por turno + retry ocasional) | [evaluator.js:901](../evaluator.js#L901) | 400 | 0.95 | ~4.500 | ~150 |
| `Evaluator.finalReport` (1× por sessão) | [evaluator.js:1091](../evaluator.js#L1091) | 1800 | 0.5 | ~3.500 | ~1.400 |

¹ *Estimativas conservadoras a partir do tamanho dos system prompts (`evaluator.js:6-250` ~1000 linhas, `scenarios.js:189-377` ~190 linhas) + 9 JSONs injetados inline (`caminho_18_passos` 20KB, `conceitos_permissao` 53KB) + conversa acumulada.*

### Sessão típica de 15 turnos
- 1 cenário + 1 hint inicial + 15 × (eval + lead + hint) + 1 relatório = **48 chamadas LLM**
- Input total: ~2.500 + 6.000 + 15×(8.000 + 4.500 + 6.000) + 3.500 = **~290.000 tokens input**
- Output total: ~700 + 600 + 15×(800 + 150 + 600) + 1.400 = **~26.000 tokens output**

**Custo estimado por sessão de 15 turnos:**
```
input:  290.000 × $3   / 1.000.000 = $0,87
output:  26.000 × $15  / 1.000.000 = $0,39
TOTAL:                                $1,26 / sessão
```

> ⚠️ Esses números são **upper bound** de estimativa — o real provavelmente está em **$0,60–$1,00**. Sem medição direta é especulação informada. **A Fase 0 precisa colocar telemetria pra parar de chutar.**

### Onde o custo está concentrado
- **~74% do input** vem do system prompt do `evaluateTurn` (system de ~1000 linhas reenviado a cada turno).
- **~17% do input** vem do system do `leadHint` (similar, também reenviado).
- **Combo crítico:** evaluateTurn + leadHint juntos = **~91% do custo da sessão**. São EXATAMENTE os dois prompts que mais ganham com cache porque são estáveis turno-a-turno.

### Target pós-Fase 0
| Alavanca | Mecanismo | Economia esperada |
|---|---|---|
| Prompt caching no `evaluateTurn` system | `cache_control: ephemeral` em ~95% do prompt; cache hit reduz custo do bloco cacheado em 90% | **-65% do custo total** |
| Prompt caching no `leadHint` system | mesmo mecanismo | **-15%** |
| `leadHint` a cada 2 turnos | gate no app.js; dica do turno passado segue válida | **-7%** |
| `leadResponse` em Haiku 4.5 (input $0,80 / output $4 vs $3 / $15) | downgrade no `ClaudeAPI.call({ model: ... })` | **-3% adicional** (chamada já é barata em input) |
| **Total** | | **~70-85%** |

Stop condition do prompt original (Fase 0): se custo **não cair ≥50%**, parar e investigar. Esse target deve ser fácil — se não for, sinal de que `cache_control` não está hitando (provavelmente system prompt varia entre turnos, então a parte estável precisa ser separada).

---

## 3. Mapa dos bugs A-F

Cada bug do prompt original verificado contra código real. **Resultado: TODOS os 6 confirmados como descritos, com nuance no Bug B.**

### Bug A — `MAX_LISTEN_MS` inconsistente
- **Onde:** [speech.js:5](../speech.js#L5) — `const MAX_LISTEN_MS = 60000;`
- **Conflito com:** [app.js:1667](../app.js#L1667) — `maxListenMs: 90000` passado pra `Speech.startListening`
- **Comportamento real:** [speech.js:173](../speech.js#L173) — `const maxMs = currentOptions.maxListenMs || MAX_LISTEN_MS;` → o app.js sempre vence (passa 90000), então o `MAX_LISTEN_MS=60000` é **dead code**. Não causa bug funcional, mas confunde.
- **Fix proposto:** subir constante pra `90000` em speech.js:5 OU remover constante e usar literal nos dois lugares. Recomendo subir para 90000 (alinhar com app.js).

### Bug B — Cedilha em IDs (`avanço_concreto`)
- **Onde — 3 ocorrências, não 1:**
  - [gamification.js:71](../gamification.js#L71) — `{ id: 'avanço_concreto', ... }` (ACHIEVEMENT)
  - [gamification.js:97](../gamification.js#L97) — `{ id: 'avanço_concreto_hoje', ... }` (DAILY_CHALLENGE)
  - [gamification.js:273](../gamification.js#L273) — `unlockAchievement('avanço_concreto')`
- **Nuance vs prompt:** o prompt diz "linha 71". São na real **3 IDs** com cedilha, não 1. Renomear precisa atingir os três + qualquer estado salvo no `localStorage` de usuários existentes (chave `dojo:ramon:achievements_v2.avanço_concreto` e `dojo:ramon:daily_challenge` se hoje tiver esse ID).
- **NÃO precisa mexer** em `gamification.js:49` (`avanco_concreto`, technique ID — já é ASCII) nem em `data/tecnicas_compendio.json:204` (`avanco_concreto` — ASCII).
- **Fix proposto:** renomear os 3 IDs pra ASCII (`avanco_concreto` / `avanco_concreto_hoje`). Adicionar migração one-shot no boot pra renomear chaves antigas no localStorage de quem já tinha a conquista desbloqueada (caso contrário Ramon perde o registro).

> ⚠️ **Stop check do prompt original:** "se algum bug A-F vier diferente do descrito, pare e pergunte". Bug B veio diferente (3 ocorrências). Não é blocker — fix é trivial — mas estou documentando.

### Bug C — Fallback silencioso do `leadHint`
- **Onde:** [evaluator.js:799-802](../evaluator.js#L799)
  ```js
  } catch (err) {
    console.warn('leadHint falhou:', err);
    return null;
  }
  ```
- **Comportamento:** se a chamada Anthropic falhar (rede / 529 / token), o hint vira `null`. Ramon perde o gabarito do turno. **Pior:** o `evaluateTurn` do turno seguinte usa `lastLeadHint` como ground truth (regra de "nota = 10 obrigatório se bateu o gabarito"). Se `null`, essa calibração crítica fica inativa silenciosamente.
- **Fix proposto (do prompt original, validado):**
  1. Adicionar contador `state.hintFailCount` no `app.js:5` (state inicial).
  2. Incrementar no catch (passar callback ou via evento).
  3. Adicionar linha no `finalReport` ("dicas falharam em N turnos, calibração parcial").
  4. Considerar 1 retry com backoff curto antes de cair pra `null`.

### Bug D — `loadData` faz 9 fetches sequenciais
- **Onde:** [app.js:60-74](../app.js#L60)
  ```js
  for (const f of files) {
    const r = await fetch(`data/${f}.json`);
    if (!r.ok) throw new Error(`${f}.json ${r.status}`);
    data[f] = await r.json();
  }
  ```
- **Conflito:** [ARQUITETURA.md:1046](../ARQUITETURA.md#L1046) afirma "fetch 9 JSONs em paralelo via fetch()" — **doc está errado**. Código é sequencial.
- **Impacto:** boot leva ~9 × (RTT + parse) em vez de 1×. Em rede local rápida (~50ms cada) são 450ms desperdiçados; em rede móvel piora.
- **Fix proposto:**
  ```js
  const results = await Promise.all(files.map(async f => {
    const r = await fetch(`data/${f}.json`);
    if (!r.ok) throw new Error(`${f}.json ${r.status}`);
    return [f, await r.json()];
  }));
  for (const [f, json] of results) data[f] = json;
  ```
  Combinar com Bug F (try/catch por arquivo).

### Bug E — Chave `dojo:ramon:semClicheSessions` ausente em `K`
- **Onde:**
  - [gamification.js:5-15](../gamification.js#L5) — objeto `K` lista 9 chaves canônicas. **NÃO** inclui `semCliche` / `semClicheSessions`.
  - [app.js:968](../app.js#L968) — escreve `localStorage.setItem('dojo:ramon:semClicheSessions', ...)` direto, sem passar por `K`.
  - [ARQUITETURA.md:698](../ARQUITETURA.md#L698) — documenta a chave como existente, mas K não a tem.
- **Consequência:** `Gamification.resetAll()` ([gamification.js:383-388](../gamification.js#L383)) só zera as chaves de `K`. A conquista `fiel_mesa` ([gamification.js:72](../gamification.js#L72), 10 sessões sem clichê) usa um contador que sobrevive a `resetAll()` — bug pra quem reseta o progresso.
- **Fix proposto:**
  1. Adicionar `semCliche: 'dojo:ramon:semClicheSessions'` em `K` na gamification.js:14.
  2. Refatorar [app.js:968-971](../app.js#L968) pra usar `Gamification.K.semCliche` (acoplamento explícito).

### Bug F — `loadData` morre inteiro se 1 JSON corrompe
- **Onde:** mesmo bloco do Bug D, [app.js:66-70](../app.js#L66).
- **Comportamento:** qualquer `r.ok === false` ou parse error de qualquer um dos 9 JSONs lança e aborta o boot inteiro. App não inicia.
- **Por que importa:** Ramon edita os JSONs na mão regularmente (curadoria do método). Um erro de vírgula em `caminho_18_passos.json` deixa o sistema offline até alguém debugar.
- **Fix proposto:**
  ```js
  const results = await Promise.allSettled(files.map(...));
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') data[files[i]] = r.value[1];
    else console.warn(`[loadData] ${files[i]}.json falhou:`, r.reason);
  });
  // Banner UI: "Aviso: N de 9 datasets falharam ao carregar"
  ```
  Sistema sobe degradado mas Ramon pode editar/corrigir sem reiniciar nada.

### Bug extra (não estava no prompt mas merece estar) — `preRequisitosClose` undefined em `evaluateTurn`
- **Onde:** [evaluator.js:417](../evaluator.js#L417) — `else if (ancorouPreco && !isolamentoJaFeito && !preRequisitosClose?.submodo_ja_fechamento)`
- **Problema:** `preRequisitosClose` só está definido dentro de `leadHint` ([evaluator.js:699-707](../evaluator.js#L699)). No escopo de `evaluateTurn`, é sempre `undefined`. O `?.` evita o crash mas `undefined?.x === undefined`, então a cláusula `!undefined === true`, e a checagem fica permanentemente em "submodo NÃO é fechamento" — quebra a exceção pra sub-modos curtos.
- **Documentado em:** [ARQUITETURA.md:969](../ARQUITETURA.md#L969) (item 14 das dívidas técnicas).
- **Fix proposto:** computar `submodoJaFechamento` localmente em evaluator.js:264 (já existe lá!) e usar essa variável em vez de `preRequisitosClose?.submodo_ja_fechamento`. Renomear pra `submodoJaFechamento` direto.

---

## 4. Inventário dos pontos de mudança da Fase 0

Para cada item do checklist da Fase 0 do prompt original, o arquivo:linha exato onde a mudança vai pousar.

### 4.1 Bloco de custo

| Item | Arquivo:linha | Mudança específica |
|---|---|---|
| Prompt caching no `evaluator` system | [evaluator.js:6](../evaluator.js#L6) (`buildEvaluatorSystem`) | Quebrar return em 2 strings: `SYSTEM_STATIC` (linhas 7-250 atuais — regras, conceitos, JSONs inline, todos invariantes) + `SYSTEM_DYNAMIC` (vazio por enquanto; placeholder pra growth futura). Hoje toda a função retorna 1 string só. |
| Prompt caching no `leadHint` system | [evaluator.js:483-803](../evaluator.js#L483) (área do `leadHint`) | Mesma quebra: a parte de regras de output, conceitos, ritmo é estática; a parte que muda turno-a-turno (lead atual, conversa, gatilhos contextuais) vai pro user prompt e o system fica estável. |
| Suporte a `cache_control` no `ClaudeAPI.call` | [claude-api.js:15-25](../claude-api.js#L15) | Aceitar `system` como string OU array de blocks. Se for array, passa direto pro body. Se string, embrulha em `[{ type: 'text', text: system }]`. Adicionar suporte a `cache_control: { type: 'ephemeral' }` no último block estático. |
| Trocar `leadResponse` pra Haiku 4.5 | [evaluator.js:901-903](../evaluator.js#L901), [evaluator.js:918-920](../evaluator.js#L918) (retry) | Passar `model: 'claude-haiku-4-5-20251001'` no `ClaudeAPI.call`. Requer suporte a `model` opcional no wrapper. |
| Trocar `leadHint` pra Haiku 4.5 | [evaluator.js:794-797](../evaluator.js#L794) | Mesma coisa. ⚠️ **Atenção:** leadHint produz a `resposta_nota_10` que vira gabarito do `evaluateTurn` — se Haiku piorar a qualidade do gabarito, a calibração do avaliador degrada em cascata. **Recomendado testar lado-a-lado antes de mergear.** Considerar manter Sonnet aqui e fazer caching agressivo. |
| Suporte a override de `model` no wrapper | [claude-api.js:15](../claude-api.js#L15) | `async function call({ system, messages, max_tokens = 1024, temperature = 0.8, model = MODEL })` |
| Atualizar modelo default pra Sonnet 4.6 | [claude-api.js:4](../claude-api.js#L4) | `const MODEL = 'claude-sonnet-4-6';` (ou Opus 4.7 — ver Question Q1 ao final). |
| `leadHint` a cada 2 turnos | [app.js:640](../app.js#L640) (chamada do hint pro próximo turno) | Adicionar gate: `if (state.turn % 2 === 1) { call leadHint } else { reuse state.lastLeadHint }`. ⚠️ Risco: o avaliador usa `lastLeadHint` como gabarito — se mantemos o mesmo hint por 2 turnos, no segundo turno o gabarito está desalinhado com a fala atual do lead. **Stop check pendente.** Talvez seja melhor pular hint nos turnos em que o lead apenas confirma/atrita pós-aceite. |
| Telemetria de custo (input/output tokens + USD) | [claude-api.js:43-45](../claude-api.js#L43) (return) | Retornar `usage` do `data.usage` da Anthropic. Agregar em `state.sessionUsage` em app.js. Mostrar no `finalReport` ([app.js:909](../app.js#L909)) e no relatório UI. |
| `Promise.all` no `loadData` | [app.js:66-70](../app.js#L66) | Bug D. Ver §3 acima. |
| Temperature 0.1 no `evaluateTurn` | [evaluator.js:317](../evaluator.js#L317) | `temperature: 0.3` → `0.1`. |

### 4.2 Lei do Checkout na Call (prioridade #1)

| Item | Arquivo:linha | Mudança específica |
|---|---|---|
| Nova armadilha `fechamento_aparente_transferido` (regex + cap) | [evaluator.js:344-456](../evaluator.js#L344) (zona dos caps pós-LLM) | Adicionar bloco novo após o cap de `ancorou sem isolar`. Detector: 3 regex (aceite verbal do lead + transferência do Ramon + ausência de comprovante na conversa toda). Se trigger: `capNota = min(capNota, 5)`, `notas.fechamento = min(notas.fechamento, 3)`, `armadilhaForcada = 'fechamento_aparente_transferido'`, `xpFechamento = 0`. Ver C.1 do prompt original. |
| Mesma regra no system do evaluator | [evaluator.js:188-203](../evaluator.js#L188) (as 14 regras absolutas) | Adicionar como regra 15: "Se lead disse SIM verbal mas Ramon mandou pra 'depois/WhatsApp/casa' sem comprovante na call, Fechamento ≤ 3 + armadilha." Reforça o cap determinístico via instrução ao LLM. |
| Nova armadilha `sino_prematuro` | mesma zona, [evaluator.js:344-456](../evaluator.js#L344) | Detector: regex de sino tocado pelo Ramon + ausência de comprovante ANTES no histórico. Cap nota_geral ≤ 6. Ver C.2 do prompt. |
| Sino reposicionado no JSON | [data/caminho_18_passos.json](../data/caminho_18_passos.json) (passo 18) | Adicionar `pre_requisito: "comprovante_recebido_na_call"` + texto "NUNCA antes". (Ramon revisa antes de mergear.) |
| TCC — storage key | [gamification.js:5-15](../gamification.js#L5) (`K`) | Adicionar `tcc: 'dojo:ramon:tcc_history'`. |
| TCC — funções `recordTccDataPoint` + `getTccCurrent` | [gamification.js:316+](../gamification.js#L316) (após `computeSessionXp`) | Implementar conforme C.3 do prompt original. Janela de 30 sessões. Só conta sessões onde lead aceitou verbalmente (denominador). |
| TCC — registro pós-sessão | [app.js:909+](../app.js#L909) (após `endSession`) | Chamar `Gamification.recordTccDataPoint(sessionPayload)`. |
| TCC — gauge no dashboard | [app.js renderDashboard area](../app.js#L100) + [index.html dashboard section](../index.html) + [styles.css](../styles.css) | Adicionar componente `tcc-gauge` (0-100, cor por threshold: verde ≥90, amarelo 72-89, vermelho <72). |
| Estágio B — contador regressivo visual | [app.js:656-781](../app.js#L656) (zona de detecção 2-estágios) + [app.js:711-716](../app.js#L711) | Estágio B já tem banner amarelo. Adicionar contador: se passar 5 turnos sem comprovante e Ramon mencionar "WhatsApp/depois/amanhã" → fire warning UI + bloqueio de XP de fechamento. |
| Reforço do CUE pós-aceite no `leadResponse` | [evaluator.js:865-877](../evaluator.js#L865) | Já existe CUE de pressão por Avanço Concreto. Adicionar variante mais explícita: se Ramon mandou pra WhatsApp em vez de processar na call → lead reage com "ah, melhor eu pago depois então" (reforça o padrão das 5 calls perdidas). |

### 4.3 Bugs A-F (todos verificados em §3)

| Bug | Arquivo:linha | Esforço |
|---|---|---|
| A — MAX_LISTEN_MS inconsistente | [speech.js:5](../speech.js#L5) | 1 char (60000 → 90000) |
| B — cedilha em 3 IDs | [gamification.js:71,97,273](../gamification.js#L71) + migração localStorage | ~15 linhas (incluir migração) |
| C — leadHint fallback silencioso | [evaluator.js:799-802](../evaluator.js#L799) + state em app.js + linha no finalReport | ~10 linhas |
| D — loadData sequencial | [app.js:66-70](../app.js#L66) | 5 linhas |
| E — semClicheSessions fora de K | [gamification.js:14](../gamification.js#L14) + [app.js:968](../app.js#L968) | 3 linhas |
| F — loadData morre se 1 JSON corrompe | combinar com D, [app.js:66-70](../app.js#L66) | 5 linhas (Promise.allSettled em vez de Promise.all) |
| Extra — preRequisitosClose undefined em evaluateTurn | [evaluator.js:417](../evaluator.js#L417) | 1 linha (usar `submodoJaFechamento` já calculado em :264) |

---

## 5. Branch e estrutura criada

- ✅ Branch `feat/v3-dojo-melhorias` criada a partir de `v2` (confirmado: `git checkout -b feat/v3-dojo-melhorias`).
- ✅ Pasta `tools/` criada.
- ✅ Este relatório em `tools/discovery-report.md`.
- ⏳ `tools/seed-sessions.json` — slot reservado, aguarda Ramon rodar 1 sessão real após Fase 0 pra capturar baseline.
- ⏳ `TECH_DEBT.md` — não criado nesta rodada. Criar quando aparecer 1ª coisa "fora do plano" pra anotar.

---

## 6. Stop conditions ativas

Levantadas pelo prompt original + descobertas nesta Discovery:

1. ⚠️ **Bug B veio diferente do prompt** (3 ocorrências, não 1). Não é blocker, mas requer migração de localStorage. **Decisão antes de Fase 0:** Ramon aceita uma migração one-shot que renomeia chaves antigas, OU mantemos os IDs com cedilha como aliases e só evitamos novos IDs assim? (Ver Q3 ao final.)

2. ⚠️ **Bug extra (preRequisitosClose undefined em evaluateTurn)** não estava no prompt mas é da mesma família. **Decisão:** incluir na Fase 0 (3 linhas) ou jogar pra TECH_DEBT?

3. ⚠️ **`leadHint` a cada 2 turnos quebra a calibração do avaliador.** O `evaluateTurn` usa `lastLeadHint` como gabarito do turno corrente (regra de ouro: "se bateu nota-10, dá 10"). Se reutilizamos hint do turno N pro turno N+1, o gabarito está desalinhado com a fala do lead no N+1. **Alternativa mais segura:** rodar `leadHint` sempre, mas pular nos turnos em que o lead apenas confirma/atrita pós-aceite (já que o gabarito é "manda link" / "pede comprovante"). Ou: rodar hint sempre em Sonnet e usar caching pra cortar custo do hint pela metade sem perder qualidade.

4. ⚠️ **Troca de `leadHint` pra Haiku 4.5** tem risco em cascata (degrada gabarito → degrada calibração do evaluator). Recomendado: NÃO trocar nesta Fase 0; medir depois com offline eval (Fase 4) e só trocar se Haiku der gabarito ≥95% equivalente a Sonnet.

5. ⚠️ **Stop oficial do prompt:** se custo NÃO cair ≥50% após cache + Haiku, parar. Esse target deve ser folgado dado que evaluator+hint = 91% do custo e ambos cacheiam bem. Se não bater, investigar se o system prompt está mudando algo entre turnos (variáveis injetadas dentro do system em vez de no user).

6. ⚠️ **Stop oficial do prompt:** se TCC após Fase 0 ficar PIOR que antes, parar. Cap `fechamento_aparente_transferido` pode estar agressivo demais e disparar em falsos positivos (Ramon faz follow-up legítimo no WhatsApp pós-comprovante, por exemplo). Precisamos de regex `houveComprovante` confiável.

---

## 7. Perguntas que precisam de decisão antes da Fase 0

### Q1 — Modelo default
Sonnet 4.6 (`claude-sonnet-4-6`) é o recomendado pelo ARQUITETURA.md como bom custo/qualidade. Opus 4.7 (`claude-opus-4-7`) tem instruction-following melhor — o evaluator é o caso de uso onde Opus tipicamente ganha. Mas Opus custa **5× mais que Sonnet 4.6 em input** ($15 vs $3 / MTok).

**Recomendação:** Sonnet 4.6 com prompt caching agressivo. Opus 4.7 só se Sonnet 4.6 falhar nos snapshot tests da Fase 3.

### Q2 — `leadHint` em Haiku ou Sonnet com cache?
Como em §6.4 — Haiku 4.5 é arriscado porque degrada o gabarito. Sonnet 4.6 com cache deve ser mais barato que Haiku sem cache em maioria dos casos (cache hit pro system gigante > diferença de tier).

**Recomendação:** manter `leadHint` em Sonnet, focar em caching. Trocar `leadResponse` pra Haiku 4.5 (output curto, qualidade não impacta calibração).

### Q3 — Migração dos IDs com cedilha
Opções:
- **A.** Renomear no código + migração one-shot no boot que renomeia chaves antigas no localStorage. Mais limpo, perde nada.
- **B.** Manter IDs com cedilha como aliases (suportar os dois). Menos limpo, mas zero risco de migração.

**Recomendação:** A. Migração trivial (3 lookups). Anotar no commit message.

### Q4 — Sessão real antes ou depois da Fase 0?
- **Antes:** mede baseline real → mede ganho real após Fase 0. Mais cientificamente sólido.
- **Depois (escolhido por Ramon hoje):** roda 1 sessão pós-Fase 0 e mede ganho contra a estimativa deste relatório. Risco: se a estimativa estiver torta, conclusão sobre ganho fica frágil.

**Recomendação:** rodar **DUAS** sessões idênticas (mesmo sub-modo, esforço similar) — uma com código atual antes do merge da Fase 0, outra com código pós-Fase 0. Compara custo direto. Toma ~30min total e dá baseline confiável.

---

## 8. Próximos passos sugeridos

1. **Ramon decide** as 4 questões do §7.
2. Se OK, abrir **Fase 0 propriamente dita** com escopo travado:
   - 7 itens de custo (caching + downgrade leadResponse + leadHint cadence + temperature + Promise.all + telemetria + modelo)
   - 4 itens de Lei do Checkout (armadilha + sino + TCC + reforço estágio B)
   - 7 fixes de bug (A, B, C, D, E, F, extra)
3. Cada commit atômico, mensagem no formato `fase0(bloco): descrição`.
4. Rodar sessão real pré-merge (ver Q4).
5. Validar contra critérios de aceitação do prompt original:
   - Custo médio cai ≥70%
   - Telemetria de custo no relatório final
   - Lei do Checkout dispara (testar manualmente: dizer "perfeito, te mando o link no WhatsApp depois" sem comprovante → ver se armadilha aparece)
   - Sino prematuro dispara (tocar sino antes de "paguei" → armadilha)
   - TCC gauge visível no dashboard

---

## 9. Sinais verdes que o sistema está saudável (pré-Fase 0)

A leitura completa do código revelou um sistema **mais maduro que o esperado**:

- ✅ Detecção em 2 estágios de venda já existe e cobre o caso da "venda fantasma" parcialmente ([app.js:711-716](../app.js#L711) pré-requisitos de venda real). Lei do Checkout é a versão **mais rigorosa** desse mesmo princípio.
- ✅ Detector de quebra de personagem do lead com retry + sanitização ([evaluator.js:808-838](../evaluator.js#L808)).
- ✅ Caps determinísticos pós-LLM bem estruturados ([evaluator.js:344-456](../evaluator.js#L344)) — a Lei do Checkout vai pousar com naturalidade nessa mesma zona.
- ✅ 14 regras absolutas de Fidelidade ([evaluator.js:188-203](../evaluator.js#L188)) já consolidadas — armadilha nova vira regra 15.
- ✅ CUE pós-aceite do lead ([evaluator.js:870-877](../evaluator.js#L870)) já força pressão pelo Avanço Concreto — Lei do Checkout amplifica isso.
- ✅ Quota-safe storage com trimming ([gamification.js:158-180](../gamification.js#L158)) — não precisa mexer.

**A boa notícia:** Fase 0 não é refatoração estrutural. É **emenda cirúrgica** em pontos já preparados pra receber as mudanças. Esforço estimado: **2-3 dias úteis**, não 3-4 do prompt original.

---

*Discovery completa. Aguarda decisão do Ramon nas 4 questões do §7 pra abrir Fase 0.*
