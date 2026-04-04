import { Platform } from 'react-native';

export type HeroAvatarId = 'capt_marvel' | 'iron_man';

// Android emulator reaches host via 10.0.2.2
const API_HOST =
  Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';

export const HERO_AVATARS: Record<
  HeroAvatarId,
  {
    id: HeroAvatarId;
    label: string;
    badge: string;
    accent: string;
    tint: string;
    modelUrl: string;
  }
> = {
  capt_marvel: {
    id: 'capt_marvel',
    label: 'Captain Marvel',
    badge: 'CM',
    accent: '#5BB7FF',
    tint: '#E8F5FF',
    modelUrl: `${API_HOST}/static/models/capt_marvel.glb`,
  },
  iron_man: {
    id: 'iron_man',
    label: 'Iron Man',
    badge: 'IM',
    accent: '#FF8B5E',
    tint: '#FFF1E9',
    modelUrl: `${API_HOST}/static/models/iron_man.glb`,
  },
};

export function isHeroAvatarId(value: unknown): value is HeroAvatarId {
  return value === 'capt_marvel' || value === 'iron_man';
}

export function getHeroAvatar(heroId?: unknown): (typeof HERO_AVATARS)[HeroAvatarId] | null {
  if (!isHeroAvatarId(heroId)) {
    return null;
  }

  return HERO_AVATARS[heroId];
}
