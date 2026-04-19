// gamification.js v2 — XP, 4 Tiers, streak, conquistas, 18-passos, técnicas dominadas

const Gamification = (() => {

  const K = {
    profile: 'dojo:ramon:profile',
    skills: 'dojo:ramon:skills',
    sessions: 'dojo:ramon:sessions_v2',
    achievements: 'dojo:ramon:achievements_v2',
    daily: 'dojo:ramon:daily_challenge',
    techniques: 'dojo:ramon:tecnicas_dominadas_v2',
    stepHits: 'dojo:ramon:step_hits',         // { "1": count, "2": count... }
    tierLevels: 'dojo:ramon:tier_levels',     // { fundacao: {level, xp}, ... }
    semana: 'dojo:ramon:semana_treino'        // 1-8 das 8 semanas do plano
  };

  const TIERS = [
    { id: 'fundacao', nome: 'Fundação', descricao: 'Abertura + Investigação', cor: '#6BA368', passos: [1,2,3,4,5,6,7] },
    { id: 'conducao', nome: 'Condução', descricao: 'Apresentação', cor: '#C89A2E', passos: [8,9,10] },
    { id: 'fechamento', nome: 'Fechamento', descricao: 'Looping + Closes + Avanço', cor: '#C65D2E', passos: [11,12,13,14,15,16,17,18] },
    { id: 'palco', nome: 'Palco', descricao: '(Arena 3 — em breve)', cor: '#9B4520', passos: [] }
  ];

  const TECHNIQUES = [
    { id: 'mirror', name: 'Mirror', xp: 10, tier: 'fundacao' },
    { id: 'label', name: 'Label', xp: 10, tier: 'fundacao' },
    { id: 'perguntas_calibradas', name: 'Perguntas Calibradas', xp: 10, tier: 'fundacao' },
    { id: 'silencio_dinamico', name: 'Silêncio Dinâmico', xp: 15, tier: 'fundacao' },
    { id: '4_segundos', name: 'Os 4 Segundos', xp: 10, tier: 'fundacao' },
    { id: 'tom_eu_me_importo', name: 'Tom "Eu me importo"', xp: 10, tier: 'fundacao' },
    { id: 'pergunta_implicacao', name: 'Pergunta de Implicação', xp: 25, tier: 'fundacao' },
    { id: 'pergunta_necessidade', name: 'Pergunta de Necessidade de Solução', xp: 25, tier: 'fundacao' },
    { id: 'patamar_ledge', name: 'Patamar (Ledge)', xp: 10, tier: 'fundacao' },
    { id: 'thats_right', name: 'That\'s Right', xp: 20, tier: 'conducao' },
    { id: 'accusation_audit', name: 'Accusation Audit', xp: 15, tier: 'conducao' },
    { id: 'storytelling_cena', name: 'Storytelling (cena + decisão)', xp: 15, tier: 'conducao' },
    { id: 'pre_handling_3_objecoes', name: 'Pre-handling 3 Objeções', xp: 15, tier: 'conducao' },
    { id: '3_dez', name: '3 Dez na ordem (Produto→Você→Aliança)', xp: 30, tier: 'conducao' },
    { id: 'framework_3a', name: 'Framework 3A (Acknowledge Associate Ask)', xp: 15, tier: 'conducao' },
    { id: 'metodo_4_passos_concer', name: 'Método 4 Passos Concer', xp: 15, tier: 'conducao' },
    { id: 'cisnes_negros', name: 'Cisnes Negros', xp: 20, tier: 'conducao' },
    { id: '10_tonalidades', name: '10 Tonalidades (3 Tons no pedido)', xp: 20, tier: 'fechamento' },
    { id: 'looping_universal', name: 'Looping Universal', xp: 25, tier: 'fechamento' },
    { id: 'isolamento_preco', name: 'Isolamento de Preço', xp: 20, tier: 'fechamento' },
    { id: 'cadeira_balanco', name: 'Cadeira de Balanço / Custo da Inação', xp: 20, tier: 'fechamento' },
    { id: 'skin_in_the_game', name: 'Skin in the Game', xp: 20, tier: 'fechamento' },
    { id: 'assumptive_close', name: 'Assumptive Close', xp: 20, tier: 'fechamento' },
    { id: 'alternative_close', name: 'Alternative Close', xp: 15, tier: 'fechamento' },
    { id: 'avanco_concreto', name: 'Avanço Concreto (vs Continuação)', xp: 25, tier: 'fechamento' },
    { id: 'teste_hipotetico', name: 'Teste Hipotético', xp: 15, tier: 'fechamento' },
    { id: 'best_worst_case', name: 'Best / Worst Case', xp: 15, tier: 'fechamento' },
    { id: 'risco_reverso', name: 'Risco Reverso', xp: 15, tier: 'fechamento' },
    { id: 'ancoragem_preco', name: 'Ancoragem de Preço', xp: 15, tier: 'fechamento' },
    { id: 'takeaway', name: 'Takeaway (Retirada)', xp: 15, tier: 'fechamento' },
    { id: 'micro_commitments', name: 'Micro Compromissos', xp: 10, tier: 'conducao' },
    { id: 'nomeou_conceito_permissao', name: 'Nomeou conceito Teoria da Permissão', xp: 15, tier: 'conducao' },
    { id: 'frase_ancora_ancorada', name: 'Frase-âncora com contexto real', xp: 10, tier: 'conducao' },
    { id: 'caso_real_citado', name: 'Citou caso real da Aliança', xp: 10, tier: 'conducao' },
    { id: 'fechou_venda', name: 'Fechou a venda', xp: 50, tier: 'fechamento' },
    { id: 'fechou_dificil', name: 'Fechou lead Difícil/Hostil', xp: 100, tier: 'fechamento' }
  ];

  const ACHIEVEMENTS = [
    { id: 'primeiro_caminho', icon: '🚀', name: 'Primeiro Caminho', desc: 'Completou primeira sessão Arena 2' },
    { id: 'caminho_completo', icon: '🗺️', name: 'Caminho Completo', desc: 'Cumpriu 15+ dos 18 passos numa sessão' },
    { id: 'mestre_implicacao', icon: '⛓️', name: 'Mestre da Implicação', desc: 'Pergunta de Implicação aplicada 15×' },
    { id: 'necessidade_cravada', icon: '🎯', name: 'Necessidade Cravada', desc: 'Necessidade de Solução aplicada 15×' },
    { id: 'mestre_3_dez', icon: '3️⃣', name: 'Mestre dos 3 Dez', desc: '3 Dez na ordem correta 10×' },
    { id: 'looper', icon: '🔁', name: 'Looper', desc: 'Looping Universal usado 10×' },
    { id: 'dono_silencio', icon: '⏳', name: 'Dono do Silêncio', desc: 'Silêncio Dinâmico usado 10×' },
    { id: 'avanço_concreto', icon: '📅', name: 'Avanço Concreto', desc: 'Marcou Avanço (vs Continuação) 10×' },
    { id: 'fiel_mesa', icon: '🧠', name: 'Fiel à Mesa de Jantar', desc: '10 sessões sem clichê/religiosidade/desconto' },
    { id: 'mestre_mirror', icon: '👂', name: 'Mestre do Mirror', desc: 'Mirror 20× com Escuta ≥ 8' },
    { id: 'rotulador', icon: '🏷️', name: 'Rotulador', desc: 'Label 20× com precisão' },
    { id: 'nomeador_padroes', icon: '📛', name: 'Nomeador de Padrões', desc: 'Nomeou conceito Permissão 20×' },
    { id: 'fechador_improvavel', icon: '⚔️', name: 'Fechador Improvável', desc: 'Fechou 5 leads hostis' },
    { id: 'playbook_concer', icon: '📖', name: 'Playbook Concer', desc: 'Aplicou os 4 passos numa única sessão' },
    { id: 'tier_fundacao_l10', icon: '🟢', name: 'Fundação L10', desc: 'Alcançou Nível 10 em Fundação' },
    { id: 'tier_conducao_l10', icon: '🟡', name: 'Condução L10', desc: 'Alcançou Nível 10 em Condução' },
    { id: 'tier_fechamento_l10', icon: '🟠', name: 'Fechamento L10', desc: 'Alcançou Nível 10 em Fechamento' },
    { id: 'tier_fundacao_l50', icon: '💚', name: 'Fundação Mestre', desc: 'Alcançou Nível 50 em Fundação' },
    { id: 'tier_fechamento_l50', icon: '🧡', name: 'Fechamento Mestre', desc: 'Alcançou Nível 50 em Fechamento' },
    { id: 'maratonista_30', icon: '🔥', name: 'Maratonista', desc: 'Streak de 30 dias' },
    { id: 'maratonista_100', icon: '♾️', name: 'Maratonista 100', desc: 'Streak de 100 dias' },
    { id: 'semana_completa', icon: '📚', name: 'Semana Completa', desc: 'Cumpriu uma semana inteira do plano de 8 semanas' },
    { id: 'plano_8_semanas', icon: '🎓', name: 'Plano 8 Semanas', desc: 'Concluiu o plano de treino de 8 semanas' },
    { id: 'l99_geral', icon: '👑', name: 'L99 Geral', desc: 'Nível 99 acumulado entre todos os Tiers' },
    { id: 'caso_real_mestre', icon: '📋', name: 'Mestre dos Casos Reais', desc: 'Citou caso real 20×' }
  ];

  const DAILY_CHALLENGES = [
    { id: 'implicacao_hoje', text: 'Hoje: 3 Perguntas de Implicação em cada sessão.', hint: 'pergunta_implicacao' },
    { id: 'necessidade_hoje', text: 'Hoje: faça o lead verbalizar o benefício com as PRÓPRIAS palavras.', hint: 'pergunta_necessidade' },
    { id: '3_dez_ordem', text: 'Hoje: 3 Dez na ordem Produto → Você → Aliança em toda apresentação.', hint: '3_dez' },
    { id: 'looping_universal_hoje', text: 'Hoje: Looping Universal em toda objeção — NUNCA responda a objeção direto.', hint: 'looping_universal' },
    { id: 'silencio_pos_preco', text: 'Hoje: silêncio de 7-10s após o preço ([silêncio 10s] explícito).', hint: 'silencio_dinamico' },
    { id: 'avanço_concreto_hoje', text: 'Hoje: NUNCA aceite "vou pensar e te falo". Sempre marque Avanço concreto.', hint: 'avanco_concreto' },
    { id: 'pre_handling_hoje', text: 'Hoje: 3 objeções pré-listadas antes de revelar o preço.', hint: 'pre_handling_3_objecoes' },
    { id: 'tacaro_sem_desconto', text: 'Hoje: quebre "tá caro" pela tradução Permissão (Culpa da Sobrevivência) — SEM desconto.', hint: 'nomeou_conceito_permissao' },
    { id: 'padrao_antes_3', text: 'Hoje: nomeie o Padrão antes do 3º turno.', hint: 'nomeou_conceito_permissao' },
    { id: 'isolamento_toda_objecao', text: 'Hoje: Isolamento de Preço após cada objeção financeira.', hint: 'isolamento_preco' },
    { id: 'caso_real_sempre', text: 'Hoje: cite 1 caso real por sessão (Daniela, Regiane, Vanilton, Ícaro...).', hint: 'caso_real_citado' },
    { id: 'storytelling_hoje', text: 'Hoje: use Storytelling com cena + decisão, não cena + aprendizado.', hint: 'storytelling_cena' }
  ];

  const MISSAO_8_SEMANAS = [
    { semana: 1, foco: 'Abertura (passos 1-3) — 4 Segundos + Tom Importo + Abertura Focada' },
    { semana: 2, foco: 'Abertura — consolidar. Meta: em 4s o lead está no estado de escuta, não de defesa' },
    { semana: 3, foco: 'Investigação (passos 5-7) — Problema + Implicação + Necessidade de Solução' },
    { semana: 4, foco: 'Investigação — consolidar. Meta: o cliente verbaliza o benefício antes de você falar' },
    { semana: 5, foco: 'Apresentação (passo 10) — 3 Dez na ordem + Pre-handling' },
    { semana: 6, foco: 'Apresentação — consolidar. Meta: lead pergunta "quanto é?" no meio da apresentação' },
    { semana: 7, foco: 'Fechamento (passos 11-18) — 3 Tons + Looping + Assumptive + Avanço' },
    { semana: 8, foco: 'Fechamento — consolidar. Meta: "vou pensar" vira Avanço ou fechamento no ato' }
  ];

  // ========= STORAGE =========
  function _get(key, def) {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; }
    catch (e) { return def; }
  }
  function _set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  function defaultProfile() {
    return { name: 'Ramon', xp_total_acumulado: 0, streak: 0, last_session_date: null,
             semana_atual: 1, created_at: new Date().toISOString() };
  }
  function defaultSkills() {
    return { escuta: 0, investigacao: 0, apresentacao: 0, fechamento: 0, fidelidade: 0 };
  }
  function defaultTiers() {
    return TIERS.reduce((acc, t) => { acc[t.id] = { level: 1, xp: 0 }; return acc; }, {});
  }
  function defaultAchievements() {
    return ACHIEVEMENTS.reduce((acc, a) => { acc[a.id] = false; return acc; }, {});
  }
  function defaultTechniques() {
    return TECHNIQUES.reduce((acc, t) => { acc[t.id] = 0; return acc; }, {});
  }
  function defaultStepHits() {
    const obj = {}; for (let i = 1; i <= 18; i++) obj[i] = 0; return obj;
  }

  function getProfile() { return _get(K.profile, defaultProfile()); }
  function saveProfile(p) { _set(K.profile, p); }
  function getSkills() { return _get(K.skills, defaultSkills()); }
  function saveSkills(s) { _set(K.skills, s); }
  function getSessions() { return _get(K.sessions, []); }
  function getAchievements() { return _get(K.achievements, defaultAchievements()); }
  function saveAchievements(a) { _set(K.achievements, a); }
  function getTechniques() { return _get(K.techniques, defaultTechniques()); }
  function saveTechniques(t) { _set(K.techniques, t); }
  function getStepHits() { return _get(K.stepHits, defaultStepHits()); }
  function saveStepHits(s) { _set(K.stepHits, s); }
  function getTierLevels() { return _get(K.tierLevels, defaultTiers()); }
  function saveTierLevels(t) { _set(K.tierLevels, t); }

  function saveSession(session) {
    const all = getSessions();
    all.unshift(session);
    if (all.length > 100) all.length = 100;
    _set(K.sessions, all);
  }

  // ========= XP / NÍVEIS POR TIER =========
  function xpToLevel(level) { return 100 + (level - 1) * 50; }

  function addXpToTier(tierId, amount) {
    const tiers = getTierLevels();
    const t = tiers[tierId];
    if (!t) return null;
    t.xp += amount;
    let leveled = false;
    while (t.xp >= xpToLevel(t.level) && t.level < 99) {
      t.xp -= xpToLevel(t.level);
      t.level += 1;
      leveled = true;
    }
    tiers[tierId] = t;
    saveTierLevels(tiers);

    const p = getProfile();
    p.xp_total_acumulado += amount;
    saveProfile(p);

    // Achievements de Tier
    if (tierId === 'fundacao' && t.level >= 10) unlockAchievement('tier_fundacao_l10');
    if (tierId === 'conducao' && t.level >= 10) unlockAchievement('tier_conducao_l10');
    if (tierId === 'fechamento' && t.level >= 10) unlockAchievement('tier_fechamento_l10');
    if (tierId === 'fundacao' && t.level >= 50) unlockAchievement('tier_fundacao_l50');
    if (tierId === 'fechamento' && t.level >= 50) unlockAchievement('tier_fechamento_l50');

    const sumLevels = Object.values(tiers).reduce((a, x) => a + x.level, 0);
    if (sumLevels >= 99) unlockAchievement('l99_geral');

    return { tier: t, leveled };
  }

  function tierOfTechnique(techId) {
    const t = TECHNIQUES.find(x => x.id === techId);
    return t ? t.tier : 'fundacao';
  }

  // ========= SKILLS =========
  function updateSkillsFromScores(notas) {
    const s = getSkills();
    const keys = ['escuta', 'investigacao', 'apresentacao', 'fechamento', 'fidelidade'];
    keys.forEach(k => {
      if (notas[k] !== undefined) {
        const target = notas[k] * 10;
        s[k] = Math.max(0, Math.min(100, Math.round(s[k] + (target - s[k]) * 0.12)));
      }
    });
    saveSkills(s);
    return s;
  }

  // ========= STREAK =========
  function updateStreak() {
    const p = getProfile();
    const today = new Date().toISOString().slice(0, 10);
    const last = p.last_session_date;
    if (last === today) return p;
    if (!last) { p.streak = 1; }
    else {
      const diff = Math.round((new Date(today) - new Date(last)) / 86400000);
      if (diff === 1) p.streak += 1;
      else if (diff > 1) p.streak = 1;
    }
    p.last_session_date = today;
    saveProfile(p);
    if (p.streak >= 30) unlockAchievement('maratonista_30');
    if (p.streak >= 100) unlockAchievement('maratonista_100');
    return p;
  }

  // ========= ACHIEVEMENTS =========
  function unlockAchievement(id) {
    const a = getAchievements();
    if (!a[id]) { a[id] = true; saveAchievements(a); return true; }
    return false;
  }

  // ========= TECHNIQUES =========
  function recordTechniques(applied) {
    const t = getTechniques();
    Object.keys(applied).forEach(k => {
      if (applied[k] && t[k] !== undefined) t[k] += 1;
    });
    saveTechniques(t);
    if (t.pergunta_implicacao >= 15) unlockAchievement('mestre_implicacao');
    if (t.pergunta_necessidade >= 15) unlockAchievement('necessidade_cravada');
    if (t['3_dez'] >= 10) unlockAchievement('mestre_3_dez');
    if (t.looping_universal >= 10) unlockAchievement('looper');
    if (t.silencio_dinamico >= 10) unlockAchievement('dono_silencio');
    if (t.avanco_concreto >= 10) unlockAchievement('avanço_concreto');
    if (t.mirror >= 20) unlockAchievement('mestre_mirror');
    if (t.label >= 20) unlockAchievement('rotulador');
    if (t.nomeou_conceito_permissao >= 20) unlockAchievement('nomeador_padroes');
    if (t.caso_real_citado >= 20) unlockAchievement('caso_real_mestre');
    if ((t.fechou_dificil || 0) >= 5) unlockAchievement('fechador_improvavel');
  }

  // ========= 18-STEP HITS =========
  function recordStepHits(stepsCompleted) {
    const hits = getStepHits();
    (stepsCompleted || []).forEach(s => {
      if (hits[s] !== undefined) hits[s] += 1;
    });
    saveStepHits(hits);
    if ((stepsCompleted || []).length >= 15) unlockAchievement('caminho_completo');
  }

  // ========= DAILY =========
  function getDailyChallenge() {
    const today = new Date().toISOString().slice(0, 10);
    const stored = _get(K.daily, null);
    if (stored && stored.date === today) return stored;
    const pick = DAILY_CHALLENGES[Math.floor(Math.random() * DAILY_CHALLENGES.length)];
    const d = { date: today, challenge_id: pick.id, text: pick.text, hint: pick.hint, completed: false };
    _set(K.daily, d);
    return d;
  }

  function checkDailyCompletion(tecnicasAplicadas) {
    const d = getDailyChallenge();
    if (d.completed) return { completed: true, already: true };
    const required = (d.hint || '').split(',').filter(Boolean);
    if (!required.length) return { completed: false };
    const all = required.every(r => tecnicasAplicadas[r]);
    if (all) {
      d.completed = true;
      _set(K.daily, d);
      return { completed: true, already: false };
    }
    return { completed: false };
  }

  // ========= XP CALC =========
  function computeSessionXp({ nota_geral, streak, tecnicas_aplicadas, stepsCompleted, fechou, leadDificil, desafioCumprido, ordemBonus }) {
    const breakdown = [];
    const base = Math.round((nota_geral || 0) * 10);
    breakdown.push({ label: `Nota ${(nota_geral || 0).toFixed(1)} × 10`, value: base, tier: null });

    const streakBonus = Math.min(60, streak * 2);
    if (streakBonus) breakdown.push({ label: `Streak ${streak} dias × 2`, value: streakBonus, tier: null });

    const tiersXp = { fundacao: 0, conducao: 0, fechamento: 0, palco: 0 };
    const tecHits = [];
    TECHNIQUES.forEach(t => {
      if (tecnicas_aplicadas[t.id]) {
        tiersXp[t.tier] += t.xp;
        tecHits.push(t.name);
      }
    });
    const tecTotal = Object.values(tiersXp).reduce((a, b) => a + b, 0);
    if (tecTotal) breakdown.push({ label: `Técnicas aplicadas (${tecHits.length})`, value: tecTotal, details: tecHits, tier: null });

    const stepBonus = (stepsCompleted || []).length * 5;
    if (stepBonus) breakdown.push({ label: `Passos cumpridos (${stepsCompleted.length}/18) × 5`, value: stepBonus, tier: null });

    const ordem = ordemBonus || 0;
    if (ordem) breakdown.push({ label: 'Bônus ordem correta do Caminho', value: ordem, tier: null });

    let fechamentoBonus = 0;
    if (fechou) {
      fechamentoBonus = leadDificil ? 100 : 50;
      breakdown.push({ label: leadDificil ? 'Fechou lead hostil' : 'Fechou a venda', value: fechamentoBonus, tier: 'fechamento' });
      tiersXp.fechamento += fechamentoBonus;
    }

    const desafioBonus = desafioCumprido ? 25 : 0;
    if (desafioBonus) breakdown.push({ label: 'Desafio do dia cumprido', value: desafioBonus, tier: null });

    const total = base + streakBonus + tecTotal + stepBonus + ordem + fechamentoBonus + desafioBonus;

    // Distribuir XP geral entre tiers proporcionalmente ao esforço
    const distributed = {};
    if (base + streakBonus + stepBonus + ordem + desafioBonus > 0) {
      const generalBucket = base + streakBonus + stepBonus + ordem + desafioBonus;
      distributed.fundacao = Math.round(generalBucket * 0.35);
      distributed.conducao = Math.round(generalBucket * 0.30);
      distributed.fechamento = Math.round(generalBucket * 0.35);
    }
    Object.keys(tiersXp).forEach(tid => {
      distributed[tid] = (distributed[tid] || 0) + tiersXp[tid];
    });

    return { total, breakdown, tiersXp: distributed };
  }

  function applySessionXp(xpInfo) {
    // Adiciona XP em cada tier
    const leveledUp = [];
    Object.keys(xpInfo.tiersXp).forEach(tid => {
      const amt = xpInfo.tiersXp[tid];
      if (amt > 0) {
        const r = addXpToTier(tid, amt);
        if (r && r.leveled) leveledUp.push({ tier: tid, newLevel: r.tier.level });
      }
    });
    return leveledUp;
  }

  // ========= RESET =========
  function resetAll() {
    Object.values(K).forEach(key => localStorage.removeItem(key));
    // Limpa também as chaves do v1 se existirem
    ['dojo:ramon:sessions', 'dojo:ramon:achievements', 'dojo:ramon:tecnicas_dominadas',
     'dojo:ramon:scenario_hashes', 'dojo:ramon:personas_usadas'].forEach(k => localStorage.removeItem(k));
  }

  return {
    K, TIERS, TECHNIQUES, ACHIEVEMENTS, DAILY_CHALLENGES, MISSAO_8_SEMANAS,
    getProfile, saveProfile,
    getSkills, saveSkills, updateSkillsFromScores,
    getSessions, saveSession,
    getAchievements, unlockAchievement,
    getTechniques, recordTechniques,
    getStepHits, recordStepHits,
    getTierLevels, addXpToTier, tierOfTechnique,
    xpToLevel, updateStreak,
    getDailyChallenge, checkDailyCompletion,
    computeSessionXp, applySessionXp,
    resetAll
  };
})();
