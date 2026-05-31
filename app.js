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
    lastLeadHint: null,          // hint mais recente do lead (ground truth pro evaluator)
    sessionClosed: false,
    sessionClosedDifficult: false,
    sessionEndReason: null,        // 'venda_pagamento' | 'lead_desistiu' | 'usuario_encerrou' | 'max_turns' | null
    sessionAwaitingReport: false,  // fim detectado; aguardando Ramon clicar "Ver relatório"
    leadCederCamada: false,
    leadEndurecer: false,
    podeFechar: false,
    closeAttempts: 0,              // nº de tentativas de fechamento (Assumptive/Alternative/Risco Reverso)
    turnoUltimaCessao: -99,         // turno em que o lead cedeu camada pela última vez (throttle)
    leadDesistiu: false,           // lead sinalizou desistência explícita
    awaitingPaymentConfirmation: false, // lead aceitou + nomeou pagto, mas AGUARDA Ramon fechar loop (link + confirmação + acesso)
    turnoAceiteInicial: -1,        // turno em que o lead deu o aceite inicial (pra throttle do aguardo)
    sessionStartTime: null,        // timestamp (ms) de início da sessão
    sessionEndTime: null,          // timestamp (ms) de fim da sessão (gravado em endSession)
    modoChamada: false,          // (legacy — substituído pelo call state)
    silenceTickTimer: null,
    hintFailCount: 0,            // turnos em que leadHint retornou null (calibração parcial do evaluator)
    sessionUsage: { calls: 0, input: 0, output: 0, cache_write: 0, cache_read: 0, cost_usd: 0 },
    call: {
      active: false,
      paused: false,
      phase: 'idle',       // idle | lead_speaking | listening | processing | paused
      countdownTimer: null
    }
  };

  const MAX_TURNS = 50;
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
  // Paralelo + tolerante a falhas: se 1 JSON corromper (Ramon edita na mão), boot
  // segue degradado com warning visível em vez de morrer inteiro.
  async function loadData() {
    const files = [
      'caminho_18_passos', 'produto_alianca', 'conceitos_permissao',
      'frases_ancora', 'persona_improvavel', 'dores_por_area',
      'casos_provas', 'tecnicas_compendio', 'objecoes_scripts'
    ];
    const data = {};
    const failed = [];
    const results = await Promise.allSettled(files.map(async f => {
      const r = await fetch(`data/${f}.json`);
      if (!r.ok) throw new Error(`${f}.json HTTP ${r.status}`);
      return [f, await r.json()];
    }));
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        const [f, json] = r.value;
        data[f] = json;
      } else {
        failed.push(files[i]);
        console.warn(`[loadData] ${files[i]}.json falhou:`, r.reason);
      }
    });
    state.data = data;
    state.dataLoaded = true;
    state.dataLoadFailed = failed;
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

    // TCC — Taxa de Checkout na Call (Lei do Checkout)
    const tccEl = $('#tccGauge');
    if (tccEl) {
      const tcc = Gamification.getTccCurrent();
      if (!tcc) {
        tccEl.innerHTML = `
          <div class="tcc-label">TCC — Taxa de Checkout na Call</div>
          <div class="tcc-empty">Sem dados ainda. Cada sessão onde lead diz "sim" entra aqui.</div>
          <div class="tcc-meta">Baseline observado: 72% · Meta: ≥90%</div>`;
        tccEl.className = 'tcc-gauge empty';
      } else {
        const cls = tcc.pct >= 90 ? 'good' : tcc.pct >= 72 ? 'mid' : 'low';
        tccEl.innerHTML = `
          <div class="tcc-label">TCC — Taxa de Checkout na Call</div>
          <div class="tcc-value">${tcc.pct}<small>%</small></div>
          <div class="tcc-bar"><div class="tcc-fill" style="width:${tcc.pct}%"></div></div>
          <div class="tcc-meta">${tcc.fechou}/${tcc.n} sessões com aceite verbal fecharam na call · meta ≥90%</div>`;
        tccEl.className = 'tcc-gauge ' + cls;
      }
    }

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
    state.lastLeadHint = null;
    state.sessionClosed = false;
    state.sessionClosedDifficult = false;
    state.sessionEndReason = null;
    state.sessionAwaitingReport = false;
    state.leadCederCamada = false;
    state.leadEndurecer = false;
    state.podeFechar = false;
    state.closeAttempts = 0;
    state.turnoUltimaCessao = -99;
    state.leadDesistiu = false;
    state.awaitingPaymentConfirmation = false;
    state.turnoAceiteInicial = -1;
    state.sessionStartTime = Date.now();   // início da sessão — usado pra duração total
    state.sessionEndTime = null;
    state.hintFailCount = 0;
    state.sessionUsage = { calls: 0, input: 0, output: 0, cache_write: 0, cache_read: 0, cost_usd: 0 };
    ClaudeAPI.startAccumulating();
    hideSessionEndModal();
    enableSessionInputs();

    const m = Scenarios.SUB_MODOS[submodo];
    $('#sessionModoName').textContent = `${m.icone} ${m.nome}`;
    $('#chat').innerHTML = '';
    const oldBanner = document.getElementById('awaitingPaymentBanner');
    if (oldBanner) oldBanner.remove();
    $('#feedbackPanel').classList.remove('active');
    $('#feedbackPanel').innerHTML = '';
    $('#userInput').value = '';
    $('#turnCounter').textContent = '1';
    const maxEl = $('#turnMax'); if (maxEl) maxEl.textContent = String(MAX_TURNS);

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
      }).then(h => {
        state.lastLeadHint = h;
        attachLeadHint(hintSlot, h);
        if (!h) state.hintFailCount += 1;
      });
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
    const nivel = sc.nivel_conhecimento_metodologia || 'exposto';
    const nivelLabel = {
      cru: '🟤 CRU — nunca viu conteúdo seu, fala só em linguagem de dor',
      exposto: '🟡 EXPOSTO — viu lives/conteúdo, usa termos da metodologia',
      estudioso: '🔵 ESTUDIOSO — consome bastante, pode até te desafiar'
    }[nivel] || nivel;
    const vocab = (sc.vocabulario_que_usa || []).filter(Boolean);
    const padraoConc = expandConceito(sc.padrao_oculto_teoria_permissao);
    const padraoDisplay = padraoConc ? padraoConc.display : esc(sc.padrao_oculto_teoria_permissao || '—');
    const conceitosList = (sc.conceitos_ideais_aqui || []).map(c => {
      const e = expandConceito(c);
      return e ? e.display : esc(c);
    }).filter(Boolean).join(' · ');
    $('#personaHint').innerHTML = `
      <div class="tec-line"><b>Nível de conhecimento da metodologia:</b> ${esc(nivelLabel)}</div>
      ${vocab.length ? `<div class="tec-line"><b>Vocabulário que o lead já usa:</b> <i>${esc(vocab.join(' · '))}</i></div>` : ''}
      ${sc.duvida_aplicacao_tipica ? `<div class="tec-line"><b>Dúvida típica de aplicação:</b> ${esc(sc.duvida_aplicacao_tipica)}</div>` : ''}
      <div class="tec-line" style="margin-top:0.6em"><b>Objeção superficial:</b> ${esc(sc.objecao_superficial)}</div>
      <div class="tec-line"><b>Objeção real (oculta):</b> ${esc(sc.objecao_real)}</div>
      <div class="tec-line"><b>Padrão Teoria da Permissão:</b> ${padraoDisplay}</div>
      <div class="tec-line"><b>Dificuldade:</b> ${esc(sc.dificuldade)}</div>
      <div class="tec-line" style="margin-top:0.8em"><b>Técnicas ideais aqui:</b></div>
      <div class="tec-cards">${renderTechniqueCards(techs)}</div>
      <div class="tec-line" style="margin-top:0.5em"><b>Conceitos em jogo:</b> ${conceitosList || '—'}</div>
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

  // ========= CONCEITOS (apelido ↔ canônico) =========
  // Retorna { display, apelido, canonico, is_apelido } resolvendo contra data/conceitos_permissao.json v2.
  // Se o nome recebido for um apelido_venda, emparelha canônico. Senão, retorna só o nome.
  function expandConceito(rawName) {
    if (!rawName) return null;
    const conceitos = state.data?.conceitos_permissao?.conceitos || [];
    const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const target = norm(rawName);
    if (!target) return null;
    // Busca exata ou por substring no nome do conceito
    for (const c of conceitos) {
      const cnorm = norm(c.nome);
      if (cnorm === target || cnorm.includes(target) || target.includes(cnorm)) {
        if (c.apelido_venda && c.nome_canonico) {
          return {
            display: `${c.nome} <span class="conceito-canonico">(canônico: ${c.nome_canonico})</span>`,
            apelido: c.nome,
            canonico: c.nome_canonico,
            is_apelido: true
          };
        }
        return { display: c.nome, apelido: null, canonico: c.nome, is_apelido: false };
      }
    }
    // Não achou no JSON — devolve como veio
    return { display: rawName, apelido: null, canonico: rawName, is_apelido: false };
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
      const exemplo = t.exemplo ? `<div class="hint-tec-example">💬 <span>${esc(t.exemplo)}</span></div>` : '';
      return `<div class="hint-tec">
        <div class="hint-tec-head"><b>▸ ${esc(ref)}</b></div>
        <div class="hint-tec-why">${esc(t.porque || '')}</div>
        ${exemplo}
      </div>`;
    }).join('');

    const nota10 = hint.resposta_nota_10 ? `
      <details class="hint-nota10">
        <summary class="hint-nota10-head">💎 Resposta exemplar (nota 10) <span class="hint-nota10-warn">— tente formular a sua antes</span></summary>
        <blockquote class="hint-nota10-body">${esc(hint.resposta_nota_10)}</blockquote>
      </details>` : '';

    const sugPasso = hint.passo_do_caminho_sugerido;
    // Expande conceito: se for apelido_venda, emparelha com nome canônico
    const conc = expandConceito(hint.conceito_permissao_em_jogo);
    const conceitoLine = conc ? `<div class="hint-line"><b>Conceito em jogo:</b> ${conc.display}</div>` : '';
    hintSlot.innerHTML = `<details class="lead-hint-box">
      <summary>
        <span class="hint-chip">🤫 dica do turno</span>
        <span class="hint-status">${esc(hint.categoria || '—')}${hint.camada_revelada ? ' · ' + esc(hint.camada_revelada) : ''}${sugPasso ? ' · passo ' + sugPasso : ''}</span>
      </summary>
      <div class="lead-hint-body">
        <div class="hint-line"><b>Provável objeção agora:</b> ${esc(hint.possivel_objecao || '—')}</div>
        ${conceitoLine}
        ${hint.o_que_observar ? `<div class="hint-line"><b>O que observar:</b> ${esc(hint.o_que_observar)}</div>` : ''}
        ${techs ? `<div class="hint-line"><b>Caminhos possíveis:</b></div>${techs}` : ''}
        ${nota10}
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
    // Bloqueia envios após a sessão ter sido marcada como encerrada
    if (state.sessionAwaitingReport) return;
    const input = $('#userInput');
    const text = input.value.trim();
    if (!text || !state.currentScenario) return;

    // Captura o silêncio ANTES de enviar (tempo que o Ramon ficou quieto antes de falar)
    const silenceSec = Speech.captureAndResetSilence();
    state.silences.push({ turn: state.turn + 1, seconds: silenceSec });

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
        passosCumpridosAnteriormente: state.passosCumpridos,
        lastLeadHint: state.lastLeadHint
      });
      state.turnFeedbacks.push(feedback);

      const ta = feedback.tecnicas_aplicadas || {};
      Object.keys(ta).forEach(k => {
        if (ta[k]) state.sessionTechniques[k] = (state.sessionTechniques[k] || 0) + 1;
      });
      state.leadCederCamada = !!feedback.lead_ceder_camada;
      state.leadEndurecer = !!feedback.lead_endurecer;
      state.podeFechar = !!feedback.pode_fechar;

      // Se o feedback diz que o lead vai ceder camada, registra o turno.
      // Isso alimenta o throttle do lead (não ceder em turnos consecutivos).
      if (feedback.lead_ceder_camada) {
        state.turnoUltimaCessao = state.turn;
      }

      // Contador de tentativas de fechamento (Close direto OU Assumptive/Alternative)
      // Incrementa quando detectar técnica de close aplicada neste turno.
      const techsApplied = feedback.tecnicas_aplicadas || {};
      if (techsApplied.assumptive_close || techsApplied.alternative_close || techsApplied.risco_reverso) {
        state.closeAttempts = (state.closeAttempts || 0) + 1;
      }

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

    // Transição pra 'lead pensando' (se em modo chamada)
    if (state.call.active && !state.call.paused) {
      state.call.phase = 'processing_lead';
      updateCallUI();
    }

    // Resposta do lead — com retry automático (2 tentativas)
    pushTypingPlaceholder();
    let leadReply = null;
    let lastErr = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        leadReply = await Evaluator.leadResponse({
          scenario: state.currentScenario,
          conversation: state.conversation,
          data: state.data,
          leadCederCamada: state.leadCederCamada,
          leadEndurecer: state.leadEndurecer,
          podeFechar: state.podeFechar,
          turn: state.turn,
          closeAttempts: state.closeAttempts || 0,
          turnosDesdeUltimaCessao: state.turnoUltimaCessao >= 0
            ? (state.turn - state.turnoUltimaCessao)
            : 99,
          awaitingPaymentConfirmation: !!state.awaitingPaymentConfirmation,
          turnosDesdeAceite: state.turnoAceiteInicial >= 0
            ? (state.turn - state.turnoAceiteInicial)
            : 0
        });
        if (leadReply && leadReply.trim()) break;
        // resposta vazia — trata como falha
        throw new Error('resposta vazia');
      } catch (err) {
        lastErr = err;
        console.warn(`[handleSend] leadResponse tentativa ${attempt} falhou:`, err.message);
        if (attempt < 2) {
          // espera 1s e tenta de novo
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    removeTyping();
    if (leadReply && leadReply.trim()) {
      const leadMsg = pushLeadMessage(leadReply);
      Evaluator.leadHint({
        scenario: state.currentScenario, leadMessage: leadReply,
        conversation: state.conversation, turn: state.turn, data: state.data,
        awaitingPaymentConfirmation: !!state.awaitingPaymentConfirmation,
        turnosDesdeAceite: state.turnoAceiteInicial >= 0
          ? (state.turn - state.turnoAceiteInicial)
          : 0
      }).then(h => {
        state.lastLeadHint = h;
        attachLeadHint(leadMsg.hintSlot, h);
        if (!h) state.hintFailCount += 1;
      });
    } else {
      // Não empurra mensagem '(erro:...)' no chat — fica feio e o TTS lê.
      // Deixa o autoSubmitFromCall detectar a ausência e mostrar status.
      console.error('[handleSend] falha total em leadResponse:', lastErr);
    }

    $('#btnSend').disabled = false;

    // ========= DETECÇÃO DE FIM DA SESSÃO =========
    const reachedMax = state.turn >= MAX_TURNS;
    const lastLead = state.conversation[state.conversation.length - 1]?.content || '';

    // 1. ACEITE INICIAL — lead manifestou intenção CLARA de fechar + nomeou pagamento.
    //    ISSO NÃO É AINDA UMA VENDA. É um aceite verbal que precisa ser AMARRADO com:
    //    (a) Ramon enviando o link / confirmando método
    //    (b) Lead reportando pagamento concluído
    //    (c) Ramon confirmando acesso à Marca Passos
    //    Decisão de design: a venda só fecha DEPOIS desse loop — aceite sozinho
    //    é animação retórica. Isso ensina o Ramon a fechar o Avanço Concreto (passo 17-18).
    //    Obs: (?:\s|^) em vez de \b para lidar com "à" (acento quebra word boundary).
    const signalsPagamento = /(?:\s|^)(pix|cart[aã]o|cr[eé]dito|d[eé]bito|boleto|parcel[oa]|parcelad[oa]|parcelar|[aà]\s+vista|transfer[eê]ncia|link\s*(de|do|pra)?\s*pagamento|pagar|pago|paguei|pagamento)(?:\s|$|[,.!?])/i.test(lastLead);
    const signalsAceiteFinal = /\b(t[oô]\s*dentro|quero\s*entrar|quero\s*fechar|pode\s*come[çc]ar|me\s*manda\s*o\s*link|manda\s*o\s*link|bora\s*fazer|bora\s*fechar|vou\s*fechar|fechado)\b/i.test(lastLead);

    // 1b. CONFIRMAÇÃO DE PAGAMENTO EFETIVADO — lead reporta que o pagamento FOI feito,
    //     o acesso chegou, ou o fluxo concreto terminou. SÓ ISSO fecha venda_realizada.
    //     Regex: verbos no pretérito ("paguei", "deu certo", "chegou", "entrei", "recebi")
    //     ou confirmação direta da transação ("confirmado", "aprovou", "apareceu a confirmação").
    const signalsPagamentoConcluido = /\b(paguei|pago|pagamento\s+(foi|deu|confirmad|aprovad|caiu)|j[áa]\s+(paguei|foi|fiz|est[aá]\s+pago)|deu\s+certo|funcionou|aprovou|aprovado|confirmad[oa]|apareceu\s+(a\s+)?(confirma[çc][ãa]o|aprova[çc][ãa]o|mensagem)|chegou\s+(o\s+)?(link|email|acesso|confirma[çc][ãa]o)|recebi\s+(o\s+)?(acesso|email|link|confirma[çc][ãa]o)|entrei\s+(na\s+plataforma|na\s+marca|no\s+marca|no\s+programa)|j[áa]\s+(est[aá]\s+)?(dentro|na\s+plataforma|no\s+acesso|liberado)|t[oô]\s+dentro\s+da\s+plataforma|consegui\s+(pagar|entrar|acessar))\b/i.test(lastLead);

    // 1c. ATRITO PÓS-ACEITE — lead reporta problema no pagamento (NÃO fecha ainda).
    //     Serve pra detectar que o loop ainda precisa continuar sem marcar desistência.
    const signalsAtritoPagamento = /\b(n[ãa]o\s+(chegou|recebi|caiu|funcionou|deu)|cart[aã]o\s+(recusou|negou|n[ãa]o\s+passou)|deu\s+erro|deu\s+ruim|n[ãa]o\s+t[aá]\s+(indo|passando|funcionando)|t[aá]\s+dando\s+erro|tem\s+outro\s+jeito|como\s+fa[çc]o)\b/i.test(lastLead);

    // 2. LEAD DESISTIU — recusa explícita e definitiva ao NEGÓCIO (não à vida)
    //    Regex exige referência clara à compra/decisão pra evitar falso positivo
    //    (ex: "não quero viver assim" não é desistência — é dor).
    //
    //    EXCLUSÃO DE CONDICIONAL NEGATIVA (fix do bug "Roberto, 63"):
    //    Frases do tipo "não vou entrar em furada SEM SABER", "não vou fechar ANTES DE
    //    ver", "não vou comprar SE NÃO me explicar" são PEDIDOS DE APRESENTAÇÃO, não
    //    desistência. Só contam como desistência quando a frase é REFUSAL absoluta.
    //    Primeiro checamos se é condicional; se for, ignoramos o match de desistência.
    const ehCondicionalPedindoInfo = /\b(n[ãa]o\s*vou\s*(fazer|entrar|fechar|comprar|assinar)|n[ãa]o\s*quero\s*(fazer|entrar|fechar|comprar|assinar))\b[^.!?]{0,60}\b(sem\s+(saber|entender|ver|conhecer|detalhe|informa[çc][ãa]o|expl|detalh)|antes\s+de|sem\s+antes|se\s+(voc[eê]\s+)?n[ãa]o\s+(me\s+)?(explicar|mostrar|apresentar|falar|detalhar)|a\s+cegas|no\s+escuro|sem\s+ter|sem\s+eu\s+(saber|entender))/i.test(lastLead);

    const signalsDesistenciaRaw = /\b(n[ãa]o\s*vou\s*(fazer|entrar|fechar|comprar|assinar)|n[ãa]o\s*quero\s*(fazer|entrar|fechar|comprar|assinar|isso|o\s*programa)|n[ãa]o\s*(é|e)\s*(pra\s*mim|o\s*momento|o\s*meu\s*momento)|n[ãa]o\s*tenho\s*interesse|desisto|desisti|vou\s*passar|pode\s*parar|t[oô]\s*fora|melhor\s*n[ãa]o|n[ãa]o\s*vai\s*dar|n[ãa]o\s*vai\s*rolar|obrigad[oa]\s*pelo\s*tempo|deixa\s*pra\s*l[aá]|deixa\s*quieto)\b/i.test(lastLead);

    const signalsDesistencia = signalsDesistenciaRaw && !ehCondicionalPedindoInfo;

    if (signalsDesistenciaRaw && ehCondicionalPedindoInfo) {
      console.log('[handleSend] MATCH de desistência bloqueado por condicional-pedindo-info:', lastLead.slice(0, 120));
    }

    // 3. PRÉ-REQUISITOS MÍNIMOS DE VENDA REAL (guarda contra close-fantasia em 4 turnos)
    //    Uma venda high-ticket exige:
    //    (a) pelo menos 6 turnos (pra dar tempo de abertura/investigação/apresentação);
    //    (b) Ramon ter nomeado "Marca Passos" em alguma fala (apresentação estruturada);
    //    (c) Ramon ter declarado valor concreto (R$/parcela/investimento) em alguma fala.
    //    No sub-modo 'caminho_completo' exigimos (a). Nos demais sub-modos, que começam
    //    depois da abertura, só (b)+(c) bastam.
    const ramonCompleto = state.conversation
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' \n ');
    const ramonNomeouMarcaPassos = /\bmarca[-\s]?passos\b/i.test(ramonCompleto);
    const ramonAncorouPreco = /\b(R\$|\d[\d\.\,]*\s*(reais|pila|conto)|m[eê]s|parcela|parcelad[oa]|[aà]\s*vista|investimento\s+[eé]|valor\s+[eé]|custa|\d+\s*x|\d+\s*vezes)\b/i.test(ramonCompleto);
    const submodoAtual = state.currentScenario?.submodo || 'caminho_completo';
    const turnosMinimosOK = submodoAtual === 'caminho_completo' ? state.turn >= 6 : state.turn >= 3;
    const preReqVendaReal = turnosMinimosOK && ramonNomeouMarcaPassos && ramonAncorouPreco;

    // (Nota: checagem de execução do Avanço Concreto pelo Ramon é feita no evaluator.leadHint e em
    //  leadResponse — aqui no app.js basta rastrear os estágios A/B.)

    // ========= LÓGICA DE TRANSIÇÃO EM 2 ESTÁGIOS =========
    //
    // Estágio A — lead dá aceite + nomeia pagamento → awaitingPaymentConfirmation = true
    //              (sessão CONTINUA; Ramon precisa fazer passo 17: enviar link + pedir confirmação)
    //
    // Estágio B — lead confirma pagamento concluído → sessionClosed = true
    //              (venda_realizada final, com loop fechado)
    //
    // Se awaitingPaymentConfirmation está aberto e lead relata atrito → continua aberto (Ramon
    // precisa resolver fricção). Se muito tempo sem resolver, vira max_turns.

    if (state.awaitingPaymentConfirmation) {
      // ---- ESTÁGIO B: já aguardando confirmação final ----
      if (signalsPagamentoConcluido) {
        state.sessionClosed = true;
        state.sessionClosedDifficult = ['dificil', 'hostil'].includes(state.currentScenario?.dificuldade);
        state.sessionEndReason = 'venda_pagamento';
      } else if (signalsDesistencia) {
        // lead desistiu DURANTE o pagamento — venda não realizada
        state.leadDesistiu = true;
        state.sessionEndReason = 'lead_desistiu';
      } else if (reachedMax) {
        state.sessionEndReason = 'max_turns';
      } else if (signalsAtritoPagamento) {
        // atrito explícito — NÃO fecha, mantém aguardando (Ramon precisa resolver)
        console.log('[handleSend] atrito de pagamento detectado, aguardando Ramon resolver');
      }
      // Se nada disso, segue aguardando silenciosamente.
    } else {
      // ---- ESTÁGIO A: ainda não houve aceite inicial ----
      if (state.podeFechar && signalsAceiteFinal && signalsPagamento && preReqVendaReal) {
        // Aceite verbal detectado. NÃO fecha ainda — abre estágio B.
        state.awaitingPaymentConfirmation = true;
        state.turnoAceiteInicial = state.turn;
        console.log('[handleSend] aceite inicial detectado — aguardando Ramon fechar o loop (link + confirmação + acesso)');
      } else if (state.podeFechar && signalsAceiteFinal && signalsPagamento && !preReqVendaReal) {
        // Lead aceitou mas faltam pré-requisitos — NÃO fecha ainda. Log pra debug.
        console.warn('[handleSend] aceite detectado mas pré-requisitos de venda real faltam:', {
          turno: state.turn,
          turnosMinimosOK,
          ramonNomeouMarcaPassos,
          ramonAncorouPreco,
          submodoAtual
        });
      } else if (signalsDesistencia || state.leadDesistiu) {
        state.sessionClosed = false;
        state.leadDesistiu = true;
        state.sessionEndReason = 'lead_desistiu';
      } else if (reachedMax) {
        state.sessionEndReason = 'max_turns';
      }
    }

    if (state.sessionClosed || state.leadDesistiu || reachedMax) {
      // NÃO fecha sozinha — avisa o Ramon e deixa ele clicar "Ver relatório"
      state.sessionAwaitingReport = true;
      disableSessionInputs();
      showSessionEndModal(state.sessionEndReason);
    } else if (state.awaitingPaymentConfirmation) {
      // Feedback visual pro Ramon: sessão está na reta final do fechamento.
      showAwaitingPaymentBanner();
    }
  }

  // ========= BANNER DE AGUARDO DE PAGAMENTO =========
  // Mostra um aviso sutil no topo do chat dizendo que o aceite foi dado e agora
  // o Ramon precisa fazer o fechamento concreto (passo 17 — Avanço Concreto).
  function showAwaitingPaymentBanner() {
    let banner = document.getElementById('awaitingPaymentBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'awaitingPaymentBanner';
      banner.style.cssText = 'background:linear-gradient(135deg,#fef3c7,#fde68a);border-left:4px solid #d97706;padding:12px 16px;margin:12px 0;border-radius:8px;color:#78350f;font-size:13px;line-height:1.4;';
      banner.innerHTML = `
        <strong>🔒 Aceite verbal recebido — não solte o fio agora.</strong><br>
        O lead nomeou o método de pagamento. Você está no <strong>passo 17 (Avanço Concreto)</strong>.
        Execute: <em>(1)</em> envio explícito do link, <em>(2)</em> pergunta de confirmação do pagamento,
        <em>(3)</em> confirmação do acesso à Marca Passos. A venda só conta quando o lead confirmar o pagamento efetivado.`;
      const chat = document.getElementById('chat');
      if (chat && chat.parentNode) chat.parentNode.insertBefore(banner, chat);
    }
  }

  // ========= MODAL DE FIM DE SESSÃO =========
  // Não encerra automaticamente — informa o resultado e oferece botão pro relatório.
  const END_MODAL_META = {
    venda_pagamento: {
      cls: 'sale',
      icon: '✅',
      title: 'Venda realizada',
      desc: 'O lead confirmou pagamento efetivado e acesso à Marca Passos. Loop fechado — fechamento concreto.'
    },
    lead_desistiu: {
      cls: 'no-sale',
      icon: '❌',
      title: 'Lead desistiu',
      desc: 'O lead recusou explicitamente. A sessão terminou sem venda.'
    },
    max_turns: {
      cls: 'no-sale',
      icon: '⏱️',
      title: 'Tempo esgotado',
      desc: `Limite de ${MAX_TURNS} turnos atingido sem venda nem desistência.`
    },
    usuario_encerrou: {
      cls: 'partial',
      icon: '⏸️',
      title: 'Sessão encerrada',
      desc: 'Você encerrou manualmente. Relatório parcial.'
    }
  };

  function showSessionEndModal(reason) {
    const meta = END_MODAL_META[reason] || END_MODAL_META.max_turns;
    const modal = $('#sessionEndModal');
    if (!modal) return;
    modal.className = 'end-modal ' + meta.cls;
    $('#endModalIcon').textContent = meta.icon;
    $('#endModalTitle').textContent = meta.title;
    $('#endModalDesc').textContent = meta.desc;
    $('#endModalMeta').textContent = `${state.turn} turnos respondidos`;
    modal.hidden = false;
    // Foco no botão pra Enter funcionar
    setTimeout(() => $('#btnGoToReport')?.focus(), 50);
  }

  function hideSessionEndModal() {
    const modal = $('#sessionEndModal');
    if (modal) modal.hidden = true;
  }

  function disableSessionInputs() {
    $('#btnSend').disabled = true;
    $('#btnMic').disabled = true;
    const ta = $('#userInput');
    if (ta) { ta.disabled = true; ta.placeholder = 'Sessão encerrada — veja o relatório'; }
    // Se estiver em modo chamada, encerra automaticamente o loop de call
    if (state.call?.active) endCall();
    // Esconde "Encerrar agora" (não faz mais sentido — já encerrou)
    const btnEnd = $('#btnEndSessionNow');
    if (btnEnd) btnEnd.hidden = true;
  }

  function enableSessionInputs() {
    $('#btnSend').disabled = false;
    $('#btnMic').disabled = false;
    const ta = $('#userInput');
    if (ta) { ta.disabled = false; ta.placeholder = 'Sua resposta... (voz: "vírgula", "ponto", "pausa 3 segundos")'; }
    const btnEnd = $('#btnEndSessionNow');
    if (btnEnd) btnEnd.hidden = false;
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

    // Grava fim da sessão pra cálculo de duração (se ainda não gravou)
    if (!state.sessionEndTime) state.sessionEndTime = Date.now();

    const panel = $('#feedbackPanel');
    panel.innerHTML += '<div style="margin-top:1em;color:var(--ink-muted)">Gerando relatório...</div>';

    let report;
    try {
      report = await Evaluator.finalReport({
        scenario: state.currentScenario,
        conversation: state.conversation,
        turnFeedbacks: state.turnFeedbacks,
        passosCumpridos: state.passosCumpridos,
        data: state.data,
        sessionClosed: !!state.sessionClosed,
        reachedMaxTurns: state.turn >= MAX_TURNS,
        endReason: state.sessionEndReason,
        leadDesistiu: !!state.leadDesistiu
      });
    } catch (err) {
      console.error(err);
      const fallbackOutcome = state.sessionClosed ? 'venda_realizada'
        : state.leadDesistiu ? 'venda_nao_realizada_desistencia'
        : state.sessionEndReason === 'usuario_encerrou' ? 'encerrada_parcial'
        : 'venda_nao_realizada';
      report = { nota_final: 0, frase_caderno: 'Erro: ' + err.message, notas: {}, tecnicas_acumuladas: {}, passos_cumpridos: [], cobertura_pct: 0, outcome: fallbackOutcome, outcome_motivo: 'Erro ao gerar análise detalhada.', melhores_3_tecnicas: [], piores_3_pontos: [], por_momento: {} };
    }

    // Captura uso de API acumulado e contador de falhas de hint
    state.sessionUsage = ClaudeAPI.endAccumulating();
    report.usage = state.sessionUsage;
    report.hint_fail_count = state.hintFailCount;

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
      const k = Gamification.K.semCliche;
      const cur = parseInt(localStorage.getItem(k) || '0', 10) + 1;
      localStorage.setItem(k, String(cur));
      if (cur >= 10) Gamification.unlockAchievement('fiel_mesa');
    }
    if (state.sessionTechniques.metodo_4_passos_concer) Gamification.unlockAchievement('playbook_concer');

    const durationMs = (state.sessionStartTime && state.sessionEndTime)
      ? (state.sessionEndTime - state.sessionStartTime) : 0;

    // Captura TCC ANTES de salvar (depende dos turn_feedbacks)
    const _tccSessionPayload = {
      id: 'sess_tcc_' + Date.now(),
      outcome: report.outcome,
      turn_feedbacks: state.turnFeedbacks
    };
    Gamification.recordTccDataPoint(_tccSessionPayload);

    Gamification.saveSession({
      id: 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
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
      turnos: state.turn,
      duration_ms: durationMs,           // duração total da sessão em ms
      started_at: state.sessionStartTime,
      ended_at: state.sessionEndTime,
      // Histórico completo
      outcome: report.outcome,
      outcome_motivo: report.outcome_motivo,
      outcome_evidencia_lead: report.outcome_evidencia_lead,
      end_reason: state.sessionEndReason,
      is_parcial: !!report.is_parcial,
      cenario: state.currentScenario ? {
        persona: state.currentScenario.persona,
        objecao_superficial: state.currentScenario.objecao_superficial,
        objecao_real: state.currentScenario.objecao_real,
        padrao_oculto: state.currentScenario.padrao_oculto_teoria_permissao,
        primeira_mensagem_lead: state.currentScenario.primeira_mensagem_lead,
        dificuldade: state.currentScenario.dificuldade,
        nivel_conhecimento: state.currentScenario.nivel_conhecimento_metodologia
      } : null,
      conversation: state.conversation.slice(),      // todas as trocas Ramon↔Lead
      turn_feedbacks: state.turnFeedbacks.slice(),   // feedbacks turno-a-turno (para revisão)
      report_full: report                            // relatório completo (melhores, piores, por_momento)
    });

    renderReport(report, xpInfo, leveledUp);
    showScreen('report');
  }

  function renderReport(report, xpInfo, leveledUp) {
    // ===== OUTCOME BANNER =====
    const outcomeEl = $('#reportOutcome');
    if (outcomeEl) {
      const outcomeMeta = {
        venda_realizada:               { cls: 'sale',     label: '✅ VENDA REALIZADA' },
        venda_nao_realizada_desistencia:{ cls: 'no-sale', label: '❌ VENDA NÃO REALIZADA — Lead desistiu' },
        venda_nao_realizada_tempo:     { cls: 'no-sale', label: '⏱️ VENDA NÃO REALIZADA — Tempo esgotado' },
        venda_nao_realizada:           { cls: 'no-sale', label: '❌ VENDA NÃO REALIZADA' },
        encerrada_parcial:             { cls: 'partial', label: '⏸️ SESSÃO ENCERRADA — Relatório parcial' }
      };
      const meta = outcomeMeta[report.outcome] || outcomeMeta['venda_nao_realizada'];
      const evidencia = report.outcome_evidencia_lead ? `<div class="outcome-evidencia">💬 <i>"${esc(report.outcome_evidencia_lead)}"</i></div>` : '';
      const duracaoMs = (state.sessionStartTime && state.sessionEndTime)
        ? (state.sessionEndTime - state.sessionStartTime) : 0;
      const duracaoLabel = duracaoMs ? `<div class="outcome-meta">⏱️ Duração: <b>${formatDuration(duracaoMs)}</b> · ${state.turn} turnos</div>` : '';
      // Telemetria de custo + falhas de hint (Fase 0)
      const u = report.usage || state.sessionUsage || null;
      let costLabel = '';
      if (u && u.calls > 0) {
        const cacheHit = u.cache_read > 0 ? ` · cache hit ${Math.round(u.cache_read / (u.cache_read + u.input + 1) * 100)}%` : '';
        costLabel = `<div class="outcome-meta">💰 ${u.calls} chamadas · ${(u.input + u.cache_read + u.cache_write).toLocaleString('pt-BR')} tokens in / ${u.output.toLocaleString('pt-BR')} out · <b>US$ ${u.cost_usd.toFixed(4)}</b>${cacheHit}</div>`;
      }
      const hintFailLabel = (report.hint_fail_count > 0)
        ? `<div class="outcome-meta" style="color:var(--warn,#c89a2e)">⚠️ Dicas falharam em ${report.hint_fail_count} turno(s) — calibração do avaliador foi parcial</div>`
        : '';
      outcomeEl.className = 'outcome-banner ' + meta.cls;
      outcomeEl.innerHTML = `
        <div class="outcome-label">${meta.label}</div>
        <div class="outcome-motivo">${esc(report.outcome_motivo || '')}</div>
        ${evidencia}
        ${duracaoLabel}
        ${costLabel}
        ${hintFailLabel}
      `;
    }

    // ===== MELHORES 3 TÉCNICAS =====
    const melhoresEl = $('#reportMelhores');
    if (melhoresEl) {
      const lista = report.melhores_3_tecnicas || [];
      const momentoLabel = { abertura: '🌅 Abertura', conducao: '🎯 Condução', fechamento: '🔒 Fechamento' };
      melhoresEl.innerHTML = lista.length ? lista.map(t => `
        <div class="melhor-card">
          <div class="melhor-head">
            <span class="melhor-nome">✅ ${esc(t.nome || '—')}</span>
            <span class="melhor-meta">${esc(momentoLabel[t.momento] || t.momento || '')} · turno ${t.turno || '?'}</span>
          </div>
          <div class="melhor-porque">${esc(t.porque || '')}</div>
        </div>
      `).join('') : '<div class="muted">(sem técnicas destacáveis nesta sessão)</div>';
    }

    // ===== PIORES 3 PONTOS =====
    const pioresEl = $('#reportPiores');
    if (pioresEl) {
      const lista = report.piores_3_pontos || [];
      const momentoLabel = { abertura: '🌅 Abertura', conducao: '🎯 Condução', fechamento: '🔒 Fechamento' };
      const tipoIcon = { armadilha: '⚡', tecnica_faltante: '🕳️', tecnica_mal_aplicada: '🔧' };
      pioresEl.innerHTML = lista.length ? lista.map(p => `
        <div class="pior-card">
          <div class="pior-head">
            <span class="pior-nome">${tipoIcon[p.tipo] || '⚠️'} ${esc(p.nome || '—')}</span>
            <span class="pior-meta">${esc(momentoLabel[p.momento] || p.momento || '')} · turno ${p.turno || '?'}</span>
          </div>
          <div class="pior-line"><b>O que aconteceu:</b> ${esc(p.o_que_aconteceu || '')}</div>
          <div class="pior-line"><b>Correção:</b> ${esc(p.correcao || '')}</div>
        </div>
      `).join('') : '<div class="muted">(sem pontos críticos — boa sessão)</div>';
    }

    // ===== ANÁLISE POR MOMENTO =====
    const porMomentoEl = $('#reportPorMomento');
    if (porMomentoEl) {
      const pm = report.por_momento || {};
      const momentos = [
        { key: 'abertura', label: '🌅 Abertura', passos: 'passos 1-3' },
        { key: 'conducao', label: '🎯 Condução', passos: 'passos 4-10' },
        { key: 'fechamento', label: '🔒 Fechamento', passos: 'passos 11-18' }
      ];
      porMomentoEl.innerHTML = momentos.map(m => {
        const d = pm[m.key] || {};
        const nota = typeof d.nota === 'number' ? d.nota.toFixed(1) : '—';
        const notaClass = d.nota >= 8 ? 'good' : d.nota >= 5 ? 'mid' : 'low';
        return `
          <div class="momento-card">
            <div class="momento-head">
              <span class="momento-label">${m.label}</span>
              <span class="momento-passos">${m.passos}</span>
              <span class="momento-nota ${notaClass}">${nota}/10</span>
            </div>
            <div class="momento-line"><b>✅ Ponto forte:</b> ${esc(d.ponto_forte || '—')}</div>
            <div class="momento-line"><b>⚠️ Ponto fraco:</b> ${esc(d.ponto_fraco || '—')}</div>
            <div class="momento-line"><b>💡 Sugestão:</b> ${esc(d.sugestao || '—')}</div>
          </div>
        `;
      }).join('');
    }

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

  // ========= HISTÓRICO =========
  const OUTCOME_META = {
    venda_realizada:               { cls: 'sale',     label: '✅ Venda realizada',    short: 'Venda' },
    venda_nao_realizada_desistencia:{ cls: 'no-sale', label: '❌ Lead desistiu',      short: 'Desistência' },
    venda_nao_realizada_tempo:     { cls: 'no-sale', label: '⏱️ Tempo esgotado',     short: 'Timeout' },
    venda_nao_realizada:           { cls: 'no-sale', label: '❌ Não realizada',       short: 'Não vendeu' },
    encerrada_parcial:             { cls: 'partial', label: '⏸️ Parcial',             short: 'Parcial' }
  };

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  }

  // Formata duração em ms como "Xm YYs" ou "Hh MMm" se passar de 1h
  function formatDuration(ms) {
    if (!ms || ms < 0) return '—';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
    return `${s}s`;
  }

  function renderHistoryList() {
    const all = Gamification.getSessions() || [];
    const outcomeFilter = $('#historyFilterOutcome').value;
    const q = ($('#historySearch').value || '').toLowerCase().trim();

    const filtered = all.filter(s => {
      if (outcomeFilter !== 'all' && (s.outcome || 'venda_nao_realizada') !== outcomeFilter) return false;
      if (!q) return true;
      const hay = [s.persona, s.padrao, s.submodo, s.frase_caderno, s.cenario?.objecao_real, s.cenario?.objecao_superficial].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });

    $('#historyCount').textContent = String(filtered.length);
    const listEl = $('#historyList');
    const emptyEl = $('#historyEmpty');

    if (!filtered.length) {
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    listEl.innerHTML = filtered.map(s => {
      const meta = OUTCOME_META[s.outcome] || OUTCOME_META['venda_nao_realizada'];
      const nota = typeof s.nota_final === 'number' ? s.nota_final.toFixed(1) : '—';
      const padrao = s.padrao || '—';
      const persona = s.persona || '—';
      const turnos = s.turnos || (s.conversation ? Math.floor(s.conversation.length / 2) : 0);
      return `
        <div class="history-item" data-id="${esc(s.id || s.date)}">
          <div class="history-item-head">
            <span class="history-outcome ${meta.cls}">${meta.label}</span>
            <span class="history-date">${formatDate(s.date)}</span>
          </div>
          <div class="history-item-body">
            <div class="history-persona">${esc(persona)} <span class="muted">· ${esc(padrao)}</span></div>
            <div class="history-stats">
              <span>Nota <b>${nota}</b></span>
              <span>${turnos} turnos</span>
              ${s.duration_ms ? `<span>⏱️ ${formatDuration(s.duration_ms)}</span>` : ''}
              <span>+${s.xp_ganho || 0} XP</span>
              ${s.dificuldade ? `<span class="muted">${esc(s.dificuldade)}</span>` : ''}
            </div>
            ${s.frase_caderno ? `<div class="history-frase">"${esc(s.frase_caderno)}"</div>` : ''}
          </div>
          <div class="history-item-cta">Ver transcrição →</div>
        </div>
      `;
    }).join('');

    // Click handlers
    listEl.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        showHistoryDetail(id);
      });
    });
  }

  function findSessionById(id) {
    const all = Gamification.getSessions() || [];
    return all.find(s => (s.id || s.date) === id) || null;
  }

  let currentHistorySession = null;

  function showHistoryDetail(id) {
    const s = findSessionById(id);
    if (!s) {
      alert('Sessão não encontrada.');
      return;
    }
    currentHistorySession = s;
    renderHistoryDetail(s);
    showScreen('history-detail');
  }

  function renderHistoryDetail(s) {
    const meta = OUTCOME_META[s.outcome] || OUTCOME_META['venda_nao_realizada'];
    const conv = s.conversation || [];
    const feedbacks = s.turn_feedbacks || [];
    const report = s.report_full || {};
    const momentoLabel = { abertura: '🌅 Abertura', conducao: '🎯 Condução', fechamento: '🔒 Fechamento' };

    // Cenário resumo
    const cenario = s.cenario || {};
    const persona = cenario.persona || {};

    // Mapear feedbacks pelo turno (turno = index do user message na conversa)
    // turnFeedbacks são ordenados na sessão — 1 por turno do Ramon
    const feedbackByTurn = {};
    feedbacks.forEach((f, i) => { feedbackByTurn[i + 1] = f; });

    let ramonTurnIndex = 0;
    const chatHtml = conv.map((msg) => {
      if (msg.role === 'user') {
        ramonTurnIndex++;
        const fb = feedbackByTurn[ramonTurnIndex];
        const fbBlock = fb ? `
          <div class="history-feedback">
            <div class="history-feedback-grade">Nota ${(fb.nota_geral || 0).toFixed(1)}/10</div>
            ${fb.ponto_forte ? `<div><b>✅ Forte:</b> ${esc(fb.ponto_forte)}</div>` : ''}
            ${fb.ajuste ? `<div><b>⚠️ Ajuste:</b> ${esc(fb.ajuste)}</div>` : ''}
            ${fb.reformulacao ? `<div><b>💡 Melhor:</b> <i>${esc(fb.reformulacao)}</i></div>` : ''}
            ${fb.passo_do_caminho_executado ? `<div class="muted">Passo ${fb.passo_do_caminho_executado}/18</div>` : ''}
          </div>
        ` : '';
        return `
          <div class="history-msg ramon">
            <div class="history-msg-label">RAMON · turno ${ramonTurnIndex}</div>
            <div class="history-msg-body">${esc(msg.content)}</div>
            ${fbBlock}
          </div>
        `;
      }
      return `
        <div class="history-msg lead">
          <div class="history-msg-label">LEAD</div>
          <div class="history-msg-body">${esc(msg.content)}</div>
        </div>
      `;
    }).join('');

    const porMomentoHtml = report.por_momento ? Object.keys(report.por_momento).map(k => {
      const d = report.por_momento[k] || {};
      const nota = typeof d.nota === 'number' ? d.nota.toFixed(1) : '—';
      return `
        <div class="history-momento">
          <div class="history-momento-head"><b>${momentoLabel[k] || k}</b> · ${nota}/10</div>
          ${d.ponto_forte ? `<div><b>Forte:</b> ${esc(d.ponto_forte)}</div>` : ''}
          ${d.ponto_fraco ? `<div><b>Fraco:</b> ${esc(d.ponto_fraco)}</div>` : ''}
          ${d.sugestao ? `<div><b>Sugestão:</b> ${esc(d.sugestao)}</div>` : ''}
        </div>
      `;
    }).join('') : '';

    const melhoresHtml = (report.melhores_3_tecnicas || []).map(t => `
      <div class="history-melhor">✅ <b>${esc(t.nome || '—')}</b> <span class="muted">${esc(momentoLabel[t.momento] || t.momento || '')} · turno ${t.turno || '?'}</span><br/>${esc(t.porque || '')}</div>
    `).join('');

    const pioresHtml = (report.piores_3_pontos || []).map(p => `
      <div class="history-pior">⚠️ <b>${esc(p.nome || '—')}</b> <span class="muted">${esc(momentoLabel[p.momento] || p.momento || '')} · turno ${p.turno || '?'}</span><br/>
      <i>${esc(p.o_que_aconteceu || '')}</i><br/>
      <b>Correção:</b> ${esc(p.correcao || '')}</div>
    `).join('');

    $('#historyDetailBody').innerHTML = `
      <div class="history-detail-outcome ${meta.cls}">
        <div class="history-detail-outcome-label">${meta.label}</div>
        <div class="history-detail-outcome-motivo">${esc(s.outcome_motivo || '')}</div>
        ${s.outcome_evidencia_lead ? `<div class="history-detail-outcome-evidence">💬 <i>"${esc(s.outcome_evidencia_lead)}"</i></div>` : ''}
      </div>

      <div class="history-detail-meta">
        <div><b>Data:</b> ${formatDate(s.date)}</div>
        <div><b>Nota final:</b> ${typeof s.nota_final === 'number' ? s.nota_final.toFixed(1) : '—'}/10</div>
        <div><b>Turnos:</b> ${s.turnos || (conv.length && Math.floor(conv.length / 2)) || 0}</div>
        ${s.duration_ms ? `<div><b>⏱️ Duração:</b> ${formatDuration(s.duration_ms)}</div>` : ''}
        <div><b>XP ganho:</b> +${s.xp_ganho || 0}</div>
        <div><b>Sub-modo:</b> ${esc(s.submodo || '—')}</div>
        <div><b>Dificuldade:</b> ${esc(s.dificuldade || '—')}</div>
      </div>

      <div class="history-detail-section">
        <h3>Cenário</h3>
        <div><b>Persona:</b> ${esc(persona.nome || '—')}${persona.idade ? ` (${persona.idade})` : ''}${persona.profissao ? ` · ${esc(persona.profissao)}` : ''}</div>
        ${cenario.padrao_oculto ? `<div><b>Padrão oculto:</b> ${esc(cenario.padrao_oculto)}</div>` : ''}
        ${cenario.objecao_superficial ? `<div><b>Objeção superficial:</b> ${esc(cenario.objecao_superficial)}</div>` : ''}
        ${cenario.objecao_real ? `<div><b>Objeção real:</b> ${esc(cenario.objecao_real)}</div>` : ''}
        ${cenario.nivel_conhecimento ? `<div><b>Nível de conhecimento do lead:</b> ${esc(cenario.nivel_conhecimento)}</div>` : ''}
      </div>

      ${porMomentoHtml ? `<div class="history-detail-section"><h3>Análise por momento</h3>${porMomentoHtml}</div>` : ''}
      ${melhoresHtml ? `<div class="history-detail-section"><h3>🏆 Melhores técnicas</h3>${melhoresHtml}</div>` : ''}
      ${pioresHtml ? `<div class="history-detail-section"><h3>🪓 Pontos a melhorar</h3>${pioresHtml}</div>` : ''}

      <div class="history-detail-section">
        <h3>Transcrição completa</h3>
        <div class="history-chat">${chatHtml || '<div class="muted">(sem transcrição — sessão salva em modo leve por limite de armazenamento)</div>'}</div>
      </div>

      ${s.frase_caderno ? `<div class="history-detail-section frase-caderno"><h3>Frase pro caderno</h3><blockquote>${esc(s.frase_caderno)}</blockquote></div>` : ''}
    `;
  }

  // ========= EXPORT TXT / PDF =========
  function buildExportText(s) {
    const meta = OUTCOME_META[s.outcome] || OUTCOME_META['venda_nao_realizada'];
    const lines = [];
    const sep = '═'.repeat(60);
    const sub = '─'.repeat(60);

    lines.push(sep);
    lines.push('DOJÔ ALIANÇA DIVERGENTE — ARENA 2');
    lines.push('Relatório de Sessão');
    lines.push(sep);
    lines.push('');
    lines.push(`Resultado: ${meta.label}`);
    lines.push(`Data: ${formatDate(s.date)}`);
    lines.push(`Nota final: ${typeof s.nota_final === 'number' ? s.nota_final.toFixed(1) : '—'}/10`);
    lines.push(`Turnos: ${s.turnos || 0}`);
    if (s.duration_ms) lines.push(`Duração: ${formatDuration(s.duration_ms)}`);
    lines.push(`XP ganho: +${s.xp_ganho || 0}`);
    lines.push(`Sub-modo: ${s.submodo || '—'} · Dificuldade: ${s.dificuldade || '—'}`);
    if (s.outcome_motivo) { lines.push(''); lines.push('Motivo: ' + s.outcome_motivo); }
    if (s.outcome_evidencia_lead) lines.push('Evidência do lead: "' + s.outcome_evidencia_lead + '"');
    lines.push('');

    const cenario = s.cenario || {};
    const persona = cenario.persona || {};
    lines.push(sub);
    lines.push('CENÁRIO');
    lines.push(sub);
    lines.push('Persona: ' + (persona.nome || '—') + (persona.idade ? ` (${persona.idade})` : '') + (persona.profissao ? ` · ${persona.profissao}` : ''));
    if (cenario.padrao_oculto) lines.push('Padrão oculto: ' + cenario.padrao_oculto);
    if (cenario.objecao_superficial) lines.push('Objeção superficial: ' + cenario.objecao_superficial);
    if (cenario.objecao_real) lines.push('Objeção real: ' + cenario.objecao_real);
    if (cenario.nivel_conhecimento) lines.push('Nível de conhecimento do lead: ' + cenario.nivel_conhecimento);
    lines.push('');

    const report = s.report_full || {};
    if (report.por_momento) {
      lines.push(sub);
      lines.push('ANÁLISE POR MOMENTO');
      lines.push(sub);
      ['abertura', 'conducao', 'fechamento'].forEach(k => {
        const d = report.por_momento[k] || {};
        const lbl = { abertura: 'Abertura (1-3)', conducao: 'Condução (4-10)', fechamento: 'Fechamento (11-18)' }[k];
        lines.push(`${lbl} — Nota ${typeof d.nota === 'number' ? d.nota.toFixed(1) : '—'}/10`);
        if (d.ponto_forte) lines.push('  Forte: ' + d.ponto_forte);
        if (d.ponto_fraco) lines.push('  Fraco: ' + d.ponto_fraco);
        if (d.sugestao) lines.push('  Sugestão: ' + d.sugestao);
        lines.push('');
      });
    }

    if (report.melhores_3_tecnicas?.length) {
      lines.push(sub);
      lines.push('🏆 MELHORES TÉCNICAS APLICADAS');
      lines.push(sub);
      report.melhores_3_tecnicas.forEach(t => {
        lines.push(`✅ ${t.nome || '—'} · ${t.momento || '—'} · turno ${t.turno || '?'}`);
        if (t.porque) lines.push('   ' + t.porque);
      });
      lines.push('');
    }

    if (report.piores_3_pontos?.length) {
      lines.push(sub);
      lines.push('🪓 PONTOS A MELHORAR');
      lines.push(sub);
      report.piores_3_pontos.forEach(p => {
        lines.push(`⚠️ ${p.nome || '—'} · ${p.momento || '—'} · turno ${p.turno || '?'}`);
        if (p.o_que_aconteceu) lines.push('   O que aconteceu: ' + p.o_que_aconteceu);
        if (p.correcao) lines.push('   Correção: ' + p.correcao);
      });
      lines.push('');
    }

    lines.push(sub);
    lines.push('TRANSCRIÇÃO COMPLETA');
    lines.push(sub);
    const conv = s.conversation || [];
    const feedbacks = s.turn_feedbacks || [];
    let ramonTurn = 0;
    conv.forEach(m => {
      if (m.role === 'user') {
        ramonTurn++;
        lines.push('');
        lines.push(`[RAMON — turno ${ramonTurn}]`);
        lines.push(m.content);
        const fb = feedbacks[ramonTurn - 1];
        if (fb) {
          lines.push(`   Nota: ${(fb.nota_geral || 0).toFixed(1)}/10`);
          if (fb.ponto_forte) lines.push('   ✅ Forte: ' + fb.ponto_forte);
          if (fb.ajuste) lines.push('   ⚠️ Ajuste: ' + fb.ajuste);
          if (fb.reformulacao) lines.push('   💡 Melhor: ' + fb.reformulacao);
        }
      } else {
        lines.push('');
        lines.push('[LEAD]');
        lines.push(m.content);
      }
    });

    if (s.frase_caderno) {
      lines.push('');
      lines.push(sub);
      lines.push('FRASE PRO CADERNO');
      lines.push(sub);
      lines.push('"' + s.frase_caderno + '"');
    }

    lines.push('');
    lines.push(sep);
    return lines.join('\n');
  }

  function downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function exportTxt() {
    if (!currentHistorySession) return;
    const txt = buildExportText(currentHistorySession);
    const datePart = (currentHistorySession.date || '').slice(0, 10);
    const personaPart = (currentHistorySession.persona || 'sessao').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadBlob('\uFEFF' + txt, `dojo_sessao_${datePart}_${personaPart}.txt`, 'text/plain;charset=utf-8');
  }

  function exportPdf() {
    if (!currentHistorySession) return;
    // Usa print do browser — o próprio usuário escolhe "Salvar como PDF" no diálogo de impressão.
    // Uma classe 'print-mode' é adicionada pra que styles.css possa ajustar a página de impressão.
    document.body.classList.add('print-mode');
    // Esconde tudo que não é a sessão detalhada
    window.print();
    setTimeout(() => document.body.classList.remove('print-mode'), 500);
  }

  let historyReturnScreen = 'dashboard'; // lembra de onde veio pra voltar certo

  function openHistory(fromScreen) {
    historyReturnScreen = fromScreen || 'dashboard';
    renderHistoryList();
    showScreen('history');
  }

  function initHistory() {
    $('#btnViewHistory').addEventListener('click', () => openHistory('report'));
    const dashBtn = $('#btnViewHistoryDash');
    if (dashBtn) dashBtn.addEventListener('click', () => openHistory('dashboard'));
    $('#btnHistoryBack').addEventListener('click', () => {
      showScreen(historyReturnScreen);
    });
    $('#btnHistoryDetailBack').addEventListener('click', () => {
      renderHistoryList();
      showScreen('history');
    });
    $('#historyFilterOutcome').addEventListener('change', renderHistoryList);
    $('#historySearch').addEventListener('input', renderHistoryList);
    $('#btnExportTxt').addEventListener('click', exportTxt);
    $('#btnExportPdf').addEventListener('click', exportPdf);
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
      processing: '🤔 Avaliando sua resposta...',
      processing_lead: '💬 Lead pensando na resposta...',
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
    // Conta de mensagens do lead ANTES — usa pra saber se handleSend produziu uma nova
    const leadMsgsBefore = state.conversation.filter(m => m.role === 'assistant').length;

    try {
      await handleSend();
    } catch (err) {
      console.error('[autoSubmit] handleSend falhou:', err);
    }

    // Verifica o estado da chamada depois do processamento
    if (!state.call.active) { return; }
    if (state.call.paused) {
      state.call.phase = 'paused';
      updateCallUI();
      return;
    }
    if (state.sessionClosed) { endCall(); return; }

    // Pega a ÚLTIMA mensagem do lead que foi adicionada durante handleSend
    const allLeadMsgs = state.conversation.filter(m => m.role === 'assistant');
    const produzidaNova = allLeadMsgs.length > leadMsgsBefore;
    const ultimaLeadMsg = allLeadMsgs[allLeadMsgs.length - 1];

    // Filtra mensagens "de erro" — não queremos que TTS leia isso nem o flow fique estranho
    const isErrorMsg = ultimaLeadMsg?.content && /^\(erro/i.test(ultimaLeadMsg.content.trim());

    if (produzidaNova && ultimaLeadMsg?.content && !isErrorMsg) {
      // Fluxo normal — lead respondeu, TTS fala
      speakLeadThenListen(ultimaLeadMsg.content);
    } else {
      // API travou ou deu erro em série: a avaliação rodou (Ramon msg no chat), mas lead não respondeu.
      // NÃO perde a resposta do Ramon — ela já está no chat avaliada.
      // Só reabre o mic pra você falar o PRÓXIMO turno depois de um aviso.
      console.warn('[autoSubmit] sem resposta válida do lead; mantém sua resposta e reabre mic');
      const statusEl = $('#callStatus');
      if (statusEl) {
        statusEl.innerHTML = '<span class="ping" style="background:#c89a2e"></span> ⚠️ API do lead falhou (resposta sua já avaliada no chat). Continue falando ou ⏸️ Pausar.';
      }
      // espera 3s pra usuário ler, depois reabre o mic
      setTimeout(() => {
        if (state.call.active && !state.call.paused) beginListening();
      }, 3000);
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
      // Se a sessão já acabou (aguardando relatório), avisa que vai perder o relatório
      if (state.sessionAwaitingReport) {
        if (!confirm('Você tem um relatório pronto pra gerar. Sair sem gerar?')) return;
      } else if (state.turn > 0 && !state.sessionClosed && !confirm('Sair sem concluir? O progresso será perdido.')) {
        return;
      }
      Speech.stopSpeaking();
      stopSilenceTick();
      hideSessionEndModal();
      renderDashboard();
      showScreen('dashboard');
    });

    $('#btnEndSessionNow').addEventListener('click', () => {
      if (state.turn === 0) {
        alert('Você ainda não respondeu nenhuma vez. Não há o que encerrar.');
        return;
      }
      if (state.sessionClosed || state.leadDesistiu || state.sessionAwaitingReport) {
        return; // já encerrado — modal de fim está/estará visível
      }
      if (!confirm(`Encerrar agora? Um relatório parcial será gerado com os ${state.turn} turnos já respondidos.`)) return;
      Speech.stopSpeaking();
      stopSilenceTick();
      if (state.call.active) endCall();
      state.sessionEndReason = 'usuario_encerrou';
      // Mesmo fluxo unificado: modal de fim → botão "Ver relatório"
      state.sessionAwaitingReport = true;
      disableSessionInputs();
      showSessionEndModal('usuario_encerrou');
    });

    $('#btnGoToReport').addEventListener('click', () => {
      hideSessionEndModal();
      endSession();
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
    Gamification.migrateLegacyKeys();
    initWelcome();
    initDashboard();
    initSession();
    initHistory();

    try {
      await loadData();
    } catch (err) {
      alert('Erro carregando data/*.json: ' + err.message + '\n\nSirva via http:// (python3 -m http.server 8080)');
    }
  }

  window.addEventListener('DOMContentLoaded', boot);
})();
