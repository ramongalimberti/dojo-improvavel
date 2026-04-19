# 🥋 Dojô Aliança Divergente — v2

App web local de treino cirúrgico de **conversão em chamadas 1×1 pós-evento** para a **Aliança Divergente** (Ramon Galimberti).

Moldura: **Teoria da Permissão** + **Caminho de 18 passos** compilado de Belfort / Voss / Blount / Rackham / Concer / Hormozi / Cardone.

---

## O que mudou da v1

| v1 | v2 |
|---|---|
| 3 dojôs genéricos | **Arena 2 focada em chamada 1×1** pós-evento |
| 1 nível L1-99 geral | **4 Tiers** (Fundação / Condução / Fechamento / Palco), cada um com L1-99 |
| Rubrica genérica | **Caminho de 18 passos** como espinha dorsal + mapa visual em tempo real |
| Dados genéricos (Teoria da Permissão) | **9 JSONs** derivados da Apostila + Compêndio curados do Ramon |
| 15 técnicas | **36 técnicas** indexadas (CLOSER, 3 Dez, 10 Tonalidades, 4 Passos Concer, Implicação, Necessidade de Solução, Looping Universal, etc.) |
| Sem voz automatizada | **Modo Chamada**: TTS do lead + cronômetro de silêncio |
| 1 modo de treino | **4 sub-modos**: Caminho Completo / Dúvidas / Quebra / Fechamento |
| Casos genéricos | **12 casos reais** (Daniela, Regiane, Vanilton, Ícaro, Berenice...) |

---

## Como abrir

```bash
cd "Treinamento de Vendas"
python3 -m http.server 8080
```

http://localhost:8080 em Chrome ou Edge.

Primeira vez: cole sua Anthropic API key. Salva apenas no localStorage.

---

## Os 4 sub-modos

| Sub-modo | Quando treinar | Passos foco |
|---|---|---|
| **🎯 Caminho Completo** | Sessão longa e realista, do "oi" ao fechamento | 1-18 |
| **❓ Modo Dúvidas** | Lead curioso perguntando sobre pilares/preço/método | 4-10 |
| **🛡️ Modo Quebra** | Lead chega JÁ com objeção declarada | 12-16 |
| **🔒 Modo Fechamento** | Lead travado só no último passo | 11-18 |

---

## Modo Chamada

Clique no badge 🔴 **Chamada** no topo da sessão pra ativar:

- 🎙️ **TTS fala automaticamente** a resposta do lead (voz pt-BR feminina)
- ⏱️ **Cronômetro de silêncio** entre fim da fala do lead e início da sua — 3s+ depois do preço = XP Silêncio Dinâmico automático
- 🎤 Seu áudio vai direto pro textarea (já com pontuação por voz funcionando: "vírgula", "ponto", "pausa 3 segundos")
- 📊 Relatório final lista todos os silêncios da sessão

Desliga-se clicando no badge de novo. Funciona como texto puro também.

---

## Mapa de 18 passos (visível durante a sessão)

No topo do chat, 18 quadrados. Cada um representa um passo do Caminho cirúrgico:

- ⚪ cinza = pendente
- 🟡 amarelo = tentou, faltou
- 🟢 verde = cumpriu
- 🔴 borda laranja = passo atual sugerido
- ⭐ = alavanca máxima (não pode pular)

Hover em qualquer quadrado mostra o nome do passo, técnica e autor.

---

## 4 Tiers com L1-99 cada

| Tier | Cobre | Passos |
|---|---|---|
| 🟢 **Fundação** | Abertura + Investigação | 1-7 |
| 🟡 **Condução** | Apresentação | 8-10 |
| 🟠 **Fechamento** | Looping + Closes + Avanço | 11-18 |
| 🔴 **Palco** | (Arena 3 — futuro) | — |

Técnicas específicas dão XP no Tier correspondente. Você sente evolução separada em cada fase.

---

## Missão das 8 semanas (plano Rackham)

O app guia você pela progressão:
- **Semana 1-2:** Abertura (passos 1-3)
- **Semana 3-4:** Investigação (passos 5-7)
- **Semana 5-6:** Apresentação em 3 Dez (passo 10)
- **Semana 7-8:** Fechamento (passos 11-18)

Dashboard mostra em qual semana você está e o foco daquela semana.

