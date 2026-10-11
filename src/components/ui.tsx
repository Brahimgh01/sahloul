// Small shared UI pieces. Every screen builds from these so the look stays the same.
// All text sizes come from the theme (which follows the text-size setting).
//
// This set now mirrors the "S-IT Hub" redesign: soft cards, pill chips, status
// tags, grouped settings rows, stat tiles, quest cards and a health ring.
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Gradient } from '@/components/Gradient';
import { useDirection, useT } from '@/i18n';
import { useDisplayFamily, useFontFamily, type DisplayWeight } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';

import { cardShadow, gradients, radius, spacing } from '@/theme/tokens';

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
type SizeName = 'title' | 'section' | 'body' | 'small' | 'tiny' | 'huge' | 'lg' | 'hero';

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

/** Display text: the rounded Baloo 2 face used for headings and big numbers. */
export interface DisplayProps extends TextProps {
  size?: SizeName;
  weight?: DisplayWeight;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center';
}

export function Display({ size = 'title', weight = '700', color, align, style, ...rest }: DisplayProps) {
  const theme = useTheme();
  const dir = useDirection();
  const fontFamily = useDisplayFamily(weight);
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily,
          fontSize: theme.font(size),
          fontWeight: weight,
          letterSpacing: -0.2,
          color: color ?? theme.colors.text,
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
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.line }} />;
}

// ---------- Card ----------
export function Card({ style, children, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.line,
          padding: theme.spacing.lg,
          ...cardShadow(theme.mode, 1),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---------- Buttons ----------
type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'brandSoft'
  | 'danger'
  | 'success';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
  block,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  block?: boolean;
}) {
  const theme = useTheme();
  const dir = useDirection();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const gradientColors =
    variant === 'primary'
      ? gradients.brand
      : variant === 'success'
        ? gradients.fresh
        : null;

  const soft = variant === 'brandSoft' || variant === 'secondary';
  const outline = variant === 'ghost' || variant === 'outline';
  const danger = variant === 'danger';

  const fg = gradientColors
    ? '#FFFFFF'
    : danger
      ? theme.colors.danger
      : soft
        ? theme.colors.brand
        : theme.colors.text;

  return (
    <Animated.View style={[anim, block ? { width: '100%' } : null, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        disabled={disabled || loading}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 16, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 300 });
        }}
        onPress={onPress}
        style={{
          minHeight: theme.HIT,
          borderRadius: theme.radius.md,
          overflow: 'hidden',
          backgroundColor: danger
            ? theme.colors.danger + '22'
            : soft
              ? theme.colors.brandSoft
              : outline
                ? 'transparent'
                : 'transparent',
          borderWidth: outline ? 1.5 : 0,
          borderColor: theme.colors.line,
          paddingHorizontal: theme.spacing.xl,
          opacity: disabled ? 0.45 : 1,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: dir.row,
          gap: theme.spacing.sm,
          ...(gradientColors ? cardShadow(theme.mode, 1) : null),
        }}
      >
        {gradientColors ? (
          <Gradient colors={gradientColors} radius={theme.radius.md} style={StyleSheet.absoluteFill} />
        ) : null}
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {icon ? <Icon name={icon} size={20} color={fg} /> : null}
            <AppText size="body" weight="700" color={fg} align="center">
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
  variant,
}: {
  name: IconName;
  onPress?: () => void;
  label: string;
  color?: string;
  size?: number;
  background?: string;
  variant?: 'soft' | 'brand';
}) {
  const theme = useTheme();
  const bg =
    background ?? (variant === 'soft' ? theme.colors.surface2 : variant === 'brand' ? theme.colors.brandSoft : undefined);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={{
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: bg,
      }}
    >
      <Icon name={name} size={size} color={color ?? (variant === 'brand' ? theme.colors.brand : theme.colors.text)} />
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
  size = 'md',
  tone = 'brand',
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  icon?: IconName;
  size?: 'sm' | 'md';
  tone?: 'brand' | 'warn' | 'crit' | 'info' | 'ok';
}) {
  const theme = useTheme();
  const toneColor =
    tone === 'warn'
      ? theme.colors.warn
      : tone === 'crit'
        ? theme.colors.danger
        : tone === 'info'
          ? theme.colors.info
          : tone === 'ok'
            ? theme.colors.success
            : color ?? theme.colors.brand;
  const sm = size === 'sm';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minHeight: sm ? 34 : 40,
        paddingHorizontal: sm ? 11 : 14,
        borderRadius: theme.radius.pill,
        borderWidth: 1.5,
        borderColor: selected ? toneColor : theme.colors.line,
        backgroundColor: selected ? toneColor : theme.colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {icon ? <Icon name={icon} size={sm ? 14 : 15} color={selected ? '#FFFFFF' : toneColor} /> : null}
      <AppText size={sm ? 'tiny' : 'small'} weight="700" color={selected ? '#FFFFFF' : theme.colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

// ---------- Tag (small status label, always with an optional icon) ----------
export type TagTone = 'default' | 'late' | 'crit' | 'info' | 'ok' | 'warn';

export function Tag({
  label,
  tone = 'default',
  icon,
}: {
  label: string;
  tone?: TagTone;
  icon?: IconName;
}) {
  const theme = useTheme();
  const color =
    tone === 'late' || tone === 'crit'
      ? theme.colors.danger
      : tone === 'info'
        ? theme.colors.info
        : tone === 'ok'
          ? theme.colors.success
          : tone === 'warn'
            ? theme.colors.warn
            : theme.colors.textMuted;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        height: 24,
        paddingHorizontal: 9,
        borderRadius: 8,
        backgroundColor: tone === 'default' ? theme.colors.surface2 : color + '26',
      }}
    >
      {icon ? <Icon name={icon} size={13} color={color} /> : null}
      <AppText size="tiny" weight="700" color={color}>
        {label}
      </AppText>
    </View>
  );
}

