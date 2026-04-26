// speech.js v2 — Web Speech pt-BR + comandos de voz + Modo Chamada (TTS auto + silence timer)

const Speech = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const MAX_LISTEN_MS = 60000;        // 60s max pra call mode

  let recognition = null;
  let listening = false;
  let autoStopTimer = null;
  let manualStop = false;
  let callbacks = null;
  let currentOptions = null;

  // Silence-watchdog — auto-stop quando fica N ms sem nova transcrição
  let silenceWatchdog = null;
  let lastResultAt = null;
  let silenceTimeoutMs = null;   // se null, watchdog desligado
  let autoStopReason = null;      // 'silence' | 'timeout' | 'manual'

  // Timer de silêncio "narrado" (Modo Chamada visual) — desde fim do TTS até 1ª fala do usuário
  let silenceTimerStart = null;
  let lastSilenceDuration = 0;

  function isSupported() { return !!SR; }

  // ========= COMANDOS DE VOZ → PONTUAÇÃO & PAUSAS =========
  function processVoiceCommands(text) {
    if (!text) return text;
    let t = ' ' + text + ' ';

    // Pausas: "pausa de N segundos" → "...N" (se 1-9) ou "..." (fallback)
    t = t.replace(/\bpausa(?:\s+de)?\s+(\d+)\s*(?:segundos?|s)\b/gi, (_, n) => {
      const num = parseInt(n, 10);
      return (num >= 1 && num <= 9) ? ` ...${num} ` : ` ... `;
    });
    t = t.replace(/\bsil[êe]ncio(?:\s+de)?\s+(\d+)\s*(?:segundos?|s)\b/gi, (_, n) => {
      const num = parseInt(n, 10);
      return (num >= 1 && num <= 9) ? ` ...${num} ` : ` ... `;
    });
    t = t.replace(/\bpausa\b/gi, ' ... ');
    t = t.replace(/\bsil[êe]ncio\b/gi, ' ... ');

    const rules = [
      [/\bponto\s+de\s+interroga[cç][aã]o\b/gi, '?'],
      [/\bponto\s+de\s+exclama[cç][aã]o\b/gi, '!'],
      [/\bponto\s+e\s+v[ií]rgula\b/gi, ';'],
      [/\bponto\s+final\b/gi, '.'],
      [/\binterroga[cç][aã]o\b/gi, '?'],
      [/\bexclama[cç][aã]o\b/gi, '!'],
      [/\bv[ií]rgula\b/gi, ','],
      [/\bdois\s+pontos\b/gi, ':'],
      [/\bretic[êe]ncias\b/gi, '...'],
      [/\breticencias\b/gi, '...'],
      [/\bnova\s+linha\b/gi, '\n'],
      [/\bquebra\s+de\s+linha\b/gi, '\n'],
      [/\bpar[áa]grafo\b/gi, '\n\n'],
      [/\babre\s+aspas\b/gi, ' "'],
      [/\bfecha\s+aspas\b/gi, '" '],
      [/\babre\s+par[êe]ntese\b/gi, ' ('],
      [/\bfecha\s+par[êe]ntese\b/gi, ') '],
      [/\bh[ií]fen\b/gi, '-'],
      [/\btra[cç]o\b/gi, ' — '],
      [/\bponto\b/gi, '.']
    ];
    rules.forEach(([re, rep]) => { t = t.replace(re, rep); });

    t = t.replace(/\s+([,.;:!?])/g, '$1');
    t = t.replace(/([,.;:!?])(\S)/g, '$1 $2');
    t = t.replace(/[ \t]{2,}/g, ' ');
    t = t.replace(/\s*\n\s*/g, '\n');
    t = t.replace(/\s+\[silêncio/g, ' [silêncio');
    t = t.replace(/\]\s*([^\s\n])/g, '] $1');

    t = t.replace(/^([ \t]*)([a-záàâãéêíóôõúç])/, (_, w, c) => w + c.toUpperCase());
    t = t.replace(/([.!?]\s+)([a-záàâãéêíóôõúç])/g, (_, p, c) => p + c.toUpperCase());
    t = t.replace(/(\n[ \t]*)([a-záàâãéêíóôõúç])/g, (_, p, c) => p + c.toUpperCase());

    return t.trim();
  }

  // ========= RECOGNITION =========
  function createRecognition() {
    if (!SR) return null;
    const r = new SR();
    r.lang = 'pt-BR';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    return r;
  }

  function clearAutoStop() { if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null; } }
  function clearSilenceWatchdog() { if (silenceWatchdog) { clearInterval(silenceWatchdog); silenceWatchdog = null; } }

  // cb: { onInterim, onFinal, onError, onEnd, onAutoStop, silenceTimeoutMs, maxListenMs }
  function startListening(cb) {
    if (!SR) { cb?.onError?.('Reconhecimento de voz não suportado. Use Chrome ou Edge.'); return; }
    if (listening) return;

    callbacks = cb || {};
    currentOptions = cb || {};
    silenceTimeoutMs = currentOptions.silenceTimeoutMs || null;
    autoStopReason = null;
    recognition = createRecognition();
    manualStop = false;
    lastResultAt = null;
    let finalText = '';

    recognition.onresult = (e) => {
      let interim = '';
      let newFinal = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) newFinal += transcript + ' ';
        else interim += transcript;
      }
      if (newFinal) finalText += newFinal;

      const hasNewContent = (newFinal || interim);
      if (hasNewContent) {
        lastResultAt = Date.now();
        // Se era a primeira fala do usuário neste listening, captura o tempo de silêncio
        if (silenceTimerStart) {
          lastSilenceDuration = (Date.now() - silenceTimerStart) / 1000;
          silenceTimerStart = null;
        }
      }

      const combined = processVoiceCommands((finalText + ' ' + interim).trim());
      if (combined && callbacks.onInterim) callbacks.onInterim(combined);
      if (newFinal && callbacks.onFinal) callbacks.onFinal(processVoiceCommands(finalText.trim()));
    };

    recognition.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      callbacks?.onError?.(e.error || 'Erro no reconhecimento');
    };

    recognition.onend = () => {
      if (manualStop) {
        listening = false;
        clearAutoStop();
        clearSilenceWatchdog();
        const cleanText = processVoiceCommands(finalText.trim());
        if (autoStopReason === 'silence') {
          callbacks?.onAutoStop?.(cleanText);
        } else {
          callbacks?.onEnd?.(cleanText);
        }
        return;
      }
      // Reinício automático se continuous e ainda listening
      if (listening) {
        try { recognition.start(); }
        catch (_) {
          listening = false;
          clearAutoStop();
          clearSilenceWatchdog();
          callbacks?.onEnd?.(processVoiceCommands(finalText.trim()));
        }
      }
    };

    listening = true;
    try { recognition.start(); }
    catch (err) {
      listening = false;
      callbacks?.onError?.(err.message);
      return;
    }

    // Max duration
    const maxMs = currentOptions.maxListenMs || MAX_LISTEN_MS;
    autoStopTimer = setTimeout(() => {
      if (listening) {
        autoStopReason = 'timeout';
        manualStop = true;
        try { recognition.stop(); } catch (_) {}
      }
    }, maxMs);

    // Silence watchdog (detecta quando usuário parou de falar)
    if (silenceTimeoutMs) {
      silenceWatchdog = setInterval(() => {
        if (!listening || !lastResultAt) return;
        const silentFor = Date.now() - lastResultAt;
        if (silentFor >= silenceTimeoutMs && finalText.trim().length > 0) {
          autoStopReason = 'silence';
          manualStop = true;
          try { recognition.stop(); } catch (_) {}
        }
      }, 200);
    }
  }

  function stopListening() {
    autoStopReason = 'manual';
    manualStop = true;
    clearAutoStop();
    clearSilenceWatchdog();
    if (recognition && listening) {
      try { recognition.stop(); } catch (_) {}
    } else {
      listening = false;
    }
  }

  // Retorna ms desde a última transcrição (pra mostrar countdown)
  function getMsSinceLastResult() {
    if (!listening || !lastResultAt) return null;
    return Date.now() - lastResultAt;
  }

  function isListening() { return listening; }

  // ========= TTS =========
  function getPreferredPtBrFemaleVoice() {
    const voices = window.speechSynthesis.getVoices();
    const ptVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('pt'));
    const femaleHints = ['luciana', 'maria', 'helena', 'camila', 'francisca', 'female', 'feminina', 'google', 'microsoft'];
    return ptVoices.find(v => femaleHints.some(h => v.name.toLowerCase().includes(h))) || ptVoices[0];
  }

  function cleanTextForTTS(text) {
    // Remove marcações como [silêncio 3s], [pausa], etc
    return (text || '').replace(/\[sil[êe]ncio\s+(\d+)s?\]/gi, '... ')
                       .replace(/\[pausa[^\]]*\]/gi, '... ')
                       .replace(/\s+/g, ' ')
                       .trim();
  }

  // Converte texto com marcadores de pausa em chunks [texto, texto, ...]
  // com pausas explícitas entre eles. Marcadores suportados:
  //   "...N" (onde N = 1..9) → pausa de N segundos (sem falar "...")
  //   "..."                  → pausa curta natural (~700ms) — mantido no texto pra TTS respirar
  function splitByPauseMarkers(text) {
    if (!text) return [];
    const clean = cleanTextForTTS(text);
    // Primeiro extraímos ...N (pausa longa) — split com captura
    // Regex: reticências seguidas de dígito 1-9 (sem ser parte de número maior)
    const parts = clean.split(/(\.{3}\s*[1-9])\b/g);
    const out = [];
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (!p) continue;
      const m = p.match(/^\.{3}\s*([1-9])$/);
      if (m) {
        out.push({ type: 'pause', seconds: parseInt(m[1], 10) });
      } else {
        const trimmed = p.trim();
        if (trimmed) out.push({ type: 'speak', text: trimmed });
      }
    }
    return out;
  }

  function speak(text, { rate = 1.0, onEnd, onStart } = {}) {
    if (!('speechSynthesis' in window) || !text) return;
    try { window.speechSynthesis.cancel(); } catch (_) {}

    const chunks = splitByPauseMarkers(text);
    if (!chunks.length) { onEnd?.(); return; }

    const voice = getPreferredPtBrFemaleVoice();
    let started = false;
    let cancelled = false;

    // cancela tudo se stopSpeaking for chamado
    pendingPauseTimers.forEach(t => clearTimeout(t));
    pendingPauseTimers = [];

    function playNext(i) {
      if (cancelled) return;
      if (i >= chunks.length) {
        silenceTimerStart = Date.now();
        onEnd?.();
        return;
      }
      const c = chunks[i];
      if (c.type === 'pause') {
        const t = setTimeout(() => playNext(i + 1), c.seconds * 1000);
        pendingPauseTimers.push(t);
      } else {
        const u = new SpeechSynthesisUtterance(c.text);
        u.lang = 'pt-BR';
        u.rate = rate;
        if (voice) u.voice = voice;
        u.onstart = () => { if (!started) { started = true; onStart?.(); } };
        u.onend = () => playNext(i + 1);
        u.onerror = () => playNext(i + 1);
        try { window.speechSynthesis.speak(u); }
        catch (_) { playNext(i + 1); }
      }
    }
    playNext(0);

    // expose cancel
    currentSpeakCancel = () => { cancelled = true; pendingPauseTimers.forEach(t => clearTimeout(t)); pendingPauseTimers = []; };
  }

  let pendingPauseTimers = [];
  let currentSpeakCancel = null;

  function stopSpeaking() {
    if (currentSpeakCancel) { try { currentSpeakCancel(); } catch (_) {} currentSpeakCancel = null; }
    pendingPauseTimers.forEach(t => clearTimeout(t));
    pendingPauseTimers = [];
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  // ========= SILENCE TIMER (Modo Chamada) =========
  function resetSilenceTimer() {
    silenceTimerStart = null;
    lastSilenceDuration = 0;
  }

  function getSilenceStartTime() {
    return silenceTimerStart;
  }

  function getCurrentSilenceSeconds() {
    if (!silenceTimerStart) return 0;
    return (Date.now() - silenceTimerStart) / 1000;
  }

  function getLastSilenceDuration() {
    return lastSilenceDuration;
  }

  function captureAndResetSilence() {
    if (silenceTimerStart) {
      lastSilenceDuration = (Date.now() - silenceTimerStart) / 1000;
      silenceTimerStart = null;
    }
    return lastSilenceDuration;
  }

  return {
    isSupported, startListening, stopListening, isListening,
    speak, stopSpeaking, processVoiceCommands,
    resetSilenceTimer, getSilenceStartTime, getCurrentSilenceSeconds,
    getLastSilenceDuration, captureAndResetSilence,
    getMsSinceLastResult
  };
})();
