// Animated ring for the Today screen: three numbers that count up on open.
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function CountUp({ value, color }: { value: number; color: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = Date.now();
    const dur = 700;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / dur);
      setN(Math.round(value * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <AppText size="huge" weight="700" color={color}>
      {n}
    </AppText>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <CountUp value={value} color={color} />
      <AppText size="small" weight="600" color={color}>
        {label}
      </AppText>
    </View>
  );
}

export function TodayRing({ late, away, critical }: { late: number; away: number; critical: number }) {
  const theme = useTheme();
  const { t, language } = useT();
  const progress = useSharedValue(0);
  const size = 168;
  const r = (size - 20) / 2;
  const c = 2 * Math.PI * r;

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: theme.reduceMotion ? 0 : 900 });
  }, [progress, late, away, critical, theme.reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - progress.value),
  }));

  const clear = away === 0 ? 1 : Math.max(0, (away - late) / away);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.colors.border} strokeWidth={10} fill="none" />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={theme.colors.primary}
            strokeWidth={10}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            animatedProps={animatedProps}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <AppText size="small" muted>
          {t('today.away')}
        </AppText>
        <CountUp value={away} color={theme.colors.primary} />
        <AppText size="tiny" muted>
          {t('today.allGood')} {Math.round(clear * 100)}%
        </AppText>
      </View>

      <View style={[styles.row, { marginTop: theme.spacing.lg }]}>
        <Stat value={late} label={t('today.late')} color={theme.colors.late} />
        <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
        <Stat value={away} label={t('today.away')} color={theme.colors.info} />
        <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
        <Stat value={critical} label={t('today.critical')} color={theme.colors.critical} />
      </View>
      {/* language is used so the ring re-renders on language change */}
      <AppText size="tiny" muted style={{ opacity: 0 }}>
        {language}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  stat: { alignItems: 'center', minWidth: 64 },
  sep: { width: StyleSheet.hairlineWidth, height: 46 },
});
