// speech.js — Web Speech API pt-BR (reconhecimento + síntese de voz)

const Speech = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const MAX_LISTEN_MS = 30000; // 30s máximo

  let recognition = null;
  let listening = false;
  let autoStopTimer = null;
  let manualStop = false;
  let callbacks = null;

  function isSupported() { return !!SR; }

  // ========= COMANDOS DE VOZ → PONTUAÇÃO & PAUSAS =========
  // Aplica transformações no texto reconhecido pela Web Speech API pra
  // converter palavras faladas em pontuação real e marcar pausas.
  function processVoiceCommands(text) {
    if (!text) return text;
    let t = ' ' + text + ' '; // espaçamento pras regex de \b funcionarem no extremo

    // PAUSA (antes das outras regras — antes de "ponto")
    t = t.replace(/\bpausa(?:\s+de)?\s+(\d+)\s*(?:segundos?|s)\b/gi, (_, n) => ` [silêncio ${n}s] `);
    t = t.replace(/\bsil[êe]ncio(?:\s+de)?\s+(\d+)\s*(?:segundos?|s)\b/gi, (_, n) => ` [silêncio ${n}s] `);
    t = t.replace(/\bpausa\b/gi, ' [silêncio 3s] ');

    // PONTUAÇÃO — composições específicas antes das genéricas
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

    // Normalização de espaços ao redor da pontuação
    t = t.replace(/\s+([,.;:!?])/g, '$1');          // tira espaço antes
    t = t.replace(/([,.;:!?])(\S)/g, '$1 $2');       // coloca espaço depois
    t = t.replace(/[ \t]{2,}/g, ' ');                // colapsa espaços
    t = t.replace(/\s*\n\s*/g, '\n');                // limpa em volta de newline
    t = t.replace(/\s+\[silêncio/g, ' [silêncio');   // pausa com espaço único
    t = t.replace(/\]\s*([^\s\n])/g, '] $1');        // espaço depois de ]

    // Capitalização: início da string, depois de . ! ? ou newline
    t = t.replace(/^([ \t]*)([a-záàâãéêíóôõúç])/,
      (_, w, c) => w + c.toUpperCase());
    t = t.replace(/([.!?]\s+)([a-záàâãéêíóôõúç])/g,
      (_, p, c) => p + c.toUpperCase());
    t = t.replace(/(\n[ \t]*)([a-záàâãéêíóôõúç])/g,
      (_, p, c) => p + c.toUpperCase());

    return t.trim();
  }

  function createRecognition() {
    if (!SR) return null;
    const r = new SR();
    r.lang = 'pt-BR';
    r.continuous = true;       // escuta contínua
    r.interimResults = true;
    r.maxAlternatives = 1;
    return r;
  }

  function clearAutoStop() {
    if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null; }
  }

  function startListening(cb) {
    if (!SR) { cb?.onError?.('Reconhecimento de voz não suportado. Use Chrome ou Edge.'); return; }
    if (listening) return;

    callbacks = cb || {};
    recognition = createRecognition();
    manualStop = false;
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
      const combined = processVoiceCommands((finalText + ' ' + interim).trim());
      if (combined && callbacks.onInterim) callbacks.onInterim(combined);
      if (newFinal && callbacks.onFinal) callbacks.onFinal(processVoiceCommands(finalText.trim()));
    };

    recognition.onerror = (e) => {
      // 'no-speech' e 'aborted' são esperados durante escuta contínua — não derrubar
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      callbacks?.onError?.(e.error || 'Erro no reconhecimento');
    };

    recognition.onend = () => {
      // Se paramos manualmente ou o timer expirou, encerra de verdade
      if (manualStop) {
        listening = false;
        clearAutoStop();
        callbacks?.onEnd?.(finalText.trim());
        return;
      }
      // Caso contrário (fim natural antes do tempo), reinicia pra manter contínuo
      if (listening) {
        try { recognition.start(); } catch (_) {
          listening = false;
          clearAutoStop();
          callbacks?.onEnd?.(finalText.trim());
        }
      }
    };

    listening = true;
    try {
      recognition.start();
    } catch (err) {
      listening = false;
      callbacks?.onError?.(err.message);
      return;
    }

    // Auto-stop depois de 30s
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

  // TTS — leitura da resposta do lead (opcional)
  function speak(text, { rate = 1.0, voice = null } = {}) {
    if (!('speechSynthesis' in window) || !text) return;
    try { window.speechSynthesis.cancel(); } catch (_) {}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    u.rate = rate;
    // Tentar voz pt-BR feminina
    const voices = window.speechSynthesis.getVoices();
    const ptVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('pt'));
    const femaleHints = ['female', 'feminina', 'Luciana', 'Maria', 'Helena', 'Camila', 'Francisca'];
    const preferred = voice
      || ptVoices.find(v => femaleHints.some(h => v.name.toLowerCase().includes(h.toLowerCase())))
      || ptVoices[0];
    if (preferred) u.voice = preferred;
    window.speechSynthesis.speak(u);
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  return { isSupported, startListening, stopListening, isListening, speak, stopSpeaking, processVoiceCommands };
})();
