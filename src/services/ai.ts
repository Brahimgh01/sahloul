// The assistant. Two paths:
//  1. Online  -> call the server function (the AI key NEVER lives in the app).
//  2. Offline -> a few simple commands that work with no internet.
// It only ever talks about devices, companies and papers, and it always asks
// before doing something (spec golden rule 6 / section 10).
import { callAssistant, isAiConfigured } from '@/services/supabase';
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
  devices?: { inventory_no: string; type: string; department: string; status: string; company?: string | null }[];
  companies?: { id: string; name: string }[];
}

/** One turn of the conversation, used to give the server some memory. */
export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

/** Things the assistant is allowed to do. It still asks first. */
export type AssistantAction =
  | { kind: 'open_device'; inventory_no: string }
  | { kind: 'open_company'; company_name: string }
  | { kind: 'start_send'; inventory_no: string; company_name?: string }
  | { kind: 'start_return'; inventory_no: string }
  | { kind: 'route'; route: 'Scan' | 'Board' | 'Today' | 'Devices' | 'Companies' | 'Papers' | 'Settings' | 'ImportCsv' | 'About' | 'Send' }
  | { kind: 'none' };

export interface AssistantReply {
  text: string;
  action: AssistantAction;
  needsConfirm: boolean;
  source: 'offline' | 'server' | 'none';
  error?: 'quota_exceeded' | 'invalid_api_key' | 'rate_limited' | 'upstream_error' | 'disabled';
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

  const inv = /inv[-\s]?(\d{2,})/i.exec(text);
  const inventoryNo = inv ? inv[0].toUpperCase().replace(/\s/g, '-') : '';
  const wantsSend = /(send|ship|envoyer|envoie|exp[eé]dier|إرسال|ارسل|أرسل|ابعث)/i.test(q);
  const wantsReturn = /(return|returned|bring back|mark.+back|retour|rendre|ramener|إرجاع|ارجاع|رجّع|رجع)/i.test(q);

  if (wantsSend) {
    return {
      text: inventoryNo
        ? language === 'ar' ? `سأجهّز ${inventoryNo} للإرسال. راجع بيانات الإصلاح وأكّد الحفظ في النموذج.` : language === 'en' ? `I’ll prepare ${inventoryNo} for sending. Review the repair details and confirm the save in the form.` : `Je prépare ${inventoryNo} pour l’envoi. Vérifiez les détails et confirmez l’enregistrement dans le formulaire.`
        : language === 'ar' ? 'ما رقم الجرد للجهاز الذي تريد إرساله؟' : language === 'en' ? 'What is the inventory number of the device to send?' : 'Quel est le numéro d’inventaire de l’appareil à envoyer ?',
      action: inventoryNo ? { kind: 'start_send', inventory_no: inventoryNo } : NONE,
      needsConfirm: !!inventoryNo,
      source: 'offline',
    };
  }

  if (wantsReturn) {
    return {
      text: inventoryNo
        ? language === 'ar' ? `سأجهّز تسجيل عودة ${inventoryNo}. راجع نتيجة الإصلاح وأكّد الحفظ في النموذج.` : language === 'en' ? `I’ll prepare the return for ${inventoryNo}. Review the repair result and confirm the save in the form.` : `Je prépare le retour de ${inventoryNo}. Vérifiez le résultat et confirmez l’enregistrement dans le formulaire.`
        : language === 'ar' ? 'ما رقم الجرد للجهاز الذي عاد من الإصلاح؟' : language === 'en' ? 'What is the inventory number of the returned device?' : 'Quel est le numéro d’inventaire de l’appareil revenu de réparation ?',
      action: inventoryNo ? { kind: 'start_return', inventory_no: inventoryNo } : NONE,
      needsConfirm: !!inventoryNo,
      source: 'offline',
    };
  }

