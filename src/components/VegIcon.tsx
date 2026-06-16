import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';
import { colors } from '@/theme';

// Minimal red line-art vegetables (One Year / habit-collection vibe). All drawn
// on a 64×64 grid, stroke-only, rounded caps. Add a new veg = add a case here +
// an entry in src/lib/veggies.ts.

export type VegType =
  | 'tomato'
  | 'carrot'
  | 'strawberry'
  | 'pepper'
  | 'corn'
  | 'eggplant'
  | 'broccoli'
  | 'mushroom';

interface Props {
  type: VegType;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function VegIcon({ type, size = 48, color = colors.tomato, strokeWidth = 3 }: Props) {
  const p: Stroke = {
    stroke: color,
    strokeWidth,
    fill: 'none',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {render(type, p)}
    </Svg>
  );
}

type Stroke = {
  stroke: string;
  strokeWidth: number;
  fill: 'none';
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
};

function render(type: VegType, p: Stroke) {
  switch (type) {
    case 'tomato':
      return (
        <>
          <Ellipse cx={32} cy={38} rx={22} ry={19} {...p} />
          {/* leafy calyx */}
          <Path d="M32 20 L25 11 M32 20 L32 8 M32 20 L39 11 M32 20 L21 16 M32 20 L43 16" {...p} />
          <Path d="M32 20 L30 14 L32 9 L34 14 Z" {...p} />
          {/* little shine */}
          <Path d="M20 32 C 18 38, 20 44, 25 48" {...p} />
        </>
      );
    case 'carrot':
      return (
        <>
          <Path d="M24 24 L40 24 L32 54 Z" {...p} />
          <Line x1={28} y1={32} x2={36} y2={32} {...p} />
          <Line x1={30} y1={40} x2={34} y2={40} {...p} />
          {/* greens */}
          <Path d="M28 24 L23 12 M32 24 L32 9 M36 24 L41 12" {...p} />
        </>
      );
    case 'strawberry':
      return (
        <>
          <Path d="M32 22 C 16 22, 14 34, 32 54 C 50 34, 48 22, 32 22 Z" {...p} />
          {/* calyx */}
          <Path d="M24 22 L20 15 M32 22 L32 13 M40 22 L44 15" {...p} />
          {/* seeds */}
          <Circle cx={27} cy={32} r={1.2} {...p} />
          <Circle cx={37} cy={32} r={1.2} {...p} />
          <Circle cx={32} cy={38} r={1.2} {...p} />
          <Circle cx={24} cy={40} r={1.2} {...p} />
          <Circle cx={40} cy={40} r={1.2} {...p} />
        </>
      );
    case 'pepper':
      return (
        <>
          <Path
            d="M20 26 C 14 30, 14 44, 24 50 C 28 53, 30 47, 34 50 C 44 52, 50 40, 46 30 C 42 24, 26 22, 20 26 Z"
            {...p}
          />
          {/* stem */}
          <Path d="M33 26 L33 16 L40 14" {...p} />
        </>
      );
    case 'corn':
      return (
        <>
          <Ellipse cx={32} cy={34} rx={13} ry={22} {...p} />
          <Line x1={32} y1={14} x2={32} y2={56} {...p} />
          <Line x1={24} y1={24} x2={40} y2={24} {...p} />
          <Line x1={22} y1={34} x2={42} y2={34} {...p} />
          <Line x1={24} y1={44} x2={40} y2={44} {...p} />
          {/* husk */}
          <Path d="M20 50 C 14 54, 14 58, 18 60 M44 50 C 50 54, 50 58, 46 60" {...p} />
        </>
      );
    case 'eggplant':
      return (
        <>
          <Path d="M22 30 C 16 44, 26 56, 38 52 C 50 47, 50 30, 38 26 C 30 23, 26 24, 22 30 Z" {...p} />
          {/* cap */}
          <Path d="M34 27 L40 18 M34 27 L30 19 M34 27 L42 22" {...p} />
        </>
      );
    case 'broccoli':
      return (
        <>
          {/* florets */}
          <Path
            d="M20 30 A 7 7 0 0 1 27 23 A 7 7 0 0 1 38 22 A 7 7 0 0 1 46 30 A 6 6 0 0 1 44 38 L22 38 A 6 6 0 0 1 20 30 Z"
            {...p}
          />
          {/* stalk */}
          <Path d="M26 38 L24 52 L40 52 L38 38" {...p} />
        </>
      );
    case 'mushroom':
      return (
        <>
          {/* cap */}
          <Path d="M14 34 C 14 20, 50 20, 50 34 Z" {...p} />
          <Line x1={14} y1={34} x2={50} y2={34} {...p} />
          {/* stem */}
          <Path d="M26 34 L26 48 C 26 52, 38 52, 38 48 L38 34" {...p} />
          {/* spots */}
          <Circle cx={26} cy={28} r={1.6} {...p} />
          <Circle cx={36} cy={29} r={1.6} {...p} />
        </>
      );
    default:
      return null;
  }
}
