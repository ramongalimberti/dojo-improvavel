# 🏗️ ARQUITETURA — Dojô Aliança Divergente (Arena 2)

> Documento exaustivo para qualquer engenheiro que precise **revisar, corrigir, evoluir ou refatorar** este sistema sem ter participado da construção.
>
> **Última atualização:** 2026-05-25 · **Branch atual:** `v2` · **Estado:** rodando, em uso ativo pelo Ramon.

---

## 0. TL;DR de 60 segundos

App web 100% local (vanilla JS, sem build, sem backend) para o **Ramon Galimberti** (mentor da Aliança Divergente) treinar **chamadas 1×1 pós-evento** contra um lead simulado por IA. A IA da Anthropic é chamada **direto do browser** com a API key do próprio Ramon, gravada em `localStorage`. O treino é estruturado em torno de um **Caminho de 18 passos** (Belfort + Voss + Blount + Rackham + Concer + Hormozi) ancorado na **Teoria da Permissão** (metodologia da Aliança).

Servir: `python3 -m http.server 8080` na pasta raiz. Abrir em Chrome ou Edge (Web Speech API).

Loop principal:
1. Ramon escolhe um sub-modo (Caminho Completo / Dúvidas / Quebra / Fechamento)
2. Sistema gera um **cenário** (persona + objeção + nível de conhecimento) via Claude
3. Sistema gera a **primeira fala do lead** + uma **dica** (gabarito de resposta nota-10)
4. Ramon responde por texto ou voz; após cada resposta, o **avaliador** dá nota 0-10, identifica passo executado, técnicas aplicadas e armadilhas
5. **Lead** responde com base em CUEs internos (ceder camada / endurecer / fechar / atrito de pagamento)
6. Loop até venda confirmada / lead desistir / 50 turnos / Ramon encerrar
7. **Relatório final** com 3 melhores, 3 piores, análise por momento, XP distribuído entre 4 Tiers

Modelo: `claude-sonnet-4-20250514`. Cada turno faz **3 chamadas LLM** (avaliação + lead + dica do próximo turno).

---

## 1. Stack e ambiente

| Camada | Escolha |
|---|---|
| Runtime | Browser (Chrome/Edge — requer Web Speech API) |
| Linguagem | JavaScript ES2020+ vanilla, IIFE-based modules |
| Build | **Nenhum.** Arquivos servidos direto do filesystem. |
| Framework | **Nenhum.** DOM imperativo via `document.querySelector` |
| Servidor estático | `python3 -m http.server 8080` (qualquer servidor estático serve) |
| Voz STT | `window.SpeechRecognition` / `webkitSpeechRecognition`, `lang='pt-BR'`, `continuous=true`, `interimResults=true` |
| Voz TTS | `window.speechSynthesis`, escolhe voz pt-BR feminina por heurística (Luciana, Maria, Helena, Camila, Francisca...) |
| IA | Anthropic Messages API direto via `fetch`. Header crítico: `anthropic-dangerous-direct-browser-access: true` |
| Modelo | `claude-sonnet-4-20250514` (hardcoded em `claude-api.js:4`) |
| Persistência | `localStorage` apenas. Chaves prefixadas `dojo:ramon:*` |
| Tipografia | Google Fonts: Fraunces (títulos) + Inter (corpo) — pré-conectadas no `<head>` |
| Estética | Kraft/caderno: `--kraft-bg #e8dcc4`, acento `--accent #c65d2e` (laranja terroso) |

**Sem dependências externas além de fontes Google e da API Anthropic.** Tudo o que roda no cliente é o que está no diretório.

---

## 2. Estrutura de arquivos

```
Treinamento de Vendas/
├── index.html              # Marca a estrutura das 5 telas (welcome, dashboard, session, report, history, history-detail)
├── styles.css              # 41 KB — kraft, mapa 18 passos, persona card, mini-evals, end modal
├── app.js                  # 1906 linhas — orquestração, estado, fluxo, call state machine
├── claude-api.js           # 65 linhas — wrapper sobre fetch da Anthropic Messages API
├── speech.js               # 345 linhas — STT + TTS + pausas + comandos de voz
├── scenarios.js            # 381 linhas — gerador de cenário + prompt do lead
├── evaluator.js            # 1185 linhas — avaliador turno-a-turno + dica + leadResponse + relatório final
├── gamification.js         # 404 linhas — XP, 4 Tiers, conquistas, técnicas dominadas, streak
├── data/
│   ├── caminho_18_passos.json        # 20 KB — espinha dorsal (18 passos + 4 fases)
│   ├── produto_alianca.json          # 5.5 KB — 5 pilares + oferta + frase mestra
│   ├── conceitos_permissao.json      # 53 KB — 30 conceitos canônicos com apelidos comerciais
│   ├── frases_ancora.json            # 8.7 KB — saques rápidos por categoria
│   ├── persona_improvavel.json       # 20 KB — 8 arquétipos + vocabulário real das 8 chamadas
│   ├── dores_por_area.json           # 13.6 KB — 10 áreas com frases literais em 1ª pessoa
│   ├── casos_provas.json             # 10 KB — 12 casos reais (Daniela, Regiane, Vanilton…)
│   ├── tecnicas_compendio.json       # 28 KB — 35 técnicas indexadas com aliases
│   └── objecoes_scripts.json         # 14 KB — scripts linha-a-linha das 6 objeções críticas
├── README.md                          # Visão geral do v2
├── COMO-USAR-v2.md                    # Playbook (referencia estrutura antiga de 7 JSONs — desatualizado)
├── PROMPT-MESTRE-v2.md                # Prompt original que gerou o sistema — também desatualizado
├── REVISAO_CONCEITOS.md               # Doc de revisão dos 20 conceitos pelo Ramon
└── .gitignore
```

**Nota sobre docs**: README.md está alinhado com o estado atual. `COMO-USAR-v2.md` e `PROMPT-MESTRE-v2.md` ainda referenciam estrutura antiga de 7 JSONs (`metodologia.json`, `objecoes.json`, `personas.json`, `rubrica.json`, etc.). O sistema **real** usa 9 JSONs com nomes diferentes. Se for refatorar docs, fonte da verdade são os arquivos em `data/`.

---

## 3. Conceitos de domínio (pra entender qualquer linha de código)

### 3.1 Teoria da Permissão (metodologia)

Tudo no app gira em torno desta premissa:
> *"O problema do Improvável não é falta de Capacidade nem Disposição — é falta de Permissão."*

**CDP = Capacidade + Disposição + Permissão.** Se C+D = SIM e resultado = NÃO, a causa é Permissão.

Conceitos canônicos que aparecem espalhados no código (especialmente no system prompt de `evaluator.js` linhas 80-200):
- **Permissão** (autorização inconsciente pra ter/ser/fazer/ir) — opera em 3 áreas: Financeiro, Relacionamento, Saúde
- **PDA** (Perceber → Decidir → Agir) — Descontrolado vs. Memorável
- **Padrões** (3 dimensões: Acontecimento + Comportamento + Relacionamento; 3 camadas: Mostrar → Desenvolver → Diplomar)
- **Pré-Queda** (4 gatilhos: Vontade→Dúvida→Decisão→Desistência, 24h entre eles; 3 Ps: Precisa/Permite/Prefere)
- **Matriz da Utilidade** (4 quadrantes: Punir / Poupar / Unir / Afastar)
- **Dependência Emocional** (5 Danos: Medo, Culpa, Desânimo, Insegurança, Procrastinação)
- **3 Perfis Controladores** (Vítima / Vingador / Narcisista — `evaluator.js` é categórico: **NÃO existe "Salvador" canônico** — é manifestação do Narcisista)
- **Teto Financeiro + CPF**
- **Escada da Maturidade** (5 degraus: Afeto → Reconhecimento → Recompensa → Sentido → Legado)
- **Escada da Postura** (5 degraus)
- **Combinados** (Inconsciente Velado / Vencido / Desesperado)
- **Modo Fome**, **Plano Perfeito**, **Efeito Paralelo** (intencional) vs. **Defeito Paralelo** (involuntário), **Ponto Cego**, **Conversa Difícil**

**Apelidos comerciais** (usar em rapport, citar canônico no sistema):
| Apelido comercial | Canônico (o que o lead encontra dentro da Aliança) |
|---|---|
| Mula de Carga | Permissão Represada + Distúrbio de Prioridade |
| Salvador / Herói da Família | Dependência Emocional + Culpa (APF_09) + Efeito Paralelo negativo |
| Ciclo do Quase | Pré-Queda recorrente em série |
| Festa no Banheiro | Dependência Emocional + 3 Perfis Controladores simultâneos |
| Obesidade Intelectual | Confusão Capacidade/Permissão |
| Medo do Brilho | Dependência Emocional + Teto Financeiro + Escada da Maturidade presa |

