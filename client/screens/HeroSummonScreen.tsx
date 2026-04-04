import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  WebView,
  WebViewMessageEvent,
} from 'react-native-webview';
import type { WebViewErrorEvent } from 'react-native-webview/lib/WebViewTypes';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { getHeroAvatar, HeroAvatarId } from '../config/heroAvatars';
import { buildHeroViewerHtml } from '../utils/heroViewerHtml';
import { notifyHeroSummoned } from '../services/notifications';

type SummonRouteParams = {
  heroId: HeroAvatarId;
  openedAt?: number;
};

export default function HeroSummonScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, SummonRouteParams>, string>>();
  const heroId = route.params?.heroId;
  const openedAt = route.params?.openedAt;
  const hero   = getHeroAvatar(heroId);
  const webViewKey = `${heroId ?? 'unknown'}:${openedAt ?? route.key}`;
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [canDismiss, setCanDismiss] = useState(false);
  const viewerHtml = useMemo(() => {
    if (!hero?.modelUrl) {
      return null;
    }

    return buildHeroViewerHtml(hero.modelUrl, hero.accent);
  }, [hero]);

  useEffect(() => {
    if (!hasLoaded || hasError) {
      setCanDismiss(false);
      return;
    }

    const timer = setTimeout(() => {
      setCanDismiss(true);
    }, 250);

    return () => clearTimeout(timer);
  }, [hasLoaded, hasError]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0b1622', '#122035', '#0b1622']}
        style={StyleSheet.absoluteFill}
      />

      {viewerHtml ? (
        <WebView
          key={webViewKey}
          source={{ html: viewerHtml, baseUrl: Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001' }}
          style={styles.webview}
          originWhitelist={['*']}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          mixedContentMode="always"
          startInLoadingState={false}
          onMessage={(event: WebViewMessageEvent) => {
            if (event.nativeEvent.data === 'loaded') {
              setHasLoaded(true);
              setHasError(false);
              if (hero?.label) {
                notifyHeroSummoned(hero.label);
              }
            }
            if (event.nativeEvent.data === 'error') {
              setHasError(true);
              setHasLoaded(false);
            }
          }}
          onError={(e: WebViewErrorEvent) =>
            console.warn('[3D error]', e.nativeEvent.description)
          }
        />
      ) : null}

      {!hasLoaded && !hasError ? (
        <View style={styles.statusOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#57B8FF" />
          <Text style={styles.statusText}>Loading model...</Text>
        </View>
      ) : null}

      {hasError ? (
        <View style={styles.statusOverlay} pointerEvents="none">
          <Text style={styles.errorTitle}>Model failed to render</Text>
          <Text style={styles.errorText}>The 3D file loaded, but the viewer could not display it.</Text>
        </View>
      ) : null}

      {/* Hero name overlay — pointerEvents none so taps reach WebView */}
      <View style={styles.overlay} pointerEvents="none">
        <Text style={styles.label}>⚡  HERO SUMMONED</Text>
        <Text style={[styles.name, { color: hero?.accent ?? '#57B8FF' }]}>
          {hero?.label ?? 'Unknown Hero'}
        </Text>
        {hasLoaded && !hasError ? (
          <Text style={styles.tapHint}>Tap anywhere to continue</Text>
        ) : null}
      </View>

      {canDismiss ? (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => navigation.goBack()}
          style={styles.tapOverlay}
        />
      ) : null}

      {/* Back button — always tappable */}
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Icon name="chevron-back" size={20} color="#fff" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1622' },
  webview:   { flex: 1 },
  overlay: {
    position: 'absolute',
    bottom: 160, left: 0, right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  name: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  back: {
    position: 'absolute',
    top: 58, left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  backText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  statusText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    fontWeight: '600',
  },
  tapHint: {
    marginTop: 18,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