  if (inv) {
    return {
      text: inventoryNo,
      action: { kind: 'open_device', inventory_no: inventoryNo },
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

  const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const company = ctx.companies?.find((c) => normalized(q).includes(normalized(c.name)));
  if (company) {
    return {
      text: language === 'ar' ? `سأفتح ملف ${company.name}.` : language === 'en' ? `I’ll open ${company.name}.` : `J’ouvre le dossier de ${company.name}.`,
      action: { kind: 'open_company', company_name: company.name },
      needsConfirm: true,
      source: 'offline',
    };
  }

  const routes: { pattern: RegExp; route: Extract<AssistantAction, { kind: 'route' }>['route']; label: { fr: string; en: string; ar: string } }[] = [
    { pattern: /(\bsettings\b|\bpreferences\b|réglages|paramètres|الإعدادات|اعدادات)/, route: 'Settings', label: { fr: 'les réglages', en: 'Settings', ar: 'الإعدادات' } },
    { pattern: /(\bimport\b|csv|استيراد)/, route: 'ImportCsv', label: { fr: 'l’import CSV', en: 'CSV import', ar: 'استيراد CSV' } },
    { pattern: /(\bcompanies\b|\bcompany\b|sociétés|société|entreprise|الشركات|شركة)/, route: 'Companies', label: { fr: 'les sociétés', en: 'Companies', ar: 'الشركات' } },
    { pattern: /(\bpapers\b|\bdocuments\b|papiers|document|وثائق|مستندات)/, route: 'Papers', label: { fr: 'les documents', en: 'Papers', ar: 'الوثائق' } },
    { pattern: /(\bdevices\b|\bdevice list\b|appareils|équipements|الأجهزة)/, route: 'Devices', label: { fr: 'les appareils', en: 'Devices', ar: 'الأجهزة' } },
    { pattern: /(\bboard\b|tableau|kanban|لوحة)/, route: 'Board', label: { fr: 'le tableau', en: 'the board', ar: 'اللوحة' } },
    { pattern: /(\btoday\b|\bhome\b|accueil|aujourd'hui|اليوم|الرئيسية)/, route: 'Today', label: { fr: 'l’accueil', en: 'Today', ar: 'الرئيسية' } },
  ];
  const destination = routes.find((entry) => entry.pattern.test(normalized(q)));
  if (destination) {
    return {
      text: language === 'ar' ? `سأفتح ${destination.label.ar}.` : language === 'en' ? `I’ll open ${destination.label.en}.` : `J’ouvre ${destination.label.fr}.`,
      action: { kind: 'route', route: destination.route },
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
  if (type === 'open_company') {
    const name = String(a.company_name ?? '').trim();
    return name ? { kind: 'open_company', company_name: name } : NONE;
  }
  if (type === 'start_send') {
    const inv = String(a.inventory_no ?? a.inventory ?? '').toUpperCase();
    const companyName = String(a.company_name ?? '').trim();
    return inv ? { kind: 'start_send', inventory_no: inv, ...(companyName ? { company_name: companyName } : {}) } : NONE;
  }
  if (type === 'start_return') {
    const inv = String(a.inventory_no ?? a.inventory ?? '').toUpperCase();
    return inv ? { kind: 'start_return', inventory_no: inv } : NONE;
  }
  if (type === 'route') {
    const route = String(a.route ?? '');
    if (['Scan', 'Board', 'Today', 'Devices', 'Companies', 'Papers', 'Settings', 'ImportCsv', 'About', 'Send'].includes(route)) {
      return { kind: 'route', route: route as Extract<AssistantAction, { kind: 'route' }>['route'] };
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
  history: ChatTurn[] = [],
  allowOnline = true,
): Promise<AssistantReply> {
  const local = offlineReply(text, language, ctx);
  if (local) return local;

  if (!allowOnline) {
    return {
      text: language === 'ar' ? 'المساعد عبر الإنترنت متوقف في الإعدادات. تظل الأوامر المحلية متاحة.' : language === 'en' ? 'Online AI is turned off in Settings. Local commands are still available.' : 'L’assistant en ligne est désactivé dans les réglages. Les commandes locales restent disponibles.',
      action: NONE,
      needsConfirm: false,
      source: 'none',
      error: 'disabled',
    };
  }

  if (!isAiConfigured()) {
    return {
      text: language === 'ar' ? 'المساعد عبر الإنترنت غير مُهيّأ. الأوامر المحلية تظل متاحة.' : language === 'en' ? 'Online AI is not configured. Local commands are still available.' : 'L’assistant en ligne n’est pas configuré. Les commandes locales restent disponibles.',
      action: NONE,
      needsConfirm: false,
      source: 'none',
      error: 'upstream_error',
    };
  }

  try {
    const res = (await callAssistant({
      text,
      language,
      context: ctx,
      history: history.slice(-8),
    })) as Record<string, unknown>;
    const replyText = String(res.reply ?? res.text ?? res.answer ?? '').trim();
    if (!replyText) throw new Error('empty');
    const action = normalizeAction(res.action);
    return {
      text: replyText,
      action,
      needsConfirm: action.kind !== 'none',
      source: 'server',
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : 'upstream_error';
    const knownCode: Exclude<NonNullable<AssistantReply['error']>, 'disabled'> =
      ['quota_exceeded', 'invalid_api_key', 'rate_limited'].includes(code)
        ? code as Exclude<NonNullable<AssistantReply['error']>, 'disabled'>
        : 'upstream_error';
    const messages = {
      quota_exceeded: {
        fr: 'Le compte OpenAI n’a plus de crédits API. Ajoutez des crédits dans la facturation OpenAI ; les commandes locales restent disponibles.',
        en: 'The OpenAI account has no API credits remaining. Add API credits in OpenAI billing; local commands still work.',
        ar: 'نفدت أرصدة API في حساب OpenAI. أضف رصيداً من إعدادات الفوترة؛ تظل الأوامر المحلية متاحة.',
      },
      invalid_api_key: {
        fr: 'La clé OpenAI est refusée. Vérifiez OPENAI_API_KEY dans sit-hub/.env.local puis redémarrez le proxy.',
        en: 'OpenAI rejected the key. Check OPENAI_API_KEY in sit-hub/.env.local, then restart the proxy.',
        ar: 'رفض OpenAI المفتاح. تحقّق من OPENAI_API_KEY في sit-hub/.env.local ثم أعد تشغيل البروكسي.',
      },
      rate_limited: {
        fr: 'OpenAI est momentanément limité. Réessayez dans un instant.',
        en: 'OpenAI is rate limiting requests. Try again in a moment.',
        ar: 'طلبات OpenAI محدودة مؤقتاً. حاول مجدداً بعد قليل.',
      },
      upstream_error: {
        fr: 'Je ne peux pas joindre le service IA pour le moment. Les commandes locales restent disponibles.',
        en: 'The AI service is unavailable right now. Local commands are still available.',
        ar: 'خدمة الذكاء الاصطناعي غير متاحة الآن. تظل الأوامر المحلية متاحة.',
      },
    };
    return {
      text: messages[knownCode][language],
      action: NONE,
      needsConfirm: false,
      source: 'none',
      error: knownCode,
    };
  }
}