A função `expandConceito()` em [app.js:338](app.js#L338) faz o emparelhamento apelido↔canônico no momento de exibir.

### 3.2 Caminho de 18 passos (espinha dorsal do treino)

`data/caminho_18_passos.json`. Estrutura:

| Fase | Passos | Duração esperada |
|---|---|---|
| **Abertura** (Tier Fundação) | 1-3 | 2 min |
| **Investigação** (Tier Fundação) | 4-7 | 10 min |
| **Apresentação** (Tier Condução) | 8-10 | 12 min |
| **Fechamento** (Tier Fechamento) | 11-18 | 8 min |

Os 18 passos:
1. **Os Primeiros 4 Segundos** (4 Segundos — Belfort) — alavanca máxima
2. **Tom "Eu Me Importo"** (10 Tonalidades — Belfort)
3. **Abertura Focada** (Permissão pra perguntar — SPIN/Rackham)
4. **Situação Expressa** (Pergunta de Situação — Rackham)
5. **Pergunta de Problema** (SPIN)
6. **Pergunta de Implicação** (SPIN) — alavanca máxima
7. **Pergunta de Necessidade de Solução** (SPIN) — alavanca máxima
8. **3 Dez (Produto)** (Straight Line — Belfort)
9. **3 Dez (Você/Aliança)**
10. **Storytelling + Pre-handling 3 objeções** (Hormozi/Belfort) — alavanca máxima
11. **Looping Universal** (Belfort) — alavanca máxima
12. **Isolamento de Preço** (Concer 4 Passos)
13. **Ancoragem de Preço** (sempre TOTAL antes da parcela)
14. **Looping pós-ancoragem**
15. **Skin in the Game / Risco Reverso** (Hormozi)
16. **Assumptive Close / Alternative Close** (Belfort)
17. **Avanço Concreto** (Rackham — link + confirmação) — alavanca máxima
18. **Sinal de Aceite Explícito do lead**

Cada passo tem: `numero`, `fase`, `nome`, `tecnica`, `autor`, `objetivo`, `exemplo_literal`, `sinais_de_deteccao` (lista de strings que o avaliador procura), `armadilha`, `skippable`, `xp_base`, `tier`, `is_alavanca_maxima`.

### 3.3 Os 4 Tiers (gamificação)

Definidos em [gamification.js:17-22](gamification.js#L17):

```js
const TIERS = [
  { id: 'fundacao',   passos: [1,2,3,4,5,6,7] },          // 🟢 Abertura + Investigação
  { id: 'conducao',   passos: [8,9,10] },                 // 🟡 Apresentação
  { id: 'fechamento', passos: [11,12,13,14,15,16,17,18] },// 🟠 Looping + Closes + Avanço
  { id: 'palco',      passos: [] }                        // 🔴 Arena 3 — não implementado
];
```

Cada Tier tem nível L1-L99 independente. XP é distribuído entre Tiers conforme a técnica aplicada (ver §6.2).

### 3.4 Os 4 sub-modos (definidos em scenarios.js:19)

| Sub-modo | Quando treinar | Passos foco | Tempo |
|---|---|---|---|
| `caminho_completo` 🎯 | Sessão longa, "oi" ao fechamento | 1-18 | ~25 min |
| `duvidas` ❓ | Lead com perguntas sobre programa | 4-10 | ~15 min |
| `quebra` 🛡️ | Lead chega COM objeção | 12-16 | ~12 min |
| `fechamento` 🔒 | Lead trava só no último passo | 11-18 | ~10 min |

O sub-modo afeta a calibração de ritmo do avaliador (em `caminho_completo` ele exige rapport antes de ancorar preço; em `quebra` ou `fechamento` esse cap é relaxado).

### 3.5 Verdade industrial do produto

Travada em [evaluator.js:123-128](evaluator.js#L123):
- **Aliança Divergente é programa ONLINE PAGO.** Não tem agendamento, "primeira sessão", "call de onboarding".
- **Pagamento:** cartão à vista ou parcelado **ou** boleto. PIX só onde estiver listado.
- **Acesso à plataforma Marca Passos é IMEDIATO** após confirmação do pagamento.
- Falar em "agendar call de integração" derruba Fidelidade -2 e Fechamento -2.

Oferta canônica (`data/produto_alianca.json`): R$ 2.480 à vista ou 12× R$ 249, garantia 30 dias, 5 pilares (Marca Passos / Protocolos / Áudios Diários / Encontros Ao Vivo / Comunidade).

---

## 4. Fluxo end-to-end de uma sessão

```
┌─────────────────────────────────────────────────────────────────┐
│ BOOT                                                            │
│  app.js → boot() carrega 9 JSONs em paralelo via fetch()        │
│         → initWelcome / initDashboard / initSession / initHistory│
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ WELCOME (tela 1)                                                │
│  Pede Anthropic API key + nome. Grava em localStorage.          │
│  Se key existe + nome != 'Ramon', pula direto pro dashboard.    │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ DASHBOARD (tela 2)                                              │
│  Mostra: streak, semana 1-8 do plano Rackham, 4 tier cards com  │
│  nível e barra de XP, daily challenge, 4 sub-modos clicáveis,   │
│  grid de 36 técnicas com contador, grid de conquistas.          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ click num sub-modo
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ START SESSION (app.js:196)                                      │
│  Reseta state. Chama Scenarios.generate() → LLM call #1         │
│  - Gera persona + objeção + nivel_conhecimento + primeira fala  │
│  - Hash da combinação salvo (evita repetir 50 últimas)          │
│  Renderiza persona card + chip "dica do turno" (carregando…)    │
│  Chama Evaluator.leadHint() em paralelo → LLM call #2           │
│  - Produz: passo sugerido, conceito em jogo, 3 técnicas com     │
│    exemplos, resposta_nota_10 (gabarito do avaliador)           │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ LOOP DE TURNO (app.js:516 handleSend)                           │
│                                                                 │
│  [1] Ramon digita ou fala (Web Speech → comandos pontuação)     │
│  [2] Captura silêncio antes da fala (Speech.captureAndReset)    │
│  [3] state.turn++; pushRamonMessage()                           │
│  [4] Evaluator.evaluateTurn() → LLM call #3                     │
│       Input: scenario, conversation, lastRamon, turn,           │
│              passos cumpridos, lastLeadHint (como gabarito)     │
│       Output JSON: nota_geral, notas por dimensão,              │
│              tecnicas_aplicadas (35 booleans), armadilha,       │
│              passo_executado, passo_ideal, lead_ceder_camada,   │
│              lead_endurecer, pode_fechar                        │
│       Cap pós-LLM (caminho_completo only):                      │
│         - close <10 → nota cap 4 + armadilha fechou_sem_apres   │
│         - lead pediu apresentação ignorado → cap 4.5            │
│         - pista preço sem isolamento → cap 5.5                  │
│         - ancorou sem isolar → cap 7                            │
│         - ancorou só parcela → cap 7                            │
│         - nomeou padrão turno <3 → cap 6                        │
│       Boost determinístico: ajuste vazio + sem armadilha = 10   │
│  [5] Acumula técnicas, passos, atualiza mapa 18                 │
│  [6] Render mini-eval acoplado à mensagem do Ramon              │
│  [7] Render feedback panel (3-camadas)                          │
│                                                                 │
│  [8] Evaluator.leadResponse() → LLM call #4                     │
│       Monta CUE interno baseado no estado:                      │
│       - pode_fechar → fechar com método de pagamento nomeado    │
│       - lead_endurecer → seco                                   │
│       - lead_ceder_camada + 3 turnos desde última → cede 1      │
│       - awaiting_payment_confirmation → pós-aceite (confirma    │
│         pagamento 70% / atrito 30%)                             │
│       - close_attempts >= 2 sem fechar → impaciência            │
│       Retry com correção se quebrar personagem (vira coach)     │
│  [9] Evaluator.leadHint() (próximo turno) → LLM call #5         │
│                                                                 │
│  [10] Detecção de fim de sessão (regex sobre lastLead):         │
│       - signalsPagamentoConcluido (paguei/aprovado/recebi)      │
│       - signalsDesistencia (NÃO se for condicional "sem saber") │
│       - reachedMax (50 turnos)                                  │
│       - 2 estágios: A (aceite + método) → B (pagamento conf.)   │
│       Estágio A abre awaitingPaymentConfirmation banner.        │
│       Pré-requisitos de venda real: 6+ turnos, Marca Passos     │
│       nomeada, preço ancorado.                                  │
│                                                                 │
│  → se sessionClosed/leadDesistiu/reachedMax: showSessionEndModal│
└──────────────────────────────┬──────────────────────────────────┘
                               │ Ramon clica "Ver relatório"
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ END SESSION (app.js:896 endSession)                             │
│  Evaluator.finalReport() → LLM call #N                          │
│   Outcome DETERMINÍSTICO (não LLM): venda_realizada /           │
│     desistencia / parcial / tempo                               │
│   LLM produz: frase_caderno, outcome_motivo, evidencia_lead,    │
│     3 melhores, 3 piores, por_momento (abertura/conducao/fech)  │
│   Cap de consistência: nota_final ≤ min(por_momento) + 0.5      │
│   Cap de cobertura: venda c/ <30% passos no caminho_completo    │
│     → cap 7+(pct/12)                                            │
│  Gamification.updateStreak / updateSkills / recordStepHits      │
│  Gamification.computeSessionXp → distribui em 4 tiers           │
│  Gamification.applySessionXp → level-ups detectados             │
│  Gamification.saveSession (com quota-safe trimming)             │
│  renderReport + show 'report' screen                            │
└─────────────────────────────────────────────────────────────────┘
```

**Total de chamadas LLM por sessão:** 1 (cenário) + 1 (1ª dica) + N×3 (avaliação + lead + dica) + 1 (relatório final). Numa sessão típica de 15 turnos: ~47 calls.

---

## 5. State machine completo

### 5.1 Estado global (app.js:5)

```js
const state = {
  data: {},                          // 9 JSONs carregados
  dataLoaded: false,
  submodo: null,                     // 'caminho_completo' | 'duvidas' | 'quebra' | 'fechamento'
  currentScenario: null,             // resultado de Scenarios.generate
  conversation: [],                  // [{ role: 'user'|'assistant', content: string }]
  turn: 0,                           // contador do Ramon
  turnFeedbacks: [],                 // 1 feedback por turno do Ramon
  sessionTechniques: {},             // { mirror: 3, label: 1, ... }
  passosCumpridos: [],               // [1,2,5,7] — array único ordenado
  stepsByTurn: [],                   // [{ turn, stepExecuted, stepIdeal }]
  silences: [],                      // [{ turn, seconds }]
  lastLeadHint: null,                // gabarito da dica anterior, usado pelo avaliador
  sessionClosed: false,              // venda confirmada
  sessionClosedDifficult: false,     // bonus se fechou em hostil/difícil
  sessionEndReason: null,            // 'venda_pagamento'|'lead_desistiu'|'usuario_encerrou'|'max_turns'
  sessionAwaitingReport: false,      // detectado fim, esperando user clicar "ver relatório"
  leadCederCamada: false,            // setado pelo avaliador, lido pelo leadResponse
  leadEndurecer: false,
  podeFechar: false,
  closeAttempts: 0,                  // # de Close tentados (anti-loop)
  turnoUltimaCessao: -99,            // throttle: lead não cede em turnos consecutivos
  leadDesistiu: false,
  awaitingPaymentConfirmation: false,// estágio B — aceite recebido, falta confirmar pagto
  turnoAceiteInicial: -1,
  sessionStartTime: null,
  sessionEndTime: null,
  call: {                            // máquina de estados do Modo Chamada
    active: false,
    paused: false,
    phase: 'idle',                   // idle|lead_speaking|listening|processing|processing_lead|paused
    countdownTimer: null
  }
};

const MAX_TURNS = 50;
const SILENCE_AUTO_SEND_MS = 7000;
```

### 5.2 Telas (screens)

5 telas, controladas por `showScreen(id)` que toggla classe `.active`:

| Tela | DOM ID | Função |
|---|---|---|
| Welcome | `#screen-welcome` | API key + nome |
| Dashboard | `#screen-dashboard` | Hub principal |
| Session | `#screen-session` | Loop de turno |
| Report | `#screen-report` | Relatório final |
| History | `#screen-history` | Lista de sessões salvas |
| History Detail | `#screen-history-detail` | Transcrição + análise + export TXT/PDF |

### 5.3 Estado da chamada (call state machine)

Definida em [app.js:1562-1766](app.js#L1562). Fases:

```
idle → lead_speaking → listening → processing → processing_lead → lead_speaking → ...
                          ↓
                       paused (botão Pause)
```

- **`startCall()`** — fala a última msg do lead via TTS, depois `beginListening()`
- **`beginListening()`** — STT com `silenceTimeoutMs=7000`, `maxListenMs=90000`. Quando bate 7s de silêncio com texto válido, dispara `autoSubmitFromCall(text)`
- **`autoSubmitFromCall(text)`** — chama `handleSend()`. Se há nova msg do lead → `speakLeadThenListen`. Se não (API falhou) → mostra aviso + reabre mic após 3s sem perder a resposta do Ramon
- **`pauseCall()`** — para TTS, para STT, esconde countdown
- **`resumeCall()`** — se Ramon foi o último a falar, vai direto pra listening; senão fala a última msg do lead

Countdown visual no status: a cada 200ms calcula `SILENCE_AUTO_SEND_MS - Speech.getMsSinceLastResult()` e mostra "envia em X.Xs".

### 5.4 Detecção de fim de sessão em 2 estágios

[app.js:656-781](app.js#L656). **Lógica crítica que evita "venda fantasma":**

```
Estágio A (não fechou ainda):
  IF state.podeFechar AND lead falou aceite (regex) AND falou pagamento (regex)
     AND pré-req venda real (>=6 turnos OR sub-modo curto, Marca Passos nomeada,
     preço ancorado):
       → state.awaitingPaymentConfirmation = true
       → Banner amarelo: "passo 17 — envie link, peça confirmação, confirme acesso"

Estágio B (aguardando confirmação):
  IF lead reportou pagamento concluído (paguei/aprovado/recebi/entrei/chegou):
       → state.sessionClosed = true → venda_realizada
  IF lead desistiu DURANTE pagamento:
       → leadDesistiu = true → venda_nao_realizada_desistencia
  IF atrito (regex: cartão recusou/não chegou):
       → mantém banner aberto, sem fechar
  IF reachedMax (50 turnos):
       → max_turns
```

**Exceção condicional** [app.js:690-698]: frases tipo "não vou fechar SEM SABER", "não entro NO ESCURO" são **pedidos de apresentação**, não desistência. Bloqueia o match com regex `ehCondicionalPedindoInfo`.

---

## 6. Prompts LLM em detalhe

### 6.1 Modelo e parâmetros

Hardcoded em [claude-api.js:4](claude-api.js#L4): `claude-sonnet-4-20250514`.

| Chamada | max_tokens | temperature | função |
|---|---|---|---|
| `Scenarios.generate` | 900 | 0.95 | persona única |
| `Evaluator.evaluateTurn` | 1100 | 0.3 | avaliação rigorosa |
| `Evaluator.leadHint` | 900 | 0.5 | dica/gabarito |
| `Evaluator.leadResponse` | 400 | 0.95 | fala humana |
| `Evaluator.leadResponse` retry | 400 | 0.85 | correção de personagem |
| `Evaluator.finalReport` | 1800 | 0.5 | relatório |

Headers HTTP obrigatórios:
```http
content-type: application/json
x-api-key: <user-supplied>
anthropic-version: 2023-06-01
anthropic-dangerous-direct-browser-access: true
```

### 6.2 Os 5 prompts

#### A. Gerador de cenário (`scenarios.js:101-171`)

System: "Você gera cenários para treino de vendas consultivas da Aliança Divergente. Responda SEMPRE em JSON estrito sem markdown."

User prompt inclui: sub-modo, dificuldade (calibrada por `tier_levels.fundacao.level`: <15 fácil, <30 médio, ≥30 difícil), arquétipos disponíveis, 6 objeções, hashes usadas, **distribuição calibrada de nível de conhecimento** (cru 40% / exposto 50% / estudioso 10%).

Saída JSON:
```json
{
  "persona": { "nome", "idade", "genero", "profissao", "cidade", "estrutura_familiar", "situacao_atual", "ja_tentou", "caso_real_inspiracao" },
  "evento_origem": "...",
  "nivel_conhecimento_metodologia": "cru|exposto|estudioso",
  "vocabulario_que_usa": [...],
  "gatilho_contato": "...",
  "primeira_mensagem_lead": "...",
  "duvida_aplicacao_tipica": "..." | null,
  "objecao_superficial": "...",
  "objecao_real": "...",
  "padrao_oculto_teoria_permissao": "...",
  "tecnicas_ideais_aqui": [...],
  "conceitos_ideais_aqui": [...],
  "dificuldade": "facil|medio|dificil|hostil",
  "submodo": "...",
  "hash": "..."
}
```

#### B. Lead (role-play) (`scenarios.js:189-377`)

System prompt **enorme** (~190 linhas) que cobre:
- Persona completa (nome, idade, profissão, dor)
- **Vocabulário real das 8 chamadas** injetado: `expressoes_de_dor`, `expressoes_de_heranca`, `expressoes_de_barreira_pratica`, `expressoes_de_adiamento`, `tratamento_comum`
- Nível de conhecimento da metodologia (3 textos diferentes para cru/exposto/estudioso — o **estudioso** explicitamente cita que só viu CONTEÚDO PÚBLICO, não é aluno)
- **Anti-coach** (proibições explícitas: nunca se dirigir a si mesmo pelo nome em 2ª pessoa, nunca usar Mirror/Label/That's Right, nunca diagnosticar o Ramon)
- **Proibições de acesso** (nunca mencionar "áudios do basal", "Marca Passos", "minha turma" — lead **não é aluno**, só viu conteúdo público)
- Objeção superficial vs real, padrão oculto
- 20 mentiras funcionais recorrentes
- Regras de pausas: `...` curta, `...N` para N segundos (TTS lê)
- **Gatilhos de endurecimento** (clichê / religiosidade / lei da atração / desconto / urgência artificial / atacar família / responder objeção sem Looping)
- **Gatilhos de ceder uma camada** (Mirror preciso / Label / Looping / Isolamento / Teste Hipotético / Cadeira de Balanço / nomeou padrão por nome / Implicação / Necessidade de Solução / silêncio explícito)
- **Ritmo de cessão**: máximo 1 camada a cada 3 turnos. "É isso mesmo" NO MÁXIMO 2× em 20 turnos
- **Trava crítica**: lead **não fecha** sem o Ramon ter dito (a) "Marca Passos" + (b) valor concreto + (c) "é online/acesso imediato". Se Ramon tentar Assumptive Close sem isso, lead FREIA e exige info
- **Anti-loop**: depois de 2 closes sem pré-requisitos, lead resolve binário (FECHA ou RECUSA, sem mais "vou pensar")
- **Pós-aceite (passos 17-18)**: lead espera link, reage com atrito 30% das vezes em difícil/hostil, confirma pagamento com termo inequívoco ("paguei, deu certo") em 70%

Os **CUEs internos** são adicionados como mensagem `(Sistema)` separada antes da fala (`evaluator.js:854-893`):
- `pode_fechar` → CUE de fechamento concreto
- `lead_endurecer` → seco
- `lead_ceder_camada && podeCederAgora` → revela camada
- `lead_ceder_camada && !podeCederAgora` (cedeu há <3 turnos) → reconhece sem abrir
- `awaitingPaymentConfirmation` + Ramon mandou link → confirma OU atrito leve
- `awaitingPaymentConfirmation` + Ramon NÃO mandou link → pressiona pelo Avanço
- `close_attempts >= 2 && !pode_fechar` → anti-loop, força resolução

**Detector de quebra de personagem** [evaluator.js:808-838]: regex que pega padrões como `^Nome, você...`, `That's right`, `me conta mais sobre`, `isso tem um nome: Padrão/Dependência/Permissão/...`. Se detectar, retry com correção explícita; se retry também quebrar, sanitiza removendo `^Nome, ` do começo.

#### C. Avaliador turno-a-turno (`evaluator.js:6-310`)

**System prompt de ~1000 linhas** — o mais complexo do sistema. Cobre:

1. **Calibração com a dica anterior** [linhas 11-19]: se o Ramon respondeu semanticamente equivalente à `resposta_nota_10` da dica do turno passado, **OBRIGATÓRIO** nota 10. Evita o viés de "9.5 porque sim".

2. **Regra de ritmo do Caminho** [20-32]: turno 1-3 = Abertura, 4-8 = Investigação, 9-12 = Apresentação, 13-18+ = Fechamento. Penalidades obrigatórias por violação de ritmo (nomear padrão turno 1-2, ancorar antes do 10, etc.).

3. **Contexto do lead** [34-51]: 3 níveis de conhecimento com regras diferentes de tradução pra conceito.

4. **Postura de condução** [44-53]: o vendedor traduz dor → conceito → amarra; bonifique quando ele faz isso, penalize quando despeja jargão ou espera o lead trazer diagnóstico pronto.

5. **Regra de pausas no texto** [54-59]: `...` e `...N` são marcadores intencionais, não fillers.

6. **Fonte de verdade**: JSON `caminho_18_passos` e `tecnicas_compendio` injetados inline no prompt.

7. **Conceitos canônicos da Teoria da Permissão** [82-122]: lista densa com definições, frases-âncora e armadilhas. Inclui o mapeamento apelido↔canônico.

8. **Fato do produto** [123-128]: cartão/boleto, acesso imediato, sem onboarding.

9. **Regras 15-33** [130-185]: armadilhas nomeadas:
   - `fechou_sem_apresentar` — close sem 3 Dez + Ancoragem + Isolamento
   - `ancorou_sem_isolar`
   - `ancoragem_parcelada_sem_total`
   - `lead_pediu_apresentacao_ignorou`
   - `pista_preco_ignorada`
   - `perdeu_prehandling_perfil` (servidor / médico / advogado / militar / professor / magistrado)
   - `nomeou_padrao_cedo`
   - `pulou_dor_emocional`
   - `perdeu_momento_close`
   - `risco_reverso_prematuro`
   - `pulou_looping_apresentacao`

10. **14 regras absolutas (Fidelidade ≤ 2)** [188-203]:
    - Clichê motivacional
    - Religiosidade indevida
    - Lei da atração
    - **Ressignificação** ("vamos contar uma nova história sobre seu passado") — Elton é categórico contra
    - Desconto como quebra
    - Urgência artificial
    - **Atacar família/pessoa** do lead (rotular CPF, não Padrão)
    - Promessa 10k/mês / luxo
    - Lista de bônus empilhada
    - "Alguma dúvida?" como fechamento
    - Aceitar "vou pensar" sem Avanço (Fechamento ≤ 3)
    - Responder objeção direto sem Looping (Fechamento ≤ 4)
    - Repetir preço 2+ vezes (Fechamento ≤ 3)
    - Usar apelido sem conhecer canônico

11. **Rubrica** [204-209]: 5 dimensões com pesos:
    - Escuta Ativa 0.20
    - Investigação 0.20
    - Apresentação 0.20
    - **Fechamento 0.25** (peso maior)
    - Fidelidade à Metodologia 0.15

12. **Saída JSON** [216-250]:
    ```json
    {
      "nota_geral": 7.2,
      "notas": { "escuta", "investigacao", "apresentacao", "fechamento", "fidelidade" },
      "ponto_forte": "palavra exata do Ramon",
      "ajuste": "UM ajuste mais impactante",
      "reformulacao": "frase concreta na voz do Ramon",
      "porque": "ancorado em conceito por nome + técnica por nome",
      "conceito_usado_pelo_ramon": "...|null",
      "conceito_que_deveria_usar": "...",
      "passo_do_caminho_executado": 1-18|null,
      "passo_do_caminho_ideal_agora": 1-18,
      "passos_cumpridos_na_sessao_ate_aqui": [...],
      "tecnica_que_deveria_usar": "Nome (Autor)",
      "tecnicas_aplicadas": { /* 35 booleans, ver §6.2 */ },
      "tonalidades_detectadas": [...],
      "armadilha_cometida": "..."|null,
      "xp_bonus_tecnicas": 0,
      "lead_ceder_camada": false,
      "lead_endurecer": false,
      "pode_fechar": false
    }
    ```

**User prompt** [evaluator.js:253-310] inclui:
- Persona, padrão, objeções, técnicas ideais, nível de conhecimento, vocabulário
- Passos já cumpridos
- Conversa completa até aqui
- **Checagem sistêmica de pré-requisitos de close** (regex determinísticos sobre o histórico do Ramon)
- **LEAD_HINT_ANTERIOR** (gabarito) com regra explícita "se for equivalente à `resposta_nota_10`, nota = 10 obrigatório"
- Resposta do Ramon a ser avaliada

**Pós-processamento JS** [evaluator.js:321-479]: **redes de segurança determinísticas que sobrescrevem o LLM**:

```js
// 1. Recalcula xp_bonus_tecnicas se não veio
// 2. Cap de ritmo (só caminho_completo):
//    - close <10 → nota cap 4 + armadilha fechou_sem_apresentar
//    - lead pediu apresentação e Ramon não apresentou → cap 4.5
//    - pista de preço + Ramon foi pra parcela → cap 5.5
//    - ancorou sem isolar → cap 7 + armadilha
//    - ancorou só parcela → cap 7
//    - ancorou < turno 10 → cap 5
//    - apresentou 3 Dez < turno 8 → cap 5
//    - nomeou conceito < turno 3 → cap 6
// 3. Promoção a 10:
//    Se ajuste vazio E sem armadilha → força nota_geral=10 e todas as 5 dimensões=10
// 4. Se ajuste vazio mas tem armadilha → ajuste = "armadilha detectada: X"
```

Lista das **35 técnicas** monitoradas (boolean cada):
`mirror, label, perguntas_calibradas, silencio_dinamico, 4_segundos, tom_eu_me_importo, pergunta_implicacao, pergunta_necessidade, patamar_ledge, thats_right, accusation_audit, storytelling_cena, pre_handling_3_objecoes, 3_dez, framework_3a, metodo_4_passos_concer, cisnes_negros, 10_tonalidades, looping_universal, isolamento_preco, cadeira_balanco, skin_in_the_game, assumptive_close, alternative_close, avanco_concreto, teste_hipotetico, best_worst_case, risco_reverso, ancoragem_preco, takeaway, micro_commitments, nomeou_conceito_permissao, frase_ancora_ancorada, caso_real_citado`

(`fechou_venda` e `fechou_dificil` são adicionadas em [app.js:935-936].)

#### D. Dica do turno / leadHint (`evaluator.js:483-803`)

System prompt explica: produzir dica curta com 3 técnicas + exemplos exatos + uma `resposta_nota_10` que serve de gabarito do avaliador no próximo turno.

**Lei inviolável do ritmo** [582-589]: passo sugerido tem que estar no bloco do turno (turno 3 → passo 1-3, etc.). Sugerir Marca Passos no turno 2 é "ensinar errado" — refazer.

**Caso especial estudioso** [591-600]: lead que nomeia padrão no turno 1 ("sou o Salvador"). A nota-10 **NÃO** pode re-confirmar o diagnóstico — tem que reconhecer vocabulário + devolver pra dor emocional concreta. Senão vira armadilha `nomeou_padrao_cedo`.

**Regras duras pra `resposta_nota_10`** [509-534]:
- 2-4 frases, máximo 60 palavras
- Combinar no máximo 2 técnicas
- Nomear o conceito quando a camada é profunda
- Nunca clichê/desconto/urgência artificial
- Terminar com pergunta calibrada ou gancho
- Voz mesa de jantar (contrações "tá", "né", "pra")
- Pausas com `...` e `...N` quando a técnica pede
- **Bloqueio de close prematuro** [526-534]: só sugerir Close se 3 Dez + ancoragem + isolamento já estão na conversa (regex determinístico injetado no prompt)
- **Ordem do fechamento** [520-524]: Looping → Isolamento → Ancoragem (total ANTES da parcela) → Looping → Skin/Risco → Close → Avanço

**Bloco de pré-requisitos** [709-732]: lista o que está SIM/NÃO (Marca Passos nomeada, ancoragem, isolamento, 3 Dez, sub-modo de fechamento).

**Bloco de gatilhos contextuais** [717-731]:
- Lead acabou de perguntar preço?
- Ramon citou caso real forte? → gatilho de Assumptive Close
- Lead pediu apresentação? → regra absoluta de apresentar
- Lead deu pista indireta de preço? → forçar Isolamento antes de qualquer número

**Bloco pré-handling por perfil** [679-689]: se persona é servidor público / magistrado / militar / médico / professor / advogado e turno está entre 6-11, a `resposta_nota_10` deve antecipar 1-2 objeções típicas do perfil.

**Bloco pós-aceite (estágio B)** [746-765]: se `awaitingPaymentConfirmation`, a nota-10 vira EXECUÇÃO (mandar link / pedir confirmação / resolver atrito), nunca técnica nova.

**Bloco anti-loop** [554]: turno >= 12 sem 3 Dez/Looping/Close → forçar fechamento direto na nota-10.

Saída JSON:
```json
{
  "possivel_objecao": "...",
  "categoria": "dinheiro|tempo|confianca|autoconhecimento|familia|decisao|duvida_produto",
  "camada_revelada": "superficial|intermediaria|profunda",
  "conceito_permissao_em_jogo": "nome canônico|null",
  "passo_do_caminho_sugerido": N,
  "tecnicas_sugeridas": [
    { "nome", "porque", "exemplo": "frase exata pro Ramon usar" }
  ],
  "o_que_observar": "...",
  "resposta_nota_10": "2-5 frases prontas pra serem faladas"
}
```

#### E. Relatório final (`evaluator.js:939-1182`)

**Outcome determinístico** [962-981]: o sistema decide o outcome ANTES do LLM com base em `sessionClosed`, `leadDesistiu`, `endReason`, `reachedMaxTurns`. O LLM só **EXPLICA** o motivo.

Inputs ao LLM:
- Persona, padrão, objeções, sub-modo, nível
- Total de turnos
- Outcome decidido
- Motivo sistêmico
- Passos cumpridos + cobertura %
- Notas médias
- Técnicas com frequência
- Armadilhas cometidas com turno
- Últimos 12 turn feedbacks (resumidos)
- Últimas 6 trocas

Proibições ao sugerir [1021-1027]: urgência artificial, desconto, clichê, ressignificação. Se precisar pressão, usar Implicação, Cadeira de Balanço, Best/Worst Case, Pre-handling, Isolamento, Assumptive/Alternative Close, Risco Reverso.

**Penalidade de sessão curta** [1028-1033]: < 8 turnos em `caminho_completo` com `venda_realizada` = adicionar alerta "provável pulo de passos, espera-se 15-25 turnos em chamada real".

Saída JSON:
```json
{
  "frase_caderno": "10-22 palavras",
  "outcome_motivo": "1-2 frases concretas",
  "outcome_evidencia_lead": "citação textual|null",
  "melhores_3_tecnicas": [{ "nome", "momento", "turno", "porque" }],
  "piores_3_pontos": [{ "tipo", "nome", "momento", "turno", "o_que_aconteceu", "correcao" }],
  "por_momento": {
    "abertura":   { "nota", "ponto_forte", "ponto_fraco", "sugestao" },
    "conducao":   { ... },
    "fechamento": { ... }
  }
}
```

**Pós-processamento** [1109-1158]:
1. **Cap de consistência**: `nota_final <= min(por_momento) + 0.5`. Se média dimensional disse 10 mas Fechamento tirou 8, ajusta pra 8.5.
2. **Cap de cobertura**: `venda_realizada` em `caminho_completo` com cobertura < 30% → `cap = 7 + (pct/12)`. Threshold antigo era 50% e penalizava vendas legítimas (calibração pós-sessão Leonardo, registrada em comentário).

---

## 7. Gamificação detalhada

### 7.1 Chaves localStorage

```
dojo:ramon:profile           # { name, xp_total_acumulado, streak, last_session_date, semana_atual, created_at }
dojo:ramon:skills            # { escuta, investigacao, apresentacao, fechamento, fidelidade } 0-100
dojo:ramon:sessions_v2       # array de até 100 sessões (com quota-safe trimming)
dojo:ramon:achievements_v2   # { id: bool } pra 25 conquistas
dojo:ramon:daily_challenge   # { date, challenge_id, text, hint, completed }
dojo:ramon:tecnicas_dominadas_v2  # { id: count } pra 36 técnicas
dojo:ramon:step_hits         # { "1": count, ..., "18": count }
dojo:ramon:tier_levels       # { fundacao: {level, xp}, conducao, fechamento, palco }
dojo:ramon:semana_treino     # (não usado ativamente — semana fica em profile)
dojo:ramon:api_key           # Anthropic key
dojo:ramon:scenario_hashes_v2# array das 50 últimas hashes de cenário
dojo:ramon:semClicheSessions # contador pra conquista "Fiel à Mesa"
```

### 7.2 XP por técnica (gamification.js:24-61)

| Técnica | XP | Tier |
|---|---|---|
| Mirror | 10 | fundacao |
| Label | 10 | fundacao |
| Perguntas Calibradas | 10 | fundacao |
| Silêncio Dinâmico | 15 | fundacao |
| 4 Segundos | 10 | fundacao |
| Tom "Eu me importo" | 10 | fundacao |
| **Pergunta de Implicação** | **25** | fundacao |
| **Pergunta de Necessidade de Solução** | **25** | fundacao |
| Patamar (Ledge) | 10 | fundacao |
| That's Right | 20 | conducao |
| Accusation Audit | 15 | conducao |
| Storytelling (cena + decisão) | 15 | conducao |
| Pre-handling 3 Objeções | 15 | conducao |
| **3 Dez na ordem** | **30** | conducao |
| Framework 3A | 15 | conducao |
| Método 4 Passos Concer | 15 | conducao |
| Cisnes Negros | 20 | conducao |
| 10 Tonalidades | 20 | fechamento |
| Looping Universal | 25 | fechamento |
| Isolamento de Preço | 20 | fechamento |
| Cadeira de Balanço | 20 | fechamento |
| Skin in the Game | 20 | fechamento |
| Assumptive Close | 20 | fechamento |
| Alternative Close | 15 | fechamento |
| **Avanço Concreto** | **25** | fechamento |
| Teste Hipotético | 15 | fechamento |
| Best/Worst Case | 15 | fechamento |
| Risco Reverso | 15 | fechamento |
| Ancoragem de Preço | 15 | fechamento |
| Takeaway | 15 | fechamento |
| Micro Compromissos | 10 | conducao |
| Nomeou conceito Permissão | 15 | conducao |
| Frase-âncora com contexto real | 10 | conducao |
| Caso real citado | 10 | conducao |
| Fechou a venda | 50 | fechamento |
| Fechou lead Difícil/Hostil | 100 | fechamento |

### 7.3 Fórmula de XP (gamification.js:317-367)

```
XP_sessao = (nota_geral × 10)
         + min(60, streak × 2)
         + soma_xp_tecnicas_aplicadas
         + (passos_cumpridos.length × 5)
         + ordem_bonus    // +10 por cada sequência de 3+ passos consecutivos
         + (fechou ? (leadDificil ? 100 : 50) : 0)
         + (desafioCumprido ? 25 : 0)

# Distribuição entre tiers:
generalBucket = base + streak + steps + ordem + desafio
distributed.fundacao   = generalBucket * 0.35 + tecnicas_tier_fundacao
distributed.conducao   = generalBucket * 0.30 + tecnicas_tier_conducao
distributed.fechamento = generalBucket * 0.35 + tecnicas_tier_fechamento + fechamento_bonus
```

### 7.4 Curva de nível

```js
xpToLevel(level) = 100 + (level - 1) * 50
// L1→L2 = 100 XP, L2→L3 = 150 XP, ..., L98→L99 = 4950 XP
// Total L1→L99: ~248.000 XP por tier
```

### 7.5 Skills (smoothed)

`updateSkillsFromScores(notas)` aplica EMA com α=0.12:
```
s[k] = s[k] + (nota[k] * 10 - s[k]) * 0.12
```

### 7.6 Conquistas (25 IDs)

`primeiro_caminho`, `caminho_completo`, `mestre_implicacao`, `necessidade_cravada`, `mestre_3_dez`, `looper`, `dono_silencio`, `avanço_concreto`, `fiel_mesa`, `mestre_mirror`, `rotulador`, `nomeador_padroes`, `fechador_improvavel`, `playbook_concer`, `tier_fundacao_l10/l50`, `tier_conducao_l10`, `tier_fechamento_l10/l50`, `maratonista_30/100`, `semana_completa`, `plano_8_semanas`, `l99_geral`, `caso_real_mestre`.

### 7.7 Desafio diário

`gamification.js:91-104` — 12 desafios sorteados por dia. Cada um aponta uma técnica via `hint`. Completar dá +25 XP. Streak não documentado mas armazenado.

### 7.8 Plano de 8 semanas (Rackham)

```
1-2: Abertura (passos 1-3)
3-4: Investigação (5-7) — meta: cliente verbaliza benefício
5-6: Apresentação (10) — meta: lead pergunta preço no meio
7-8: Fechamento (11-18) — meta: "vou pensar" vira Avanço
```

Exibido no dashboard como `missao-box` baseado em `profile.semana_atual`. **Nota: a progressão automática entre semanas não está implementada** — `semana_atual` precisa ser incrementado manualmente (não há lógica que detecte "passou da semana 2").

### 7.9 Quota-safe storage

`saveSession()` [gamification.js:158-180] tenta `setItem`. Se falhar (QuotaExceededError), descarta sessões antigas até caber. Se mesmo com 1 sessão não couber, tenta versão `_trimmed` sem `conversation`, `turn_feedbacks` nem `report_full`.

---

## 8. Speech (voz)

`speech.js`. Resumo:

### 8.1 STT

```js
Speech.startListening({
  silenceTimeoutMs: 7000,        // auto-stop após X ms sem nova transcrição
  maxListenMs: 90000,            // teto absoluto
  onInterim(text),               // a cada interim result
  onFinal(text),                 // a cada final result
  onAutoStop(finalText),         // chamado quando silenceTimeoutMs disparou
  onError(err),
  onEnd(finalText)
})
```

`continuous: true`, reinicia automaticamente em `onend` se o usuário não parou manualmente. Auto-restart é necessário porque Chrome para depois de ~60s mesmo com `continuous`.

### 8.2 Comandos de voz para pontuação

`processVoiceCommands(text)` [speech.js:27-79] transforma:

| Fala | → |
|---|---|
| `vírgula` | `,` |
| `ponto` | `.` |
| `ponto de interrogação` / `interrogação` | `?` |
| `exclamação` | `!` |
| `dois pontos` | `:` |
| `reticências` | `...` |
| `nova linha` / `quebra de linha` | `\n` |
| `parágrafo` | `\n\n` |
| `abre/fecha aspas` | `"` |
| `abre/fecha parêntese` | `(` `)` |
| `hífen` | `-` |
| `traço` | ` — ` |
| `pausa` | `...` |
| `pausa de 5 segundos` / `pausa 5s` | `...5` |
| `silêncio de 5s` | `...5` |

Auto-capitalização: após `.!?\n`, ou na 1ª letra do texto.

### 8.3 TTS com pausas

`Speech.speak(text)` [speech.js:236-299]:
1. `splitByPauseMarkers(text)` quebra em chunks `[{ type: 'speak', text }, { type: 'pause', seconds }]`
2. Regex pra extrair `...N` (N=1..9) como pause node
3. `...` (sem dígito) fica no texto pra TTS respirar naturalmente
4. Toca os chunks em sequência; pause usa `setTimeout(playNext, seconds*1000)`
5. Escolha de voz: filtra `pt-*`, prefere nomes com `luciana|maria|helena|camila|francisca|female|feminina|google|microsoft`

`Speech.stopSpeaking()` cancela tudo (utterances + setTimeouts pendentes).

### 8.4 Captura de silêncio

Quando o TTS do lead termina, `silenceTimerStart = Date.now()`. Quando o STT detecta a primeira transcrição, `lastSilenceDuration = (now - silenceTimerStart)/1000`. `handleSend()` chama `Speech.captureAndResetSilence()` antes do envio.

Silêncio ≥ 3s antes da fala do Ramon adiciona +1 em `state.sessionTechniques.silencio_dinamico`.

---

## 9. Persistência e exports

### 9.1 Sessão salva (gamification.js:158)

Estrutura completa (varia ~20-80 KB):

```js
{
  id: 'sess_<timestamp>_<random>',
  date: ISO string,
  submodo, persona, padrao,
  nota_final, notas,                  // notas por dimensão
  passos_cumpridos, tecnicas,
  silences,
  fechou, dificuldade,
  xp_ganho, frase_caderno, turnos,
  duration_ms, started_at, ended_at,
  outcome,                            // venda_realizada | venda_nao_realizada_* | encerrada_parcial
  outcome_motivo, outcome_evidencia_lead,
  end_reason, is_parcial,
  cenario: {                          // congelado pra histórico fiel
    persona, objecao_superficial, objecao_real, padrao_oculto,
    primeira_mensagem_lead, dificuldade, nivel_conhecimento
  },
  conversation: [...],                // todas as trocas
  turn_feedbacks: [...],              // 1 por turno do Ramon (avaliação completa)
  report_full: {...}                  // melhores_3, piores_3, por_momento
}
```

### 9.2 Histórico (UI)

- Lista filtrada por outcome + search em persona/padrão/sub-modo/frase
- Detalhe mostra: outcome banner, meta, cenário, análise por momento, melhores, piores, transcrição com avaliação inline por turno, frase pro caderno
- Export TXT: `buildExportText(s)` [app.js:1395] gera texto formatado com separadores
- Export PDF: usa `window.print()` com classe `print-mode` no body (usuário escolhe "Salvar como PDF")
- BOM `﻿` no TXT pra Excel ler acentos no Windows

---

## 10. Atalhos de teclado

| Tecla | Ação |
|---|---|
| `Ctrl+Enter` / `Cmd+Enter` no textarea | Enviar |
| `Espaço` fora de input/textarea (na tela de sessão) | Toggle do mic |
| `ESC` durante listening | (atualmente no-op — reservado pra cancelar countdown) |

---

## 11. Bugs e calibrações conhecidos (do código + comentários)

Levantados a partir dos comentários no código:

| Origem | Problema / decisão |
|---|---|
| [app.js:686-698] | Bug do "Roberto, 63": "não vou entrar em furada SEM SABER" era marcado como desistência. Fix: regex `ehCondicionalPedindoInfo` bloqueia o match. |
| [evaluator.js:1141-1155] | Cobertura de Caminho: threshold antigo (50%) penalizava vendas legítimas curtas. Pós-sessão Leonardo, baixado pra 30%. Fórmula `7 + (pct/12)` substitui o cap rígido. |
| [evaluator.js:14] | Avaliador tinha viés "9.5 porque sim". Promoção determinística a 10 se ajuste vazio + sem armadilha resolve. |
| [evaluator.js:808] | Lead às vezes virava coach. `detectLeadCharacterBreak()` + retry com correção explícita; se retry quebrar de novo, sanitiza `^Nome, `. |
| [app.js:649-652] | Antes injetava `(erro:...)` no chat e TTS lia. Agora detecta erro e mantém resposta do Ramon avaliada, reabre mic depois de 3s. |
| [app.js:711-716] | Pré-requisitos de venda real: 6+ turnos (3 em sub-modos curtos) + "Marca Passos" + valor concreto. Bloqueia close-fantasia em 4 turnos. |
| [scenarios.js:254-265] | Lead era pintado como aluno da Aliança ("vi nos áudios do basal"). Fix: proibições explícitas de acesso. Lead **não** é aluno. |

---

## 12. O que está pronto, o que falta

### Pronto e estável
- Loop completo de turno com avaliação + dica + lead
- Modo Chamada contínua (TTS auto + 7s silêncio → envio)
- Mapa visual dos 18 passos atualizado em tempo real
- 4 sub-modos com calibração diferente de ritmo
- 9 JSONs curados a partir da apostila + 8 chamadas reais
- Detecção em 2 estágios de fim de sessão (evita venda fantasma)
- Histórico com filtros, busca, export TXT/PDF
- Gamificação completa (XP, 4 Tiers, 25 conquistas, técnicas, desafio diário, plano 8 semanas)
- Detector de quebra de personagem do lead com retry
- 14 regras absolutas de Fidelidade
- 11 armadilhas nomeadas com caps determinísticos
- Pre-handling por perfil profissional (6 categorias)

### Roadmap declarado (README + COMO-USAR)
- **Arena 3 — Live/Palco** (monólogo + chat ao vivo simulado)
- **Arena 4 — WhatsApp de reengajamento** (lead não atendeu)
- **Análise de áudio real** (prosódia, velocidade, tonalidade) — hoje só mede silêncio
- **Modo "Cena Real"** — colar conversa real e receber análise
- **Export semanal Markdown pro Obsidian**
- **Versão Netlify mobile** — treino entre reuniões
- **Replay com voz** da sessão antiga (estilo podcast)
- **Biblioteca de cenas vencedoras** (nota 9+ salva como modelo)

### Gaps e dívidas técnicas (não resolvidos)
1. **`evaluator.js` (1185 linhas) é difícil de manter.** Um único system prompt de ~1000 linhas mistura regras, conceitos, JSONs inline. Precisa modularização.
2. **API key exposta no browser.** Cada usuário tem que trazer a sua. Sem rate limit, sem auditoria.
3. **Modelo desatualizado** — `claude-sonnet-4-20250514`. Existe Sonnet 4.6 e Opus 4.7 com melhor instruction-following.
4. **Sem prompt caching.** Cada turno reenvia o system prompt gigante; com `cache_control` cortaria ~80% do custo/latência.
5. **`PROMPT-MESTRE-v2.md` e `COMO-USAR-v2.md` desatualizados** (citam 7 JSONs antigos, não os 9 atuais).
6. **Calibração via edição manual de JS.** Comentários do código instruem "ajuste em `evaluator.js → buildEvaluatorSystem()`" — não há painel.
7. **`Gamification.MISSAO_8_SEMANAS` não tem lógica de progressão automática.** `semana_atual` fica em 1 pra sempre a menos que o usuário edite o profile.
8. **Sem testes automatizados.** Calibração depende de rodar sessões e ver no olho.
9. **Análise transversal ausente.** Sistema salva 100 sessões com técnicas/notas/momentos mas o dashboard não mostra tendências ("você nunca usa Mirror sob stress").
10. **Sem onboarding tutorial.** Welcome só pede key + nome.
11. **Sub-modo "Palco" definido em TIERS mas não tem implementação** — placeholder no UI.
12. **`Speech.MAX_LISTEN_MS = 60_000`** mas `beginListening()` passa `maxListenMs: 90_000`. Inconsistência interna no `speech.js` (linha 5 vs uso no app.js).
13. **Persistência de `dojo:ramon:semana_treino` declarada mas nunca lida nem escrita** — chave morta.
14. **Bug latente em [evaluator.js:417]:** referência a `preRequisitosClose?.submodo_ja_fechamento` dentro do `evaluateTurn` mas `preRequisitosClose` só está definido em `leadHint`. Sempre vai dar `undefined`. O `?.` evita o crash mas a checagem fica inativa.

---

## 13. Como rodar local

```bash
cd "Treinamento de Vendas"
python3 -m http.server 8080
# abre http://localhost:8080 no Chrome ou Edge
```

Primeira tela pede a Anthropic API key. Salva em `localStorage`. Funciona offline exceto pelas chamadas à API.

**Pra testar mudanças sem usar key real:** mocke `ClaudeAPI.call()` em `claude-api.js` pra retornar JSON pré-fabricado. Não há test harness embutido.

---

## 14. Como adicionar/mudar coisas (cookbook)

### Adicionar um conceito novo da Teoria da Permissão
1. Adicionar em `data/conceitos_permissao.json` mantendo a estrutura (`nome`, `definicao`, `quando_usar`, `frase_ancora`, `exemplo_de_uso`, `armadilha`; opcionalmente `apelido_venda: true` + `nome_canonico`)
2. Citá-lo nos blocos do `evaluator.js` "CONCEITOS CANÔNICOS DA TEORIA DA PERMISSÃO" (linhas 82-122) e do `leadHint` (linhas 491-503) se for prioritário pra chamada
3. Se for apelido comercial, adicionar em [app.js:338 expandConceito] — automático já que lê do JSON

### Adicionar uma técnica nova
1. `data/tecnicas_compendio.json` — `id`, `nome`, `autor`, `tier`, `passo_caminho`, `resumo`, `quando_usar`, `exemplo`, `armadilha`, `aliases`
2. `gamification.js:24-61` — adicionar em `TECHNIQUES` com `xp` e `tier`
3. `evaluator.js:229-241` — adicionar a chave no template JSON de `tecnicas_aplicadas`
4. Se merecer conquista: `gamification.js:63-89 ACHIEVEMENTS` + lógica de unlock em `recordTechniques()`

### Adicionar uma armadilha nova com cap determinístico
1. Documentar a regra no system prompt do `evaluator.js` (regras 18-33)
2. Adicionar detector regex no `evaluateTurn` `buildEvaluatorUserPrompt` (linhas 253-310) e replicar a checagem JS no pós-LLM cap (linhas 344-456)
3. Forçar `armadilhaForcada = 'nova_armadilha'` e `capNota = X`
4. Documentar o nome aqui em `ARQUITETURA.md §11`

### Adicionar um sub-modo novo
1. `scenarios.js:19-56` — registrar em `SUB_MODOS` com `nome`, `descricao`, `icone`, `passos_alvo`, `fase_inicial`, `estado_inicial_lead`, `tempo_estimado_min`
2. Renderiza automaticamente no dashboard via `Object.keys(Scenarios.SUB_MODOS)`
3. Avaliar se afeta calibração de cap de ritmo: `evaluator.js:264 submodoJaFechamento` e linhas 562-578

### Adicionar uma persona/caso novo
1. `data/persona_improvavel.json:40` — novo arquétipo (campo `arquetipos`)
2. `data/casos_provas.json` — caso real correspondente
3. Citar o caso na lista de `tecnicas_compendio` se aplicável

### Mudar o modelo Claude
- `claude-api.js:4` — constante `MODEL`. Considerar `claude-sonnet-4-6` ou `claude-opus-4-7` (Sonnet 4.6 = bom custo/qualidade; Opus 4.7 = mais aderência a instruções complexas, melhor pro evaluator)

### Adicionar prompt caching
Mudaria `ClaudeAPI.call` em [claude-api.js:15] pra aceitar `system` como array de blocos:
```js
body.system = [
  { type: 'text', text: SYSTEM_STATIC_PART, cache_control: { type: 'ephemeral' } },
  { type: 'text', text: SYSTEM_DYNAMIC_PART }
];
```
E refatorar `buildEvaluatorSystem` pra separar a parte estável (~95% do prompt) da dinâmica (5 últimas linhas). Cache TTL é 5 min; uma sessão típica tem turnos espaçados em 30s-2min, cabe.

### Migrar pra ter backend / proxy de API
- Substituir `ClaudeAPI.call` pra apontar pra `/api/anthropic` no seu servidor
- Remover header `anthropic-dangerous-direct-browser-access`
- Backend autentica usuário, injeta API key do servidor, rate-limit por usuário, log de custo
- localStorage pode virar sync com backend

---

## 15. Mapa de chamadas (call graph resumido)

```
DOMContentLoaded
  └─ boot()
       ├─ initWelcome → btnStart click → renderDashboard / showScreen
       ├─ initDashboard
       ├─ initSession
       ├─ initHistory
       └─ loadData() ──→ fetch 9 JSONs

submodo card click
  └─ startSession(submodo)
       ├─ reset state
       ├─ renderCaminhoMap([])
       ├─ Scenarios.generate ──→ ClaudeAPI.call (call #1)
       ├─ pushLeadMessage(primeira_mensagem)
       └─ Evaluator.leadHint ──→ ClaudeAPI.call (call #2, async)

btnSend click / Ctrl+Enter
  └─ handleSend()
       ├─ Speech.captureAndResetSilence
       ├─ pushRamonMessage
       ├─ Evaluator.evaluateTurn ──→ ClaudeAPI.call (call #3)
       │     └─ pós-LLM: cap de ritmo + promoção a 10
       ├─ atualiza state.passosCumpridos, sessionTechniques, closeAttempts
       ├─ renderCaminhoMap, renderFeedback, attachMiniEval
       ├─ Evaluator.leadResponse ──→ ClaudeAPI.call (call #4, com retry)
       │     └─ detectLeadCharacterBreak → retry se quebrou
       ├─ pushLeadMessage(leadReply)
       ├─ Evaluator.leadHint ──→ ClaudeAPI.call (call #5)
       └─ detecção fim de sessão (2 estágios)

btnGoToReport click (depois do modal de fim)
  └─ endSession()
       ├─ Evaluator.finalReport ──→ ClaudeAPI.call
       │     └─ cap consistência + cap cobertura
       ├─ Gamification.updateStreak
       ├─ Gamification.updateSkillsFromScores
       ├─ Gamification.recordStepHits
       ├─ Gamification.recordTechniques (unlock achievements)
       ├─ Gamification.checkDailyCompletion
       ├─ Gamification.computeSessionXp
       ├─ Gamification.applySessionXp (level-ups)
       ├─ Gamification.saveSession (quota-safe)
       └─ renderReport / show 'report' screen

Modo Chamada:
  btnCallStart → startCall
       └─ speakLeadThenListen (TTS última msg) → onEnd → beginListening
            └─ STT com silenceTimeoutMs=7000 → onAutoStop → autoSubmitFromCall
                 └─ handleSend → se nova msg do lead → speakLeadThenListen
```

---

## 16. Convenções de código

- **IIFE para namespace**: cada `.js` define `const Name = (() => { ...; return {...}; })();`
- **`$(sel)` e `$$(sel)`**: helpers de querySelector definidos no topo de `app.js`
- **`esc(s)`**: HTML-escape mínimo. Usado em **todos** os `innerHTML` que recebem dado do LLM ou do JSON
- **Normalização Unicode**: comparações de texto usam `.normalize('NFD').replace(/[̀-ͯ]/g, '')` pra ignorar acentos
- **Regex case-insensitive** (`/.../i`) — quase todos os matchers
- **`console.log/warn/error` deliberados**: `[handleSend]`, `[leadResponse]`, `[finalReport]` — tags pra grep
- **State é mutável e global** dentro do IIFE de `app.js`. Não há imutabilidade nem Redux
- **Async errors**: `try/catch` em todos os `await ClaudeAPI.call`, com fallback visual ("Erro: …") e log
- **Comentários em PT-BR** (português brasileiro) — match com a linguagem de domínio
- **Sem JSDoc nem TypeScript**

---

## 17. Sugestões para refatoração futura (priorizadas)

Ordem por impacto / esforço:

1. **Adicionar prompt caching** (1 dia, alto ROI) — cortar custo/latência em ~80%
2. **Atualizar modelo pra Sonnet 4.6 ou Opus 4.7** (1 hora, médio ROI) — provável melhora em instruction-following
3. **Modularizar `evaluator.js`** (3-5 dias, alto ROI manutenibilidade) — separar:
   - `evaluator/system-base.js` — base estática (rubrica, regras absolutas)
   - `evaluator/conceitos.js` — bloco de conceitos canônicos (gerado de JSON)
   - `evaluator/armadilhas.js` — bloco de armadilhas com regex de detecção
   - `evaluator/cap-ritmo.js` — pós-LLM caps determinísticos
   - `evaluator/index.js` — composição
4. **Adicionar dashboard de tendências** (2-3 dias, alto ROI pedagógico) — gráficos da evolução de notas por dimensão, técnicas que regridem, armadilhas recorrentes
5. **Sincronizar docs** (1 dia, baixo esforço) — atualizar `COMO-USAR-v2.md` e `PROMPT-MESTRE-v2.md` pra refletir os 9 JSONs reais ou deletá-los
6. **Implementar "Cena Real"** (3-5 dias, alto ROI) — paste de conversa do WhatsApp + análise transversal
7. **Export Markdown pro Obsidian** (1-2 dias, médio ROI) — fecha loop com segundo cérebro do Ramon
8. **Análise transversal de sessões** (3-5 dias, alto ROI) — "você usa Mirror em 90% das aberturas, mas em 12% dos fechamentos"
9. **Backend opcional com proxy de API** (1-2 semanas, alto ROI distribuição) — habilita time/aluno usarem sem API key própria
10. **Arena 4 (WhatsApp)** (1 semana, médio ROI) — formato muito diferente, troca o lead pra texto assíncrono
11. **Arena 3 (Palco/Live)** (2 semanas, médio ROI) — pitch ao vivo + chat simulado
12. **Testes** (3-5 dias, alto ROI estabilidade) — pelo menos snapshot tests dos prompts e teste de regex
13. **Replay de sessão com voz** (1 semana, baixo ROI mas alto delight)

---

## 18. Glossário rápido

| Termo | Significado |
|---|---|
| **Improvável** | Público-alvo da Aliança — alta capacidade + alta disposição, travado por falta de Permissão |
| **Permissão** | Autorização inconsciente pra ter/ser/fazer/ir |
| **PDA** | Perceber → Decidir → Agir (Descontrolado vs. Memorável) |
| **CDP** | Capacidade + Disposição + Permissão |
| **Marca Passos** | Nome da plataforma online da Aliança (NUNCA "aplicativo Marca Passos" no fechamento — só "Marca Passos") |
| **Caminho de 18 passos** | Espinha dorsal técnica do treino (Belfort+Voss+Blount+Rackham+Concer+Hormozi compilados) |
| **Looping Universal** | Belfort: "a ideia faz sentido pra você?" — testa percepção de valor antes de qualquer close |
| **Isolamento** | Concer: "tirando o investimento, faz sentido?" — separa objeção financeira da real |
| **3 Dez** | Belfort: 3 patamares de certeza (Produto / Você / Empresa) na ordem |
| **3 Tons** | Belfort: tonalidades aplicadas no pedido de fechamento |
| **Cadeira de Balanço** | "Daqui a 6 meses, se nada mudar…" — custo da inação |
| **Skin in the Game** | Hormozi: o valor cria o comprometimento |
| **Avanço Concreto** | Rackham: vs. continuação vaga. Próximo passo com data + comprometimento ambos os lados |
| **Pre-handling** | Hormozi: antecipar objeções antes do lead levantar |
| **Resposta nota 10** | Gabarito gerado pelo `leadHint` que o avaliador usa como referência no próximo turno |
| **Awaiting payment confirmation** | Estágio B do fechamento: aceite verbal recebido, falta lead confirmar pagamento efetivado |
| **Arena 2** | Chamada 1×1 pós-evento (o único modo implementado) |
| **Arena 3 / Palco** | Live/webinar em massa (não implementado) |
| **Arena 4 / WhatsApp** | Reengajamento assíncrono (não implementado) |

---

## 19. Pontos de partida para tarefas comuns

| "Quero…" | Comece por |
|---|---|
| Mudar a calibração de uma regra | `evaluator.js` system prompt (linhas 6-250) + cap determinístico (linhas 344-456) |
| Adicionar uma nova armadilha | §14 cookbook + procurar "armadilha_cometida" no `evaluator.js` |
| Mudar a fórmula de XP | `gamification.js:317 computeSessionXp` |
| Adicionar comando de voz | `speech.js:43 rules` |
| Tunar a personalidade do lead | `scenarios.js:189 buildLeadSystemPrompt` |
| Tunar a dica do turno | `evaluator.js:483 leadHint` |
| Adicionar uma tela nova | `index.html` (criar `<section id="screen-X">`) + handler em `app.js` |
| Mudar estética | `styles.css` (variáveis CSS no `:root` no topo) |
| Diminuir custo da API | Cache + downgrade pra Haiku 4.5 no `leadResponse` (calls #4) |
| Migrar pra outro modelo | `claude-api.js:4 MODEL` |

---

## 20. Contato e contexto

- **Owner do produto**: Ramon Galimberti (Aliança Divergente)
- **Cliente principal**: o próprio Ramon (treina antes das chamadas reais)
- **Repositório**: local, em `C:\Users\natha\Documents\Ramon-documentos\Treinamento de Vendas`
- **Branch atual**: `v2`
- **Branch principal**: `main`
- **Materiais-fonte fora do código**: Apostila do Núcleo + Compêndio de 26 seções + 8 chamadas reais de abril/2026 (vocabulário do lead extraído delas)

Qualquer engenheiro que pegar esse projeto deve, na primeira hora:
1. Ler este documento todo
2. Abrir o app local, fazer 1 sessão real
3. Ler `data/caminho_18_passos.json` e `data/conceitos_permissao.json` (50% do domínio mora aí)
4. Ler o system prompt do `evaluator.js` de cabo a rabo
5. Olhar 2-3 sessões salvas no histórico pra ver o formato dos `turn_feedbacks`

Boa sorte. O sistema funciona — falta polir, modularizar e expandir.
