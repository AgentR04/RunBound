import { Platform } from 'react-native';

export const TITLE_FONT = Platform.select({
  ios: 'Bebas Neue',
  android: 'BebasNeue',
  default: 'Bebas Neue',
});

export const STAT_FONT = Platform.select({
  ios: 'Orbitron',
  android: 'Orbitron',
  default: 'Orbitron',
});

export const BODY_FONT = Platform.select({
  ios: 'Oswald',
  android: 'Oswald',
  default: 'Oswald',
});

export const UI_FONT = BODY_FONT;
