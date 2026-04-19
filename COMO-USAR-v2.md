# 🛠️ COMO USAR v2 — Playbook Integrado

## O que mudou da v1 pra v2

A **v1** tinha 4 arquivos de dados baseados só na Teoria da Permissão.

A **v2** tem **7 arquivos** que fundem Teoria da Permissão com técnicas validadas de Hormozi, Concer, Brunson e Voss — todas traduzidas pra voz de mesa de jantar do Ramon.

### Arquivos novos (3)

| Arquivo | O que contém |
|---|---|
| **`tecnicas_vendas.json`** | Frameworks CLOSER, 4-passos-Concer, 5-passos-indeciso, gatilhos permitidos/proibidos, frases pós-preço |
| **`scripts_quebra_objecao.json`** | Scripts linha-a-linha prontos pras 7 objeções mais comuns — fase 1/2/3/4 + armadilhas |
| **`playbook_live.json`** | Estrutura de 6 blocos da live final, micro-protocolos de condução |

### Arquivos atualizados (1)

| Arquivo | O que mudou |
|---|---|
| **`rubrica.json`** | Agora cada dimensão reconhece técnicas específicas do playbook. Novo sistema de **XP bônus por técnica aplicada**. Lista ampliada de armadilhas críticas que derrubam dimensões. |

### Arquivos mantidos (3)

- `metodologia.json` — sem mudanças
- `objecoes.json` — sem mudanças (já estava cirúrgico)
- `personas.json` — sem mudanças

---

## Se você ainda não começou

Use esse pacote v2 do zero. Os passos são idênticos ao guia anterior, mas com o prompt e os 7 JSONs novos.

1. `mkdir -p ~/dojo-improvavel && cd ~/dojo-improvavel`
2. `claude` (abre Claude Code)
3. Cola o `PROMPT-MESTRE-v2.md` inteiro
4. Deixa construir
5. Substitui os 7 JSONs da pasta `data/` pelos do pacote v2
6. Pega API key no console.anthropic.com
7. `python3 -m http.server 8080`
8. Primeira sessão

## Se você já começou com a v1

Três mudanças no projeto existente:

**1. Adiciona os 3 novos JSONs** em `data/`:
```bash
cp caminho/dojo-pacote-v2/data/tecnicas_vendas.json ~/dojo-improvavel/data/
cp caminho/dojo-pacote-v2/data/scripts_quebra_objecao.json ~/dojo-improvavel/data/
cp caminho/dojo-pacote-v2/data/playbook_live.json ~/dojo-improvavel/data/
```

**2. Substitui o `rubrica.json`**:
```bash
cp caminho/dojo-pacote-v2/data/rubrica.json ~/dojo-improvavel/data/rubrica.json
```

**3. Avisa o Claude Code**:
> "Adicionei 3 novos JSONs em `data/` (tecnicas_vendas, scripts_quebra_objecao, playbook_live) e atualizei o rubrica.json. Leia-os e faça estas mudanças:
>
> **No `evaluator.js`:** incorpore ao prompt do avaliador as referências a essas técnicas do playbook. O avaliador agora deve:
> - Marcar quais técnicas o Ramon aplicou corretamente (lista em `rubrica.json.bonus_xp_por_tecnicas_aplicadas`)
> - Na sugestão de reformulação, referenciar linha-a-linha dos scripts do `scripts_quebra_objecao.json`
> - Aplicar as armadilhas críticas do `rubrica.json.armadilhas_criticas_que_zeram_dimensao`
>
> **No `gamification.js`:** implemente o XP bônus por técnica aplicada (15 técnicas com XP de 10-50 cada). Cria o painel de técnicas dominadas no dashboard.
>
> **No `scenarios.js`:** o gerador de cenário agora deve sugerir quais técnicas do playbook são ideais pra aquele cenário específico (campo `tecnicas_do_playbook_ideais_aqui`).
>
> **No dashboard (`index.html` + `app.js`):** adicione o painel de 15 técnicas com contador de 'quantas vezes apliquei com sucesso'.
>
> **Nos desafios diários:** agora use exemplos do tipo 'Hoje use Mirror em toda sessão' / 'Hoje use Teste Hipotético Hormozi pelo menos 1 vez' / 'Hoje quebre Tá Caro sem oferecer desconto'."

O Claude Code vai iterar na estrutura existente sem precisar reconstruir do zero.

---

## O que o sistema agora consegue fazer

Antes (v1):
- Avaliava se você nomeou conceito da Teoria da Permissão
- Detectava clichê/religiosidade/desconto

