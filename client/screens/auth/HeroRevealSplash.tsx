import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { getHeroAvatar, HeroAvatarId } from '../../config/heroAvatars';
import HeroAvatar from '../../components/avatar/HeroAvatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HeroRevealSplashProps {
  heroId: HeroAvatarId;
  onDone: () => void;
}

export default function HeroRevealSplash({ heroId, onDone }: HeroRevealSplashProps) {
  const hero = getHeroAvatar(heroId);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const [isClosing, setIsClosing] = useState(false);
  const [isViewerReady, setIsViewerReady] = useState(false);

  useEffect(() => {
    // Entry animation sequence
    Animated.sequence([
      // 1. Fade in + scale up the avatar
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // 2. Fade in title
      Animated.timing(titleFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // 3. Fade in subtitle
      Animated.timing(subtitleFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsing glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [fadeAnim, scaleAnim, titleFade, subtitleFade, shimmerAnim, onDone]);

  const handleDismiss = () => {
    if (isClosing || !isViewerReady) {
      return;
    }

    setIsClosing(true);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      onDone();
    });
  };

  const accent = hero?.accent ?? '#5BB7FF';
  const label = hero?.label ?? 'Hero';

  const glowOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0D1B2A', '#1B2838', '#0D1B2A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Accent glow orbs */}
      <Animated.View
        style={[
          styles.glowOrb,
          styles.glowOrbTop,
          { backgroundColor: accent, opacity: glowOpacity },
        ]}
      />
      <Animated.View
        style={[
          styles.glowOrb,
          styles.glowOrbBottom,
          { backgroundColor: accent, opacity: glowOpacity },
        ]}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Outer glow ring */}
        <Animated.View
          style={[
            styles.avatarGlow,
            {
              borderColor: accent,
              opacity: glowOpacity,
            },
          ]}
        />

        {/* 3D Hero Avatar */}
        <View style={styles.avatarContainer}>
          <HeroAvatar
            heroId={heroId}
            size={220}
            use3D
            fallbackText={hero?.badge}
            onViewerLoaded={() => setIsViewerReady(true)}
            onViewerError={() => setIsViewerReady(true)}
          />
        </View>

        {/* Hero name */}
        <Animated.View style={{ opacity: titleFade }}>
          <Text style={[styles.heroName, { color: accent }]}>{label}</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={{ opacity: subtitleFade }}>
          <Text style={styles.tagline}>Your champion has been summoned</Text>
          <Text style={styles.tapHint}>
            {isViewerReady ? 'Tap anywhere to continue' : 'Loading 3D model...'}
          </Text>
          <View style={[styles.accentBar, { backgroundColor: accent }]} />
        </Animated.View>
      </Animated.View>

      {isViewerReady ? (
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleDismiss}
          style={styles.tapOverlay}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 200,
    width: 300,
    height: 300,
  },
  glowOrbTop: {
    top: -80,
    right: -80,
  },
  glowOrbBottom: {
    bottom: -60,
    left: -100,
  },
  avatarContainer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
    backgroundColor: '#1A2A3C',
  },
  avatarGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 2,
    top: '50%',
    left: '50%',
    marginTop: -130 - 40,
    marginLeft: -130,
  },
  heroName: {
    marginTop: 32,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  tagline: {
    marginTop: 12,
    color: '#7B8FA9',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  tapHint: {
    marginTop: 18,
    color: 'rgba(255,255,255,0.58)',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  accentBar: {
    marginTop: 20,
    width: 60,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
  },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
