// Gamification: XP, level and the daily quests. Persisted on the phone so it
// keeps working offline. A quest list is generated per day from simple rules
// over the current workload; completing one awards XP.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface QuestDef {
  id: string;
  xp: number;
}

interface GameState {
  xp: number;
  /** streak = consecutive days the app was opened (kept simple). */
  streak: number;
  lastOpenDay: string | null;
  /** questId -> done, for the current day only. */
  done: Record<string, boolean>;
  dayKey: string | null;

  toggleQuest: (id: string, xp: number) => void;
  ensureDay: (key: string) => void;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Level curve: every level needs 120 XP more than the previous.
export function levelFor(xp: number): { level: number; into: number; need: number; pct: number } {
  let level = 1;
  let need = 100;
  let remaining = xp;
  while (remaining >= need) {
    remaining -= need;
    level += 1;
    need += 60;
  }
  return { level, into: remaining, need, pct: Math.round((remaining / need) * 100) };
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      xp: 40,
      streak: 1,
      lastOpenDay: null,
      done: {},
      dayKey: null,

      ensureDay: (key) => {
        const s = get();
        if (s.dayKey === key) return;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yKey = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
        const streak = s.lastOpenDay === yKey ? s.streak + 1 : 1;
        set({ dayKey: key, done: {}, lastOpenDay: key, streak });
      },

      toggleQuest: (id, xp) =>
        set((s) => {
          const on = !s.done[id];
          return { done: { ...s.done, [id]: on }, xp: Math.max(0, s.xp + (on ? xp : -xp)) };
        }),
    }),
    {
      name: 'sithub-game',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

export { todayKey };
