import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { getHeroAvatar, HeroAvatarId } from '../../config/heroAvatars';
import { buildHeroViewerHtml } from '../../utils/heroViewerHtml';

const WEBVIEW_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';

function buildInitials(name?: string) {
  const value = name?.trim() ?? '';
  if (!value) {
    return 'RB';
  }

  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

interface HeroAvatarProps {
  heroId?: HeroAvatarId | null;
  size?: number;
  fallbackText?: string;
  use3D?: boolean;
  onViewerLoaded?: () => void;
  onViewerError?: () => void;
}

export default function HeroAvatar({
  heroId,
  size = 56,
  fallbackText,
  use3D = size >= 80,
  onViewerLoaded,
  onViewerError,
}: HeroAvatarProps) {
  const [hasViewerError, setHasViewerError] = useState(false);
  const hero = getHeroAvatar(heroId);
  const fallbackLabel = buildInitials(fallbackText);

  const modelUrl = hero?.modelUrl ?? null;

  const shouldRenderViewer = use3D && !!hero && !!modelUrl && !hasViewerError;

  return (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: hero?.accent ?? '#FFD48A',
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            width: size - 12,
            height: size - 12,
            borderRadius: (size - 12) / 2,
            backgroundColor: hero?.tint ?? '#D7F1FF',
          },
        ]}
      >
        {shouldRenderViewer ? (
          <WebView
            originWhitelist={['*']}
            source={{
              html: buildHeroViewerHtml(modelUrl, hero.accent),
              baseUrl: WEBVIEW_BASE_URL,
            }}
            style={styles.webview}
            scrollEnabled={false}
            overScrollMode="never"
            bounces={false}
            mixedContentMode="always"
            onMessage={(event: WebViewMessageEvent) => {
              if (event.nativeEvent.data === 'loaded') {
                onViewerLoaded?.();
              }
              if (event.nativeEvent.data === 'error') {
                setHasViewerError(true);
                onViewerError?.();
              }
            }}
          />
        ) : (
          <Text
            style={[
              styles.fallbackText,
              { color: hero?.accent ?? '#275079', fontSize: Math.max(16, size * 0.28) },
            ]}
          >
            {hero?.badge ?? fallbackLabel}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF9',
    borderWidth: 2,
    overflow: 'hidden',
  },
  inner: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },
  fallbackText: {
    fontWeight: '900',
  },
});