---

## Feedback em 3 camadas por turno

Abaixo de cada resposta sua aparece:

1. **Tática** — palavra/frase exata que usou bem (ponto forte) e a que não (ajuste)
2. **Estratégica** — técnica do compêndio que caberia (Mirror, Looping, Isolamento...) + conceito da Teoria da Permissão (Culpa da Sobrevivência, Mula de Carga, PDA...)
3. **Estrutural** — em qual passo do Caminho você está vs. onde deveria estar

---

## Dica do turno (abaixo de cada fala do lead)

Spoiler opcional (fica fechado por padrão). Mostra:
- Provável objeção agora + categoria + camada
- Conceito em jogo
- 2-3 caminhos técnicos com motivo em 1 frase
- Passo do Caminho sugerido

---

## Proibições absolutas (derrubam Fidelidade ≤ 2)

- Clichê motivacional
- Religiosidade indevida
- Lei da atração
- **Desconto** como quebra de objeção
- Urgência artificial
- Ataque à família do lead
- Promessa de 10k/mês
- Aceitar "vou pensar" sem Avanço → Fechamento ≤ 3
- Responder objeção **diretamente** (sem Looping) → Fechamento ≤ 4
- Repetir preço 3+ vezes → Fechamento ≤ 3

---

## Os 9 JSONs (editáveis em `data/`)

| Arquivo | Conteúdo |
|---|---|
| `caminho_18_passos.json` | Espinha dorsal — passos, técnicas, autores, sinais de detecção |
| `produto_alianca.json` | Pilares 1-5, oferta (12× R$249), bônus, frase mestra |
| `conceitos_permissao.json` | 18 conceitos do Núcleo com frase-âncora + armadilha |
| `frases_ancora.json` | Banco de saque rápido por categoria |
| `persona_improvavel.json` | 8 arquétipos recombináveis |
| `dores_por_area.json` | 10 áreas + frases literais em 1ª pessoa |
| `casos_provas.json` | 12 casos reais (Daniela, Regiane, Vanilton, Ícaro, Berenice...) |
| `tecnicas_compendio.json` | 30 técnicas operacionais indexadas com aliases |
| `objecoes_scripts.json` | Scripts literais pras 5 objeções críticas |

---

## Atalhos

- `Ctrl+Enter` / `Cmd+Enter` no textarea envia
- `Espaço` toggla o mic (só quando foco não está em input/textarea)
- `🎤 comandos de voz` expande lista de comandos de pontuação

---

## Persistência (localStorage)

- `dojo:ramon:profile` (nome, streak, semana)
- `dojo:ramon:tier_levels` (L por Tier)
- `dojo:ramon:skills` (5 dimensões 0-100)
- `dojo:ramon:sessions_v2` (últimas 100)
- `dojo:ramon:achievements_v2` (25 conquistas)
- `dojo:ramon:tecnicas_dominadas_v2` (contador por técnica)
- `dojo:ramon:step_hits` (contador por passo 1-18)
- `dojo:ramon:daily_challenge`
- `dojo:ramon:scenario_hashes_v2` (evita repetição de personas)
- `dojo:ramon:api_key`

"Resetar progresso" (dashboard) limpa tudo.

---

## Calibração do avaliador

As primeiras 2-3 sessões são calibração. Se estiver duro/frouxo demais, ajuste o prompt em `evaluator.js` → `buildEvaluatorSystem()`.

Se o lead soar artificial, ajuste `scenarios.js` → `buildLeadSystemPrompt()`.

---

## Stack

- **Vanilla JS** — sem framework, sem build
- **Web Speech API** (STT + TTS pt-BR)
- **Anthropic SDK** via `fetch` direto (flag `anthropic-dangerous-direct-browser-access`)
- **Modelo:** `claude-sonnet-4-20250514`
- **100% local** — zero backend, zero banco, zero login

---

## Próximos passos (v3?)

- Arena 3 — Live/Palco (monólogo pitch + chat ao vivo simulado)
- Arena 4 — WhatsApp de reengajamento (lead não atendeu a chamada)
- Análise de áudio real (prosódia, velocidade, tonalidade)
- Modo "Cena Real" — cola conversa de verdade e recebe análise
- Export semanal em markdown pro Obsidian
