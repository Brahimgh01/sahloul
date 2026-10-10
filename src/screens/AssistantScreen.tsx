// Assistant: talk or type. Simple commands work offline; bigger answers need
// the server. It always asks before doing something (spec section 10).
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Chip, Icon, IconButton, Row, Spacer } from '@/components/ui';
import { useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { askAssistant, type AssistantAction, type AssistantContext } from '@/services/ai';
import { haptic } from '@/services/feedback';
import { speak, startListening, stopListening, useLiveSpeech } from '@/services/speech';
import { useSettings } from '@/store/settings';
import { useWork } from '@/store/work';
import { useTheme } from '@/theme/ThemeProvider';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  action?: AssistantAction;
  needsConfirm?: boolean;
}

let seq = 0;
const nextId = () => `m${seq++}`;

export function AssistantScreen() {
  const theme = useTheme();
  const { t, language } = useT();
  const nav = useNavigation<Nav>();
  const today = useWork((s) => s.today);
  const devices = useWork((s) => s.devices);
  const aiEnabled = useSettings((s) => s.aiEnabled);

  const [messages, setMessages] = useState<Msg[]>([
    { id: nextId(), role: 'assistant', text: t('assistant.tapToTalk') },
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
    }),
    [today, devices],
  );

  useLiveSpeech((text, final) => {
    if (text) setInput(text);
    if (final) setListening(false);
  });

  function execute(action: AssistantAction) {
    if (action.kind === 'open_device') {
      const d = devices.find((x) => x.inventory_no.toLowerCase() === action.inventory_no.toLowerCase());
      if (d) nav.navigate('Device', { id: d.id });
      else nav.navigate('Tabs', { screen: 'Devices' });
      return;
    }
    if (action.kind === 'route') {
      if (action.route === 'Scan') nav.navigate('Scan');
      else if (action.route === 'Board') nav.navigate('Board');
      else if (action.route === 'Today') nav.navigate('Tabs', { screen: 'Today' });
      else if (action.route === 'Devices') nav.navigate('Tabs', { screen: 'Devices' });
      else nav.navigate('Tabs', { screen: 'Papers' });
    }
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean) return;
    setInput('');
    setMessages((m) => [...m, { id: nextId(), role: 'user', text: clean }]);
    setThinking(true);
    const reply = await askAssistant(clean, language, ctx);
    setThinking(false);
    setLastReply(reply.text);
    setMessages((m) => [...m, { id: nextId(), role: 'assistant', text: reply.text, action: reply.action, needsConfirm: reply.needsConfirm }]);
    speak(reply.text, language);
    if (reply.action.kind !== 'none' && reply.needsConfirm) setConfirm(reply.action);
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
    if (a.kind === 'route') return a.route;
    return '';
  };

  return (
    <Screen edges={['top']} hideMic>
      <View style={{ flex: 1 }}>
        <Row style={{ justifyContent: 'space-between', padding: theme.spacing.lg }}>
          <Row style={{ gap: 8 }}>
            <Icon name="robot-happy-outline" size={26} color={theme.colors.primary} />
            <AppText size="title" weight="700">
              {t('assistant.title')}
            </AppText>
          </Row>
          <IconButton
            name="volume-high"
            label={t('assistant.repeat')}
            onPress={() => lastReply && speak(lastReply, language)}
          />
        </Row>

        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 40, gap: 10 }}>
          {messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.bubble,
                m.role === 'user'
                  ? { backgroundColor: theme.colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 }
                  : { backgroundColor: theme.colors.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
              ]}
            >
              <AppText size="body" color={m.role === 'user' ? theme.colors.onPrimary : theme.colors.text} style={{ lineHeight: 22 }}>
                {m.text}
              </AppText>
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
          ))}

          {thinking ? (
            <Card style={{ alignSelf: 'flex-start' }}>
              <AppText size="small" muted>
                {t('assistant.thinking')}
              </AppText>
            </Card>
          ) : null}

          {!aiEnabled ? (
            <AppText size="tiny" muted align="center" style={{ marginTop: 8 }}>
              {t('assistant.voiceOff')}
            </AppText>
          ) : null}
        </ScrollView>

        {/* Offline command chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: theme.spacing.lg }}>
          <Chip label={t('assistant.cmdLate')} onPress={() => send(t('assistant.cmdLate'))} />
          <Chip label={t('assistant.cmdEmergency')} onPress={() => send(t('assistant.cmdEmergency'))} />
          <Chip label={t('assistant.cmdScan')} onPress={() => send(t('assistant.cmdScan'))} />
          <Chip label={t('assistant.cmdDevice')} onPress={() => send(t('assistant.cmdDevice'))} />
        </ScrollView>

        {/* Talk + type */}
        <View style={{ padding: theme.spacing.lg, gap: 12 }}>
          <Pressable
            onPress={toggleTalk}
            accessibilityRole="button"
            accessibilityLabel={listening ? t('assistant.stopTalking') : t('assistant.tapToTalk')}
            style={[styles.mic, { backgroundColor: listening ? theme.colors.late : theme.colors.primary }]}
          >
            <Icon name={listening ? 'stop' : 'microphone'} size={30} color={theme.colors.onPrimary} />
          </Pressable>
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
            <IconButton name="send" label={t('assistant.send')} color={theme.colors.primary} onPress={() => send(input)} />
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
            <Row style={{ gap: 8 }}>
              <Icon name="help-circle-outline" size={24} color={theme.colors.primary} />
              <AppText size="section" weight="700">
                {t('assistant.confirmTitle')}
              </AppText>
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
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '86%' },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, minHeight: 32, alignSelf: 'flex-start' },
  mic: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  backdrop: { flex: 1, justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: 20, padding: 20 },
});
