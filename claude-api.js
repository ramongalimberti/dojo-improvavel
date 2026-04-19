// claude-api.js — integração com Anthropic Messages API (browser, direto)

const ClaudeAPI = (() => {
  const MODEL = 'claude-sonnet-4-20250514';
  const ENDPOINT = 'https://api.anthropic.com/v1/messages';

  function getKey() {
    return localStorage.getItem('dojo:ramon:api_key') || '';
  }

  function setKey(k) {
    localStorage.setItem('dojo:ramon:api_key', k);
  }

  async function call({ system, messages, max_tokens = 1024, temperature = 0.8 }) {
    const key = getKey();
    if (!key) throw new Error('API key não configurada');

    const body = {
      model: MODEL,
      max_tokens,
      temperature,
      system,
      messages
    };

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    return { text, raw: data };
  }

  // Extrai JSON de uma resposta (pode vir com prosa em volta)
  function extractJSON(text) {
    if (!text) return null;
    // Tenta achar primeiro { ... } balanceado
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first === -1 || last === -1 || last < first) return null;
    const slice = text.slice(first, last + 1);
    try { return JSON.parse(slice); }
    catch (_) {
      // tentar limpar fences de código
      const cleaned = slice.replace(/```json|```/g, '').trim();
      try { return JSON.parse(cleaned); } catch (_) { return null; }
    }
  }

  return { call, extractJSON, getKey, setKey, MODEL };
})();