Agora (v2):
- Tudo acima **+**
- Detecta se você usou **Mirror** (Voss) e em que turno
- Detecta se você usou **Label** com precisão
- Detecta se você aplicou os **4 passos de Concer** na ordem
- Detecta se você usou **Teste Hipotético** (Hormozi)
- Detecta se você usou **Silêncio estratégico** (marcado no texto como `[silêncio 3s]`)
- Detecta se você usou **Pagar com dinheiro vs pagar com tempo**
- Detecta se você usou **Cadeira de Balanço** contra "vou pensar"
- Detecta se você usou **Inversão de papéis** contra "preciso falar com cônjuge"
- Premia com XP específico cada técnica aplicada corretamente
- Sugere reformulação baseada em **script real linha-a-linha** do `scripts_quebra_objecao.json`
- Mostra painel de progresso por técnica (gamificação real)

## Desafios diários do playbook

Toda manhã o sistema gera um desafio específico. Exemplos:

- "Hoje, em toda sessão, aplique Mirror + Label nos primeiros 2 turnos"
- "Hoje, use o Teste Hipotético Hormozi em pelo menos 1 sessão"
- "Hoje, quebre 'tá caro' usando a tradução Permissão (sem desconto)"
- "Hoje, use Silêncio estratégico depois do preço (explícito no texto: [silêncio 3s])"
- "Hoje, nomeie o Padrão do lead antes do 3º turno"
- "Hoje, quebre 'se Deus quiser' sem atacar a fé"
- "Hoje, aplique o protocolo completo Label → Mirror → Reframe → PDA → Silêncio"
- "Hoje, use a Pergunta de Isolamento (Concer) em toda objeção que aparecer"

Completar o desafio dá +25 XP. Criar **streak de 7 dias de desafio completo** desbloqueia a conquista **Playbook Vivo**.

---

## Calibração no primeiro uso

**Importante:** as 2-3 primeiras sessões são calibração. O avaliador pode estar rigoroso demais ou frouxo demais dependendo de como o Claude Code interpretou os JSONs.

Depois da primeira sessão, olha com honestidade:

- **Se a nota tá muito alta (8+) em resposta que você sabe que foi mediana:** avalia se o avaliador não tá dando nota por "tentou" em vez de "conseguiu". Ajusta com Claude Code: "calibra o avaliador pra ser mais rigoroso na Fidelidade — só conta como sucesso se a técnica foi aplicada com as palavras do script, não 'parecido'".

- **Se a nota tá muito baixa (4-) em resposta que você sentiu boa:** pode ser que o avaliador não tá reconhecendo tradução pra voz Ramon. Ajusta: "o Ramon não fala exatamente como os scripts — ele traduz pra mesa de jantar. Avalia pelo ESPÍRITO da técnica, não pela frase literal".

- **Se o lead tá respondendo como IA:** ajusta no prompt do role-play: "o lead tá soando artificial. Usa linguagem mais crua, menos auto-descritiva. Gente de verdade não fala 'eu sinto medo de investir' — fala 'tô meio inseguro'."

---

## Roadmap pós-MVP

Quando o MVP estiver rodando redondo (2-3 semanas de uso), pontos de evolução:

1. **Exportar relatório semanal em markdown** pra jogar no Obsidian → histórico no segundo cérebro
2. **Modo "Cena Real"** — você cola uma conversa real que teve (DM/WhatsApp), o sistema analisa e aponta o que faria diferente
3. **Biblioteca de cenas vencedoras** — quando você tirar 9+ numa sessão, sistema salva como "cena modelo" pra revisitar
4. **Compartilhar métricas com Elton** — vocês comparam notas nas mesmas categorias
5. **Versão Netlify mobile** — treino no iPhone com o microfone, entre reuniões
6. **Replay com voz** — ouvir sessão antiga como se fosse podcast enquanto dirige

---

## Resumo visual

```
┌──────────────────────────────────────────────┐
│  DOJÔ IMPROVÁVEL v2                          │
│  ════════════════                            │
│                                              │
│  CAMADA 1: Moldura                           │
│  └─ Teoria da Permissão (metodologia.json)   │
│                                              │
│  CAMADA 2: Diagnóstico                       │
│  ├─ Perfil (personas.json)                   │
│  └─ Objeções (objecoes.json)                 │
│                                              │
│  CAMADA 3: Técnicas (🆕)                     │
│  ├─ Frameworks (tecnicas_vendas.json)        │
│  ├─ Scripts (scripts_quebra_objecao.json)    │
│  └─ Live (playbook_live.json)                │
│                                              │
│  CAMADA 4: Avaliação                         │
│  └─ Rubrica + XP bônus (rubrica.json)        │
│                                              │
│  CAMADA 5: Gamificação                       │
│  └─ XP, níveis, streak, conquistas,          │
│     desafios diários, técnicas dominadas     │
└──────────────────────────────────────────────┘
```

Cada técnica que você aplica corretamente fica registrada. Com o tempo, o sistema mostra quais técnicas você domina, quais evita, e em que contexto elas não aparecem quando deveriam. **É aí que o treino vira cirúrgico** — você para de "melhorar em geral" e começa a trabalhar lacunas específicas.
