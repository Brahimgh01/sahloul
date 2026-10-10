// Online / offline status, shared with the sync badge.
import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';

interface ConnectivityState {
  online: boolean;
  /** true only for unmetered connections (used by "Wi-Fi only" uploads) */
  wifi: boolean;
  start: () => () => void;
}

export const useConnectivity = create<ConnectivityState>((set) => ({
  online: true,
  wifi: true,
  start: () => {
    const unsub = NetInfo.addEventListener((s) => {
      const online = !!s.isConnected && s.isInternetReachable !== false;
      const wifi = s.type === 'wifi' || s.type === 'ethernet';
      set({ online, wifi });
    });
    NetInfo.fetch().then((s) =>
      set({ online: !!s.isConnected, wifi: s.type === 'wifi' || s.type === 'ethernet' }),
    );
    return unsub;
  },
}));
