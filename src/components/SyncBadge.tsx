// The little cloud that shows sync state. Tap for details + Send now.
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Icon, Row, Spacer } from '@/components/ui';
import { useT } from '@/i18n';
import { formatDate } from '@/lib/dates';
import { useConnectivity } from '@/services/connectivity';
import { syncNow } from '@/services/sync';
import { useSettings } from '@/store/settings';
import { useWork } from '@/store/work';
import { useTheme } from '@/theme/ThemeProvider';

export function SyncBadge() {
  const theme = useTheme();
  const { t } = useT();
  const online = useConnectivity((s) => s.online);
  const waiting = useWork((s) => s.waiting);
  const cloudOn = useSettings((s) => s.cloudSyncEnabled);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const color = !online
    ? theme.colors.syncOff
    : !cloudOn
      ? theme.colors.syncOff
      : waiting > 0
        ? theme.colors.syncWait
        : theme.colors.syncOk;
  const icon = !online ? 'cloud-off-outline' : waiting > 0 ? 'cloud-upload-outline' : 'cloud-check-outline';

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.syncNow')}
        onPress={() => setOpen(true)}
        hitSlop={10}
        style={[
          styles.pill,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        ]}
      >
        <Icon name={icon} size={20} color={color} />
        {waiting > 0 ? (
          <AppText size="tiny" weight="700" color={color}>
            {waiting}
          </AppText>
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.colors.card }]} onPress={() => {}}>
            <Row style={{ justifyContent: 'space-between' }}>
              <AppText size="section" weight="700">
                {t('settings.sync')}
              </AppText>
              <Icon name={icon} size={24} color={color} />
            </Row>
            <Spacer size="md" />
            <Row style={{ gap: 8 }}>
              <Icon name="information-outline" size={18} color={theme.colors.textMuted} />
              <AppText size="small" muted>
                {!online
                  ? t('sync.offline')
                  : !cloudOn
                    ? t('settings.cloudOn') + ': ' + t('common.off')
                    : waiting > 0
                      ? t('sync.pending', { count: waiting })
                      : t('sync.allSent')}
              </AppText>
            </Row>
            <Spacer size="lg" />
            <Button
              title={t('common.sendNow')}
              icon="cloud-upload"
              loading={busy}
              onPress={async () => {
                setBusy(true);
                await syncNow();
                setBusy(false);
                setOpen(false);
              }}
            />
            <Spacer size="sm" />
            <Button title={t('common.close')} variant="ghost" onPress={() => setOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  backdrop: { flex: 1, justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 20, padding: 20 },
});
