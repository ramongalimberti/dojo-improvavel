// scenarios.js — gerador dinâmico de cenários (persona + objeção + técnicas ideais)
// + prompt do lead para o role-play

const Scenarios = (() => {

  const KEY_HASHES = 'dojo:ramon:scenario_hashes';

  function getUsedHashes() {
    const s = localStorage.getItem(KEY_HASHES);
    return s ? JSON.parse(s) : [];
  }
  function pushHash(h) {
    const all = getUsedHashes();
    all.unshift(h);
    if (all.length > 50) all.length = 50;
    localStorage.setItem(KEY_HASHES, JSON.stringify(all));
  }

  // ========= PROMPT DO GERADOR =========
  function buildGeneratorPrompt({ level, dojo, data }) {
    const hashes = getUsedHashes();
    const canalMap = {
      'DM_1_1': 'WhatsApp DM após live/CPL (linguagem de mensagem, áudios ocasionais)',
      'AO_VIVO': 'Pergunta ao vivo em Q&A (fala solta, interrupções, emoção na voz)',
      'LIVE': 'Chat da live/webinar (frases curtas, urgência, muita gente vendo)'
    };

    const personasCompact = (data.personas?.arquetipos || []).map(p => ({
      id: p.id,
      nome: p.nome_sugerido,
      idade: p.idade_range,
      profissao: p.profissao,
      objecao_superficial: p.objecao_superficial_tipica,
      objecao_real: p.objecao_real,
      padrao: p.padrao_oculto,
      gatilho: p.gatilho_contato_tipico,
      linguagem: p.linguagem,
      ja_tentou: p.ja_tentou
    }));

    const objecoesCompact = (data.objecoes?.categorias || []).map(c => ({
      categoria: c.categoria,
      manifestacoes: c.manifestacoes_superficiais,
      real: c.objecao_real,
      mentiras_funcionais: c.mentiras_funcionais_recorrentes || []
    }));

    return `Gere UM cenário único para o Dojô Improvável.

NÍVEL DO ALUNO: ${level}
DOJÔ: ${dojo} — ${canalMap[dojo] || ''}

Base de arquétipos disponíveis (recombine, não copie literal):
${JSON.stringify(personasCompact, null, 2)}

Categorias de objeções (escolha uma "mentira funcional" como cortina de fumaça):
${JSON.stringify(objecoesCompact, null, 2)}

HASHES JÁ USADAS (NÃO repetir nome+padrão+profissão combinados):
${JSON.stringify(hashes)}

Regras:
- Recombine: escolha um arquétipo, misture contexto familiar, gatilho e nível de resistência de outro.
- A objeção superficial (o que o lead DIZ primeiro) deve ser diferente da objeção real (que fica oculta).
- Identifique o padrão real da Teoria da Permissão (Pré-Queda, Mula de Carga, Banheiro Emocional, Medo do Brilho, Culpa da Sobrevivência, Plano Perfeito, etc.).
- "primeira_mensagem" deve soar como mensagem REAL do canal (${canalMap[dojo]}). 1-3 frases. Nada artificial.
- Ajuste a dificuldade ao nível L${level}: L1-L10 fáceis, L11-L30 médios, L31-L60 difíceis, L61+ hostis.

SAÍDA: JSON estrito sem markdown nem fences.
{
  "persona": {
    "nome": "...",
    "idade": N,
    "profissao": "...",
    "cidade": "...",
    "situacao_financeira": "...",
    "estrutura_familiar": "...",
    "ja_tentou": ["...", "..."]
  },
  "gatilho_contato": "o que fez ela mandar mensagem AGORA",
  "primeira_mensagem": "texto real 1-3 frases, linguagem do canal",
  "objecao_superficial": "...",
  "objecao_real": "... (oculta pro Ramon, visível pro avaliador)",
  "padrao_oculto": "nome do padrão Teoria da Permissão",
  "tecnicas_do_playbook_ideais_aqui": ["Isolamento Concer", "Teste Hipotético"],
  "nivel_dificuldade": "facil | medio | dificil | hostil",
  "hash": "string-unica-nome-padrao-profissao"
}`;
  }

  async function generate({ level, dojo, data }) {
    const system = 'Você é um gerador de cenários de role-play para treino de vendas consultivas no mercado brasileiro high-ticket. Responda SEMPRE em JSON estrito, sem markdown.';
    const prompt = buildGeneratorPrompt({ level, dojo, data });
    const { text } = await ClaudeAPI.call({
      system,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.95
    });
    const parsed = ClaudeAPI.extractJSON(text);
    if (!parsed) throw new Error('Cenário inválido, resposta não era JSON');
    if (parsed.hash) pushHash(parsed.hash);
    return parsed;
  }

  // ========= PROMPT DO LEAD (role-play) =========
  function buildLeadSystemPrompt({ scenario, dojo, data }) {
    const canalMap = {
      'DM_1_1': 'WhatsApp, mensagem direta após uma live do Ramon. Frases curtas, às vezes áudio transcrito.',
      'AO_VIVO': 'Pergunta ao vivo no Q&A. Voz trêmula quando toca a dor. Emocionalmente ativo.',
      'LIVE': 'Chat rápido da live/webinar. Frases curtas, urgência, muita gente vendo — fala mais guardado.'
    };

    const mentirasGerais = (data.objecoes?.categorias || [])
      .flatMap(c => c.mentiras_funcionais_recorrentes || [])
      .slice(0, 20);

    return `Você é ${scenario.persona.nome}, ${scenario.persona.idade} anos, ${scenario.persona.profissao}, de ${scenario.persona.cidade}.

Situação: ${scenario.persona.situacao_financeira}. Família: ${scenario.persona.estrutura_familiar}.
Já tentou: ${(scenario.persona.ja_tentou || []).join(', ')}.

Gatilho que te fez mandar mensagem AGORA: ${scenario.gatilho_contato}.

Canal: ${canalMap[dojo] || dojo}.

OBJEÇÃO SUPERFICIAL (o que você diz de cara): "${scenario.objecao_superficial}"
OBJEÇÃO REAL (o que você NÃO revela de graça — só cede quando Ramon cava com técnica): "${scenario.objecao_real}"
PADRÃO OCULTO (Teoria da Permissão): ${scenario.padrao_oculto}

MENTIRAS FUNCIONAIS que você pode usar pra se proteger: ${JSON.stringify(mentirasGerais.slice(0, 8))}

Você está conversando com Ramon, mentor da Aliança Divergente.

REGRAS DE RESPOSTA:
- SEMPRE em personagem, nunca saia
- Linguagem real brasileira, como gente de verdade fala — NÃO auto-descritiva ("sinto insegurança"), mas crua ("tô meio travado")
- 2-4 frases por resposta, MÁXIMO
- A indústria do caô te machucou — você desconfia, não cede fácil
- Camadas: objeção superficial primeiro. A REAL só aparece se Ramon cavar com técnica precisa.

GATILHOS DE ENDURECIMENTO (responder SECO, fechado, quase desligando):
- Ramon usar clichê motivacional ("você é capaz", "acredite no seu potencial")
- Ramon usar religiosidade indevida ("se Deus quiser", "tempo de Deus")
- Ramon oferecer desconto ou parcelamento como quebra
- Ramon falar em lei da atração, vibração, abundância
- Ramon fazer urgência artificial ("última vaga", "só até hoje")
- Ramon atacar sua família diretamente
- Ramon prometer enriquecimento rápido, 10k/mês, luxo

GATILHOS DE CEDER UMA CAMADA (revelar algo mais real sobre sua dor):
- Ramon aplicou Mirror (repetiu suas últimas palavras com tom de pergunta)
- Ramon aplicou Label (rotulou sua emoção sem julgar, ex: "parece que isso te esgota")
- Ramon nomeou o Padrão correto POR NOME (Pré-Queda, Mula de Carga, Culpa da Sobrevivência, etc.)
- Ramon fez Pergunta de Isolamento ("além disso, tem mais algum motivo?")
- Ramon usou Teste Hipotético ("num mundo onde dinheiro não fosse o tema, você faria?")
- Ramon usou Silêncio estratégico (explícito no texto como [silêncio 3s])

GATILHO DE FECHAMENTO:
- Ramon chegou ao 5º turno ou além
- Todas as camadas foram quebradas com técnica
- Ramon fez uma pergunta de fechamento CLARA (Dupla Alternativa ou Alinhamento Lógico)
- E só então você pode dizer algo como "tá, faz sentido, como faço pra entrar"

Responda AGORA apenas com a sua fala, como a pessoa. Sem narração, sem aspas em volta.`;
  }

  return { generate, buildLeadSystemPrompt };
})();
