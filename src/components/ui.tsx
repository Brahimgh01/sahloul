// Small shared UI pieces. Every screen builds from these so the look stays the same.
// All text sizes come from the theme (which follows the text-size setting).
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useDirection, useT } from '@/i18n';
import { useFontFamily } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';

import { radius, spacing } from '@/theme/tokens';

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
export type IonName = keyof typeof Ionicons.glyphMap;

export function Icon({
  name,
  size = 22,
  color,
}: {
  name: IconName;
  size?: number;
  color: string;
}) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

export function IonIcon({ name, size = 22, color }: { name: IonName; size?: number; color: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

// ---------- Text ----------
type SizeName = 'title' | 'section' | 'body' | 'small' | 'tiny' | 'huge';

export interface AppTextProps extends TextProps {
  size?: SizeName;
  weight?: '400' | '500' | '600' | '700';
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center';
  muted?: boolean;
}

export function AppText({ size = 'body', weight = '400', color, align, muted, style, ...rest }: AppTextProps) {
  const theme = useTheme();
  const dir = useDirection();
  const fontFamily = useFontFamily(weight);
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily,
          fontSize: theme.font(size),
          fontWeight: weight,
          color: color ?? (muted ? theme.colors.textMuted : theme.colors.text),
          textAlign: align ?? dir.textAlign,
          writingDirection: dir.writingDirection,
        },
        style,
      ]}
    />
  );
}

// ---------- Layout ----------
export function Row({ style, children, ...rest }: ViewProps) {
  const dir = useDirection();
  return (
    <View {...rest} style={[{ flexDirection: dir.row, alignItems: 'center' }, style]}>
      {children}
    </View>
  );
}

export function Spacer({ size = 'md' }: { size?: keyof typeof spacing }) {
  return <View style={{ height: spacing[size] }} />;
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }} />;
}

// ---------- Card ----------
export function Card({ style, children, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          padding: theme.spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---------- Buttons ----------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const dir = useDirection();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bg =
    variant === 'primary'
      ? theme.colors.primary
      : variant === 'danger'
        ? theme.colors.late
        : variant === 'success'
          ? theme.colors.done
          : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' || variant === 'success' ? theme.colors.onPrimary : theme.colors.primary;

  return (
    <Animated.View style={[anim, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        disabled={disabled || loading}
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 90 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 120 });
        }}
        onPress={onPress}
        style={{
          minHeight: theme.HIT,
          borderRadius: theme.radius.md,
          backgroundColor: variant === 'secondary' ? theme.colors.primarySoft : bg,
          borderWidth: variant === 'ghost' || variant === 'secondary' ? 1 : 0,
          borderColor: variant === 'secondary' ? theme.colors.primary : theme.colors.border,
          paddingHorizontal: theme.spacing.xl,
          opacity: disabled ? 0.5 : 1,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: dir.row,
          gap: theme.spacing.sm,
        }}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {icon ? <Icon name={icon} size={20} color={fg} /> : null}
            <AppText size="body" weight="600" color={fg} align="center">
              {title}
            </AppText>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function IconButton({
  name,
  onPress,
  label,
  color,
  size = 24,
  background,
}: {
  name: IconName;
  onPress?: () => void;
  label: string;
  color?: string;
  size?: number;
  background?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={{
        minWidth: theme.HIT,
        minHeight: theme.HIT,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.HIT / 2,
        backgroundColor: background,
      }}
    >
      <Icon name={name} size={size} color={color ?? theme.colors.text} />
    </Pressable>
  );
}

// ---------- Chip ----------
export function Chip({
  label,
  selected,
  onPress,
  color,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  icon?: IconName;
}) {
  const theme = useTheme();
  const tint = color ?? theme.colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minHeight: 40,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: selected ? tint : theme.colors.border,
        backgroundColor: selected ? tint : theme.colors.cardAlt,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {icon ? <Icon name={icon} size={16} color={selected ? theme.colors.onPrimary : tint} /> : null}
      <AppText size="small" weight="600" color={selected ? theme.colors.onPrimary : theme.colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

// ---------- Progress dots (Send wizard) ----------
export function ProgressDots({ count, index }: { count: number; index: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === index ? 26 : 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: i <= index ? theme.colors.primary : theme.colors.border,
          }}
        />
      ))}
    </View>
  );
}

// ---------- Segmented control ----------
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.cardAlt,
        borderRadius: theme.radius.md,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: theme.radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? theme.colors.card : 'transparent',
            }}
          >
            <AppText size="small" weight={on ? '600' : '400'} color={on ? theme.colors.primary : theme.colors.textMuted}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Skeleton (never a blank screen) ----------
export function Skeleton({ height = 20, width = '100%', radius: r }: { height?: number; width?: number | string; radius?: number }) {
  const theme = useTheme();
  return <View style={{ height, width: width as never, borderRadius: r ?? 8, backgroundColor: theme.colors.cardAlt }} />;
}

// ---------- Empty state ----------
export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xxxl, paddingHorizontal: theme.spacing.xl }}>
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 42,
          backgroundColor: theme.colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={38} color={theme.colors.primary} />
      </View>
      <Spacer size="lg" />
      <AppText size="section" weight="700" align="center">
        {title}
      </AppText>
      <Spacer size="sm" />
      <AppText size="body" muted align="center">
        {body}
      </AppText>
      {actionLabel ? (
        <>
          <Spacer size="xl" />
          <Button title={actionLabel} onPress={onAction} />
        </>
      ) : null}
    </View>
  );
}

// ---------- Small badge ----------
export function Badge({ label, color, icon }: { label: string; color: string; icon?: IconName }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        minHeight: 26,
        borderRadius: radius.pill,
        backgroundColor: color + '22',
      }}
    >
      {icon ? <Icon name={icon} size={14} color={color} /> : null}
      <AppText size="tiny" weight="600" color={color}>
        {label}
      </AppText>
    </View>
  );
}

// Re-export the translation hook for convenience in screens.
export { useT };
