// claude-api.js — integração com Anthropic Messages API (browser, direto)

const ClaudeAPI = (() => {
  // Modelos disponíveis (atualizado 2026-05). Sonnet 4.6 = default custo/qualidade.
  // Haiku 4.5 = rápido/barato (usado em leadResponse). Opus = não usado por custo.
  const MODEL = 'claude-sonnet-4-6';
  const MODEL_HAIKU = 'claude-haiku-4-5-20251001';
  const ENDPOINT = 'https://api.anthropic.com/v1/messages';

  // Tabela de preços por modelo (USD por MTok). Mantida aqui pra telemetria de custo.
  // Atualizar quando Anthropic mudar tabela.
  const PRICING = {
    'claude-sonnet-4-6':           { input: 3.00, output: 15.00, cache_write: 3.75, cache_read: 0.30 },
    'claude-sonnet-4-20250514':    { input: 3.00, output: 15.00, cache_write: 3.75, cache_read: 0.30 },
    'claude-haiku-4-5-20251001':   { input: 0.80, output: 4.00,  cache_write: 1.00, cache_read: 0.08 },
    'claude-opus-4-7':             { input: 15.00, output: 75.00, cache_write: 18.75, cache_read: 1.50 }
  };

  function getKey() {
    return localStorage.getItem('dojo:ramon:api_key') || '';
  }

  function setKey(k) {
    localStorage.setItem('dojo:ramon:api_key', k);
  }

  // ========= ACUMULADOR DE USO POR SESSÃO =========
  // app.js chama startAccumulating() em startSession() e endAccumulating() em endSession().
  // Cada call() agrega input/output/cache_*/cost_usd quando o acumulador está ligado.
  let _accum = null;
  function startAccumulating() {
    _accum = { calls: 0, input: 0, output: 0, cache_write: 0, cache_read: 0, cost_usd: 0, byModel: {} };
  }
  function endAccumulating() {
    const a = _accum;
    _accum = null;
    return a || { calls: 0, input: 0, output: 0, cache_write: 0, cache_read: 0, cost_usd: 0, byModel: {} };
  }
  function peekAccumulating() {
    return _accum ? { ..._accum, byModel: { ..._accum.byModel } } : null;
  }
  function _record(usage) {
    if (!_accum) return;
    _accum.calls += 1;
    _accum.input += usage.input || 0;
    _accum.output += usage.output || 0;
    _accum.cache_write += usage.cache_write || 0;
    _accum.cache_read += usage.cache_read || 0;
    _accum.cost_usd += usage.cost_usd || 0;
    const m = usage.model || 'unknown';
    if (!_accum.byModel[m]) _accum.byModel[m] = { calls: 0, cost_usd: 0 };
    _accum.byModel[m].calls += 1;
    _accum.byModel[m].cost_usd += usage.cost_usd || 0;
  }

  // `system` pode ser:
  //   - string (legacy — vira 1 bloco sem cache)
  //   - array de blocks [{ type: 'text', text, cache_control? }] — passa direto
  // `model` opcional; default MODEL. Usar MODEL_HAIKU em chamadas baratas (leadResponse).
  async function call({ system, messages, max_tokens = 1024, temperature = 0.8, model = MODEL }) {
    const key = getKey();
    if (!key) throw new Error('API key não configurada');

    const body = {
      model,
      max_tokens,
      temperature,
      messages
    };
    if (system) body.system = system;

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
    const usage = normalizeUsage(data.usage || {}, model);
    _record(usage);
    return { text, raw: data, usage };
  }

  // Normaliza usage da API + calcula custo USD com base em PRICING.
  // Anthropic retorna: input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens
  function normalizeUsage(raw, model) {
    const p = PRICING[model] || PRICING[MODEL];
    const input = raw.input_tokens || 0;
    const output = raw.output_tokens || 0;
    const cacheWrite = raw.cache_creation_input_tokens || 0;
    const cacheRead = raw.cache_read_input_tokens || 0;
    const costUsd =
      (input * p.input + output * p.output + cacheWrite * p.cache_write + cacheRead * p.cache_read) / 1_000_000;
    return { input, output, cache_write: cacheWrite, cache_read: cacheRead, cost_usd: costUsd, model };
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

  return {
    call, extractJSON, getKey, setKey,
    MODEL, MODEL_HAIKU, PRICING,
    startAccumulating, endAccumulating, peekAccumulating
  };
})();
