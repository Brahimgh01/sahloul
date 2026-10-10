// The assistant. Two paths:
//  1. Online  -> call the server function (the AI key NEVER lives in the app).
//  2. Offline -> a few simple commands that work with no internet.
// It only ever talks about devices, companies and papers, and it always asks
// before doing something (spec golden rule 6 / section 10).
import { callAssistant, isConfigured } from '@/services/supabase';
import type { Language } from '@/types';

export interface AiDeviceRef {
  inventory_no: string;
  type: string;
  department: string;
  days_late: number;
  company?: string | null;
}

export interface AssistantContext {
  late: AiDeviceRef[];
  critical: AiDeviceRef[];
  departments: string[];
}

/** Things the assistant is allowed to do. It still asks first. */
export type AssistantAction =
  | { kind: 'open_device'; inventory_no: string }
  | { kind: 'route'; route: 'Scan' | 'Board' | 'Today' | 'Devices' | 'Papers'; params?: Record<string, unknown> }
  | { kind: 'none' };

export interface AssistantReply {
  text: string;
  action: AssistantAction;
  needsConfirm: boolean;
  source: 'offline' | 'server' | 'none';
}

const NONE: AssistantAction = { kind: 'none' };

function fmtList(items: AiDeviceRef[], max = 5): string {
  const shown = items.slice(0, max);
  return shown
    .map((d) => {
      const company = d.company ? ` — ${d.company}` : '';
      const late = d.days_late > 0 ? ` (${d.days_late} j)` : '';
      return `• ${d.inventory_no} ${d.type} · ${d.department}${company}${late}`;
    })
    .join('\n');
}

/** Simple, offline commands (fr / ar / en). Returns null when it cannot help. */
export function offlineReply(text: string, language: Language, ctx: AssistantContext): AssistantReply | null {
  const q = text.trim().toLowerCase();
  if (!q) return null;

  // Open a specific device by its inventory number.
  const inv = /inv[-\s]?(\d{2,})/i.exec(text);
  if (inv) {
    return {
      text: `${inv[0].toUpperCase()}`,
      action: { kind: 'open_device', inventory_no: inv[0].toUpperCase().replace(/\s/g, '-') },
      needsConfirm: true,
      source: 'offline',
    };
  }

  const wantsLate = /(retard|late|overdue|en retard|متأخر|متأخرة|تأخر)/.test(q);
  const wantsEmergency = /(urgence|emergency|urgences|الطوارئ|استعجالي|طوارئ)/.test(q);
  const wantsCritical = /(critique|urgent|critical|حرج|خطير)/.test(q);
  const wantsScan = /(scan|scanner|مسح|امسح|صوّر|صور)/.test(q);
  const wantsHello = /^(bonjour|salut|hello|hi|مرحبا|أهلا|السلام)/.test(q);

  if (wantsScan) {
    return {
      text: language === 'ar' ? 'فتح الماسح. هل تريد المسح الآن؟' : language === 'en' ? 'Opening the scanner. Scan now?' : 'J\u2019ouvre le scanner. Scanner maintenant ?',
      action: { kind: 'route', route: 'Scan' },
      needsConfirm: true,
      source: 'offline',
    };
  }

  if (wantsEmergency) {
    const emg = ctx.late.filter((d) => /emergency|urgences|الطوارئ/i.test(d.department));
    return {
      text: emg.length
        ? `${emg.length}\n${fmtList(emg)}`
        : language === 'ar'
          ? 'لا يوجد جهاز من الطوارئ في الخارج.'
          : language === 'en'
            ? 'No Emergency device is out.'
            : 'Aucun appareil des Urgences n\u2019est dehors.',
      action: NONE,
      needsConfirm: false,
      source: 'offline',
    };
  }

  if (wantsLate || wantsCritical) {
    const list = wantsCritical ? ctx.critical : ctx.late;
    const head =
      list.length === 0
        ? language === 'ar'
          ? 'لا يوجد تأخير. كل شيء في الوقت المحدد.'
          : language === 'en'
            ? 'Nothing is late. All good.'
            : 'Aucun retard. Tout est dans les délais.'
        : `${list.length}`;
    return {
      text: `${head}${list.length ? '\n' + fmtList(list) : ''}`,
      action: NONE,
      needsConfirm: false,
      source: 'offline',
    };
  }

  if (wantsHello) {
    return {
      text:
        language === 'ar'
          ? `مرحبا. ${ctx.late.length} جهاز متأخر.`
          : language === 'en'
            ? `Hello. ${ctx.late.length} device(s) late.`
            : `Bonjour. ${ctx.late.length} appareil(s) en retard.`,
      action: NONE,
      needsConfirm: false,
      source: 'offline',
    };
  }

  return null;
}

function normalizeAction(raw: unknown): AssistantAction {
  if (!raw || typeof raw !== 'object') return NONE;
  const a = raw as Record<string, unknown>;
  const type = String(a.type ?? a.kind ?? '').toLowerCase();
  if (type === 'open_device') {
    const inv = String(a.inventory_no ?? a.inventory ?? '').toUpperCase();
    return inv ? { kind: 'open_device', inventory_no: inv } : NONE;
  }
  if (type === 'route') {
    const route = String(a.route ?? '');
    if (['Scan', 'Board', 'Today', 'Devices', 'Papers'].includes(route)) {
      return { kind: 'route', route: route as 'Scan' | 'Board' | 'Today' | 'Devices' | 'Papers', params: (a.params as Record<string, unknown>) ?? undefined };
    }
  }
  return NONE;
}

/**
 * Ask the assistant. Tries the offline commands first (instant, no internet),
 * then the server. Only a short text summary ever leaves the phone.
 */
export async function askAssistant(
  text: string,
  language: Language,
  ctx: AssistantContext,
): Promise<AssistantReply> {
  const local = offlineReply(text, language, ctx);
  if (local) return local;

  if (!isConfigured()) {
    return {
      text: language === 'ar' ? 'أحتاج إلى الإنترنت لهذا.' : language === 'en' ? 'I need internet for that.' : 'J\u2019ai besoin d\u2019internet pour cela.',
      action: NONE,
      needsConfirm: false,
      source: 'none',
    };
  }

  try {
    const res = (await callAssistant({ text, language, context: ctx })) as Record<string, unknown>;
    const replyText = String(res.reply ?? res.text ?? res.answer ?? '').trim();
    if (!replyText) throw new Error('empty');
    return {
      text: replyText,
      action: normalizeAction(res.action),
      needsConfirm: !!res.needsConfirm,
      source: 'server',
    };
  } catch {
    return {
      text: language === 'ar' ? 'تعذّر الاتصال. حاول لاحقاً.' : language === 'en' ? 'I could not reach the server. Try later.' : 'Je n\u2019ai pas pu joindre le serveur. Réessayez plus tard.',
      action: NONE,
      needsConfirm: false,
      source: 'none',
    };
  }
}