// ---------- Search bar ----------
export function SearchBar({
  value,
  onChangeText,
  placeholder,
  children,
}: {
  value?: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
} & TextInputProps) {
  const theme = useTheme();
  const dir = useDirection();
  return (
    <View
      style={{
        flexDirection: dir.row,
        alignItems: 'center',
        gap: 10,
        minHeight: 52,
        paddingHorizontal: 14,
        borderRadius: 16,
        backgroundColor: theme.colors.surface,
        borderWidth: 1.5,
        borderColor: theme.colors.line,
      }}
    >
      <Icon name="magnify" size={22} color={theme.colors.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textFaint}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: theme.font('body'),
          color: theme.colors.text,
          paddingVertical: 12,
          textAlign: dir.textAlign,
          writingDirection: dir.writingDirection,
        }}
      />
      {children}
    </View>
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
            width: i === index ? 24 : 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: i <= index ? theme.colors.brand : theme.colors.line,
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
  compact,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  compact?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surface2,
        borderRadius: 14,
        padding: 4,
        gap: 4,
        alignSelf: compact ? 'auto' : 'stretch',
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
              flex: compact ? undefined : 1,
              minHeight: 42,
              paddingHorizontal: compact ? 14 : 0,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? theme.colors.surface : 'transparent',
              ...(on ? cardShadow(theme.mode, 1) : null),
            }}
          >
            <AppText
              size="small"
              weight="700"
              color={on ? theme.colors.brand : theme.colors.textMuted}
            >
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Switch ----------
export function Switch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const theme = useTheme();
  const dir = useDirection();
  const p = useSharedValue(value ? 1 : 0);
  React.useEffect(() => {
    p.value = withTiming(value ? 1 : 0, { duration: 200 });
  }, [value, p]);
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: (dir.isRTL ? -1 : 1) * 20 * p.value }],
  }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{
        width: 50,
        height: 30,
        borderRadius: 999,
        backgroundColor: value ? theme.colors.brand : theme.colors.line,
        justifyContent: 'center',
        paddingHorizontal: 3,
      }}
    >
      <Animated.View
        style={[
          {
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            ...cardShadow(theme.mode, 1),
          },
          knob,
        ]}
      />
    </Pressable>
  );
}

