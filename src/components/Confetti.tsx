// A small celebration burst (no dependencies). Shown after a success:
// a device sent, a return saved, an import finished.
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { accents } from '@/theme/tokens';

const COLORS = [accents.grape, accents.bubble, accents.mango, accents.coral, accents.mint, accents.lime, accents.sky];
const { width: W, height: H } = Dimensions.get('window');

interface Piece {
  x: number;
  y: number;
  dx: number;
  dy: number;
  rot: number;
  size: number;
  color: string;
  round: boolean;
  delay: number;
}

function makePieces(count: number): Piece[] {
  const pieces: Piece[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * (i / count)) - Math.PI;
    const speed = 0.35 + Math.random() * 0.5;
    pieces.push({
      x: W / 2 + (Math.random() - 0.5) * 30,
      y: H * 0.32,
      dx: Math.cos(angle) * (W * 0.5) * speed + (Math.random() - 0.5) * 40,
      dy: -Math.abs(Math.sin(angle)) * H * 0.28 * speed - 40,
      rot: (Math.random() - 0.5) * 6,
      size: 8 + Math.random() * 10,
      color: COLORS[i % COLORS.length],
      round: i % 3 === 0,
      delay: Math.random() * 160,
    });
  }
  return pieces;
}

function PieceView({ piece, progress }: { piece: Piece; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const t = Math.max(0, Math.min(1, (progress.value - piece.delay / 1400) / (1 - piece.delay / 1400)));
    const fall = t * t; // gravity feel
    return {
      opacity: t <= 0 ? 0 : 1 - Math.max(0, t - 0.7) / 0.3,
      transform: [
        { translateX: piece.dx * t },
        { translateY: piece.dy * t + H * 0.5 * fall },
        { rotate: `${piece.rot * t * 360}deg` },
        { scale: t <= 0 ? 0.2 : 1 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: piece.x,
          top: piece.y,
          width: piece.size,
          height: piece.round ? piece.size : piece.size * 0.55,
          backgroundColor: piece.color,
          borderRadius: piece.round ? piece.size / 2 : 3,
        },
        style,
      ]}
    />
  );
}

export function Confetti({ visible, onDone, count = 44 }: { visible: boolean; onDone?: () => void; count?: number }) {
  const progress = useSharedValue(0);
  const pieces = React.useRef<Piece[]>([]);
  if (pieces.current.length === 0) pieces.current = makePieces(count);

  React.useEffect(() => {
    if (!visible) return;
    pieces.current = makePieces(count);
    progress.value = 0;
    progress.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished && onDone) runOnJS(onDone)();
    });
  }, [visible, progress, onDone, count]);

  if (!visible) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.current.map((p, i) => (
        <PieceView key={i} piece={p} progress={progress} />
      ))}
    </View>
  );
}
