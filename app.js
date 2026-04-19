// app.js — estado global, navegação e wiring das sessões

(() => {

  // ========= STATE =========
  const state = {
    data: {},               // JSONs carregados
    dataLoaded: false,
    currentDojo: null,      // DM_1_1 / AO_VIVO / LIVE
    currentScenario: null,
    conversation: [],       // [{role: 'user'|'assistant', content: string}]
    turn: 0,
    turnFeedbacks: [],      // avaliações por turno
    sessionTechniques: {},  // técnicas aplicadas nesta sessão (contador)
    sessionClosed: false,
    sessionClosedDifficult: false,
    leadCederCamada: false,
    leadEndurecer: false,
    podeFechar: false
  };

  const MAX_TURNS = 8;

  // ========= HELPERS =========
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return [...document.querySelectorAll(sel)]; }

  function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    $(`#screen-${id}`).classList.add('active');
    window.scrollTo(0, 0);
  }

  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function toast(msg, type = 'info') {
    // versão simples — pode substituir por algo mais elaborado
    console.log(`[${type}] ${msg}`);
  }

  // ========= DATA LOADING =========
  async function loadData() {
    const files = ['metodologia', 'objecoes', 'personas', 'rubrica', 'tecnicas_vendas', 'scripts_quebra_objecao', 'playbook_live'];
    const data = {};
    for (const f of files) {
      try {
        const r = await fetch(`data/${f}.json`);
        if (!r.ok) throw new Error(`${f}.json ${r.status}`);
        data[f] = await r.json();
      } catch (err) {
        console.error('Falha ao carregar', f, err);
        throw err;
      }
    }
    state.data = data;
    state.dataLoaded = true;
    return data;
  }

  // ========= WELCOME =========
  function initWelcome() {
    const existingKey = ClaudeAPI.getKey();
    const profile = Gamification.getProfile();
    if (existingKey && profile.name && profile.name !== 'Ramon') {
      // usuário já configurado — ir pro dashboard
      $('#nameInput').value = profile.name;
      $('#apiKeyInput').value = existingKey;
      renderDashboard();
      showScreen('dashboard');
      return;
    }
    if (existingKey) $('#apiKeyInput').value = existingKey;
    if (profile.name) $('#nameInput').value = profile.name;

    $('#btnStart').addEventListener('click', () => {
      const key = $('#apiKeyInput').value.trim();
      const name = $('#nameInput').value.trim() || 'Ramon';
      if (!key) { alert('Cole a API key da Anthropic pra começar.'); return; }
      ClaudeAPI.setKey(key);
      const p = Gamification.getProfile();
      p.name = name;
      Gamification.saveProfile(p);
      renderDashboard();
      showScreen('dashboard');
    });
  }

  // ========= DASHBOARD =========
  function renderDashboard() {
    const p = Gamification.getProfile();
    const skills = Gamification.getSkills();
    const achievements = Gamification.getAchievements();
    const techs = Gamification.getTechniques();
    const daily = Gamification.getDailyChallenge();

    $('#userName').textContent = p.name;
    $('#userLevel').textContent = p.level;
    $('#streakCount').textContent = p.streak;

    const need = Gamification.xpToLevel(p.level);
    const pct = Math.min(100, Math.round((p.xp / need) * 100));
    $('#xpFill').style.width = pct + '%';
    $('#xpText').textContent = `${p.xp} / ${need} XP — Nível ${p.level}`;

    // Daily
    $('#challengeText').textContent = daily.text;
    const badge = $('#challengeStatus');
    if (daily.completed) { badge.textContent = '✓ Cumprido'; badge.classList.add('done'); }
    else { badge.textContent = '+25 XP'; badge.classList.remove('done'); }

    // Skills
    const skillLabels = [
      { id: 'escuta', name: 'Escuta Ativa' },
      { id: 'objecao', name: 'Quebra de Objeção' },
      { id: 'dor', name: 'Ativação de Dor' },
      { id: 'conducao', name: 'Condução ao Fechamento' },
      { id: 'fidelidade', name: 'Fidelidade à Metodologia' }
    ];
    $('#skillsGrid').innerHTML = skillLabels.map(s => `
      <div class="skill">
        <div class="skill-name">${s.name}</div>
        <div class="skill-bar"><div class="skill-fill" style="width:${skills[s.id]}%"></div></div>
        <div class="skill-value">${skills[s.id]}/100</div>
      </div>
    `).join('');

    // Dojôs
    ['DM_1_1', 'AO_VIVO', 'LIVE'].forEach(dojo => {
      const unlocked = Gamification.isDojoUnlocked(dojo);
      const btn = document.querySelector(`.btn-enter-dojo[data-dojo="${dojo}"]`);
      const statusEl = document.getElementById(`status-${dojo}`);
      if (unlocked) {
        btn.disabled = false;
        btn.textContent = 'Entrar';
        if (statusEl) {
          const sessionsInDojo = Gamification.getSessions().filter(s => s.dojo === dojo).length;
          statusEl.textContent = sessionsInDojo > 0 ? `${sessionsInDojo} sessão${sessionsInDojo > 1 ? 'ões' : ''}` : 'Aberto';
        }
      } else {
        btn.disabled = true;
        btn.textContent = '🔒';
      }
    });

    // Techniques
    $('#techniquesGrid').innerHTML = Gamification.TECHNIQUES.map(t => {
      const count = techs[t.id] || 0;
      const mastered = count >= 5;
      const unused = count === 0;
      return `<div class="technique ${mastered ? 'mastered' : ''} ${unused ? 'unused' : ''}">
        <div class="technique-name">${t.name}</div>
        <div class="technique-count">${count}×</div>
      </div>`;
    }).join('');

    // Achievements
    $('#achievementsGrid').innerHTML = Gamification.ACHIEVEMENTS.map(a => `
      <div class="achievement ${achievements[a.id] ? '' : 'locked'}" title="${escapeHtml(a.desc)}">
        <div class="achievement-icon">${a.icon}</div>
        <div>
          <div style="font-weight:600">${a.name}</div>
          <div style="font-size:0.75em;color:var(--ink-muted)">${a.desc}</div>
        </div>
      </div>
    `).join('');
  }

  function initDashboard() {
    $$('.btn-enter-dojo').forEach(btn => {
      btn.addEventListener('click', () => {
        const dojo = btn.dataset.dojo;
        if (!Gamification.isDojoUnlocked(dojo)) return;
        startSession(dojo);
      });
    });

    $('#btnChangeKey').addEventListener('click', () => {
      const k = prompt('Nova API key:', ClaudeAPI.getKey());
      if (k && k.trim()) { ClaudeAPI.setKey(k.trim()); toast('API key atualizada'); }
    });

    $('#btnResetProfile').addEventListener('click', () => {
      if (confirm('Apagar todo o progresso local? (XP, habilidades, conquistas, sessões) — isso não pode ser desfeito.')) {
        Gamification.resetAll();
        localStorage.removeItem('dojo:ramon:scenario_hashes');
        location.reload();
      }
    });
  }

  // ========= SESSION =========
  async function startSession(dojo) {
    state.currentDojo = dojo;
    state.conversation = [];
    state.turn = 0;
    state.turnFeedbacks = [];
    state.sessionTechniques = {};
    state.sessionClosed = false;
    state.sessionClosedDifficult = false;
    state.leadCederCamada = false;
    state.leadEndurecer = false;
    state.podeFechar = false;

    const dojoNames = { 'DM_1_1': 'Dojô I — DM 1:1 Pós-Evento', 'AO_VIVO': 'Dojô II — Q&A Ao Vivo', 'LIVE': 'Dojô III — Live em Massa' };
    $('#sessionDojoName').textContent = dojoNames[dojo] || dojo;
    $('#chat').innerHTML = '';
    $('#feedbackPanel').classList.remove('active');
    $('#feedbackPanel').innerHTML = '';
    $('#userInput').value = '';
    $('#turnCounter').textContent = '1';
    showScreen('session');

    // Mostrar loader enquanto gera cenário
    $('#personaTitle').textContent = 'Gerando cenário...';
    $('#personaMeta').textContent = '';
    $('#personaTrigger').textContent = '';
    $('#personaHint').textContent = '';
    $('#sessionPersonaName').textContent = '...';

    try {
      const profile = Gamification.getProfile();
      const scenario = await Scenarios.generate({ level: profile.level, dojo, data: state.data });
      state.currentScenario = scenario;
      renderPersona(scenario);
      const { hintSlot } = pushLeadMessage(scenario.primeira_mensagem);
      // Dica da primeira fala (async, não bloqueia)
      Evaluator.leadHint({
        scenario, leadMessage: scenario.primeira_mensagem,
        conversation: state.conversation, turn: 0, data: state.data
      }).then(h => attachLeadHint(hintSlot, h));
    } catch (err) {
      console.error(err);
      $('#personaTitle').textContent = 'Erro ao gerar cenário';
      $('#personaMeta').textContent = err.message;
    }
  }

  function renderTechniqueCards(names) {
    if (!names || !names.length) return '<span class="muted">—</span>';
    return names.map(raw => {
      const guide = Gamification.findTechniqueGuide(raw);
      if (!guide) {
        return `<div class="tec-card">
          <div class="tec-card-head">
            <span class="tec-card-name">${escapeHtml(raw)}</span>
            <span class="tec-card-unknown">técnica não catalogada</span>
          </div>
        </div>`;
      }
      return `<details class="tec-card">
        <summary class="tec-card-head">
          <span class="tec-card-name">${escapeHtml(guide.name)}</span>
          <span class="tec-card-more">saber mais ▾</span>
        </summary>
        <div class="tec-card-body">
          <div class="tec-line"><b>O quê:</b> ${escapeHtml(guide.resumo)}</div>
          <div class="tec-line"><b>Quando usar:</b> ${escapeHtml(guide.quando)}</div>
          <div class="tec-line"><b>Exemplo:</b><br><span class="tec-example">${escapeHtml(guide.exemplo).replace(/\n/g, '<br>')}</span></div>
          <div class="tec-line tec-origem">Origem: ${escapeHtml(guide.origem)}</div>
        </div>
      </details>`;
    }).join('');
  }

  function renderPersona(sc) {
    $('#sessionPersonaName').textContent = sc.persona.nome;
    $('#personaTitle').textContent = `${sc.persona.nome}, ${sc.persona.idade}`;
    $('#personaMeta').textContent = `${sc.persona.profissao} — ${sc.persona.cidade}. ${sc.persona.situacao_financeira}`;
    $('#personaTrigger').textContent = `Gatilho: ${sc.gatilho_contato}`;
    const techs = sc.tecnicas_do_playbook_ideais_aqui || [];
    $('#personaHint').innerHTML = `
      <div class="tec-line"><b>Objeção superficial:</b> ${escapeHtml(sc.objecao_superficial)}</div>
      <div class="tec-line"><b>Objeção real (oculta):</b> ${escapeHtml(sc.objecao_real)}</div>
      <div class="tec-line"><b>Padrão oculto:</b> ${escapeHtml(sc.padrao_oculto)}</div>
      <div class="tec-line"><b>Dificuldade:</b> ${escapeHtml(sc.nivel_dificuldade)}</div>
      <div class="tec-line" style="margin-top:0.8em"><b>Técnicas ideais aqui:</b></div>
      <div class="tec-cards">${renderTechniqueCards(techs)}</div>
    `;
  }

  function pushLeadMessage(text, { speak = false } = {}) {
    state.conversation.push({ role: 'assistant', content: text });
    const wrap = document.createElement('div');
    wrap.className = 'msg-wrap lead-wrap';

    const el = document.createElement('div');
    el.className = 'msg lead';
    el.dataset.persona = state.currentScenario?.persona?.nome || 'Lead';
    el.textContent = text;
    wrap.appendChild(el);

    const hintSlot = document.createElement('div');
    hintSlot.className = 'hint-slot';
    hintSlot.innerHTML = `<details class="lead-hint-box">
      <summary><span class="hint-chip">🤫 dica do turno</span> <span class="hint-status">analisando...</span></summary>
      <div class="lead-hint-body"><em class="muted">Carregando análise da fala do lead...</em></div>
    </details>`;
    wrap.appendChild(hintSlot);

    $('#chat').appendChild(wrap);
    wrap.scrollIntoView({ behavior: 'smooth', block: 'end' });
    if (speak && state.currentDojo !== 'LIVE') Speech.speak(text);
    return { wrap, bubble: el, hintSlot };
  }

  function pushRamonMessage(text) {
    state.conversation.push({ role: 'user', content: text });
    const wrap = document.createElement('div');
    wrap.className = 'msg-wrap ramon-wrap';

    const el = document.createElement('div');
    el.className = 'msg ramon';
    el.textContent = text;
    wrap.appendChild(el);

    const evalSlot = document.createElement('div');
    evalSlot.className = 'eval-slot';
    evalSlot.innerHTML = `<div class="mini-eval pending"><span class="mini-eval-dot">•</span> <span class="muted">avaliando...</span></div>`;
    wrap.appendChild(evalSlot);

    $('#chat').appendChild(wrap);
    wrap.scrollIntoView({ behavior: 'smooth', block: 'end' });
    return { wrap, bubble: el, evalSlot };
  }

  function attachMiniEval(evalSlot, feedback) {
    if (!evalSlot || !feedback) return;
    const nota = (feedback.nota_geral || 0).toFixed(1);
    const gradeClass = feedback.nota_geral >= 8 ? 'good' : feedback.nota_geral >= 6 ? 'mid' : 'low';
    const ponto = feedback.ponto_forte || '';
    const ajuste = feedback.ajuste || '';
    const appliedCount = Object.values(feedback.tecnicas_aplicadas || {}).filter(Boolean).length;
    const trap = feedback.armadilha_cometida;

    evalSlot.innerHTML = `<details class="mini-eval ${gradeClass}">
      <summary class="mini-eval-head">
        <span class="mini-eval-grade">${nota}</span>
        <span class="mini-eval-summary">${escapeHtml(ajuste || ponto || 'resposta avaliada')}</span>
        ${appliedCount ? `<span class="mini-eval-tag">+${feedback.xp_bonus_tecnicas || 0} XP · ${appliedCount} téc</span>` : ''}
        ${trap ? `<span class="mini-eval-tag warn">⚡ armadilha</span>` : ''}
      </summary>
      <div class="mini-eval-body">
        ${ponto ? `<div class="mini-line"><b>✅</b> ${escapeHtml(ponto)}</div>` : ''}
        ${ajuste ? `<div class="mini-line"><b>⚠️</b> ${escapeHtml(ajuste)}</div>` : ''}
        ${feedback.reformulacao ? `<div class="mini-line mini-reform"><b>💡 Tente:</b> ${escapeHtml(feedback.reformulacao)}</div>` : ''}
        ${feedback.tecnica_que_deveria_usar ? `<div class="mini-line"><b>🧠</b> ${escapeHtml(feedback.tecnica_que_deveria_usar)}</div>` : ''}
        ${feedback.conceito_que_deveria_usar ? `<div class="mini-line"><b>🎯</b> ${escapeHtml(feedback.conceito_que_deveria_usar)}</div>` : ''}
        ${trap ? `<div class="mini-line warn"><b>⚡ Armadilha:</b> ${escapeHtml(trap)}</div>` : ''}
      </div>
    </details>`;
  }

  function attachLeadHint(hintSlot, hint) {
    if (!hintSlot) return;
    if (!hint) {
      hintSlot.innerHTML = `<details class="lead-hint-box">
        <summary><span class="hint-chip">🤫 dica do turno</span> <span class="hint-status muted">análise indisponível</span></summary>
        <div class="lead-hint-body muted">Não foi possível gerar a dica deste turno.</div>
      </details>`;
      return;
    }
    const techs = (hint.tecnicas_sugeridas || []).map(t => {
      const guide = Gamification.findTechniqueGuide(t.nome);
      const refName = guide ? guide.name : t.nome;
      return `<div class="hint-tec">
        <div class="hint-tec-head"><b>▸ ${escapeHtml(refName)}</b></div>
        <div class="hint-tec-why">${escapeHtml(t.porque || '')}</div>
      </div>`;
    }).join('');

    hintSlot.innerHTML = `<details class="lead-hint-box">
      <summary>
        <span class="hint-chip">🤫 dica do turno</span>
        <span class="hint-status">${escapeHtml(hint.categoria || '—')}${hint.camada_revelada ? ' · ' + escapeHtml(hint.camada_revelada) : ''}</span>
      </summary>
      <div class="lead-hint-body">
        <div class="hint-line"><b>Provável objeção agora:</b> ${escapeHtml(hint.possivel_objecao || '—')}</div>
        ${hint.conceito_permissao_em_jogo ? `<div class="hint-line"><b>Conceito em jogo:</b> ${escapeHtml(hint.conceito_permissao_em_jogo)}</div>` : ''}
        ${hint.o_que_observar ? `<div class="hint-line"><b>O que observar:</b> ${escapeHtml(hint.o_que_observar)}</div>` : ''}
        ${techs ? `<div class="hint-line"><b>Caminhos possíveis:</b></div>${techs}` : ''}
      </div>
    </details>`;
  }

  function pushTypingPlaceholder() {
    const el = document.createElement('div');
    el.className = 'msg lead typing';
    el.dataset.persona = state.currentScenario?.persona?.nome || 'Lead';
    el.textContent = 'digitando...';
    el.id = 'typingMsg';
    $('#chat').appendChild(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  function removeTyping() {
    const t = document.getElementById('typingMsg');
    if (t) t.remove();
  }

  async function handleSend() {
    const input = $('#userInput');
    const text = input.value.trim();
    if (!text) return;
    if (!state.currentScenario) return;

    input.value = '';
    state.turn += 1;
    $('#turnCounter').textContent = String(state.turn);
    const ramonMsg = pushRamonMessage(text);

    // Avaliar turno
    $('#btnSend').disabled = true;
    $('#feedbackPanel').innerHTML = '<div style="padding:0.5em;color:var(--ink-muted)">Avaliando...</div>';
    $('#feedbackPanel').classList.add('active');

    let feedback;
    try {
      feedback = await Evaluator.evaluateTurn({
        scenario: state.currentScenario,
        conversation: state.conversation.slice(0, -1), // sem a última fala do Ramon duplicada
        lastRamon: text,
        turn: state.turn,
        data: state.data
      });
      state.turnFeedbacks.push(feedback);
      // acumular técnicas
      const ta = feedback.tecnicas_aplicadas || {};
      Object.keys(ta).forEach(k => {
        if (ta[k]) state.sessionTechniques[k] = (state.sessionTechniques[k] || 0) + 1;
      });
      state.leadCederCamada = !!feedback.lead_ceder_camada;
      state.leadEndurecer = !!feedback.lead_endurecer;
      state.podeFechar = !!feedback.pode_fechar;
      renderFeedback(feedback);
      attachMiniEval(ramonMsg.evalSlot, feedback);
    } catch (err) {
      console.error(err);
      $('#feedbackPanel').innerHTML = `<div style="color:var(--danger)">Erro na avaliação: ${escapeHtml(err.message)}</div>`;
      if (ramonMsg?.evalSlot) ramonMsg.evalSlot.innerHTML = `<div class="mini-eval low"><span class="mini-eval-summary">erro na avaliação</span></div>`;
    }

    // Se já podemos fechar ou passamos do limite → gerar resposta final do lead e encerrar
    pushTypingPlaceholder();
    try {
      const leadReply = await Evaluator.leadResponse({
        scenario: state.currentScenario,
        conversation: state.conversation,
        dojo: state.currentDojo,
        data: state.data,
        leadCederCamada: state.leadCederCamada,
        leadEndurecer: state.leadEndurecer,
        podeFechar: state.podeFechar
      });
      removeTyping();
      const leadMsg = pushLeadMessage(leadReply, { speak: state.currentDojo === 'AO_VIVO' });
      // Dica do turno — async, não bloqueia
      Evaluator.leadHint({
        scenario: state.currentScenario, leadMessage: leadReply,
        conversation: state.conversation, turn: state.turn, data: state.data
      }).then(h => attachLeadHint(leadMsg.hintSlot, h));
    } catch (err) {
      removeTyping();
      console.error(err);
      pushLeadMessage('(erro gerando resposta do lead — ' + err.message + ')');
    }

    $('#btnSend').disabled = false;

    // Critério de encerramento
    const reachedMax = state.turn >= MAX_TURNS;
    // Detecta "fechou" por texto do lead (frases de aceite) + pode_fechar
    const lastLead = state.conversation[state.conversation.length - 1]?.content || '';
    const signalsClose = /como faço pra entrar|quero entrar|bora|vamos|tô dentro|como que faz|me manda o link|manda o link|pode mandar|fecho/i.test(lastLead);
    if (state.podeFechar && signalsClose) {
      state.sessionClosed = true;
      state.sessionClosedDifficult = state.currentScenario?.nivel_dificuldade === 'dificil' || state.currentScenario?.nivel_dificuldade === 'hostil';
    }

    if (state.sessionClosed || reachedMax) {
      setTimeout(() => endSession(), 1500);
    }
  }

  function renderFeedback(f) {
    const appliedList = Object.keys(f.tecnicas_aplicadas || {}).filter(k => f.tecnicas_aplicadas[k]);
    const appliedNames = appliedList.map(id => {
      const t = Gamification.TECHNIQUES.find(x => x.id === id);
      return t ? t.name : id;
    });

    $('#feedbackPanel').innerHTML = `
      <div class="feedback-grade">${(f.nota_geral || 0).toFixed(1)} <small>/ 10</small></div>
      <div class="feedback-line"><b>✅ Ponto forte:</b> ${escapeHtml(f.ponto_forte || '—')}</div>
      <div class="feedback-line"><b>⚠️ Ajuste:</b> ${escapeHtml(f.ajuste || '—')}</div>
      <div class="feedback-line"><b>💡 Tente:</b>
        <div class="feedback-reformulacao">${escapeHtml(f.reformulacao || '')}</div>
      </div>
      <div class="feedback-line"><b>🧠 Técnica que caberia aqui:</b> ${escapeHtml(f.tecnica_que_deveria_usar || '—')}</div>
      <div class="feedback-line"><b>🎯 Conceito (Teoria da Permissão):</b> ${escapeHtml(f.conceito_que_deveria_usar || '—')}</div>
      <div class="feedback-line"><b>📚 Por quê:</b> ${escapeHtml(f.porque || '')}</div>
      ${appliedNames.length ? `<div class="feedback-line"><b>Técnicas aplicadas:</b> ${appliedNames.map(escapeHtml).join(', ')} <span class="feedback-xp-bonus">+${f.xp_bonus_tecnicas} XP</span></div>` : ''}
      ${f.armadilha_cometida ? `<div class="feedback-line" style="color:var(--danger)"><b>⚡ Armadilha:</b> ${escapeHtml(f.armadilha_cometida)}</div>` : ''}
    `;
  }

  async function endSession() {
    $('#btnSend').disabled = true;
    const panel = $('#feedbackPanel');
    panel.innerHTML += '<div style="margin-top:1em;color:var(--ink-muted)">Gerando relatório...</div>';

    let report;
    try {
      report = await Evaluator.finalReport({
        scenario: state.currentScenario,
        conversation: state.conversation,
        turnFeedbacks: state.turnFeedbacks,
        data: state.data
      });
    } catch (err) {
      console.error(err);
      report = { nota_final: 0, frase_caderno: 'Erro no relatório — ' + err.message, notas: {}, tecnicas_acumuladas: {} };
    }

    // Atualizar streak + skills
    Gamification.updateStreak();
    Gamification.updateSkillsFromScores(report.notas || {});

    // Gravar técnicas aplicadas (contador global)
    const appliedOnce = {};
    Object.keys(state.sessionTechniques).forEach(k => appliedOnce[k] = true);
    if (state.sessionClosedDifficult) appliedOnce.fechou_dificil = true;
    Gamification.recordTechniques(appliedOnce);

    // Conquistas heurísticas simples
    if (Object.values(state.sessionTechniques).reduce((a, b) => a + b, 0) > 0
        && !(state.turnFeedbacks.some(f => (f.armadilha_cometida || '').toLowerCase().includes('desconto')))) {
      Gamification.unlockAchievement('primeira_quebra');
    }
    const semClicheReligiaoLA = !state.turnFeedbacks.some(f => /clich|religi|lei da atra/i.test(f.armadilha_cometida || ''));
    if (semClicheReligiaoLA) {
      const flagKey = 'dojo:ramon:semClicheSessions';
      const cur = parseInt(localStorage.getItem(flagKey) || '0', 10) + 1;
      localStorage.setItem(flagKey, String(cur));
      if (cur >= 10) Gamification.unlockAchievement('fiel_mesa');
    }
    if (state.sessionTechniques.isolamento_concer && state.sessionTechniques.label && state.sessionTechniques.mirror) {
      Gamification.unlockAchievement('playbook_vivo');
    }

    // XP
    const profile = Gamification.getProfile();
    const daily = Gamification.getDailyChallenge();
    const dailyResult = Gamification.checkDailyCompletion(appliedOnce);
    const desafioCumprido = dailyResult.completed && !dailyResult.already;

    const xpInfo = Gamification.computeSessionXp({
      nota_geral: report.nota_final,
      streak: profile.streak,
      tecnicas_aplicadas: appliedOnce,
      fechou: state.sessionClosed,
      leadDificil: state.sessionClosedDifficult,
      desafioCumprido
    });
    Gamification.addXp(xpInfo.total);

    // Salvar sessão
    Gamification.saveSession({
      date: new Date().toISOString(),
      dojo: state.currentDojo,
      persona: state.currentScenario?.persona?.nome,
      padrao: state.currentScenario?.padrao_oculto,
      nota_final: report.nota_final,
      notas: report.notas,
      tecnicas: state.sessionTechniques,
      fechou: state.sessionClosed,
      dificuldade: state.currentScenario?.nivel_dificuldade,
      xp_ganho: xpInfo.total,
      frase_caderno: report.frase_caderno,
      turnos: state.turn
    });

    renderReport(report, xpInfo);
    showScreen('report');
  }

  function renderReport(report, xpInfo) {
    $('#reportGrade').textContent = (report.nota_final || 0).toFixed(1);
    $('#reportXp').textContent = `+${xpInfo.total} XP`;
    $('#reportXpBreakdown').innerHTML = xpInfo.breakdown.map(b =>
      `<div>• ${escapeHtml(b.label)}: <b>+${b.value}</b></div>` +
      (b.details ? `<div style="padding-left:1em;font-size:0.85em;color:var(--ink-muted)">${b.details.map(escapeHtml).join(' · ')}</div>` : '')
    ).join('');

    const skillLabels = {
      escuta: 'Escuta Ativa', objecao: 'Quebra de Objeção', dor: 'Ativação de Dor',
      conducao: 'Condução', fidelidade: 'Fidelidade à Metodologia'
    };
    $('#reportSkills').innerHTML = Object.keys(skillLabels).map(k => {
      const v = (report.notas?.[k] || 0).toFixed(1);
      return `<div class="feedback-line"><b>${skillLabels[k]}:</b> ${v}/10</div>`;
    }).join('');

    const tecs = report.tecnicas_acumuladas || {};
    const tecList = Object.keys(tecs).map(id => {
      const t = Gamification.TECHNIQUES.find(x => x.id === id);
      return `<div class="feedback-line">• ${t ? t.name : id} <b>×${tecs[id]}</b></div>`;
    }).join('');
    $('#reportTechniques').innerHTML = tecList || '<div class="muted">(nenhuma técnica bonificada foi aplicada nesta sessão)</div>';

    $('#reportPhrase').textContent = report.frase_caderno || '';
  }

  function initSession() {
    $('#btnSend').addEventListener('click', handleSend);
    $('#userInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSend();
      }
    });

    $('#btnExitSession').addEventListener('click', () => {
      if (state.turn > 0 && !state.sessionClosed && !confirm('Sair sem concluir a sessão? O progresso desta sessão será perdido.')) return;
      Speech.stopSpeaking();
      renderDashboard();
      showScreen('dashboard');
    });

    $('#btnNewSession').addEventListener('click', () => {
      startSession(state.currentDojo || 'DM_1_1');
    });

    $('#btnBackDashboard').addEventListener('click', () => {
      renderDashboard();
      showScreen('dashboard');
    });

    // Mic
    let micCountdownTimer = null;
    function stopMicCountdown() {
      if (micCountdownTimer) { clearInterval(micCountdownTimer); micCountdownTimer = null; }
    }
    function toggleMic() {
      if (!Speech.isSupported()) {
        alert('Reconhecimento de voz não suportado. Use Chrome ou Edge.');
        return;
      }
      if (Speech.isListening()) {
        Speech.stopListening();
        $('#btnMic').textContent = '🎤';
        $('#micStatus').textContent = '';
        stopMicCountdown();
        return;
      }
      $('#btnMic').textContent = '⏹️';
      const input = $('#userInput');
      const starting = input.value ? input.value + ' ' : '';

      // Contagem regressiva visual (30s)
      let remaining = 30;
      $('#micStatus').textContent = `🔴 Ouvindo... (${remaining}s — espaço ou clique pra parar)`;
      stopMicCountdown();
      micCountdownTimer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0 || !Speech.isListening()) {
          stopMicCountdown();
          return;
        }
        $('#micStatus').textContent = `🔴 Ouvindo... (${remaining}s — espaço ou clique pra parar)`;
      }, 1000);

      Speech.startListening({
        onInterim: (t) => { input.value = starting + t; },
        onFinal: (t) => { input.value = (starting + t).trim(); },
        onError: (err) => {
          $('#micStatus').textContent = 'Erro: ' + err;
          $('#btnMic').textContent = '🎤';
          stopMicCountdown();
        },
        onEnd: () => {
          $('#btnMic').textContent = '🎤';
          $('#micStatus').textContent = '';
          stopMicCountdown();
        }
      });
    }
    $('#btnMic').addEventListener('click', toggleMic);

    // Espaço toggla o mic quando a tela de sessão está ativa
    // e o foco NÃO está num input/textarea (pra não atrapalhar digitação).
    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      const sessionActive = $('#screen-session').classList.contains('active');
      if (!sessionActive) return;
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'textarea' || tag === 'input') return;
      e.preventDefault();
      toggleMic();
    });
  }

  // ========= BOOT =========
  async function boot() {
    initWelcome();
    initDashboard();
    initSession();

    try {
      await loadData();
    } catch (err) {
      alert('Erro ao carregar data/*.json: ' + err.message + '\n\nVocê está servindo via http://? (abra com python3 -m http.server 8080)');
    }
  }

  window.addEventListener('DOMContentLoaded', boot);
})();