// ---------- Skeleton (never a blank screen) ----------
export function Skeleton({ height = 20, width = '100%', radius: r }: { height?: number; width?: number | string; radius?: number }) {
  const theme = useTheme();
  return <View style={{ height, width: width as never, borderRadius: r ?? 8, backgroundColor: theme.colors.surface2 }} />;
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
          backgroundColor: theme.colors.brandSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={38} color={theme.colors.brand} />
      </View>
      <Spacer size="lg" />
      <AppText size="lg" weight="700" align="center">
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
      <AppText size="tiny" weight="700" color={color}>
        {label}
      </AppText>
    </View>
  );
}

// ---------- Section title (bar + heading + count) ----------
export function SectionTitle({
  title,
  color,
  count,
  action,
}: {
  title: string;
  color?: string;
  count?: number;
  action?: React.ReactNode;
}) {
  const theme = useTheme();
  const tint = color ?? theme.colors.brand;
  return (
    <Row style={{ gap: 10, marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
      <View style={{ width: 6, height: 22, borderRadius: 4, backgroundColor: tint }} />
      <Display size="lg" weight="700" style={{ flex: 1 }}>
        {title}
      </Display>
      {typeof count === 'number' ? (
        <View
          style={{
            minWidth: 30,
            height: 30,
            paddingHorizontal: 9,
            borderRadius: 15,
            backgroundColor: tint + '26',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText size="small" weight="700" color={tint}>
            {count}
          </AppText>
        </View>
      ) : null}
      {action}
    </Row>
  );
}

// ---------- Grouped list (settings/detail) ----------
export function GroupHeading({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <AppText
      size="small"
      weight="700"
      color={theme.colors.textMuted}
      style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm, marginHorizontal: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}
    >
      {children}
    </AppText>
  );
}

export function Group({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.line,
          paddingHorizontal: theme.spacing.md,
          ...cardShadow(theme.mode, 1),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A label / value row, used inside a Group. */
export function KV({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  const theme = useTheme();
  const dir = useDirection();
  return (
    <View
      style={{
        flexDirection: dir.row,
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.line,
      }}
    >
      <AppText size="small" muted>
        {label}
      </AppText>
      {children ?? (
        <AppText size="body" weight="700" align={dir.isRTL ? 'left' : 'right'} style={{ flexShrink: 1 }} numberOfLines={1}>
          {value}
        </AppText>
      )}
    </View>
  );
}

/** A tappable row with a coloured ribbon icon, a title and a subtitle. */
export function RowButton({
  icon,
  iconColors,
  title,
  subtitle,
  onPress,
  chevron = true,
}: {
  icon: IconName;
  iconColors?: readonly string[];
  title: string;
  subtitle?: string;
  onPress?: () => void;
  chevron?: boolean;
}) {
  const theme = useTheme();
  const dir = useDirection();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={{
        flexDirection: dir.row,
        alignItems: 'center',
        gap: 14,
        minHeight: 64,
        paddingVertical: 8,
      }}
    >
      <Gradient
        colors={iconColors ?? gradients.brand}
        radius={15}
        style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name={icon} size={24} color="#FFFFFF" />
      </Gradient>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText size="body" weight="700">
          {title}
        </AppText>
        {subtitle ? (
          <AppText size="small" muted numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {chevron ? <Icon name={dir.isRTL ? 'chevron-left' : 'chevron-right'} size={22} color={theme.colors.textFaint} /> : null}
    </Pressable>
  );
}

// ---------- Stat tiles ----------
export function Stat({
  value,
  label,
  color,
}: {
  value: number | string;
  label: string;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.line,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 10,
        alignItems: 'center',
        ...cardShadow(theme.mode, 1),
      }}
    >
      <Display size="title" weight="800" color={color}>
        {value}
      </Display>
      <AppText size="tiny" weight="700" color={theme.colors.textMuted} align="center">
        {label}
      </AppText>
    </View>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>;
}

// ---------- Quest card (daily missions + XP) ----------
export interface QuestItem {
  id: string;
  label: string;
  xp: number;
  done: boolean;
}

export function Quest({
  title,
  levelLabel,
  levelPct,
  items,
  onToggle,
}: {
  title: string;
  levelLabel: string;
  levelPct: number;
  items: QuestItem[];
  onToggle: (id: string) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        borderRadius: theme.radius.lg,
        padding: 16,
        backgroundColor: theme.colors.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.line,
        ...cardShadow(theme.mode, 1),
      }}
    >
      <Row style={{ gap: 10, marginBottom: 12 }}>
        <Gradient
          colors={gradients.gold}
          radius={13}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="trophy" size={22} color="#FFFFFF" />
        </Gradient>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Display size="lg" weight="700">
            {title}
          </Display>
          <AppText size="tiny" color={theme.colors.gold} weight="700">
            {levelLabel}
          </AppText>
        </View>
      </Row>

      <View style={{ height: 8, borderRadius: 5, backgroundColor: theme.colors.surface2, overflow: 'hidden', marginBottom: 12 }}>
        <View style={{ width: `${Math.min(100, Math.max(0, levelPct))}%`, height: '100%', borderRadius: 5, backgroundColor: theme.colors.brand }} />
      </View>

      {items.map((q) => (
        <Pressable
          key={q.id}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: q.done }}
          accessibilityLabel={q.label}
          onPress={() => onToggle(q.id)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 11,
            paddingHorizontal: 10,
            borderRadius: 14,
            backgroundColor: theme.colors.surface2,
            marginBottom: 8,
          }}
        >
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: q.done ? theme.colors.success : theme.colors.line,
              backgroundColor: q.done ? theme.colors.success : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {q.done ? <Icon name="check" size={16} color="#FFFFFF" /> : null}
          </View>
          <AppText
            size="small"
            weight="600"
            style={{ flex: 1, textDecorationLine: q.done ? 'line-through' : 'none', opacity: q.done ? 0.6 : 1 }}
          >
            {q.label}
          </AppText>
          <AppText size="tiny" weight="700" color={theme.colors.gold}>
            +{q.xp} XP
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

// ---------- Health ring ----------
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function HealthRing({
  size = 104,
  stroke = 11,
  pct,
  center,
  centerSub,
  colors,
  trackColor,
}: {
  size?: number;
  stroke?: number;
  pct: number;
  center: React.ReactNode;
  centerSub?: React.ReactNode;
  colors?: readonly string[];
  trackColor?: string;
}) {
  const theme = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(0);
  React.useEffect(() => {
    p.value = 0;
    p.value = withTiming(Math.min(1, Math.max(0, pct)), { duration: theme.reduceMotion ? 0 : 900 });
  }, [pct, p, theme.reduceMotion]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - p.value),
  }));
  const grads = colors ?? [theme.colors.brand, theme.colors.brand3];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor ?? 'rgba(255,255,255,0.25)'} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={grads[0]}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        {center}
        {centerSub}
      </View>
    </View>
  );
}

/** Compact stat used inside the gradient hero (glass look). */
export function GlassStat({ value, label }: { value: number | string; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.16)',
        paddingVertical: 10,
        alignItems: 'center',
      }}
    >
      <Display size="title" weight="800" color="#FFFFFF">
        {value}
      </Display>
      <AppText size="tiny" weight="700" color="rgba(255,255,255,0.92)">
        {label}
      </AppText>
    </View>
  );
}

// Re-export the translation hook for convenience in screens.
export { useT };
