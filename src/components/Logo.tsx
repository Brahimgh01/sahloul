// The S-IT Hub mark, as a crisp vector, so it matches assets/icon.png exactly.
import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';

export function Logo({
  size = 64,
  color = '#FFFFFF',
  accent = '#06B6D4',
  center = '#FFFFFF',
  check = '#4338CA',
  dots = ['#22C55E', '#F59E0B', '#EF4444'],
  nodeColor,
}: {
  size?: number;
  color?: string;
  accent?: string;
  center?: string;
  check?: string;
  dots?: readonly string[];
  nodeColor?: string;
}) {
  const s = size / 100;
  const c = 50;
  const dist = 30;
  const nodeR = 13.5;
  const centerR = 20;
  const stroke = 8.5;
  const nodes = [-90, 30, 150].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return { x: c + Math.cos(a) * dist, y: c + Math.sin(a) * dist };
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {nodes.map((n, i) => (
        <Line
          key={`l${i}`}
          x1={c}
          y1={c}
          x2={n.x}
          y2={n.y}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      ))}
      {nodes.map((n, i) => (
        <Circle key={`n${i}`} cx={n.x} cy={n.y} r={nodeR} fill={nodeColor ?? color} />
      ))}
      {nodes.map((n, i) => (
        <Circle key={`d${i}`} cx={n.x} cy={n.y} r={nodeR * 0.42} fill={dots[i % dots.length]} />
      ))}
      <Circle cx={c} cy={c} r={centerR} fill={center} />
      <Path
        d={`M ${c - 8.5} ${c + 0.6} L ${c - 2} ${c + 7} L ${c + 9.5} ${c - 7.5}`}
        stroke={check}
        strokeWidth={stroke * 1.05}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
