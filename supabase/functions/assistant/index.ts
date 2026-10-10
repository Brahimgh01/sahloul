// Supabase Edge Function: "assistant"
//
// The app NEVER holds the AI key. It sends only a short text question plus a
// tiny context summary (late devices, critical devices, department names), and
// this function calls the model. The key lives in the function's secrets.
//
// Deploy:
//   supabase functions deploy assistant
//   supabase secrets set AI_API_KEY=sk-... AI_MODEL=gpt-4o-mini \
//     AI_BASE_URL=https://api.openai.com/v1
//
// Request body (from src/services/ai.ts -> callAssistant):
//   { text: string, language: 'fr'|'ar'|'en', context: { late: [...], critical: [...], departments: [...] } }
//
// Response body:
//   { reply: string, action: {type:'none'} | {type:'open_device', inventory_no} | {type:'route', route}, needsConfirm: boolean }

interface CtxDevice {
  inventory_no: string;
  type: string;
  department: string;
  days_late: number;
  company?: string | null;
}

interface AskBody {
  text: string;
  language: 'fr' | 'ar' | 'en';
  context: {
    late: CtxDevice[];
    critical: CtxDevice[];
    departments: string[];
  };
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const LANG_NAME: Record<string, string> = {
  fr: 'French',
  ar: 'Arabic (Tunisian public hospital, standard Arabic is fine)',
  en: 'English',
};

function systemPrompt(language: string): string {
  return [
    'You are the assistant inside "S-IT Hub", an offline-first phone app used by the',
    'IT manager of a Tunisian public hospital to track broken devices sent out for',
    'repair, late returns, and the papers that go with them.',
    '',
    'Rules:',
    '- Answer in ' + (LANG_NAME[language] ?? 'French') + '. Keep it short and plain. No medical or patient data ever.',
    '- You may only talk about devices, companies/repairers, loans and papers.',
    '- You must ASK before anything changes: set needsConfirm=true when you propose an action.',
    '- Allowed actions:',
    '  {"type":"open_device","inventory_no":"INV-0001"}  -> open that device screen',
    '  {"type":"route","route":"Scan"}                    -> route is one of Scan, Board, Today, Devices, Papers',
    '  {"type":"none"}                                    -> just a message',
    '- Reply with STRICT JSON only: {"reply": string, "action": {...}, "needsConfirm": boolean}.',
    'Do not wrap it in markdown.',
  ].join('\n');
}

function userPrompt(body: AskBody): string {
  const lines: string[] = [];
  lines.push('Question: ' + body.text);
  lines.push('');
  lines.push('Devices currently out and LATE (' + body.context.late.length + '):');
  for (const d of body.context.late.slice(0, 20)) {
    lines.push(`- ${d.inventory_no} ${d.type} · ${d.department}` + (d.company ? ` · ${d.company}` : '') + ` · late ${d.days_late}d`);
  }
  lines.push('');
  lines.push('CRITICAL / urgent ones (' + body.context.critical.length + '):');
  for (const d of body.context.critical.slice(0, 20)) {
    lines.push(`- ${d.inventory_no} ${d.type} · ${d.department}` + (d.days_late ? ` · late ${d.days_late}d` : ''));
  }
  lines.push('');
  lines.push('Departments: ' + body.context.departments.join(', '));
  return lines.join('\n');
}

const VALID_ROUTES = ['Scan', 'Board', 'Today', 'Devices', 'Papers'];

function parseModel(text: string): { reply: string; action: unknown; needsConfirm: boolean } {
  let raw = text.trim();
  // Tolerate accidental ```json fences.
  raw = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let obj: Record<string, unknown> = {};
  try {
    obj = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { reply: text.trim(), action: { type: 'none' }, needsConfirm: false };
  }

  const reply = String(obj.reply ?? obj.text ?? '').trim() || text.trim();
  const needsConfirm = !!obj.needsConfirm;

  const a = (obj.action ?? {}) as Record<string, unknown>;
  const type = String(a.type ?? a.kind ?? 'none').toLowerCase();
  let action: unknown = { type: 'none' };
  if (type === 'open_device') {
    const inv = String(a.inventory_no ?? a.inventory ?? '').toUpperCase();
    if (inv) action = { type: 'open_device', inventory_no: inv };
  } else if (type === 'route' && VALID_ROUTES.includes(String(a.route))) {
    action = { type: 'route', route: String(a.route) };
  }
  return { reply, action, needsConfirm };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const aiKey = Deno.env.get('AI_API_KEY');
  const model = Deno.env.get('AI_MODEL') ?? 'gpt-4o-mini';
  const baseUrl = (Deno.env.get('AI_BASE_URL') ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  if (!aiKey) return json({ error: 'AI not configured' }, 500);

  let body: AskBody;
  try {
    body = (await req.json()) as AskBody;
  } catch {
    return json({ error: 'bad json' }, 400);
  }
  if (!body?.text || !body?.context) return json({ error: 'bad request' }, 400);

  const language = body.language ?? 'fr';

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${aiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt(language) },
          { role: 'user', content: userPrompt({ ...body, language }) },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: 'upstream', detail: detail.slice(0, 400) }, 502);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? '';
    return json(parseModel(content));
  } catch (e) {
    return json({ error: 'failed', detail: String(e).slice(0, 300) }, 500);
  }
});
