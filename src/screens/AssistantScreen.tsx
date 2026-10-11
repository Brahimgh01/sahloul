// Assistant: talk or type. Simple commands work offline; bigger answers need
// the server. Nova always asks before doing something (spec section 10).
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useRef, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Gradient } from '@/components/Gradient';
import { Mascot } from '@/components/Mascot';
import { Entry, PressScale } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Display, Icon, IconButton, Row, Spacer } from '@/components/ui';
import { useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { askAssistant, type AssistantAction, type AssistantContext, type AssistantReply, type ChatTurn } from '@/services/ai';
import { haptic } from '@/services/feedback';
import { speak, startListening, stopListening, useLiveSpeech } from '@/services/speech';
import { useSettings } from '@/store/settings';
import { useWork } from '@/store/work';
import { cardShadow, gradients } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  action?: AssistantAction;
  needsConfirm?: boolean;
  error?: AssistantReply['error'];
}

let seq = 0;
const nextId = () => `m${seq++}`;

function Dot({ delay }: { delay: number }) {
  const theme = useTheme();
  const v = useSharedValue(0);
  React.useEffect(() => {
    v.value = withRepeat(
      withSequence(
        withDelay(delay, withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) })),
        withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [v, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.4 + 0.6 * v.value,
    transform: [{ translateY: -4 * v.value }],
  }));
  return (
    <Animated.View
      style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary }, style]}
    />
  );
}

function TypingDots() {
  return (
    <Row style={{ gap: 5 }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} delay={i * 130} />
      ))}
    </Row>
  );
}

function Avatar() {
  return (
    <View style={styles.avatar}>
      <Mascot size={30} animate={false} />
    </View>
  );
}

