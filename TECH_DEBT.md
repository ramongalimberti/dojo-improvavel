# Tech Debt — Treinamento de Vendas (Dojô Improvável)

Itens pendentes que não couberam no escopo do commit em que foram detectados.
Cada item: o que, onde, por quê adiado, prioridade.

---

## Documentação desatualizada — IDs de modelo antigos

**Onde:**
- [ARQUITETURA.md:402](ARQUITETURA.md#L402) — referencia `claude-sonnet-4-20250514`
- [PROMPT-MESTRE-v2.md:302](PROMPT-MESTRE-v2.md#L302) — referencia `claude-sonnet-4-20250514`, max_tokens 1024/800/600 (todos defasados)

**Estado atual real (pós-fase0):**
- Modelo default: `claude-sonnet-4-6` ([claude-api.js:6](claude-api.js#L6))
- Modelo barato: `claude-haiku-4-5-20251001` ([claude-api.js:7](claude-api.js#L7), usado em leadResponse)
- max_tokens atualizados pós-bugfix de truncamento:
  - `Scenarios.generate`: 4096 (era 900) — commit 32a4034
  - `Evaluator.evaluateTurn`: 2048 (era 1100)
  - `Evaluator.leadHint`: 2048 (era 900)
  - `Evaluator.finalReport`: 4096 (era 1800)

**Por que adiado:** fora do escopo dos commits de fix; documentação precisa de passada
unificada, não patch por patch.

**Quando consertar:** próxima passada de documentação. Atualizar a tabela em
ARQUITETURA.md e a seção "DETALHES TÉCNICOS" do PROMPT-MESTRE-v2.md de uma vez só.

**Prioridade:** baixa (não bloqueia uso, mas confunde leitor novo).
