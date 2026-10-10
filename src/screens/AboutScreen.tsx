// About: a short, warm page (spec 5.8).
import Constants from 'expo-constants';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Card, Icon, Row, Spacer } from '@/components/ui';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export function AboutScreen() {
  const theme = useTheme();
  const { t } = useT();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 160 }}>
        <View style={{ alignItems: 'center', marginTop: theme.spacing.xl }}>
          <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}>
            <Icon name="hospital-box" size={46} color={theme.colors.onPrimary} />
          </View>
          <Spacer size="lg" />
          <AppText size="title" weight="700">
            {t('common.appName')}
          </AppText>
          <AppText size="small" muted>
            {t('common.version')} {version}
          </AppText>
        </View>

        <Spacer size="xxl" />
        <Card>
          <Row style={{ gap: 10, alignItems: 'flex-start' }}>
            <Icon name="heart-outline" size={24} color={theme.colors.late} />
            <AppText size="body" style={{ flex: 1, lineHeight: 24 }}>
              {t('about.thanks')}
            </AppText>
          </Row>
          <Spacer size="lg" />
          <Row style={{ gap: 10, alignItems: 'flex-start' }}>
            <Icon name="school-outline" size={24} color={theme.colors.primary} />
            <AppText size="body" style={{ flex: 1, lineHeight: 24 }}>
              {t('about.madeBy')}
            </AppText>
          </Row>
          <Spacer size="lg" />
          <Row style={{ gap: 10, alignItems: 'flex-start' }}>
            <Icon name="shield-lock-outline" size={24} color={theme.colors.done} />
            <AppText size="body" style={{ flex: 1, lineHeight: 24 }}>
              {t('about.privacy')}
            </AppText>
          </Row>
        </Card>

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

const styles = StyleSheet.create({
  logo: { width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
