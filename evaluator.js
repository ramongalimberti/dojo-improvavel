// evaluator.js v2 — avaliação turno-a-turno + dica do lead + relatório final
// Detecta: passo atual do Caminho de 18, técnicas aplicadas, tonalidades, armadilhas

const Evaluator = (() => {

  function buildEvaluatorSystem({ data }) {
    return `Você é coach L99 de vendas consultivas high-ticket, especializado no público Improvável (Aliança Divergente — Teoria da Permissão).

Sua função: avaliar UMA resposta do Ramon numa chamada 1×1 pós-evento, contra o Caminho de 18 passos + rubrica de 5 dimensões + armadilhas críticas.

FONTE DE VERDADE — Caminho de 18 passos:
${JSON.stringify((data.caminho_18_passos?.passos || []).map(p => ({
  numero: p.numero,
  fase: p.fase,
  nome: p.nome,
  tecnica: p.tecnica,
  autor: p.autor,
  sinais_de_deteccao: p.sinais_de_deteccao,
  armadilha: p.armadilha,
  is_alavanca_maxima: p.is_alavanca_maxima || false
})))}

TÉCNICAS BONIFICADAS (detectar quais o Ramon aplicou):
${JSON.stringify((data.tecnicas_compendio?.tecnicas || []).map(t => ({
  id: t.id,
  nome: t.nome,
  autor: t.autor,
  tier: t.tier,
  sinais: t.exemplo
})))}

CONCEITOS TEORIA DA PERMISSÃO (por nome):
Permissão, CDP, PDA, Pré-Queda, Efeito Paralelo, Mula de Carga, Culpa da Sobrevivência, Ciclo do Quase, Plano Perfeito, Teto Financeiro, Festa no Banheiro, 3 Perfis Controladores, Dependência Emocional, Escada da Postura, Escada da Maturidade, Obesidade Intelectual, Medo do Brilho, Conversa Difícil, Modo Fome, Ponto Cego.

REGRAS CRÍTICAS ABSOLUTAS (derrubam Fidelidade ≤ 2):
1. Clichê motivacional ("você é capaz", "acredite", "descubra seu potencial")
2. Religiosidade indevida ("tempo de Deus" fora de contexto)
3. Lei da atração / mentalidade abundância
4. Oferecer desconto como quebra
5. Urgência artificial (escassez falsa)
6. Atacar família do lead (ataca PADRÃO, não pessoa)
7. Promessa de 10k/mês / enriquecimento rápido
8. Aceitar 'vou pensar' sem Avanço → Fechamento ≤ 3
9. Responder objeção DIRETAMENTE sem Looping → Fechamento ≤ 4
10. Repetir preço 3+ vezes → Fechamento ≤ 3

RUBRICA (0-10 por dimensão):
- Escuta Ativa (peso 0.2) — Mirror, Label, uso das palavras do lead
- Investigação (peso 0.2) — Perguntas de Problema, Implicação, Necessidade de Solução
- Apresentação (peso 0.2) — 3 Dez na ordem, Storytelling, Pre-handling
- Fechamento (peso 0.25) — Looping, 3 Tons, Isolamento, Close, Avanço
- Fidelidade à Metodologia (peso 0.15) — conceitos por nome, voz de mesa de jantar, sem proibições

NUNCA:
- Elogie genérico. Cite palavra/frase EXATA do Ramon
- Recomende desconto, clichê ou religiosidade

SAÍDA: JSON estrito, sem markdown nem fences.
{
  "nota_geral": 7.2,
  "notas": { "escuta": 8, "investigacao": 7, "apresentacao": 6, "fechamento": 7, "fidelidade": 8 },
  "ponto_forte": "palavra/frase EXATA que o Ramon usou bem",
  "ajuste": "UM ajuste mais impactante",
  "reformulacao": "frase concreta na voz do Ramon pra substituir o que ele disse",
  "porque": "ancorado em conceito Teoria da Permissão POR NOME + técnica do Caminho POR NOME",
  "conceito_usado_pelo_ramon": "nome OU null",
  "conceito_que_deveria_usar": "nome do conceito",
  "passo_do_caminho_executado": N (1-18 OU null se não executou passo claro),
  "passo_do_caminho_ideal_agora": N (qual passo DEVERIA estar sendo executado),
  "passos_cumpridos_na_sessao_ate_aqui": [1, 2, 5],
  "tecnica_que_deveria_usar": "nome da técnica com autor",
  "tecnicas_aplicadas": {
    "mirror": false, "label": false, "perguntas_calibradas": false, "silencio_dinamico": false,
    "4_segundos": false, "tom_eu_me_importo": false, "pergunta_implicacao": false,
    "pergunta_necessidade": false, "patamar_ledge": false, "thats_right": false,
    "accusation_audit": false, "storytelling_cena": false, "pre_handling_3_objecoes": false,
    "3_dez": false, "framework_3a": false, "metodo_4_passos_concer": false, "cisnes_negros": false,
    "10_tonalidades": false, "looping_universal": false, "isolamento_preco": false,
    "cadeira_balanco": false, "skin_in_the_game": false, "assumptive_close": false,
    "alternative_close": false, "avanco_concreto": false, "teste_hipotetico": false,
    "best_worst_case": false, "risco_reverso": false, "ancoragem_preco": false, "takeaway": false,
    "micro_commitments": false, "nomeou_conceito_permissao": false, "frase_ancora_ancorada": false,
    "caso_real_citado": false
  },
  "tonalidades_detectadas": ["Eu me importo", "Certeza Absoluta"],
  "armadilha_cometida": null OU nome,
  "xp_bonus_tecnicas": 0,
  "lead_ceder_camada": false,
  "lead_endurecer": false,
  "pode_fechar": false
}

Regra especial: marque "tecnicas_aplicadas" com TRUE SÓ se tiver evidência clara no texto do Ramon. Não invente.`;
  }

  function buildEvaluatorUserPrompt({ scenario, conversation, lastRamon, turn, passosCumpridosAnteriormente }) {
    return `CONTEXTO DA SESSÃO (turno ${turn}) — Arena 2, sub-modo ${scenario.submodo}.

Persona:
- Nome: ${scenario.persona.nome} (${scenario.persona.idade}, ${scenario.persona.profissao})
- Padrão oculto Teoria da Permissão: ${scenario.padrao_oculto_teoria_permissao}
- Objeção superficial: ${scenario.objecao_superficial}
- Objeção real (oculta pro Ramon, visível pra você): ${scenario.objecao_real}
- Técnicas ideais neste cenário: ${(scenario.tecnicas_ideais_aqui || []).join(', ')}

Passos do Caminho JÁ cumpridos anteriormente na sessão: ${JSON.stringify(passosCumpridosAnteriormente || [])}

Conversa até aqui:
${conversation.map(m => `[${m.role === 'user' ? 'RAMON' : 'LEAD'}]: ${m.content}`).join('\n')}

RESPOSTA DO RAMON A SER AVALIADA AGORA (turno ${turn}):
"${lastRamon}"

Avalie com rigor. Identifique qual passo do Caminho o Ramon executou neste turno. Marque técnicas com honestidade.`;
  }

  async function evaluateTurn({ scenario, conversation, lastRamon, turn, data, passosCumpridosAnteriormente }) {
    const system = buildEvaluatorSystem({ data });
    const user = buildEvaluatorUserPrompt({ scenario, conversation, lastRamon, turn, passosCumpridosAnteriormente });
    const { text } = await ClaudeAPI.call({
      system, messages: [{ role: 'user', content: user }],
      max_tokens: 1100, temperature: 0.3
    });
    const parsed = ClaudeAPI.extractJSON(text);
    if (!parsed) throw new Error('Avaliação inválida');

    // Recalcular xp_bonus_tecnicas se não veio
    if (!parsed.xp_bonus_tecnicas) {
      let sum = 0;
      Gamification.TECHNIQUES.forEach(t => {
        if (parsed.tecnicas_aplicadas && parsed.tecnicas_aplicadas[t.id]) sum += t.xp;
      });
      parsed.xp_bonus_tecnicas = sum;
    }
    return parsed;
  }

  // ========= DICA INLINE PÓS-FALA DO LEAD =========
  async function leadHint({ scenario, leadMessage, conversation, turn, data }) {
    const system = `Você é coach L99 do Dojô Improvável (Arena 2 — chamada pós-evento).

Sua função nesta chamada: ler UMA fala recém-chegada do LEAD e produzir uma dica rápida pro Ramon — o que está em jogo e que caminhos técnicos existem. Spoiler opcional.

Regras:
- Cirúrgico, curto, sem prosa motivacional
- Nomes REAIS das técnicas do compêndio (Mirror, Label, Looping Universal, 3 Dez, Implicação, Necessidade de Solução, Cadeira de Balanço, Isolamento, Pre-handling, Assumptive Close, Avanço, Teste Hipotético, etc.)
- Nomeie conceitos da Teoria da Permissão (Permissão, PDA, Pré-Queda, Mula de Carga, Culpa da Sobrevivência, etc.)
- Máximo 3 técnicas sugeridas, cada uma com 1 frase de motivo
- Identifique em qual passo do Caminho (1-18) a conversa está agora

Responda JSON estrito:
{
  "possivel_objecao": "descrição em 1 frase",
  "categoria": "dinheiro | tempo | confianca | autoconhecimento | familia | decisao | duvida_produto",
  "camada_revelada": "superficial | intermediaria | profunda",
  "conceito_permissao_em_jogo": "nome OU null",
  "passo_do_caminho_sugerido": N (qual passo 1-18 o Ramon deveria estar executando agora),
  "tecnicas_sugeridas": [
    { "nome": "...", "porque": "..." }
  ],
  "o_que_observar": "1 frase do que fica claro na fala do lead"
}`;

    const user = `Persona: ${scenario.persona.nome}, padrão: ${scenario.padrao_oculto_teoria_permissao}.
Objeção superficial: ${scenario.objecao_superficial}
Objeção real: ${scenario.objecao_real}

Últimas trocas:
${conversation.slice(-4).map(m => `[${m.role === 'user' ? 'RAMON' : 'LEAD'}]: ${m.content}`).join('\n')}

FALA RECÉM-CHEGADA DO LEAD (turno ${turn}):
"${leadMessage}"

Devolva o JSON.`;

    try {
      const { text } = await ClaudeAPI.call({
        system, messages: [{ role: 'user', content: user }],
        max_tokens: 450, temperature: 0.4
      });
      return ClaudeAPI.extractJSON(text);
    } catch (err) {
      console.warn('leadHint falhou:', err);
      return null;
    }
  }

  // ========= RESPOSTA DO LEAD =========
  async function leadResponse({ scenario, conversation, data, leadCederCamada, leadEndurecer, podeFechar }) {
    const leadSystem = Scenarios.buildLeadSystemPrompt({ scenario, data });
    let cue = '';
    if (podeFechar) cue = '[CUE INTERNO] Ramon conduziu bem (3 Dez aplicados + técnica de fechamento). Você pode ceder agora: 2-3 frases aceitando.';
    else if (leadEndurecer) cue = '[CUE INTERNO] Ramon caiu em armadilha. Responda SECO, fechado. 1-2 frases.';
    else if (leadCederCamada) cue = '[CUE INTERNO] Ramon aplicou técnica precisa. Ceda UMA camada — revele algo mais próximo da objeção real, mas não entregue tudo. 2-3 frases.';

    const msgs = conversation.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
    if (cue) msgs.push({ role: 'user', content: `(Sistema) ${cue}\n\nAgora responda à última fala do Ramon em 1-3 frases, como a persona.` });

    const { text } = await ClaudeAPI.call({
      system: leadSystem, messages: msgs,
      max_tokens: 400, temperature: 0.95
    });
    return (text || '').trim();
  }

  // ========= RELATÓRIO FINAL =========
  async function finalReport({ scenario, conversation, turnFeedbacks, passosCumpridos, data }) {
    const n = turnFeedbacks.length;
    if (n === 0) return { nota_final: 0, frase_caderno: '' };

    const avg = (k) => turnFeedbacks.reduce((a, f) => a + (f.notas?.[k] || 0), 0) / n;
    const notas = {
      escuta: avg('escuta'),
      investigacao: avg('investigacao'),
      apresentacao: avg('apresentacao'),
      fechamento: avg('fechamento'),
      fidelidade: avg('fidelidade')
    };
    const nota_final = (notas.escuta * 0.2 + notas.investigacao * 0.2 + notas.apresentacao * 0.2 + notas.fechamento * 0.25 + notas.fidelidade * 0.15);

    const tecAcc = {};
    turnFeedbacks.forEach(f => {
      const t = f.tecnicas_aplicadas || {};
      Object.keys(t).forEach(k => { if (t[k]) tecAcc[k] = (tecAcc[k] || 0) + 1; });
    });

    const caminhoTotal = (data.caminho_18_passos?.passos || []).length || 18;
    const coberturaPct = Math.round((passosCumpridos.length / caminhoTotal) * 100);

    const system = `Você é coach sênior da Aliança Divergente. Emita UMA frase cirúrgica pro caderno do Ramon — voz mesa de jantar, 10-22 palavras, sem clichê, baseada no que a sessão revelou.`;
    const user = `Persona: ${scenario.persona.nome}, ${scenario.padrao_oculto_teoria_permissao}.
Sub-modo: ${scenario.submodo}
Passos do Caminho cumpridos: ${JSON.stringify(passosCumpridos)} (${coberturaPct}% de cobertura)
Notas médias: ${JSON.stringify(notas)}
Nota final: ${nota_final.toFixed(2)}
Últimos ajustes: ${turnFeedbacks.slice(-2).map(f => f.ajuste).filter(Boolean).join(' | ')}

Devolva: {"frase_caderno": "..."}`;

    let frase = '';
    try {
      const { text } = await ClaudeAPI.call({ system, messages: [{ role: 'user', content: user }], max_tokens: 150, temperature: 0.7 });
      const p = ClaudeAPI.extractJSON(text);
      frase = p?.frase_caderno || 'Perceber sem decidir é se iludir.';
    } catch (_) {
      frase = 'Perceber sem decidir é se iludir.';
    }

    return {
      nota_final,
      notas,
      tecnicas_acumuladas: tecAcc,
      passos_cumpridos: passosCumpridos,
      cobertura_pct: coberturaPct,
      frase_caderno: frase
    };
  }

  return { evaluateTurn, leadHint, leadResponse, finalReport };
})();