export function AssistantScreen() {
  const theme = useTheme();
  const { t, language } = useT();
  const nav = useNavigation<Nav>();
  const today = useWork((s) => s.today);
  const devices = useWork((s) => s.devices);
  const companies = useWork((s) => s.companies);
  const aiEnabled = useSettings((s) => s.aiEnabled);
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Msg[]>([
    { id: nextId(), role: 'assistant', text: t('assistant.knows') },
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [confirm, setConfirm] = useState<AssistantAction | null>(null);
  const [lastReply, setLastReply] = useState('');

  const ctx: AssistantContext = useMemo(
    () => ({
      late: today.late.map((d) => ({ inventory_no: d.inventory_no, type: d.type, department: d.department, days_late: d.days_late, company: d.trip_company_name })),
      critical: today.critical.map((d) => ({ inventory_no: d.inventory_no, type: d.type, department: d.department, days_late: d.days_late, company: d.trip_company_name })),
      departments: Array.from(new Set(devices.map((d) => d.department).filter(Boolean))),
      devices: devices.slice(0, 60).map((d) => ({
        inventory_no: d.inventory_no,
        type: d.type,
        department: d.department,
        status: d.status,
        company: d.trip_company_name,
      })),
      companies: companies.slice(0, 40).map((c) => ({ id: c.id, name: c.name })),
    }),
    [today, devices, companies],
  );

  const micPulse = useSharedValue(0);
  React.useEffect(() => {
    if (listening) {
      micPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      micPulse.value = withTiming(0, { duration: 200 });
    }
  }, [listening, micPulse]);
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - micPulse.value),
    transform: [{ scale: 1 + 0.45 * micPulse.value }],
  }));

  useLiveSpeech((text, final) => {
    if (text) setInput(text);
    if (final) setListening(false);
  });

  function execute(action: AssistantAction) {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    if (action.kind === 'open_device') {
      const d = devices.find((x) => x.inventory_no.toLowerCase() === action.inventory_no.toLowerCase());
      if (d) nav.navigate('Device', { id: d.id });
      else nav.navigate('Tabs', { screen: 'Devices' });
      return;
    }
    if (action.kind === 'open_company') {
      const company = companies.find((c) => normalize(c.name) === normalize(action.company_name));
      if (company) nav.navigate('Company', { id: company.id });
      else nav.navigate('Tabs', { screen: 'Companies' });
      return;
    }
    if (action.kind === 'start_send') {
      const d = devices.find((x) => x.inventory_no.toLowerCase() === action.inventory_no.toLowerCase());
      if (!d || d.status === 'at_company' || d.status === 'retired') {
        nav.navigate('Tabs', { screen: 'Devices' });
        return;
      }
      const company = action.company_name
        ? companies.find((c) => normalize(c.name) === normalize(action.company_name!))
        : undefined;
      nav.navigate('Send', { deviceIds: [d.id], ...(company ? { companyId: company.id } : {}) });
      return;
    }
    if (action.kind === 'start_return') {
      const d = devices.find((x) => x.inventory_no.toLowerCase() === action.inventory_no.toLowerCase());
      if (!d || d.status !== 'at_company' || !d.trip_id) {
        nav.navigate('Tabs', { screen: 'Devices' });
        return;
      }
      nav.navigate('Return', { deviceId: d.id, tripId: d.trip_id });
      return;
    }
    if (action.kind === 'route') {
      if (action.route === 'Scan') nav.navigate('Scan');
      else if (action.route === 'Board') nav.navigate('Board');
      else if (action.route === 'Today') nav.navigate('Tabs', { screen: 'Today' });
      else if (action.route === 'Devices') nav.navigate('Tabs', { screen: 'Devices' });
      else if (action.route === 'Companies') nav.navigate('Tabs', { screen: 'Companies' });
      else if (action.route === 'Papers') nav.navigate('Tabs', { screen: 'Papers' });
      else if (action.route === 'Settings') nav.navigate('Settings');
      else if (action.route === 'ImportCsv') nav.navigate('ImportCsv');
      else if (action.route === 'About') nav.navigate('About');
      else nav.navigate('Send');
    }
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean) return;
    haptic('light');
    setInput('');
    setMessages((m) => [...m, { id: nextId(), role: 'user', text: clean }]);
    const history: ChatTurn[] = [
      ...messages.map((m) => ({ role: m.role, text: m.text })),
      { role: 'user' as const, text: clean },
    ];
    setThinking(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    const reply = await askAssistant(clean, language, ctx, history, aiEnabled);
    setThinking(false);
    setLastReply(reply.text);
    setMessages((m) => [...m, { id: nextId(), role: 'assistant', text: reply.text, action: reply.action, needsConfirm: reply.needsConfirm, error: reply.error }]);
    speak(reply.text, language);
    if (reply.action.kind !== 'none' && reply.needsConfirm) setConfirm(reply.action);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }

  const toggleTalk = async () => {
    if (listening) {
      stopListening();
      setListening(false);
      return;
    }
    haptic('select');
    setListening(true);
    const ok = await startListening(language, (txt) => setInput(txt));
    if (!ok) setListening(false);
  };

  const actionLabel = (a: AssistantAction): string => {
    if (a.kind === 'open_device') return a.inventory_no;
    if (a.kind === 'open_company') return a.company_name;
    if (a.kind === 'start_send') return `${t('send.title')} · ${a.inventory_no}`;
    if (a.kind === 'start_return') return `${t('returnFlow.title')} · ${a.inventory_no}`;
    if (a.kind === 'route') {
      const labels: Record<typeof a.route, string> = {
        Scan: 'scan.title',
        Board: 'board.title',
        Today: 'tabs.today',
        Devices: 'tabs.devices',
        Companies: 'tabs.companies',
        Papers: 'tabs.papers',
        Settings: 'settings.title',
        ImportCsv: 'importFlow.title',
        About: 'about.title',
        Send: 'send.title',
      };
      return t(labels[a.route]);
    }
    return '';
  };

  return (
    <Screen edges={['top']} hideMic>
      <View style={{ flex: 1 }}>
        <Gradient colors={gradients.calm} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Row style={{ gap: 12, flex: 1 }}>
            <IconButton name="close" label={t('common.close')} color="#fff" onPress={() => nav.goBack()} />
            <Mascot size={54} />
            <View style={{ flex: 1 }}>
              <Display size="title" weight="800" color="#fff">
                {t('assistant.title')}
              </Display>
              <AppText size="tiny" weight="600" color="rgba(255,255,255,0.9)">
                {t('assistant.persona')}
              </AppText>
            </View>
            <IconButton
              name="volume-high"
              label={t('assistant.repeat')}
              color="#fff"
              onPress={() => lastReply && speak(lastReply, language)}
            />
          </Row>
        </Gradient>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 40, gap: 10 }}
        >
          {messages.map((m, i) => (
            <Entry key={m.id} delay={i === messages.length - 1 ? 40 : 0}>
              <Row style={{ alignItems: 'flex-end', gap: 8, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                {m.role === 'assistant' ? <Avatar /> : null}
                <View style={{ maxWidth: '82%' }}>
                  {m.role === 'user' ? (
                    <Gradient colors={gradients.brand} radius={18} style={styles.userBubble}>
                      <AppText size="body" color="#fff" style={{ lineHeight: 22 }}>
                        {m.text}
                      </AppText>
                    </Gradient>
                  ) : (
                    <View style={[styles.bubble, { backgroundColor: theme.colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, ...cardShadow(theme.mode, 1) }]}>
                      <AppText size="body" style={{ lineHeight: 22 }}>
                        {m.text}
                      </AppText>
                      {m.error === 'quota_exceeded' ? (
                        <Pressable
                          accessibilityRole="link"
                          accessibilityLabel={t('assistant.openBilling')}
                          onPress={() => Linking.openURL('https://platform.openai.com/settings/organization/billing/')}
                          style={[styles.billingLink, { backgroundColor: theme.colors.primarySoft }]}
                        >
                          <Icon name="open-in-new" size={16} color={theme.colors.primary} />
                          <AppText size="small" weight="700" color={theme.colors.primary}>
                            {t('assistant.openBilling')}
                          </AppText>
                        </Pressable>
                      ) : null}
                      {m.action && m.action.kind !== 'none' ? (
                        <>
                          <Spacer size="sm" />
                          <Pressable onPress={() => setConfirm(m.action!)} style={[styles.actionChip, { borderColor: theme.colors.primary }]}>
                            <Icon name="gesture-tap" size={16} color={theme.colors.primary} />
                            <AppText size="small" weight="600" color={theme.colors.primary}>
                              {actionLabel(m.action)}
                            </AppText>
                          </Pressable>
                        </>
                      ) : null}
                    </View>
                  )}
                </View>
              </Row>
            </Entry>
          ))}

          {thinking ? (
            <Row style={{ alignItems: 'flex-end', gap: 8 }}>
              <Avatar />
              <View style={[styles.bubble, { backgroundColor: theme.colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border }]}>
                <TypingDots />
              </View>
            </Row>
          ) : null}

          {!aiEnabled ? (
            <AppText size="tiny" muted align="center" style={{ marginTop: 8 }}>
              {t('assistant.voiceOff')}
            </AppText>
          ) : null}
        </ScrollView>

        {/* Offline command chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: theme.spacing.lg }}>
          {[t('assistant.cmdLate'), t('assistant.cmdEmergency'), t('assistant.cmdScan'), t('assistant.cmdDevice'), t('assistant.cmdSend'), t('assistant.cmdReturn')].map((c) => (
            <PressScale key={c} onPress={() => send(c)} scaleTo={0.94}>
              <View style={[styles.chip, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Icon name="lightning-bolt-outline" size={15} color={theme.colors.primary} />
                <AppText size="small" weight="600">
                  {c}
                </AppText>
              </View>
            </PressScale>
          ))}
        </ScrollView>

        {/* Talk + type */}
        <View style={{ padding: theme.spacing.lg, gap: 12 }}>
          <View style={styles.micWrap}>
            <Animated.View style={[styles.micHalo, { backgroundColor: theme.colors.late }, haloStyle]} />
            <PressScale onPress={toggleTalk} scaleTo={0.92}>
              <View style={[styles.mic, { backgroundColor: listening ? theme.colors.late : theme.colors.primary }]}>
                {listening ? null : <Gradient colors={gradients.brand} style={StyleSheet.absoluteFill} radius={36} />}
                <Icon name={listening ? 'stop' : 'microphone'} size={30} color="#fff" />
              </View>
            </PressScale>
          </View>
          <AppText size="small" align="center" muted>
            {listening ? t('assistant.listening') : t('assistant.tapToTalk')}
          </AppText>

          <Row style={[styles.inputRow, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t('assistant.placeholder')}
              placeholderTextColor={theme.colors.textFaint}
              style={{ flex: 1, fontSize: 16, color: theme.colors.text, paddingVertical: 10 }}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
            />
            <PressScale onPress={() => send(input)} scaleTo={0.9}>
              <Gradient colors={gradients.brand} radius={22} style={styles.sendBtn}>
                <Icon name="send" size={20} color="#fff" />
              </Gradient>
            </PressScale>
          </Row>
          <AppText size="tiny" muted align="center">
            {t('assistant.offlineHint')}
          </AppText>
        </View>
      </View>

      {/* Ask before doing */}
      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
        <View style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
            <Row style={{ gap: 10 }}>
              <Mascot size={44} animate={false} />
              <Display size="section" weight="700" style={{ flex: 1 }}>
                {t('assistant.confirmTitle')}
              </Display>
            </Row>
            {confirm ? (
              <>
                <Spacer size="md" />
                <Card>
                  <AppText size="body" weight="600">
                    {actionLabel(confirm)}
                  </AppText>
                </Card>
              </>
            ) : null}
            <Spacer size="lg" />
            <Button
              title={t('assistant.confirmYes')}
              icon="check"
              onPress={() => {
                const a = confirm;
                setConfirm(null);
                if (a) execute(a);
              }}
            />
            <Spacer size="sm" />
            <Button title={t('assistant.confirmNo')} variant="ghost" onPress={() => setConfirm(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingVertical: 14, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, borderBottomLeftRadius: 6 },
  userBubble: { paddingHorizontal: 14, paddingVertical: 10, borderBottomRightRadius: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, minHeight: 32, alignSelf: 'flex-start' },
  billingLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, minHeight: 40, borderRadius: 12, paddingHorizontal: 11, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, minHeight: 40 },
  micWrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  micHalo: { position: 'absolute', width: 72, height: 72, borderRadius: 36 },
  mic: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', ...cardShadow('light', 2) },
  sendBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingRight: 6 },
  backdrop: { flex: 1, justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: 20, padding: 20 },
});
