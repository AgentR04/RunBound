import { Platform } from 'react-native';

export const TITLE_FONT = Platform.select({
  ios: 'Avengeance Heroic Avenger',
  android: 'AvengeanceHeroicAvenger',
  default: 'Avengeance Heroic Avenger',
});

export const UI_FONT = Platform.select({
  ios: 'Orbitron',
  android: 'Orbitron',
  default: 'Orbitron',
});
