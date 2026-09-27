import { PlanSchema, type Plan, planJsonSchema } from './plan';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

async function chat(messages: Message[], jsonMode = true): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not set (see .env.example)');
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b',
      messages,
      temperature: 0.2,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    // Groq rejects its own output when strict JSON mode fails; that's retryable.
    const err = new Error(`Groq ${res.status}: ${body.slice(0, 300)}`) as Error & { retryable?: boolean; waitMs?: number };
    err.retryable = res.status === 429 || res.status >= 500 || body.includes('json_validate_failed');
    // Free-tier rate limits say how long to wait ("try again in 7.2s").
    const hint = body.match(/try again in ([\d.]+)s/i);
    if (res.status === 429) err.waitMs = Math.min(30_000, hint ? Math.ceil(Number(hint[1]) * 1000) + 500 : 10_000);
    throw err;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// Open models on Groq occasionally return malformed JSON or drop fields, so
// validate against the schema and feed the error back for a bounded retry.
export async function planFromLLM(system: string, user: string, attempts = 3): Promise<Plan> {
  const messages: Message[] = [
    { role: 'system', content: `${system}\n\nRespond with JSON only, matching this JSON Schema:\n${JSON.stringify(planJsonSchema)}` },
    { role: 'user', content: user },
  ];
  let lastError = '';
  for (let i = 0; i < attempts; i++) {
    let raw: string;
    try {
      // Last attempt drops strict JSON mode; safeJson() can still extract the object.
      raw = await chat(messages, i < attempts - 1);
    } catch (err) {
      const e = err as Error & { retryable?: boolean; waitMs?: number };
      if (!e.retryable) throw err;
      lastError = e.message;
      await new Promise((r) => setTimeout(r, e.waitMs ?? 800 * (i + 1)));
      continue;
    }
    const parsed = PlanSchema.safeParse(safeJson(raw));
    if (parsed.success) return parsed.data;
    lastError = parsed.error.message;
    messages.push(
      { role: 'assistant', content: raw },
      { role: 'user', content: `That JSON did not match the schema: ${lastError.slice(0, 500)}. Return corrected JSON only.` },
    );
  }
  throw new Error(`LLM did not return a valid plan after ${attempts} attempts: ${lastError.slice(0, 200)}`);
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
