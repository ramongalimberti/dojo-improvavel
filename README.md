# 🥋 Dojô Improvável

App web local de treino cirúrgico de condução de vendas para a **Aliança Divergente** (Ramon).

Moldura: **Teoria da Permissão** + playbook validado (Hormozi / Concer / Voss / Brunson) traduzido pra voz de mesa de jantar.

---

## Como abrir

Precisa servir por HTTP (os JSONs não carregam via `file://`).

```bash
cd "Treinamento de Vendas"
python3 -m http.server 8080
```

Abre http://localhost:8080 no Chrome ou Edge (pro microfone funcionar).

---

## Primeira vez

1. Pega sua API key em https://console.anthropic.com/settings/keys
2. Cola na tela de boas-vindas (fica salva só no navegador, `localStorage`)
3. Escolhe um nome
4. Entra no **Dojô I — DM 1:1**
5. Lê o cenário gerado. Espera a primeira mensagem do lead. Responde (áudio 🎤 ou texto)
6. O avaliador volta com:
   - nota geral
   - 1 ponto forte (palavra/frase sua)
   - 1 ajuste
   - reformulação pronta
   - técnica do playbook que caberia
   - conceito da Teoria da Permissão que se encaixa
   - técnicas que você aplicou corretamente (com XP bônus)

---

## Os 7 JSONs da pasta `data/`

| Arquivo | O quê |
|---|---|
| `metodologia.json` | Conceitos Teoria da Permissão |
| `objecoes.json` | 7 categorias + mentiras funcionais |
| `personas.json` | 8 arquétipos do Improvável |
| `rubrica.json` | 5 dimensões + técnicas bonificadas + armadilhas críticas |
| `tecnicas_vendas.json` | Frameworks (CLOSER, 4 passos Concer, 5 passos indeciso) |
| `scripts_quebra_objecao.json` | Scripts linha-a-linha das 7 objeções mais comuns |
| `playbook_live.json` | Estrutura de 6 blocos da live final |

Você pode substituir qualquer um pelos seus arquivos curados — o app recarrega sozinho.

---

## Dojôs

- **Dojô I — DM 1:1 Pós-Evento** (sempre aberto)
- **Dojô II — Q&A Ao Vivo** (libera com média ≥ 7.0 em 10+ sessões do Dojô I)
- **Dojô III — Live/Webinar em Massa** (libera com média ≥ 7.5 em 10+ sessões do Dojô II)

---

## Gamificação

- **XP** por nota + bônus streak + bônus por técnica aplicada + bônus fechamento
- **Níveis** L1 → L99
- **Streak** diário
- **13 conquistas** (Mestre do Mirror, Playbook Vivo, Fechador Improvável, L99, etc.)
- **Painel de 15 técnicas dominadas** com contador de aplicações corretas
- **Desafio diário** que força prática de uma técnica específica (ex: "hoje use Mirror em toda sessão")

---

## Proibições (derrubam Fidelidade pra ≤ 2 automático)

- Clichê motivacional ("você é capaz", "acredite")
- Religiosidade indevida ("tempo de Deus" fora de contexto)
- Lei da atração / mentalidade abundância
- Oferecer desconto como quebra de objeção
- Urgência artificial
- Ataque à família do lead
- Promessa de 10k/mês / enriquecimento rápido

---

## Atalhos

- `Ctrl+Enter` / `Cmd+Enter` no textarea envia a resposta
- 🎤 liga/desliga o microfone (pt-BR)

---

## Persistência

Tudo em `localStorage`:
- `dojo:ramon:api_key`
- `dojo:ramon:profile` (nome, nível, xp, streak)
- `dojo:ramon:skills` (5 habilidades 0-100)
- `dojo:ramon:sessions` (últimas 100 sessões)
- `dojo:ramon:achievements`
- `dojo:ramon:daily_challenge`
- `dojo:ramon:tecnicas_dominadas`
- `dojo:ramon:scenario_hashes` (últimas 50 personas geradas — evita repetição)

**"Resetar progresso"** (dashboard) limpa tudo.

---

## Calibração

As primeiras 2-3 sessões são calibração. Se o avaliador estiver duro/frouxo demais:

- Ajuste o prompt em `evaluator.js` → `buildEvaluatorSystem()`
- Ou peça em conversa nova: *"calibra o avaliador: o Ramon traduz pra mesa de jantar, avalia pelo espírito da técnica não pela frase literal"*

Se o lead soar artificial, ajuste em `scenarios.js` → `buildLeadSystemPrompt()`.

---

## Sem backend, sem login, sem banco

Tudo roda no navegador. A única chamada externa é pra API da Anthropic (direto do fetch do browser, com `anthropic-dangerous-direct-browser-access: true`).
