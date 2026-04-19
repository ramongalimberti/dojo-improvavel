// evaluator.js — avaliação turno-a-turno + relatório final + frase-pro-caderno

const Evaluator = (() => {

  function buildEvaluatorSystem({ data }) {
    return `Você é coach de vendas L99 especializado no público Improvável (Aliança Divergente — Teoria da Permissão).

Sua função é avaliar UMA resposta do Ramon numa sessão de role-play, aplicando a rubrica dos 5 dimensões integradas com o playbook Hormozi/Concer/Voss/Brunson.

Fonte de verdade (resumida):
- metodologia.json: conceitos da Teoria da Permissão (Permissão, Pré-Queda, Mula de Carga, Banheiro Emocional, Culpa da Sobrevivência, PDA, Efeito Paralelo, Escada da Postura, Conversa Difícil, Obesidade Intelectual, Plano Perfeito, Medo do Brilho, Ciclo do Quase).
- objecoes.json: 7 categorias (dinheiro, tempo, confiança, autoconhecimento, família, religiosidade, postura).
- rubrica.json: 5 dimensões (escuta, objecao, dor, conducao, fidelidade) com pesos e armadilhas críticas.
- tecnicas_vendas.json / scripts_quebra_objecao.json: frameworks CLOSER, 4 passos Concer (Dissonância→Empatia→Isolamento→Argumento), 5 passos indeciso (Label→Mirror→Reframe→PDA→Silêncio), Teste Hipotético, Dupla Alternativa, Alinhamento Lógico.

REGRAS CRÍTICAS ABSOLUTAS:
1. Se Ramon usou clichê motivacional / religiosidade indevida / lei da atração / ofereceu desconto → Fidelidade ≤ 2.
2. Se Ramon aceitou 'vou pensar' sem resposta estruturada → Condução ≤ 3.
3. Se Ramon repetiu preço 3+ vezes → Condução ≤ 3.
4. Se Ramon atacou a família do lead → Fidelidade = 1 E Dor ≤ 3.
5. Se Ramon prometeu enriquecimento rápido ou 10k/mês → Fidelidade = 1.
6. NUNCA elogie genérico. Cite palavra/frase EXATA do Ramon.
7. NUNCA recomende desconto, clichê, ou religiosidade como reformulação.
8. Reformulação SEMPRE na voz de mesa de jantar do Ramon (não de palco, não de script).

TÉCNICAS BONIFICADAS (marcar true SÓ se aplicou corretamente no turno):
- mirror: repetiu 2-3 últimas palavras do lead como pergunta
- label: rotulou a emoção percebida ("parece que..." / "soa como...")
- isolamento_concer: "além disso, tem mais algum motivo?" ou equivalente
- teste_hipotetico: "num mundo hipotético onde..." / "se não fosse X, você faria?"
- dinheiro_vs_tempo: mostrou que não investir custa tempo em vez de só dinheiro
- silencio_estrategico: marcado no texto como [silêncio 3s] ou equivalente explícito
- nomeou_conceito_permissao: disse POR NOME — Pré-Queda, Mula de Carga, Culpa da Sobrevivência, PDA, etc.
- frase_ancora_ancorada: usou frase-âncora amarrada ao contexto real do lead (não gratuita)
- alinhamento_logico: fez as 3 perguntas fechadas (resolve? confia? tem recursos?)
- dupla_alternativa: "crédito ou à vista?" / "entrada A ou B?"
- inversao_papeis: virou o "preciso falar com cônjuge" em pergunta devolvida
- cadeira_balanco: quebrou "vou pensar" nomeando a paralisia
- ciclo_quase_devolvido: "há quanto tempo você tá quase lá?"
- risco_reverso: ofereceu garantia inversa / movimento de risco do Ramon

Se uma técnica do playbook seria IDEAL no turno e Ramon NÃO usou, registre em "tecnica_sugerida" apontando a referência.

SAÍDA: JSON estrito, sem markdown nem fences.
{
  "nota_geral": 7.2,
  "notas": { "escuta": 8, "objecao": 7, "dor": 6, "conducao": 7, "fidelidade": 8 },
  "ponto_forte": "palavra/frase EXATA que o Ramon usou bem — sem elogio genérico",
  "ajuste": "UM ajuste mais impactante (não lista)",
  "reformulacao": "frase concreta pra Ramon usar no lugar do que ele disse — voz dele",
  "porque": "ancorado em conceito Teoria da Permissão POR NOME + técnica do playbook POR NOME",
  "conceito_usado_pelo_ramon": "nome do conceito OU null",
  "conceito_que_deveria_usar": "Culpa da Sobrevivência / Pré-Queda / Mula de Carga / etc",
  "tecnica_que_deveria_usar": "ex: Pergunta de Isolamento (4 Passos Concer - passo 3)",
  "tecnicas_aplicadas": {
    "mirror": false, "label": false, "isolamento_concer": false, "teste_hipotetico": false,
    "dinheiro_vs_tempo": false, "silencio_estrategico": false, "nomeou_conceito_permissao": false,
    "frase_ancora_ancorada": false, "alinhamento_logico": false, "dupla_alternativa": false,
    "inversao_papeis": false, "cadeira_balanco": false, "ciclo_quase_devolvido": false,
    "risco_reverso": false
  },
  "armadilha_cometida": null,
  "xp_bonus_tecnicas": 0,
  "lead_ceder_camada": false,
  "lead_endurecer": false,
  "pode_fechar": false
}

Campos adicionais:
- lead_ceder_camada: true se Ramon aplicou técnica que justifica o lead revelar uma camada mais profunda
- lead_endurecer: true se Ramon caiu em armadilha crítica → lead deve responder seco
- pode_fechar: true SÓ se turno ≥ 5, todas camadas quebradas, e Ramon fez pergunta de fechamento clara`;
  }

  function buildEvaluatorUserPrompt({ scenario, conversation, lastRamon, turn }) {
    return `CONTEXTO DA SESSÃO (turno ${turn}):

Persona oculta:
- Nome: ${scenario.persona.nome}
- Padrão real: ${scenario.padrao_oculto}
- Objeção superficial: ${scenario.objecao_superficial}
- Objeção real (oculta pro Ramon, VISÍVEL pra você avaliar): ${scenario.objecao_real}

Conversa até aqui:
${conversation.map(m => `[${m.role === 'user' ? 'RAMON' : 'LEAD'}]: ${m.content}`).join('\n')}

RESPOSTA DO RAMON A SER AVALIADA:
"${lastRamon}"

Avalie com rigor. Siga a rubrica e as regras críticas. Marque técnicas aplicadas com honestidade (só true se identificável de fato).`;
  }

  async function evaluateTurn({ scenario, conversation, lastRamon, turn, data }) {
    const system = buildEvaluatorSystem({ data });
    const user = buildEvaluatorUserPrompt({ scenario, conversation, lastRamon, turn });
    const { text } = await ClaudeAPI.call({
      system,
      messages: [{ role: 'user', content: user }],
      max_tokens: 900,
      temperature: 0.35
    });
    const parsed = ClaudeAPI.extractJSON(text);
    if (!parsed) throw new Error('Avaliação inválida');

    // Calcular xp_bonus_tecnicas se não veio
    if (!parsed.xp_bonus_tecnicas || parsed.xp_bonus_tecnicas === 0) {
      let sum = 0;
      Gamification.TECHNIQUES.forEach(t => {
        if (parsed.tecnicas_aplicadas && parsed.tecnicas_aplicadas[t.id]) sum += t.xp;
      });
      parsed.xp_bonus_tecnicas = sum;
    }
    return parsed;
  }

  // ========= ANÁLISE DA FALA DO LEAD (dica/spoiler pro Ramon) =========
  async function leadHint({ scenario, leadMessage, conversation, turn, data }) {
    const system = `Você é coach de vendas L99 do Dojô Improvável (Teoria da Permissão + playbook Voss/Concer/Hormozi/Brunson).

Sua função nesta chamada: ler UMA fala recém-chegada do LEAD e produzir uma dica rápida pro Ramon — o que provavelmente está em jogo e que caminhos técnicos existem. É um spoiler opcional, fica oculto por padrão.

Regras:
- Seja cirúrgico. Curto. Sem prosa motivacional.
- Use nomes REAIS das técnicas (Mirror, Label, Isolamento Concer, Teste Hipotético, Silêncio, Dupla Alternativa, Alinhamento Lógico, Cadeira de Balanço, Inversão de Papéis, Ciclo do Quase, Risco Reverso, Dinheiro vs Tempo, Nomear conceito da Teoria da Permissão).
- Nomeie o conceito da Teoria da Permissão quando couber (Pré-Queda, Mula de Carga, Culpa da Sobrevivência, Banheiro Emocional, Medo do Brilho, Obesidade Intelectual, Plano Perfeito, PDA, Escada da Postura, Conversa Difícil).
- 2-3 técnicas sugeridas, no máximo. Cada uma com UM motivo em 1 frase (por que aqui, agora).

Responda JSON estrito, sem markdown nem fences:
{
  "possivel_objecao": "descrição em 1 frase da objeção que o lead acabou de sinalizar (superficial OU se virou algo mais real)",
  "categoria": "dinheiro | tempo | confianca | autoconhecimento | familia | religiosidade | postura | decisao",
  "camada_revelada": "superficial | intermediaria | profunda",
  "conceito_permissao_em_jogo": "nome do conceito OU null",
  "tecnicas_sugeridas": [
    { "nome": "Mirror", "porque": "repetir 'quem você pensa que é' devolve a voz herdada sem invadir" },
    { "nome": "Nomear conceito Permissão", "porque": "isso é Medo de Ofuscar — padrão de lealdade ao pai" }
  ],
  "o_que_observar": "1 frase do que fica claro na fala do lead e que o Ramon pode querer mirar"
}`;

    const user = `Persona: ${scenario.persona.nome}, padrão oculto: ${scenario.padrao_oculto}.
Objeção superficial do cenário: ${scenario.objecao_superficial}
Objeção real (oculta — ajuda a ancorar a análise): ${scenario.objecao_real}

Últimas 2 trocas da conversa:
${conversation.slice(-4).map(m => `[${m.role === 'user' ? 'RAMON' : 'LEAD'}]: ${m.content}`).join('\n')}

FALA RECÉM-CHEGADA DO LEAD (turno ${turn}):
"${leadMessage}"

Devolva o JSON.`;

    try {
      const { text } = await ClaudeAPI.call({
        system,
        messages: [{ role: 'user', content: user }],
        max_tokens: 450,
        temperature: 0.4
      });
      return ClaudeAPI.extractJSON(text);
    } catch (err) {
      console.warn('leadHint falhou:', err);
      return null;
    }
  }

  // ========= PROMPT DO LEAD (resposta) =========
  async function leadResponse({ scenario, conversation, dojo, data, leadCederCamada, leadEndurecer, podeFechar }) {
    const leadSystem = Scenarios.buildLeadSystemPrompt({ scenario, dojo, data });

    // Injetar estado atual no prompt do turno
    let cueMsg = '';
    if (podeFechar) cueMsg = '[CUE DE FECHAMENTO] Ramon fez a pergunta certa no momento certo, todas as camadas foram quebradas. Você pode ceder e aceitar entrar. Responda 2-3 frases.';
    else if (leadEndurecer) cueMsg = '[CUE] Ramon caiu em armadilha (clichê / religiosidade / desconto / urgência falsa). Responda SECO, fechado, quase desligando. 1-2 frases.';
    else if (leadCederCamada) cueMsg = '[CUE] Ramon aplicou técnica de precisão. Ceda UMA camada — revele algo mais próximo da objeção real, mas não entregue tudo. 2-3 frases.';

    const msgs = conversation.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
    // O lead é "assistant" da perspectiva do modelo; mas na nossa história o assistant é o LEAD.
    // Como nosso loop alterna user=Ramon / assistant=Lead, seguimos isso:
    if (cueMsg) {
      msgs.push({ role: 'user', content: `(Sistema — ignore no conteúdo da resposta) ${cueMsg}\n\nAgora responda como a persona à última fala do Ramon, em 1-3 frases.` });
    }

    const { text } = await ClaudeAPI.call({
      system: leadSystem,
      messages: msgs,
      max_tokens: 400,
      temperature: 0.95
    });
    return (text || '').trim();
  }

  // ========= RELATÓRIO FINAL =========
  async function finalReport({ scenario, conversation, turnFeedbacks, data }) {
    // Média ponderada das notas dos turnos
    const n = turnFeedbacks.length;
    if (n === 0) return { nota_final: 0, frase_caderno: '', summary: '' };

    const avg = (k) => turnFeedbacks.reduce((a, f) => a + (f.notas?.[k] || 0), 0) / n;
    const notas = {
      escuta: avg('escuta'),
      objecao: avg('objecao'),
      dor: avg('dor'),
      conducao: avg('conducao'),
      fidelidade: avg('fidelidade')
    };
    const nota_final = (notas.escuta * 0.2 + notas.objecao * 0.25 + notas.dor * 0.2 + notas.conducao * 0.2 + notas.fidelidade * 0.15);

    // União das técnicas aplicadas
    const tecAcc = {};
    turnFeedbacks.forEach(f => {
      const t = f.tecnicas_aplicadas || {};
      Object.keys(t).forEach(k => { if (t[k]) tecAcc[k] = (tecAcc[k] || 0) + 1; });
    });

    // Pedir frase-pro-caderno
    const system = `Você é coach sênior do Dojô Improvável (Teoria da Permissão + playbook). Ao fim de uma sessão, emita UMA frase curta e afiada para o Ramon levar pro caderno — cirúrgica, voz de mesa de jantar, baseada no que ele aprendeu ou precisa treinar. 10-22 palavras. Sem clichê. Sem reticências motivacionais.`;
    const user = `Persona: ${scenario.persona.nome}, ${scenario.padrao_oculto}.
Notas médias: ${JSON.stringify(notas)}.
Nota final: ${nota_final.toFixed(2)}.
Técnicas aplicadas: ${JSON.stringify(tecAcc)}.
Últimos 2 ajustes do avaliador: ${turnFeedbacks.slice(-2).map(f => f.ajuste).filter(Boolean).join(' | ')}.

Devolva SÓ o JSON:
{"frase_caderno": "..."}`;

    let frase = '';
    try {
      const { text } = await ClaudeAPI.call({ system, messages: [{ role: 'user', content: user }], max_tokens: 200, temperature: 0.7 });
      const p = ClaudeAPI.extractJSON(text);
      frase = p?.frase_caderno || '';
    } catch (_) {
      frase = 'O que você percebe e não decide, vira dívida com você mesmo.';
    }

    return {
      nota_final,
      notas,
      tecnicas_acumuladas: tecAcc,
      frase_caderno: frase
    };
  }

  return { evaluateTurn, leadHint, leadResponse, finalReport };
})();
