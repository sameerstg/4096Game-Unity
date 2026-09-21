import React from 'react';
import Svg, { Path } from 'react-native-svg';

// Material Design icon paths (Apache 2.0), drawn on a 24x24 grid.
const PATHS = {
  music: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
  musicOff:
    'M4.27 3L3 4.27l9 9v.28c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4v-1.73L19.73 21 21 19.73 4.27 3zM14 7h4V3h-6v5.18l2 2z',
  restart:
    'M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
};

export type IconName = keyof typeof PATHS;

type Props = {
  name: IconName;
  size: number;
  color: string;
};

export function Icon({ name, size, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={PATHS[name]} fill={color} />
    </Svg>
  );
}
