// scenarios.js v2 — geração de cenários e prompt do lead para Arena 2

const Scenarios = (() => {

  const KEY_HASHES = 'dojo:ramon:scenario_hashes_v2';

  function getUsedHashes() {
    try { return JSON.parse(localStorage.getItem(KEY_HASHES) || '[]'); }
    catch (_) { return []; }
  }
  function pushHash(h) {
    const all = getUsedHashes();
    all.unshift(h);
    if (all.length > 50) all.length = 50;
    localStorage.setItem(KEY_HASHES, JSON.stringify(all));
  }

  // ========= SUB-MODOS DA ARENA 2 =========
  const SUB_MODOS = {
    caminho_completo: {
      nome: 'Caminho Completo',
      descricao: 'Sessão longa e realista, do "oi" ao fechamento. Lead aquecido de evento, ~15-20 turnos.',
      icone: '🎯',
      passos_alvo: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      fase_inicial: 'abertura',
      estado_inicial_lead: 'aquecido, curioso, com dor fresca do evento',
      tempo_estimado_min: 25
    },
    duvidas: {
      nome: 'Modo Dúvidas',
      descricao: 'Lead curioso perguntando sobre pilares, preço, duração, método. Foco em investigação e apresentação.',
      icone: '❓',
      passos_alvo: [4, 5, 6, 7, 8, 9, 10],
      fase_inicial: 'investigacao',
      estado_inicial_lead: 'curioso, cheio de perguntas específicas sobre o programa',
      tempo_estimado_min: 15
    },
    quebra: {
      nome: 'Modo Quebra de Objeção',
      descricao: 'Lead chega JÁ com objeção declarada ("tá caro" / "vou pensar" / "esposa" / "não é pra mim"). Pratica Looping + Isolamento + Close.',
      icone: '🛡️',
      passos_alvo: [12, 13, 14, 15, 16, 18],
      fase_inicial: 'fechamento',
      estado_inicial_lead: 'defensivo, com objeção pronta na ponta da língua',
      tempo_estimado_min: 12
    },
    fechamento: {
      nome: 'Modo Fechamento',
      descricao: 'Lead já aceitou a lógica, trava só no último passo (medo, 3º elemento). Pratica 3 Tons + Close + Avanço.',
      icone: '🔒',
      passos_alvo: [11, 12, 16, 17, 18],
      fase_inicial: 'fechamento',
      estado_inicial_lead: 'quase convencido, mas travado no medo de agir',
      tempo_estimado_min: 10
    }
  };

  // ========= PROMPT DO GERADOR =========
  function buildGeneratorPrompt({ submodo, data, tierLevels }) {
    const mode = SUB_MODOS[submodo] || SUB_MODOS.caminho_completo;
    const hashes = getUsedHashes();

    const personasCompact = (data.persona_improvavel?.arquetipos || []).map(p => ({
      id: p.id,
      nome: p.nome_sugerido,
      idade: p.idade_range,
      genero: p.genero,
      profissao: p.profissao,
      objecao_superficial: p.objecao_superficial_tipica,
      objecao_real: p.objecao_real,
      padrao: p.padrao_oculto,
      gatilho: p.gatilho_contato_tipico,
      linguagem: p.linguagem,
      ja_tentou: p.ja_tentou,
      caso_real: p.caso_real_inspiracao
    }));

    const objecoesCompact = (data.objecoes_scripts?.objecoes || []).map(o => ({
      id: o.id,
      categoria: o.categoria,
      manifestacoes: o.manifestacoes,
      objecao_real: o.objecao_real_permissao
    }));

    const dificuldade = tierLevels?.fundacao?.level >= 30 ? 'dificil' :
                        tierLevels?.fundacao?.level >= 15 ? 'medio' : 'facil';

    return `Gere UM cenário único para Arena 2 do Dojô Improvável — Chamada 1×1 Pós-Evento.

SUB-MODO: ${mode.nome} — ${mode.descricao}
ESTADO INICIAL DO LEAD: ${mode.estado_inicial_lead}
FASE INICIAL DA CONVERSA: ${mode.fase_inicial}
NÍVEL DO ALUNO (dificuldade): ${dificuldade}

CANAL: Chamada de voz Zoom ou telefone — lead atendeu a chamada do Ramon depois de evento/live da Aliança Divergente.

ARQUÉTIPOS DISPONÍVEIS (recombine, não copie literal):
${JSON.stringify(personasCompact, null, 2)}

OBJEÇÕES CLÁSSICAS (escolha uma de acordo com o sub-modo):
${JSON.stringify(objecoesCompact, null, 2)}

HASHES JÁ USADAS (NÃO repetir combinação nome+padrão):
${JSON.stringify(hashes)}

REGRAS:
- Recombine: escolha arquétipo, misture contexto familiar, gatilho e nível de resistência.
- Objeção superficial ≠ objeção real. A real fica oculta — só revela quando Ramon cava com técnica.
- Nomeie o padrão da Teoria da Permissão (Culpa da Sobrevivência, Medo do Brilho, Mula de Carga, Ciclo do Quase, Pré-Queda, Plano Perfeito, Obesidade Intelectual, etc).
- "primeira_mensagem_lead" = a PRIMEIRA frase do lead depois do Ramon cumprimentar. No Modo Quebra/Fechamento ela já vem com objeção declarada. No Modo Dúvidas, vem com pergunta específica sobre o programa. No Caminho Completo, vem aberta/acolhedora.
- Dificuldade: ${dificuldade}. Se fácil, lead coopera. Se médio, lead é cauteloso. Se difícil, lead é seco ou hostil.

SAÍDA: JSON estrito, sem markdown.
{
  "persona": {
    "nome": "...",
    "idade": N,
    "genero": "masculino" | "feminino",
    "profissao": "...",
    "cidade": "...",
    "estrutura_familiar": "...",
    "situacao_atual": "...",
    "ja_tentou": ["...", "..."],
    "caso_real_inspiracao": "ID ou nome do caso (Daniela, Regiane, Vanilton, Ícaro...)"
  },
  "evento_origem": "descrição curta do evento/live de onde veio",
  "gatilho_contato": "o que fez ela atender a chamada AGORA",
  "primeira_mensagem_lead": "a primeira fala do lead, 1-3 frases, tom condizente com o sub-modo",
  "objecao_superficial": "...",
  "objecao_real": "... (oculta pro Ramon)",
  "padrao_oculto_teoria_permissao": "nome do padrão",
  "tecnicas_ideais_aqui": ["Pergunta de Implicação", "Cadeira de Balanço", "Looping Universal"],
  "conceitos_ideais_aqui": ["Culpa da Sobrevivência", "Pré-Queda"],
  "dificuldade": "${dificuldade}",
  "submodo": "${submodo}",
  "hash": "string-unica"
}`;
  }

  async function generate({ submodo, data, tierLevels }) {
    const system = 'Você gera cenários para treino de vendas consultivas da Aliança Divergente. Responda SEMPRE em JSON estrito sem markdown.';
    const prompt = buildGeneratorPrompt({ submodo, data, tierLevels });
    const { text } = await ClaudeAPI.call({
      system, messages: [{ role: 'user', content: prompt }],
      max_tokens: 900, temperature: 0.95
    });
    const parsed = ClaudeAPI.extractJSON(text);
    if (!parsed) throw new Error('Cenário inválido');
    if (parsed.hash) pushHash(parsed.hash);
    parsed._submodo_config = SUB_MODOS[submodo] || SUB_MODOS.caminho_completo;
    return parsed;
  }

  // ========= PROMPT DO LEAD =========
  function buildLeadSystemPrompt({ scenario, data }) {
    const mentirasGerais = data.persona_improvavel?.mentiras_funcionais_recorrentes || [];

    return `Você é ${scenario.persona.nome}, ${scenario.persona.idade} anos, ${scenario.persona.profissao}, de ${scenario.persona.cidade}.

Estrutura familiar: ${scenario.persona.estrutura_familiar}
Situação atual: ${scenario.persona.situacao_atual}
Já tentou: ${(scenario.persona.ja_tentou || []).join(', ')}

Você está numa CHAMADA DE VOZ com Ramon, co-líder da Aliança Divergente (150 mil alunos). Você veio do evento: ${scenario.evento_origem}.
Gatilho pra atender AGORA: ${scenario.gatilho_contato}

OBJEÇÃO SUPERFICIAL (o que você diz de cara): "${scenario.objecao_superficial}"
OBJEÇÃO REAL (o que NÃO revela de graça): "${scenario.objecao_real}"
PADRÃO OCULTO: ${scenario.padrao_oculto_teoria_permissao}

MENTIRAS FUNCIONAIS que você pode usar pra se proteger: ${JSON.stringify(mentirasGerais.slice(0, 8))}

REGRAS DE RESPOSTA:
- SEMPRE em personagem, nunca saia
- Linguagem real brasileira, de gente que atende chamada — não auto-descritiva ("me sinto ansioso") mas crua ("tô meio travado")
- 2-4 frases por resposta, MÁXIMO
- Desconfia: a indústria do caô te machucou
- Camadas: superficial primeiro. Real só se Ramon cavar com técnica precisa

GATILHOS DE ENDURECIMENTO (responda SECO):
- Clichê motivacional ("você é capaz", "acredite", "descubra seu potencial")
- Religiosidade indevida ("tempo de Deus" fora de contexto, "se Deus quiser")
- Lei da atração, vibração, abundância
- Oferecer desconto ou parcelamento como quebra
- Urgência artificial (escassez falsa)
- Promessa de enriquecimento rápido (10k/mês, luxo)
- Atacar diretamente sua família
- Ramon responder à sua objeção DIRETAMENTE (sem Looping)

GATILHOS DE CEDER UMA CAMADA (revelar algo mais real):
- Mirror preciso (repetiu 2-3 últimas palavras com tom de pergunta)
- Label certeiro ("parece que...", "soa como...")
- Looping Universal ("a ideia faz sentido pra você?")
- Isolamento ("tirando o investimento, faz sentido?")
- Teste Hipotético ("num mundo onde dinheiro não fosse o tema...")
- Cadeira de Balanço ("daqui a 6 meses, se nada mudar...")
- Nomeou POR NOME o padrão correto (Culpa da Sobrevivência / Medo do Brilho / Mula de Carga / etc.)
- Pergunta de Implicação bem feita
- Pergunta de Necessidade de Solução
- Silêncio estratégico explícito [silêncio Ns]

GATILHO DE FECHAMENTO:
- Ramon já aplicou 3 Dez na ordem (Produto → Você → Aliança)
- Ramon já usou Looping pelo menos 1×
- Ramon fez pergunta de fechamento clara (Assumptive ou Alternative Close)
- Todas camadas foram quebradas
Aí você pode ceder: "Tá, faz sentido. Me manda o link" ou "bora, que e-mail você quer?"

Responda APENAS com sua fala, como a pessoa — sem narração, sem aspas em volta, sem descrever ações entre asteriscos. É uma chamada de voz transcrita.`;
  }

  return { generate, buildLeadSystemPrompt, SUB_MODOS };
})();
