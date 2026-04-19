// speech.js v2 — Web Speech pt-BR + comandos de voz + Modo Chamada (TTS auto + silence timer)

const Speech = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const MAX_LISTEN_MS = 30000;

  let recognition = null;
  let listening = false;
  let autoStopTimer = null;
  let manualStop = false;
  let callbacks = null;

  // Silence timer (Modo Chamada)
  let silenceTimerStart = null;  // timestamp quando o lead terminou de falar
  let lastSilenceDuration = 0;

  function isSupported() { return !!SR; }

  // ========= COMANDOS DE VOZ → PONTUAÇÃO & PAUSAS =========
  function processVoiceCommands(text) {
    if (!text) return text;
    let t = ' ' + text + ' ';

    t = t.replace(/\bpausa(?:\s+de)?\s+(\d+)\s*(?:segundos?|s)\b/gi, (_, n) => ` [silêncio ${n}s] `);
    t = t.replace(/\bsil[êe]ncio(?:\s+de)?\s+(\d+)\s*(?:segundos?|s)\b/gi, (_, n) => ` [silêncio ${n}s] `);
    t = t.replace(/\bpausa\b/gi, ' [silêncio 3s] ');

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

  function startListening(cb) {
    if (!SR) { cb?.onError?.('Reconhecimento de voz não suportado. Use Chrome ou Edge.'); return; }
    if (listening) return;

    callbacks = cb || {};
    recognition = createRecognition();
    manualStop = false;
    let finalText = '';

    // Captura o tempo de silêncio DESDE que o lead falou pela última vez
    if (silenceTimerStart) {
      lastSilenceDuration = (Date.now() - silenceTimerStart) / 1000;
      silenceTimerStart = null;
    }

    recognition.onresult = (e) => {
      let interim = '';
      let newFinal = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) newFinal += transcript + ' ';
        else interim += transcript;
      }
      if (newFinal) finalText += newFinal;
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
        callbacks?.onEnd?.(processVoiceCommands(finalText.trim()));
        return;
      }
      if (listening) {
        try { recognition.start(); }
        catch (_) {
          listening = false;
          clearAutoStop();
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

    autoStopTimer = setTimeout(() => {
      if (listening) {
        manualStop = true;
        try { recognition.stop(); } catch (_) {}
      }
    }, MAX_LISTEN_MS);
  }

  function stopListening() {
    manualStop = true;
    clearAutoStop();
    if (recognition && listening) {
      try { recognition.stop(); } catch (_) {}
    } else {
      listening = false;
    }
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
    // Remove marcações como [silêncio 3s], [pausa], etc, mas FAZ a pausa de verdade
    return (text || '').replace(/\[sil[êe]ncio\s+(\d+)s?\]/gi, '... ')  // TTS vai pausar naturalmente
                       .replace(/\[pausa[^\]]*\]/gi, '... ')
                       .replace(/\s+/g, ' ')
                       .trim();
  }

  function speak(text, { rate = 1.0, onEnd, onStart } = {}) {
    if (!('speechSynthesis' in window) || !text) return;
    try { window.speechSynthesis.cancel(); } catch (_) {}
    const clean = cleanTextForTTS(text);
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'pt-BR';
    u.rate = rate;
    const voice = getPreferredPtBrFemaleVoice();
    if (voice) u.voice = voice;
    u.onstart = () => { onStart?.(); };
    u.onend = () => {
      // Começar a contar silêncio agora que o lead parou de falar
      silenceTimerStart = Date.now();
      onEnd?.();
    };
    window.speechSynthesis.speak(u);
  }

  function stopSpeaking() {
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
    getLastSilenceDuration, captureAndResetSilence
  };
})();
