// About: a short, warm page (spec 5.8).
// Redesign: the Nova mascot, a display title, a small facts card and a privacy card.
import Constants from 'expo-constants';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { Mascot } from '@/components/Mascot';
import { Entry } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import { AppText, Card, Display, Group, Icon, KV, Row, Spacer } from '@/components/ui';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export function AboutScreen() {
  const theme = useTheme();
  const { t } = useT();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 160, alignItems: 'center' }}>
        <Spacer size="xl" />

        <Entry>
          <Mascot size={120} />
        </Entry>

        <Spacer size="md" />
        <Entry delay={80} style={{ alignSelf: 'stretch' }}>
          <Display size="title" align="center">
            {t('common.appName')}
          </Display>
          <Spacer size="xs" />
          <AppText size="small" muted align="center" style={{ alignSelf: 'center', maxWidth: 320 }}>
            {t('about.thanks')}
          </AppText>
        </Entry>

        <Spacer size="xl" />
        <Entry delay={140} style={{ alignSelf: 'stretch' }}>
          <Group>
            <KV label={t('common.version')} value={version} />
            <KV label={t('about.title')} value={t('about.madeBy')} />
          </Group>
        </Entry>

        <Spacer size="md" />
        <Entry delay={200} style={{ alignSelf: 'stretch' }}>
          <Card>
            <Row style={{ gap: 12, alignItems: 'flex-start' }}>
              <Icon name="shield-check-outline" size={24} color={theme.colors.done} />
              <AppText size="body" style={{ flex: 1 }}>
                {t('about.privacy')}
              </AppText>
            </Row>
          </Card>
        </Entry>

        <Spacer size="lg" />
        <Row style={{ gap: 8, justifyContent: 'center' }}>
          <Icon name="information-outline" size={16} color={theme.colors.textMuted} />
          <AppText size="tiny" muted>
            {t('common.noPatientNames')}
          </AppText>
        </Row>
      </ScrollView>
    </Screen>
  );
}
