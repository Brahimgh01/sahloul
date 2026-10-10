// One place that loads data from SQLite and shares it with all screens.
import { create } from 'zustand';

import {
  getTodayData,
  listCompanies,
  listDevices,
  listPapers,
  type CompanyWithStats,
  type DeviceWithTrip,
  type PaperWithRefs,
  type TodayData,
} from '@/data/queries';
import { waitingCount } from '@/db/repo';

interface WorkState {
  ready: boolean;
  today: TodayData;
  devices: DeviceWithTrip[];
  companies: CompanyWithStats[];
  papers: PaperWithRefs[];
  waiting: number;
  refresh: () => Promise<void>;
  refreshWaiting: () => Promise<void>;
}

const emptyToday: TodayData = {
  late: [],
  critical: [],
  comingBack: [],
  counts: { late: 0, away: 0, critical: 0 },
};

export const useWork = create<WorkState>((set) => ({
  ready: false,
  today: emptyToday,
  devices: [],
  companies: [],
  papers: [],
  waiting: 0,
  refresh: async () => {
    const [today, devices, companies, papers, waiting] = await Promise.all([
      getTodayData(),
      listDevices(),
      listCompanies(),
      listPapers(),
      waitingCount(),
    ]);
    set({ today, devices, companies, papers, waiting, ready: true });
  },
  refreshWaiting: async () => set({ waiting: await waitingCount() }),
}));
