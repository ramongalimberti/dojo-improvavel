// gamification.js — XP, níveis, streak, conquistas, técnicas dominadas, desafios diários

const Gamification = (() => {

  // ========= STORAGE KEYS =========
  const K = {
    profile: 'dojo:ramon:profile',
    skills: 'dojo:ramon:skills',
    sessions: 'dojo:ramon:sessions',
    achievements: 'dojo:ramon:achievements',
    daily: 'dojo:ramon:daily_challenge',
    personasUsed: 'dojo:ramon:personas_usadas',
    techniques: 'dojo:ramon:tecnicas_dominadas'
  };

  // ========= DEFAULTS =========
  function defaultProfile() {
    return {
      name: 'Ramon',
      level: 1,
      xp: 0,
      xp_total_acumulado: 0,
      streak: 0,
      last_session_date: null,
      created_at: new Date().toISOString()
    };
  }

  function defaultSkills() {
    return {
      escuta: 0,        // Escuta Ativa
      objecao: 0,       // Quebra de Objeção
      dor: 0,           // Ativação de Dor
      conducao: 0,      // Condução ao Fechamento
      fidelidade: 0     // Fidelidade à Metodologia
    };
  }

  function defaultAchievements() {
    return ACHIEVEMENTS.reduce((acc, a) => { acc[a.id] = false; return acc; }, {});
  }

  function defaultTechniques() {
    return TECHNIQUES.reduce((acc, t) => { acc[t.id] = 0; return acc; }, {});
  }

  // ========= TECHNIQUES (15 bonificadas) =========
  const TECHNIQUES = [
    { id: 'mirror', name: 'Mirror (3 últimas palavras)', xp: 10 },
    { id: 'label', name: 'Label (rotular emoção)', xp: 10 },
    { id: 'isolamento_concer', name: 'Isolamento Concer', xp: 15 },
    { id: 'teste_hipotetico', name: 'Teste Hipotético Hormozi', xp: 15 },
    { id: 'dinheiro_vs_tempo', name: 'Pagar com dinheiro vs com tempo', xp: 15 },
    { id: 'silencio_estrategico', name: 'Silêncio estratégico [silêncio 3s]', xp: 10 },
    { id: 'nomeou_conceito_permissao', name: 'Nomeou conceito Teoria da Permissão', xp: 15 },
    { id: 'frase_ancora_ancorada', name: 'Frase-âncora com contexto real', xp: 10 },
    { id: 'alinhamento_logico', name: 'Alinhamento Lógico (3 perguntas)', xp: 20 },
    { id: 'dupla_alternativa', name: 'Dupla Alternativa', xp: 10 },
    { id: 'inversao_papeis', name: 'Inversão de papéis', xp: 15 },
    { id: 'cadeira_balanco', name: 'Cadeira de Balanço', xp: 15 },
    { id: 'ciclo_quase_devolvido', name: 'Ciclo do Quase devolvido', xp: 15 },
    { id: 'risco_reverso', name: 'Risco Reverso', xp: 15 },
    { id: 'fechou_dificil', name: 'Fechou lead Difícil/Hostil', xp: 50 }
  ];

  // ========= GUIAS DAS TÉCNICAS (explicação + exemplo curto) =========
  const TECHNIQUE_GUIDES = {
    mirror: {
      origem: 'Chris Voss — Never Split the Difference',
      resumo: 'Repetir as 2-3 últimas palavras do lead como pergunta, com entonação subindo no fim. Faz ele elaborar sozinho, sem pressão.',
      quando: 'Logo depois que o lead revela algo emocional ou ambíguo. Abre camada sem forçar.',
      exemplo: 'Lead: "Não consigo sair do lugar."\nRamon: "Não consegue sair do lugar?" [pausa]',
      aliases: ['mirror', 'espelho', 'espelhar', 'espelhamento', 'mirror voss']
    },
    label: {
      origem: 'Chris Voss — Tactical Empathy',
      resumo: 'Nomear a emoção que você percebe, sem julgar. Começa com "parece que…" ou "soa como…". Valida sem concordar.',
      quando: 'Quando o lead está tenso, envergonhado ou defensivo. Label desarma.',
      exemplo: '"Parece que isso já virou parte da sua rotina — uma exaustão que você nem questiona mais."',
      aliases: ['label', 'rotular', 'rotulação', 'nomear emoção', 'labeling']
    },
    isolamento_concer: {
      origem: 'Thiago Concer — 4 Passos (passo 3)',
      resumo: 'Pergunta de ISOLAMENTO: separa a objeção declarada das outras ocultas. Se o lead não tiver mais objeção, você quebra a única que ele declarou.',
      quando: 'Sempre que o lead apresentar UMA objeção — antes de responder, pergunte se é SÓ aquilo.',
      exemplo: '"Entendi. Só pra eu entender: ALÉM do valor, tem mais algum motivo ou alguma coisa que não faz sentido pra você?"',
      aliases: ['isolamento', 'isolamento concer', 'pergunta de isolamento', '4 passos concer', 'concer', 'quatro passos']
    },
    teste_hipotetico: {
      origem: 'Alex Hormozi — $100M Offers',
      resumo: 'Remova mentalmente a objeção declarada pra ver se há outra por trás. Se o lead continuar travado, a objeção real é outra.',
      quando: 'Contra "tá caro", "não tenho tempo", "não é o momento" — pra validar se é a objeção real.',
      exemplo: '"Num mundo hipotético onde dinheiro não fosse o tema — você entraria hoje?"',
      aliases: ['hipotético', 'teste hipotético', 'hormozi', 'mundo hipotético']
    },
    dinheiro_vs_tempo: {
      origem: 'Playbook Live — tradução Permissão',
      resumo: 'Mostre que recusar não é "economia" — é pagar com outra moeda. O custo da inação é tempo, vida, padrão que continua.',
      quando: 'Contra "tá caro" quando o lead já tem o dinheiro, mas trava em se dar permissão.',
      exemplo: '"Você não tá escolhendo entre pagar ou não pagar. Tá escolhendo entre pagar com dinheiro agora ou pagar com mais 3 anos da sua vida igual a hoje."',
      aliases: ['dinheiro vs tempo', 'custo de inação', 'pagar com tempo', 'pagar com dinheiro']
    },
    silencio_estrategico: {
      origem: 'Straight Line + Voss',
      resumo: 'Depois da pergunta-chave ou do preço, você CALA. 3 a 10 segundos. O silêncio empurra o lead a responder o que importa. No texto, marque explícito: [silêncio 5s].',
      quando: 'Depois de preço, de pergunta de fechamento, ou depois de nomear um padrão pesado.',
      exemplo: '"Faz sentido pra você? [silêncio 5s]"',
      aliases: ['silêncio', 'silencio', 'silencio estrategico', 'pausa', 'pausa estratégica']
    },
    nomeou_conceito_permissao: {
      origem: 'Teoria da Permissão (Ramon)',
      resumo: 'Dar NOME ao padrão do lead: Pré-Queda, Mula de Carga, Culpa da Sobrevivência, Banheiro Emocional, Medo do Brilho, PDA, Plano Perfeito. Nomear vira lucidez.',
      quando: 'Depois que você escutou o padrão se repetindo. Não use como etiqueta de palco — use como diagnóstico.',
      exemplo: '"Isso que você tá descrevendo chama Mula de Carga. Você virou represa da sua família — todo problema chega e para em você."',
      aliases: ['nomear conceito', 'nomear padrão', 'conceito permissão', 'teoria da permissão', 'padrão oculto']
    },
    frase_ancora_ancorada: {
      origem: 'Teoria da Permissão',
      resumo: 'Frase cirúrgica ancorada no contexto ESPECÍFICO do lead. Nada de citação gratuita — é martelada no exato momento em que ele percebe a contradição.',
      quando: 'Depois do lead confessar algo que confirma o padrão. Selo, não introdução.',
      exemplo: 'Lead acabou de dizer que sabe o que precisa fazer mas não faz. Ramon: "Perceber sem decidir é se iludir."',
      aliases: ['frase âncora', 'frase ancora', 'ancorar', 'ancoragem']
    },
    alinhamento_logico: {
      origem: 'Playbook Live — 5 passos indeciso',
      resumo: 'Três perguntas fechadas em ordem: 1) Se funcionar, RESOLVE? 2) Você CONFIA no método e em mim? 3) Você tem RECURSOS pra investir hoje? Três "sim" desarmam qualquer "vou pensar".',
      quando: 'Pré-fechamento, quando o lead já recebeu a solução e precisa assumir a decisão.',
      exemplo: '"Pergunta 1: se isso funcionar como a gente conversou, resolve o que você me trouxe? [sim] Pergunta 2: você confia em mim e no método? [sim] Pergunta 3: você tem como investir hoje? [sim]. Então o que falta é só a decisão."',
      aliases: ['alinhamento lógico', 'alinhamento logico', '3 perguntas fechadas', 'três perguntas']
    },
    dupla_alternativa: {
      origem: 'Straight Line — Jordan Belfort / Hormozi',
      resumo: 'No fechamento, nunca pergunta "sim ou não". Pergunta "A ou B" — as duas opções já presumem o sim.',
      quando: 'No fechamento, depois do alinhamento lógico.',
      exemplo: '"Você prefere crédito em 12x ou à vista com desconto de tabela?"',
      aliases: ['dupla alternativa', 'alternativa dupla', 'crédito ou à vista', 'a ou b']
    },
    inversao_papeis: {
      origem: 'Playbook Live — 5 passos indeciso',
      resumo: 'Contra "preciso falar com meu cônjuge/sócio". Em vez de aceitar o adiamento, você VIRA pergunta pra ele. Quem decide é ELE, não o outro.',
      quando: '"Vou conversar com minha esposa", "preciso alinhar com meu sócio".',
      exemplo: '"Claro. Me conta: o que exatamente você vai dizer pra ela? Porque a resposta dela depende da conversa que VOCÊ vai liderar. Se você chegar em dúvida, volta dúvida."',
      aliases: ['inversão de papéis', 'inversao de papeis', 'inversão', 'cônjuge', 'falar com sócio']
    },
    cadeira_balanco: {
      origem: 'Playbook Live — contorno de "vou pensar"',
      resumo: 'Nomeia o "vou pensar" como cadeira de balanço — se mexe, faz barulho, mas não sai do lugar. Depois pede o que EXATAMENTE falta decidir.',
      quando: 'Qualquer "vou pensar", "preciso refletir", "me dá uns dias".',
      exemplo: '"\'Vou pensar\' é cadeira de balanço — se mexe, parece que tá fazendo algo, mas não sai do lugar. Me diz: o que EXATAMENTE você precisa decidir que já não decidiu aqui?"',
      aliases: ['cadeira de balanço', 'cadeira balanço', 'vou pensar', 'pensar']
    },
    ciclo_quase_devolvido: {
      origem: 'Teoria da Permissão — Pré-Queda',
      resumo: 'Espelha a repetição do "quase" na vida do lead. Pergunta quanto tempo ele tá quase lá. Expõe o padrão sem acusar.',
      quando: 'Lead descreve 2+ situações onde "quase" aconteceu algo bom e desmoronou.',
      exemplo: '"Há quantos anos você tá quase lá? Porque cada vez que você conta, tem a palavra \'quase\' no meio."',
      aliases: ['ciclo do quase', 'quase', 'ciclo quase', 'devolvido']
    },
    risco_reverso: {
      origem: 'Hormozi / Brunson',
      resumo: 'Você assume parte do risco — inverte a assimetria. Mas amarrado em condição de aplicação, não em promessa de resultado.',
      quando: 'No fechamento, contra descrença ("já tentei tudo, nada funciona").',
      exemplo: '"Se em 30 dias você aplicar o protocolo e não sentir shift real, eu devolvo. Mas o trato é: só entra quem vai aplicar — não quem vai assistir."',
      aliases: ['risco reverso', 'garantia', 'garantia reversa', 'risco invertido']
    },
    fechou_dificil: {
      origem: 'Bônus — não é técnica a aplicar, é resultado',
      resumo: 'Fechar um lead classificado como "difícil" ou "hostil" vale +50 XP bônus automático.',
      quando: '—',
      exemplo: '—',
      aliases: ['fechou difícil', 'fechou hostil', 'fechamento difícil']
    }
  };

  // ========= FUZZY LOOKUP DE GUIA POR NOME (vindo do LLM) =========
  function _norm(s) {
    return (s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[()\[\]{}.,;:!?"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function findTechniqueGuide(rawName) {
    const norm = _norm(rawName);
    if (!norm) return null;

    // Tentativa 1: match direto em id ou nome oficial
    for (const t of TECHNIQUES) {
      if (_norm(t.id) === norm || _norm(t.name) === norm) {
        const g = TECHNIQUE_GUIDES[t.id];
        if (g) return { id: t.id, name: t.name, ...g };
      }
    }
    // Tentativa 2: aliases (substring nos dois lados)
    for (const id of Object.keys(TECHNIQUE_GUIDES)) {
      const g = TECHNIQUE_GUIDES[id];
      const aliases = (g.aliases || []).map(_norm);
      if (aliases.some(a => norm.includes(a) || a.includes(norm))) {
        const t = TECHNIQUES.find(x => x.id === id);
        return { id, name: t ? t.name : id, ...g };
      }
    }
    // Tentativa 3: substring no nome oficial
    for (const t of TECHNIQUES) {
      const n = _norm(t.name);
      if (n.includes(norm) || norm.includes(n.split(' ')[0])) {
        const g = TECHNIQUE_GUIDES[t.id];
        if (g) return { id: t.id, name: t.name, ...g };
      }
    }
    return null;
  }

  // ========= ACHIEVEMENTS =========
  const ACHIEVEMENTS = [
    { id: 'primeira_quebra', icon: '🎯', name: 'Primeira Quebra', desc: 'Quebrou objeção sem baixar preço' },
    { id: 'mestre_mirror', icon: '👂', name: 'Mestre do Mirror', desc: 'Mirror aplicado 20x com Escuta > 8' },
    { id: 'rotulador', icon: '🏷️', name: 'Rotulador', desc: 'Label aplicado 20x com precisão' },
    { id: 'isolador', icon: '🔍', name: 'Isolador', desc: 'Pergunta de Isolamento usada 15x' },
    { id: 'hipotetico', icon: '🎲', name: 'Hipotético', desc: 'Teste Hipotético aplicado 15x' },
    { id: 'dono_silencio', icon: '⏳', name: 'Dono do Silêncio', desc: 'Silêncio estratégico em 10 sessões' },
    { id: 'maratonista', icon: '🔥', name: 'Maratonista', desc: 'Streak de 30 dias' },
    { id: 'fiel_mesa', icon: '🧠', name: 'Fiel à Mesa', desc: '10 sessões sem clichê nem religiosidade' },
    { id: 'fechador_improvavel', icon: '⚔️', name: 'Fechador Improvável', desc: 'Fechou 3 leads hostis' },
    { id: 'espelho_afiado', icon: '🪞', name: 'Espelho Afiado', desc: 'Nomeou padrão correto em 5 sessões seguidas' },
    { id: 'quebra_pedra', icon: '🧱', name: 'Quebra-Pedra', desc: 'Aplicou as 7 quebras validadas ao menos 1x' },
    { id: 'playbook_vivo', icon: '📖', name: 'Playbook Vivo', desc: 'Aplicou os 4 passos de Concer numa única sessão' },
    { id: 'l99', icon: '👑', name: 'L99 Mestre do Dojô', desc: 'Alcançou o Nível 99' }
  ];

  // ========= DESAFIOS DIÁRIOS =========
  const DAILY_CHALLENGES = [
    { id: 'mirror_label_turnos', text: 'Em toda sessão hoje: aplique Mirror + Label nos primeiros 2 turnos.', technique_hint: 'mirror,label' },
    { id: 'hipotetico_1x', text: 'Use o Teste Hipotético Hormozi em pelo menos 1 sessão hoje.', technique_hint: 'teste_hipotetico' },
    { id: 'tacaro_sem_desconto', text: 'Quebre "tá caro" pela tradução Permissão — SEM oferecer desconto.', technique_hint: 'nomeou_conceito_permissao' },
    { id: 'silencio_pos_preco', text: 'Use [silêncio 3s] explícito depois do preço em 1 sessão.', technique_hint: 'silencio_estrategico' },
    { id: 'padrao_antes_3', text: 'Nomeie o Padrão do lead antes do 3º turno.', technique_hint: 'nomeou_conceito_permissao' },
    { id: 'sedeusquiser_sem_fe', text: 'Quebre "se Deus quiser" sem atacar a fé — separe fé de paralisia.', technique_hint: 'nomeou_conceito_permissao' },
    { id: 'protocolo_5_passos', text: 'Aplique o protocolo completo: Label → Mirror → Reframe → PDA → Silêncio.', technique_hint: 'label,mirror,silencio_estrategico' },
    { id: 'isolamento_toda_objecao', text: 'Use a Pergunta de Isolamento (Concer) em TODA objeção que aparecer.', technique_hint: 'isolamento_concer' },
    { id: 'cadeira_balanco_voupensar', text: 'Use Cadeira de Balanço quando aparecer "vou pensar".', technique_hint: 'cadeira_balanco' },
    { id: 'ciclo_quase_devolver', text: 'Devolva o Ciclo do Quase pro lead em 1 sessão.', technique_hint: 'ciclo_quase_devolvido' }
  ];

  // ========= XP & NÍVEIS =========
  // Curva: XP_necessario(n) = 100 + (n-1)*50  — nível 1 começa em 0
  function xpToLevel(level) {
    return 100 + (level - 1) * 50;
  }

  function addXp(amount) {
    const p = getProfile();
    p.xp += amount;
    p.xp_total_acumulado += amount;
    let leveled = false;
    while (p.xp >= xpToLevel(p.level)) {
      p.xp -= xpToLevel(p.level);
      p.level = Math.min(99, p.level + 1);
      leveled = true;
      if (p.level >= 99) break;
    }
    saveProfile(p);
    if (p.level === 99) unlockAchievement('l99');
    return { profile: p, leveled };
  }

  // ========= PROFILE / SKILLS =========
  function getProfile() {
    const s = localStorage.getItem(K.profile);
    return s ? JSON.parse(s) : defaultProfile();
  }
  function saveProfile(p) { localStorage.setItem(K.profile, JSON.stringify(p)); }

  function getSkills() {
    const s = localStorage.getItem(K.skills);
    return s ? JSON.parse(s) : defaultSkills();
  }
  function saveSkills(s) { localStorage.setItem(K.skills, JSON.stringify(s)); }

  // Nota de cada dimensão (0-10) entra pesada pra subir a habilidade (0-100).
  // Movimento suave: skill += (nota*10 - skill) * 0.12
  function updateSkillsFromScores(notas) {
    const s = getSkills();
    const keys = ['escuta', 'objecao', 'dor', 'conducao', 'fidelidade'];
    keys.forEach(k => {
      const target = (notas[k] || 0) * 10;
      s[k] = Math.max(0, Math.min(100, Math.round(s[k] + (target - s[k]) * 0.12)));
    });
    saveSkills(s);
    return s;
  }

  // ========= STREAK =========
  function updateStreak() {
    const p = getProfile();
    const today = new Date().toISOString().slice(0, 10);
    const last = p.last_session_date;
    if (last === today) { return p; }
    if (!last) { p.streak = 1; }
    else {
      const diff = (new Date(today) - new Date(last)) / (1000 * 60 * 60 * 24);
      if (diff === 1) p.streak += 1;
      else if (diff > 1) p.streak = 1;
    }
    p.last_session_date = today;
    saveProfile(p);
    if (p.streak >= 30) unlockAchievement('maratonista');
    return p;
  }

  // ========= SESSIONS =========
  function getSessions() {
    const s = localStorage.getItem(K.sessions);
    return s ? JSON.parse(s) : [];
  }
  function saveSession(session) {
    const all = getSessions();
    all.unshift(session);
    if (all.length > 100) all.length = 100;
    localStorage.setItem(K.sessions, JSON.stringify(all));
  }

  // Média das últimas N sessões de um dojô
  function avgScoreInDojo(dojo, lastN = 10) {
    const sessions = getSessions().filter(s => s.dojo === dojo).slice(0, lastN);
    if (sessions.length < lastN) return { avg: null, count: sessions.length };
    const sum = sessions.reduce((a, s) => a + (s.nota_final || 0), 0);
    return { avg: sum / sessions.length, count: sessions.length };
  }

  function isDojoUnlocked(dojo) {
    if (dojo === 'DM_1_1') return true;
    if (dojo === 'AO_VIVO') {
      const { avg, count } = avgScoreInDojo('DM_1_1', 10);
      return count >= 10 && avg >= 7.0;
    }
    if (dojo === 'LIVE') {
      const { avg, count } = avgScoreInDojo('AO_VIVO', 10);
      return count >= 10 && avg >= 7.5;
    }
    return false;
  }

  // ========= ACHIEVEMENTS =========
  function getAchievements() {
    const s = localStorage.getItem(K.achievements);
    return s ? JSON.parse(s) : defaultAchievements();
  }
  function saveAchievements(a) { localStorage.setItem(K.achievements, JSON.stringify(a)); }

  function unlockAchievement(id) {
    const a = getAchievements();
    if (!a[id]) {
      a[id] = true;
      saveAchievements(a);
      return true;
    }
    return false;
  }

  // ========= TECHNIQUES =========
  function getTechniques() {
    const s = localStorage.getItem(K.techniques);
    return s ? JSON.parse(s) : defaultTechniques();
  }
  function saveTechniques(t) { localStorage.setItem(K.techniques, JSON.stringify(t)); }

  function recordTechniques(applied) {
    const t = getTechniques();
    const hits = [];
    Object.keys(applied).forEach(k => {
      if (applied[k] && t[k] !== undefined) {
        t[k] += 1;
        hits.push(k);
      }
    });
    saveTechniques(t);
    checkTechniqueAchievements(t);
    return hits;
  }

  function checkTechniqueAchievements(t) {
    if (t.mirror >= 20) unlockAchievement('mestre_mirror');
    if (t.label >= 20) unlockAchievement('rotulador');
    if (t.isolamento_concer >= 15) unlockAchievement('isolador');
    if (t.teste_hipotetico >= 15) unlockAchievement('hipotetico');
    if (t.silencio_estrategico >= 10) unlockAchievement('dono_silencio');
    if ((t.fechou_dificil || 0) >= 3) unlockAchievement('fechador_improvavel');
  }

  // ========= DAILY CHALLENGE =========
  function getDailyChallenge() {
    const today = new Date().toISOString().slice(0, 10);
    const stored = localStorage.getItem(K.daily);
    if (stored) {
      const d = JSON.parse(stored);
      if (d.date === today) return d;
    }
    // gerar novo
    const random = DAILY_CHALLENGES[Math.floor(Math.random() * DAILY_CHALLENGES.length)];
    const d = { date: today, challenge_id: random.id, text: random.text, technique_hint: random.technique_hint, completed: false };
    localStorage.setItem(K.daily, JSON.stringify(d));
    return d;
  }

  function checkDailyCompletion(technicas_aplicadas_na_sessao) {
    const d = getDailyChallenge();
    if (d.completed) return { completed: true, already: true };
    const required = (d.technique_hint || '').split(',').filter(Boolean);
    if (required.length === 0) return { completed: false };
    const allHit = required.every(r => technicas_aplicadas_na_sessao[r]);
    if (allHit) {
      d.completed = true;
      localStorage.setItem(K.daily, JSON.stringify(d));
      return { completed: true, already: false };
    }
    return { completed: false };
  }

  // ========= XP CALC =========
  function computeSessionXp({ nota_geral, streak, tecnicas_aplicadas, fechou, leadDificil, desafioCumprido }) {
    let breakdown = [];
    let baseXp = Math.round((nota_geral || 0) * 10);
    breakdown.push({ label: `Nota ${nota_geral.toFixed(1)} × 10`, value: baseXp });

    const streakBonus = Math.min(60, streak * 2);
    if (streakBonus > 0) breakdown.push({ label: `Streak ${streak} dias × 2`, value: streakBonus });

    let tecBonus = 0;
    const tecHits = [];
    TECHNIQUES.forEach(t => {
      if (tecnicas_aplicadas[t.id]) {
        tecBonus += t.xp;
        tecHits.push(t.name);
      }
    });
    if (tecBonus > 0) breakdown.push({ label: `Técnicas aplicadas (${tecHits.length})`, value: tecBonus, details: tecHits });

    let fechoBonus = 0;
    if (fechou) {
      fechoBonus = leadDificil ? 100 : 50;
      breakdown.push({ label: leadDificil ? 'Fechou lead hostil' : 'Fechou a venda', value: fechoBonus });
    }

    const desafioBonus = desafioCumprido ? 25 : 0;
    if (desafioBonus > 0) breakdown.push({ label: 'Desafio do dia cumprido', value: desafioBonus });

    const total = baseXp + streakBonus + tecBonus + fechoBonus + desafioBonus;
    return { total, breakdown };
  }

  // ========= RESET =========
  function resetAll() {
    Object.values(K).forEach(key => localStorage.removeItem(key));
  }

  // ========= EXPOSED =========
  return {
    K,
    TECHNIQUES,
    TECHNIQUE_GUIDES,
    findTechniqueGuide,
    ACHIEVEMENTS,
    DAILY_CHALLENGES,

    getProfile, saveProfile,
    getSkills, saveSkills, updateSkillsFromScores,
    getSessions, saveSession, avgScoreInDojo, isDojoUnlocked,
    getAchievements, unlockAchievement,
    getTechniques, recordTechniques,
    getDailyChallenge, checkDailyCompletion,
    computeSessionXp, addXp, xpToLevel,
    updateStreak,
    resetAll
  };
})();
