// Navigation route names and their parameters.
import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Today: undefined;
  Devices: undefined;
  Companies: undefined;
  Papers: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Device: { id: string };
  Company: { id: string };
  Send: { deviceIds?: string[] } | undefined;
  Return: { deviceId: string; tripId?: string };
  Scan: { deviceId?: string; tripId?: string; companyId?: string } | undefined;
  PaperCheck: { draftId: string };
  PaperViewer: { paperId: string };
  Settings: undefined;
  ImportCsv: undefined;
  About: undefined;
  Assistant: undefined;
  Board: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
