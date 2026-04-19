// app.js v2 — orquestração Arena 2 (Chamada 1×1 Pós-Evento)

(() => {

  // ========= STATE =========
  const state = {
    data: {},
    dataLoaded: false,
    submodo: null,
    currentScenario: null,
    conversation: [],
    turn: 0,
    turnFeedbacks: [],
    sessionTechniques: {},      // contador por técnica
    passosCumpridos: [],         // lista única ordenada de passos feitos
    stepsByTurn: [],             // { turn, stepExecuted, stepIdeal }
    silences: [],                // segundos de silêncio antes de cada turno do Ramon
    sessionClosed: false,
    sessionClosedDifficult: false,
    leadCederCamada: false,
    leadEndurecer: false,
    podeFechar: false,
    modoChamada: false,          // (legacy — substituído pelo call state)
    silenceTickTimer: null,
    call: {
      active: false,
      paused: false,
      phase: 'idle',       // idle | lead_speaking | listening | processing | paused
      countdownTimer: null
    }
  };

  const MAX_TURNS = 18;
  const SILENCE_AUTO_SEND_MS = 7000;   // 7s de silêncio → auto-envio

  function $(s) { return document.querySelector(s); }
  function $$(s) { return [...document.querySelectorAll(s)]; }
  function esc(s) {
    return (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    $(`#screen-${id}`).classList.add('active');
    window.scrollTo(0, 0);
  }

  // ========= DATA LOADING =========
  async function loadData() {
    const files = [
      'caminho_18_passos', 'produto_alianca', 'conceitos_permissao',
      'frases_ancora', 'persona_improvavel', 'dores_por_area',
      'casos_provas', 'tecnicas_compendio', 'objecoes_scripts'
    ];
    const data = {};
    for (const f of files) {
      const r = await fetch(`data/${f}.json`);
      if (!r.ok) throw new Error(`${f}.json ${r.status}`);
      data[f] = await r.json();
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
      if (!key) { alert('Cole a Anthropic API key pra começar.'); return; }
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
    const tiers = Gamification.getTierLevels();
    const techs = Gamification.getTechniques();
    const achievements = Gamification.getAchievements();
    const daily = Gamification.getDailyChallenge();

    $('#userName').textContent = p.name;
    $('#streakCount').textContent = p.streak || 0;
    $('#semanaAtual').textContent = p.semana_atual || 1;

    // Missão da semana
    const semanaIdx = Math.min(7, (p.semana_atual || 1) - 1);
    const missao = Gamification.MISSAO_8_SEMANAS[semanaIdx];
    $('#missaoText').textContent = missao ? missao.foco : '—';

    // Daily
    $('#challengeText').textContent = daily.text;
    const badge = $('#challengeStatus');
    if (daily.completed) { badge.textContent = '✓ Cumprido'; badge.classList.add('done'); }
    else { badge.textContent = '+25 XP'; badge.classList.remove('done'); }

    // Tiers
    $('#tiersGrid').innerHTML = Gamification.TIERS.map(t => {
      const tl = tiers[t.id] || { level: 1, xp: 0 };
      const need = Gamification.xpToLevel(tl.level);
      const pct = Math.min(100, Math.round((tl.xp / need) * 100));
      return `<div class="tier-card ${t.id}">
        <div class="tier-head">
          <span class="tier-name">${esc(t.nome)}</span>
          <span class="tier-level">L${tl.level}</span>
        </div>
        <div class="tier-desc">${esc(t.descricao)}</div>
        <div class="tier-bar"><div class="tier-fill" style="width:${pct}%"></div></div>
        <div class="tier-xp">${tl.xp} / ${need} XP</div>
      </div>`;
    }).join('');

    // Sub-modos
    $('#submodosGrid').innerHTML = Object.keys(Scenarios.SUB_MODOS).map(key => {
      const m = Scenarios.SUB_MODOS[key];
      return `<div class="submodo-card" data-submodo="${key}">
        <div class="submodo-icon">${m.icone}</div>
        <div class="submodo-name">${esc(m.nome)}</div>
        <div class="submodo-desc">${esc(m.descricao)}</div>
        <div class="submodo-meta">
          <span>${m.passos_alvo.length} passos</span>
          <span>~${m.tempo_estimado_min} min</span>
        </div>
      </div>`;
    }).join('');
    $$('.submodo-card').forEach(c => {
      c.addEventListener('click', () => startSession(c.dataset.submodo));
    });

    // Técnicas
    $('#techniquesGrid').innerHTML = Gamification.TECHNIQUES.map(t => {
      const count = techs[t.id] || 0;
      const mastered = count >= 5;
      const unused = count === 0;
      return `<div class="technique tier-${t.tier} ${mastered ? 'mastered' : ''} ${unused ? 'unused' : ''}">
        <div class="technique-name">${esc(t.name)}</div>
        <div class="technique-count">${count}×</div>
      </div>`;
    }).join('');

    // Conquistas
    $('#achievementsGrid').innerHTML = Gamification.ACHIEVEMENTS.map(a => `
      <div class="achievement ${achievements[a.id] ? '' : 'locked'}" title="${esc(a.desc)}">
        <div class="achievement-icon">${a.icon}</div>
        <div>
          <div style="font-weight:600">${esc(a.name)}</div>
          <div style="font-size:0.75em;color:var(--ink-muted)">${esc(a.desc)}</div>
        </div>
      </div>
    `).join('');
  }

  function initDashboard() {
    $('#btnChangeKey').addEventListener('click', () => {
      const k = prompt('Nova API key:', ClaudeAPI.getKey());
      if (k && k.trim()) { ClaudeAPI.setKey(k.trim()); }
    });
    $('#btnResetProfile').addEventListener('click', () => {
      if (confirm('Apagar todo o progresso local? (XP, tiers, conquistas, sessões) — não pode ser desfeito.')) {
        Gamification.resetAll();
        location.reload();
      }
    });
  }

  // ========= SESSION =========
  async function startSession(submodo) {
    state.submodo = submodo;
    state.conversation = [];
    state.turn = 0;
    state.turnFeedbacks = [];
    state.sessionTechniques = {};
    state.passosCumpridos = [];
    state.stepsByTurn = [];
    state.silences = [];
    state.sessionClosed = false;
    state.sessionClosedDifficult = false;
    state.leadCederCamada = false;
    state.leadEndurecer = false;
    state.podeFechar = false;

    const m = Scenarios.SUB_MODOS[submodo];
    $('#sessionModoName').textContent = `${m.icone} ${m.nome}`;
    $('#chat').innerHTML = '';
    $('#feedbackPanel').classList.remove('active');
    $('#feedbackPanel').innerHTML = '';
    $('#userInput').value = '';
    $('#turnCounter').textContent = '1';

    renderCaminhoMap([]);

    // Reset call state ao iniciar nova sessão
    endCall();
    updateCallUI();

    showScreen('session');

    $('#personaTitle').textContent = 'Gerando cenário...';
    $('#personaMeta').textContent = '';
    $('#personaTrigger').textContent = '';
    $('#personaHint').innerHTML = '';
    $('#sessionPersonaName').textContent = '...';

    try {
      const tierLevels = Gamification.getTierLevels();
      const scenario = await Scenarios.generate({ submodo, data: state.data, tierLevels });
      state.currentScenario = scenario;
      renderPersona(scenario);

      const { hintSlot } = pushLeadMessage(scenario.primeira_mensagem_lead);
      Evaluator.leadHint({
        scenario, leadMessage: scenario.primeira_mensagem_lead,
        conversation: state.conversation, turn: 0, data: state.data
      }).then(h => attachLeadHint(hintSlot, h));
    } catch (err) {
      console.error(err);
      $('#personaTitle').textContent = 'Erro ao gerar cenário';
      $('#personaMeta').textContent = err.message;
    }
  }

  function renderPersona(sc) {
    $('#sessionPersonaName').textContent = sc.persona.nome;
    $('#personaTitle').textContent = `${sc.persona.nome}, ${sc.persona.idade}`;
    $('#personaMeta').textContent = `${sc.persona.profissao} — ${sc.persona.cidade}. ${sc.persona.situacao_atual}`;
    $('#personaTrigger').textContent = `Evento: ${sc.evento_origem} · Gatilho: ${sc.gatilho_contato}`;
    const techs = sc.tecnicas_ideais_aqui || [];
    $('#personaHint').innerHTML = `
      <div class="tec-line"><b>Objeção superficial:</b> ${esc(sc.objecao_superficial)}</div>
      <div class="tec-line"><b>Objeção real (oculta):</b> ${esc(sc.objecao_real)}</div>
      <div class="tec-line"><b>Padrão Teoria da Permissão:</b> ${esc(sc.padrao_oculto_teoria_permissao)}</div>
      <div class="tec-line"><b>Dificuldade:</b> ${esc(sc.dificuldade)}</div>
      <div class="tec-line" style="margin-top:0.8em"><b>Técnicas ideais aqui:</b></div>
      <div class="tec-cards">${renderTechniqueCards(techs)}</div>
      <div class="tec-line" style="margin-top:0.5em"><b>Conceitos em jogo:</b> ${esc((sc.conceitos_ideais_aqui || []).join(', '))}</div>
    `;
  }

  function renderTechniqueCards(names) {
    if (!names || !names.length) return '<span class="muted">—</span>';
    return names.map(raw => {
      const guide = findTechniqueGuide(raw);
      if (!guide) {
        return `<div class="tec-card"><div class="tec-card-head">
          <span class="tec-card-name">${esc(raw)}</span>
          <span class="muted">técnica não catalogada</span>
        </div></div>`;
      }
      return `<details class="tec-card">
        <summary class="tec-card-head">
          <span class="tec-card-name">${esc(guide.nome)}</span>
          <span class="tec-card-more">saber mais ▾</span>
        </summary>
        <div class="tec-card-body">
          <div class="tec-line"><b>O quê:</b> ${esc(guide.resumo)}</div>
          <div class="tec-line"><b>Quando usar:</b> ${esc(guide.quando_usar)}</div>
          <div class="tec-line"><b>Exemplo:</b><br><span class="tec-example">${esc(guide.exemplo)}</span></div>
          <div class="tec-line tec-origem">Origem: ${esc(guide.autor)}</div>
        </div>
      </details>`;
    }).join('');
  }

  function findTechniqueGuide(rawName) {
    const techs = state.data.tecnicas_compendio?.tecnicas || [];
    const norm = (rawName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (!norm) return null;
    for (const t of techs) {
      if ((t.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(norm)) return t;
      if ((t.aliases || []).some(a => norm.includes(a) || a.includes(norm))) return t;
    }
    return null;
  }

  // ========= MAPA 18 PASSOS =========
  function renderCaminhoMap(passosCumpridos, passoAtual = null) {
    const passos = state.data.caminho_18_passos?.passos || [];
    const stripHtml = passos.map(p => {
      const done = passosCumpridos.includes(p.numero);
      const current = passoAtual === p.numero;
      const alavanca = p.is_alavanca_maxima;
      let cls = 'caminho-step';
      if (done) cls += ' done';
      if (current) cls += ' current';
      if (alavanca) cls += ' alavanca';
      return `<div class="${cls}" data-step="${p.numero}">
        ${p.numero}
        <span class="caminho-tooltip">${p.numero}. ${esc(p.nome)} <br><small>${esc(p.tecnica)} · ${esc(p.autor)}</small></span>
      </div>`;
    }).join('');
    $('#caminhoStrip').innerHTML = stripHtml;
  }

  // ========= MESSAGES =========
  function pushLeadMessage(text) {
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
      <div class="lead-hint-body"><em class="muted">Carregando análise...</em></div>
    </details>`;
    wrap.appendChild(hintSlot);

    $('#chat').appendChild(wrap);
    wrap.scrollIntoView({ behavior: 'smooth', block: 'end' });
    return { wrap, bubble: el, hintSlot };
  }

  function pushRamonMessage(text, silenceSec) {
    state.conversation.push({ role: 'user', content: text });
    const wrap = document.createElement('div');
    wrap.className = 'msg-wrap ramon-wrap';

    const el = document.createElement('div');
    el.className = 'msg ramon';
    el.textContent = text;
    wrap.appendChild(el);

    const evalSlot = document.createElement('div');
    evalSlot.className = 'eval-slot';
    evalSlot.innerHTML = `<div class="mini-eval pending"><span class="muted">avaliando...</span></div>`;
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
    const stepExec = feedback.passo_do_caminho_executado;

    evalSlot.innerHTML = `<details class="mini-eval ${gradeClass}">
      <summary class="mini-eval-head">
        <span class="mini-eval-grade">${nota}</span>
        <span class="mini-eval-summary">${esc(ajuste || ponto || 'avaliado')}</span>
        ${stepExec ? `<span class="mini-eval-tag step">Passo ${stepExec}</span>` : ''}
        ${appliedCount ? `<span class="mini-eval-tag">+${feedback.xp_bonus_tecnicas || 0} XP · ${appliedCount} téc</span>` : ''}
        ${trap ? `<span class="mini-eval-tag warn">⚡ armadilha</span>` : ''}
      </summary>
      <div class="mini-eval-body">
        ${ponto ? `<div class="mini-line"><b>✅</b> ${esc(ponto)}</div>` : ''}
        ${ajuste ? `<div class="mini-line"><b>⚠️</b> ${esc(ajuste)}</div>` : ''}
        ${feedback.reformulacao ? `<div class="mini-line mini-reform"><b>💡 Tente:</b> ${esc(feedback.reformulacao)}</div>` : ''}
        ${feedback.tecnica_que_deveria_usar ? `<div class="mini-line"><b>🧠</b> ${esc(feedback.tecnica_que_deveria_usar)}</div>` : ''}
        ${feedback.conceito_que_deveria_usar ? `<div class="mini-line"><b>🎯</b> ${esc(feedback.conceito_que_deveria_usar)}</div>` : ''}
        ${feedback.tonalidades_detectadas?.length ? `<div class="mini-line"><b>🎵 Tonalidades:</b> ${esc(feedback.tonalidades_detectadas.join(', '))}</div>` : ''}
        ${trap ? `<div class="mini-line warn"><b>⚡ Armadilha:</b> ${esc(trap)}</div>` : ''}
      </div>
    </details>`;
  }

  function attachLeadHint(hintSlot, hint) {
    if (!hintSlot) return;
    if (!hint) {
      hintSlot.innerHTML = `<details class="lead-hint-box">
        <summary><span class="hint-chip">🤫 dica do turno</span> <span class="muted">análise indisponível</span></summary>
      </details>`;
      return;
    }
    const techs = (hint.tecnicas_sugeridas || []).map(t => {
      const guide = findTechniqueGuide(t.nome);
      const ref = guide ? guide.nome : t.nome;
      return `<div class="hint-tec">
        <div class="hint-tec-head"><b>▸ ${esc(ref)}</b></div>
        <div class="hint-tec-why">${esc(t.porque || '')}</div>
      </div>`;
    }).join('');

    const sugPasso = hint.passo_do_caminho_sugerido;
    hintSlot.innerHTML = `<details class="lead-hint-box">
      <summary>
        <span class="hint-chip">🤫 dica do turno</span>
        <span class="hint-status">${esc(hint.categoria || '—')}${hint.camada_revelada ? ' · ' + esc(hint.camada_revelada) : ''}${sugPasso ? ' · passo ' + sugPasso : ''}</span>
      </summary>
      <div class="lead-hint-body">
        <div class="hint-line"><b>Provável objeção agora:</b> ${esc(hint.possivel_objecao || '—')}</div>
        ${hint.conceito_permissao_em_jogo ? `<div class="hint-line"><b>Conceito em jogo:</b> ${esc(hint.conceito_permissao_em_jogo)}</div>` : ''}
        ${hint.o_que_observar ? `<div class="hint-line"><b>O que observar:</b> ${esc(hint.o_que_observar)}</div>` : ''}
        ${techs ? `<div class="hint-line"><b>Caminhos possíveis:</b></div>${techs}` : ''}
      </div>
    </details>`;
  }

  function pushTypingPlaceholder() {
    const el = document.createElement('div');
    el.className = 'msg lead typing';
    el.dataset.persona = state.currentScenario?.persona?.nome || 'Lead';
    el.textContent = 'pensando...';
    el.id = 'typingMsg';
    $('#chat').appendChild(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
  function removeTyping() { const t = document.getElementById('typingMsg'); if (t) t.remove(); }

  // (silence meter UI legacy removido — substituído pelo call panel)
  function stopSilenceTick() { /* no-op */ }

  // ========= SEND =========
  async function handleSend() {
    const input = $('#userInput');
    const text = input.value.trim();
    if (!text || !state.currentScenario) return;

    // Captura o silêncio ANTES de enviar (tempo que o Ramon ficou quieto antes de falar)
    const silenceSec = Speech.captureAndResetSilence();
    state.silences.push({ turn: state.turn + 1, seconds: silenceSec });
    stopSilenceTick();
    updateSilenceMeter();

    input.value = '';
    state.turn += 1;
    $('#turnCounter').textContent = String(state.turn);
    const ramonMsg = pushRamonMessage(text, silenceSec);

    $('#btnSend').disabled = true;
    $('#feedbackPanel').innerHTML = '<div style="padding:0.5em;color:var(--ink-muted)">Avaliando...</div>';
    $('#feedbackPanel').classList.add('active');

    let feedback;
    try {
      feedback = await Evaluator.evaluateTurn({
        scenario: state.currentScenario,
        conversation: state.conversation.slice(0, -1),
        lastRamon: text,
        turn: state.turn,
        data: state.data,
        passosCumpridosAnteriormente: state.passosCumpridos
      });
      state.turnFeedbacks.push(feedback);

      const ta = feedback.tecnicas_aplicadas || {};
      Object.keys(ta).forEach(k => {
        if (ta[k]) state.sessionTechniques[k] = (state.sessionTechniques[k] || 0) + 1;
      });
      state.leadCederCamada = !!feedback.lead_ceder_camada;
      state.leadEndurecer = !!feedback.lead_endurecer;
      state.podeFechar = !!feedback.pode_fechar;

      // Bônus: silêncio ≥ 3s + técnica de silêncio
      if (silenceSec >= 3) {
        state.sessionTechniques['silencio_dinamico'] = (state.sessionTechniques['silencio_dinamico'] || 0) + 1;
      }

      // Acumula passos cumpridos
      const stepDone = feedback.passo_do_caminho_executado;
      if (stepDone && !state.passosCumpridos.includes(stepDone)) {
        state.passosCumpridos.push(stepDone);
        state.passosCumpridos.sort((a, b) => a - b);
      }
      state.stepsByTurn.push({
        turn: state.turn,
        stepExecuted: stepDone,
        stepIdeal: feedback.passo_do_caminho_ideal_agora
      });

      renderCaminhoMap(state.passosCumpridos, feedback.passo_do_caminho_ideal_agora);
      renderFeedback(feedback);
      attachMiniEval(ramonMsg.evalSlot, feedback);
    } catch (err) {
      console.error(err);
      $('#feedbackPanel').innerHTML = `<div style="color:var(--danger)">Erro na avaliação: ${esc(err.message)}</div>`;
      if (ramonMsg?.evalSlot) ramonMsg.evalSlot.innerHTML = `<div class="mini-eval low"><span class="mini-eval-summary">erro</span></div>`;
    }

    // Resposta do lead
    pushTypingPlaceholder();
    try {
      const leadReply = await Evaluator.leadResponse({
        scenario: state.currentScenario,
        conversation: state.conversation,
        data: state.data,
        leadCederCamada: state.leadCederCamada,
        leadEndurecer: state.leadEndurecer,
        podeFechar: state.podeFechar
      });
      removeTyping();
      const leadMsg = pushLeadMessage(leadReply);
      Evaluator.leadHint({
        scenario: state.currentScenario, leadMessage: leadReply,
        conversation: state.conversation, turn: state.turn, data: state.data
      }).then(h => attachLeadHint(leadMsg.hintSlot, h));
    } catch (err) {
      removeTyping();
      console.error(err);
      pushLeadMessage('(erro: ' + err.message + ')');
    }

    $('#btnSend').disabled = false;

    // Check close
    const reachedMax = state.turn >= MAX_TURNS;
    const lastLead = state.conversation[state.conversation.length - 1]?.content || '';
    const signalsClose = /como fa[çc]o|quero entrar|bora|vamos|t[oô] dentro|me manda|pode mandar|fecho|pode come[çc]ar|vamos l[aá]/i.test(lastLead);
    if (state.podeFechar && signalsClose) {
      state.sessionClosed = true;
      state.sessionClosedDifficult = ['dificil', 'hostil'].includes(state.currentScenario?.dificuldade);
    }
    if (state.sessionClosed || reachedMax) {
      setTimeout(() => endSession(), 1500);
    }
  }

  function renderFeedback(f) {
    const applied = Object.keys(f.tecnicas_aplicadas || {}).filter(k => f.tecnicas_aplicadas[k]);
    const names = applied.map(id => {
      const t = Gamification.TECHNIQUES.find(x => x.id === id);
      return t ? t.name : id;
    });
    $('#feedbackPanel').innerHTML = `
      <div class="feedback-grade">${(f.nota_geral || 0).toFixed(1)} <small>/ 10</small></div>
      <div class="feedback-line"><b>✅ Ponto forte:</b> ${esc(f.ponto_forte || '—')}</div>
      <div class="feedback-line"><b>⚠️ Ajuste:</b> ${esc(f.ajuste || '—')}</div>
      <div class="feedback-line"><b>💡 Tente:</b>
        <div class="feedback-reformulacao">${esc(f.reformulacao || '')}</div>
      </div>
      ${f.passo_do_caminho_executado ? `<div class="feedback-line"><b>🗺️ Passo do Caminho executado:</b> ${f.passo_do_caminho_executado} / 18</div>` : ''}
      ${f.passo_do_caminho_ideal_agora ? `<div class="feedback-line"><b>🧭 Passo ideal agora:</b> ${f.passo_do_caminho_ideal_agora} / 18</div>` : ''}
      <div class="feedback-line"><b>🧠 Técnica que caberia:</b> ${esc(f.tecnica_que_deveria_usar || '—')}</div>
      <div class="feedback-line"><b>🎯 Conceito (Teoria da Permissão):</b> ${esc(f.conceito_que_deveria_usar || '—')}</div>
      <div class="feedback-line"><b>📚 Por quê:</b> ${esc(f.porque || '')}</div>
      ${names.length ? `<div class="feedback-line"><b>Técnicas aplicadas:</b> ${names.map(esc).join(', ')} <span class="feedback-xp-bonus">+${f.xp_bonus_tecnicas} XP</span></div>` : ''}
      ${f.armadilha_cometida ? `<div class="feedback-line" style="color:var(--danger)"><b>⚡ Armadilha:</b> ${esc(f.armadilha_cometida)}</div>` : ''}
    `;
  }

  // ========= END SESSION / REPORT =========
  async function endSession() {
    $('#btnSend').disabled = true;
    stopSilenceTick();
    Speech.stopSpeaking();

    const panel = $('#feedbackPanel');
    panel.innerHTML += '<div style="margin-top:1em;color:var(--ink-muted)">Gerando relatório...</div>';

    let report;
    try {
      report = await Evaluator.finalReport({
        scenario: state.currentScenario,
        conversation: state.conversation,
        turnFeedbacks: state.turnFeedbacks,
        passosCumpridos: state.passosCumpridos,
        data: state.data
      });
    } catch (err) {
      console.error(err);
      report = { nota_final: 0, frase_caderno: 'Erro: ' + err.message, notas: {}, tecnicas_acumuladas: {}, passos_cumpridos: [], cobertura_pct: 0 };
    }

    Gamification.updateStreak();
    Gamification.updateSkillsFromScores(report.notas || {});
    Gamification.recordStepHits(state.passosCumpridos);

    const appliedOnce = {};
    Object.keys(state.sessionTechniques).forEach(k => appliedOnce[k] = true);
    if (state.sessionClosed) appliedOnce.fechou_venda = true;
    if (state.sessionClosedDifficult) appliedOnce.fechou_dificil = true;
    Gamification.recordTechniques(appliedOnce);

    const profile = Gamification.getProfile();
    const dailyRes = Gamification.checkDailyCompletion(appliedOnce);
    const desafioCumprido = dailyRes.completed && !dailyRes.already;

    // Bônus ordem: conta se 3+ passos sequenciais
    let ordemBonus = 0;
    const passos = state.passosCumpridos;
    let seq = 1;
    for (let i = 1; i < passos.length; i++) {
      if (passos[i] === passos[i-1] + 1) { seq++; if (seq >= 3) ordemBonus += 10; }
      else seq = 1;
    }

    const xpInfo = Gamification.computeSessionXp({
      nota_geral: report.nota_final,
      streak: profile.streak,
      tecnicas_aplicadas: appliedOnce,
      stepsCompleted: state.passosCumpridos,
      fechou: state.sessionClosed,
      leadDificil: state.sessionClosedDifficult,
      desafioCumprido,
      ordemBonus
    });
    const leveledUp = Gamification.applySessionXp(xpInfo);

    // Check achievements
    if (state.turnFeedbacks.length > 0) Gamification.unlockAchievement('primeiro_caminho');
    const semArmadilhaCritica = !state.turnFeedbacks.some(f => /clich|religi|lei da atra|desconto/i.test(f.armadilha_cometida || ''));
    if (semArmadilhaCritica) {
      const k = 'dojo:ramon:semClicheSessions';
      const cur = parseInt(localStorage.getItem(k) || '0', 10) + 1;
      localStorage.setItem(k, String(cur));
      if (cur >= 10) Gamification.unlockAchievement('fiel_mesa');
    }
    if (state.sessionTechniques.metodo_4_passos_concer) Gamification.unlockAchievement('playbook_concer');

    Gamification.saveSession({
      date: new Date().toISOString(),
      submodo: state.submodo,
      persona: state.currentScenario?.persona?.nome,
      padrao: state.currentScenario?.padrao_oculto_teoria_permissao,
      nota_final: report.nota_final,
      notas: report.notas,
      passos_cumpridos: state.passosCumpridos,
      tecnicas: state.sessionTechniques,
      silences: state.silences,
      fechou: state.sessionClosed,
      dificuldade: state.currentScenario?.dificuldade,
      xp_ganho: xpInfo.total,
      frase_caderno: report.frase_caderno,
      turnos: state.turn
    });

    renderReport(report, xpInfo, leveledUp);
    showScreen('report');
  }

  function renderReport(report, xpInfo, leveledUp) {
    $('#reportGrade').textContent = (report.nota_final || 0).toFixed(1);
    $('#reportXp').textContent = `+${xpInfo.total} XP`;
    $('#reportXpBreakdown').innerHTML = xpInfo.breakdown.map(b =>
      `<div>• ${esc(b.label)}: <b>+${b.value}</b></div>` +
      (b.details ? `<div style="padding-left:1em;font-size:0.85em;color:var(--ink-muted)">${b.details.map(esc).join(' · ')}</div>` : '')
    ).join('');

    if (leveledUp.length) {
      $('#reportLevelUps').innerHTML = leveledUp.map(l => {
        const tier = Gamification.TIERS.find(t => t.id === l.tier);
        return `<span class="level-up-badge">🎉 ${tier ? tier.nome : l.tier} → L${l.newLevel}</span>`;
      }).join('');
    } else {
      $('#reportLevelUps').innerHTML = '';
    }

    // Caminho percorrido
    const passos = state.data.caminho_18_passos?.passos || [];
    const passosDone = report.passos_cumpridos || [];
    const stripHtml = passos.map(p => {
      const done = passosDone.includes(p.numero);
      let cls = 'caminho-step';
      if (done) cls += ' done';
      if (p.is_alavanca_maxima) cls += ' alavanca';
      return `<div class="${cls}">${p.numero}</div>`;
    }).join('');
    const alavancasDone = passos.filter(p => p.is_alavanca_maxima && passosDone.includes(p.numero)).length;
    const alavancasTotal = passos.filter(p => p.is_alavanca_maxima).length;
    $('#reportCaminho').innerHTML = `
      <div class="report-caminho-viz">${stripHtml}</div>
      <div class="report-caminho-summary">
        <b>${passosDone.length}</b> de 18 passos cumpridos (${report.cobertura_pct || 0}%) ·
        <b>${alavancasDone}</b>/${alavancasTotal} alavancas máximas
      </div>
    `;

    // Skills
    const labels = {
      escuta: 'Escuta Ativa', investigacao: 'Investigação',
      apresentacao: 'Apresentação', fechamento: 'Condução ao Fechamento',
      fidelidade: 'Fidelidade à Metodologia'
    };
    $('#reportSkills').innerHTML = Object.keys(labels).map(k => {
      const v = (report.notas?.[k] || 0).toFixed(1);
      return `<div class="feedback-line"><b>${labels[k]}:</b> ${v}/10</div>`;
    }).join('');

    // Técnicas
    const tecs = report.tecnicas_acumuladas || {};
    const tecList = Object.keys(tecs).map(id => {
      const t = Gamification.TECHNIQUES.find(x => x.id === id);
      return `<div class="feedback-line">• ${t ? t.name : id} <b>×${tecs[id]}</b></div>`;
    }).join('');
    $('#reportTechniques').innerHTML = tecList || '<div class="muted">(nenhuma técnica bonificada nesta sessão)</div>';

    // Silêncios
    const sil = state.silences.filter(s => s.seconds > 0);
    if (sil.length) {
      const chips = sil.map(s => {
        const cls = s.seconds >= 3 ? 'good' : s.seconds >= 1 ? '' : 'low';
        return `<span class="silence-chip ${cls}">Turno ${s.turn}: ${s.seconds.toFixed(1)}s</span>`;
      }).join('');
      const med = (sil.reduce((a, b) => a + b.seconds, 0) / sil.length).toFixed(1);
      $('#reportSilences').innerHTML = `<div class="silence-list">${chips}</div>
        <div style="margin-top:0.5em;font-size:0.9em;color:var(--ink-soft)">Média: <b>${med}s</b> · ${sil.filter(s => s.seconds >= 3).length} silêncios ≥ 3s</div>`;
    } else {
      $('#reportSilences').innerHTML = '<div class="muted">(modo chamada desligado ou sem dados)</div>';
    }

    $('#reportPhrase').textContent = report.frase_caderno || '';
  }

  // ========= CALL STATE MACHINE =========
  function updateCallUI() {
    const panel = $('#callPanel');
    const status = $('#callStatus');
    const btnStart = $('#btnCallStart');
    const btnPause = $('#btnCallPause');
    const btnResume = $('#btnCallResume');
    const btnEnd = $('#btnCallEnd');

    btnStart.hidden = state.call.active;
    btnPause.hidden = !(state.call.active && !state.call.paused);
    btnResume.hidden = !(state.call.active && state.call.paused);
    btnEnd.hidden = !state.call.active;

    panel.classList.toggle('active', state.call.active && !state.call.paused);
    panel.classList.toggle('paused', state.call.active && state.call.paused);

    const phaseMap = {
      idle: '🟢 Pronto (modo texto)',
      lead_speaking: '<span class="ping"></span> 🔊 Lead falando...',
      listening: '<span class="ping"></span> 🎤 Ouvindo você... <span class="muted" style="font-weight:400;font-size:0.85em">(7s de silêncio = envia)</span>',
      processing: '🤔 Processando resposta...',
      paused: '⏸️ Em pausa'
    };
    status.innerHTML = phaseMap[state.call.phase] || phaseMap.idle;

    // Enquanto chamada ativa, desabilita mic/send manuais
    $('#btnMic').disabled = state.call.active && !state.call.paused;
    $('#btnSend').disabled = state.call.active && !state.call.paused;
  }

  function startCall() {
    if (!state.currentScenario) {
      alert('Precisa estar numa sessão ativa pra iniciar a chamada.');
      return;
    }
    state.call.active = true;
    state.call.paused = false;
    Speech.stopSpeaking();
    Speech.stopListening();
    // Fala a última mensagem do lead (ou a primeira se ainda não respondeu)
    const last = [...state.conversation].reverse().find(m => m.role === 'assistant');
    if (last) {
      speakLeadThenListen(last.content);
    } else {
      beginListening();
    }
    updateCallUI();
  }

  function pauseCall() {
    state.call.paused = true;
    state.call.phase = 'paused';
    Speech.stopSpeaking();
    Speech.stopListening();
    stopCountdownTicker();
    updateCallUI();
  }

  function resumeCall() {
    state.call.paused = false;
    // Retoma falando a última mensagem do lead, ou indo direto pra listening se Ramon já estava falando
    const last = [...state.conversation].reverse().find(m => m.role === 'assistant');
    const ramonFaloumaisRecente = state.conversation.length > 0 && state.conversation[state.conversation.length - 1].role === 'user';
    if (last && !ramonFaloumaisRecente) {
      speakLeadThenListen(last.content);
    } else {
      beginListening();
    }
    updateCallUI();
  }

  function endCall() {
    state.call.active = false;
    state.call.paused = false;
    state.call.phase = 'idle';
    Speech.stopSpeaking();
    Speech.stopListening();
    stopCountdownTicker();
    updateCallUI();
  }

  function speakLeadThenListen(text) {
    state.call.phase = 'lead_speaking';
    updateCallUI();
    Speech.resetSilenceTimer();
    Speech.speak(text, {
      onEnd: () => {
        if (state.call.active && !state.call.paused) {
          beginListening();
        }
      }
    });
  }

  function beginListening() {
    state.call.phase = 'listening';
    updateCallUI();
    const input = $('#userInput');
    input.value = '';    // limpa anterior pra captura nova
    startCountdownTicker();

    Speech.startListening({
      silenceTimeoutMs: SILENCE_AUTO_SEND_MS,
      maxListenMs: 90000,
      onInterim: (t) => { input.value = t; },
      onFinal: (t) => { input.value = t; },
      onAutoStop: (finalText) => {
        stopCountdownTicker();
        const text = (finalText || '').trim();
        // valida tamanho mínimo — se muito curto, assume falha de captura e reinicia
        if (!text || text.split(/\s+/).length < 2) {
          if (state.call.active && !state.call.paused) {
            // tenta de novo
            beginListening();
          }
          return;
        }
        state.call.phase = 'processing';
        updateCallUI();
        autoSubmitFromCall(text);
      },
      onError: (err) => {
        stopCountdownTicker();
        $('#micStatus').textContent = 'Erro: ' + err;
        // não encerra a chamada — só registra
      },
      onEnd: () => {
        stopCountdownTicker();
      }
    });
  }

  async function autoSubmitFromCall(text) {
    $('#userInput').value = text;
    await handleSend();    // handleSend já roda a avaliação e busca a resposta do lead
    // Depois que handleSend retorna, a mensagem do lead já foi adicionada.
    // Em call mode, vamos falar a nova mensagem do lead e voltar a ouvir.
    if (!state.call.active || state.call.paused) { return; }
    if (state.sessionClosed) { endCall(); return; }
    const last = [...state.conversation].reverse().find(m => m.role === 'assistant');
    if (last) {
      speakLeadThenListen(last.content);
    } else {
      beginListening();
    }
  }

  function startCountdownTicker() {
    stopCountdownTicker();
    state.call.countdownTimer = setInterval(() => {
      if (state.call.phase !== 'listening') return;
      const since = Speech.getMsSinceLastResult();
      const status = $('#callStatus');
      if (since == null) {
        status.innerHTML = '<span class="ping"></span> 🎤 Ouvindo você... <span class="muted" style="font-weight:400;font-size:0.85em">(aguardando fala)</span>';
        return;
      }
      const remaining = Math.max(0, SILENCE_AUTO_SEND_MS - since);
      if (remaining < SILENCE_AUTO_SEND_MS) {
        const sec = (remaining / 1000).toFixed(1);
        status.innerHTML = `<span class="ping"></span> 🎤 Ouvindo você... <span class="call-countdown">envia em ${sec}s</span>`;
      }
    }, 200);
  }

  function stopCountdownTicker() {
    if (state.call.countdownTimer) {
      clearInterval(state.call.countdownTimer);
      state.call.countdownTimer = null;
    }
  }

  // ========= INIT SESSION HANDLERS =========
  function initSession() {
    $('#btnSend').addEventListener('click', handleSend);
    $('#userInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSend();
      }
    });

    $('#btnExitSession').addEventListener('click', () => {
      if (state.turn > 0 && !state.sessionClosed && !confirm('Sair sem concluir? O progresso será perdido.')) return;
      Speech.stopSpeaking();
      stopSilenceTick();
      renderDashboard();
      showScreen('dashboard');
    });

    $('#btnNewSession').addEventListener('click', () => {
      startSession(state.submodo || 'caminho_completo');
    });
    $('#btnBackDashboard').addEventListener('click', () => {
      renderDashboard();
      showScreen('dashboard');
    });

    // Call controls
    $('#btnCallStart').addEventListener('click', startCall);
    $('#btnCallPause').addEventListener('click', pauseCall);
    $('#btnCallResume').addEventListener('click', resumeCall);
    $('#btnCallEnd').addEventListener('click', endCall);

    // ESC cancela o countdown de auto-envio (volta a ouvir)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.call.active && state.call.phase === 'listening') {
        // Nada a fazer aqui diretamente — o watchdog só dispara após 7s sem fala
        // ESC pode ser usado para forçar "continuar ouvindo": reset lastResultAt via nova fala
      }
    });

    // Mic with countdown
    let micCountdownTimer = null;
    function stopMicCountdown() { if (micCountdownTimer) { clearInterval(micCountdownTimer); micCountdownTimer = null; } }
    function toggleMic() {
      if (!Speech.isSupported()) { alert('Reconhecimento de voz não suportado. Use Chrome/Edge.'); return; }
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
      let remaining = 30;
      $('#micStatus').textContent = `🔴 Ouvindo... (${remaining}s — espaço/clique pra parar)`;
      stopMicCountdown();
      micCountdownTimer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0 || !Speech.isListening()) { stopMicCountdown(); return; }
        $('#micStatus').textContent = `🔴 Ouvindo... (${remaining}s — espaço/clique pra parar)`;
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

    // Spacebar toggle mic
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
      alert('Erro carregando data/*.json: ' + err.message + '\n\nSirva via http:// (python3 -m http.server 8080)');
    }
  }

  window.addEventListener('DOMContentLoaded', boot);
})();
