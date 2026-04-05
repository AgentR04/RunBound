import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function AnimatedChip({ style, title, copy }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.chip,
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.chipTitle}>{title}</Text>
      <Text style={styles.chipCopy}>{copy}</Text>
    </Animated.View>
  );
}

export default function DropsHUD({
  dropsCollected,
  coinsCollected,
  multiplierValue,
  multiplierRemainingMs,
  ghostRemainingMs,
  flashKey = 0,
  topOffset = 168,
}) {
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!flashKey) {
      return;
    }

    flash.setValue(0);
    Animated.sequence([
      Animated.timing(flash, {
        toValue: 1,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(flash, {
        toValue: 0,
        duration: 260,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [flash, flashKey]);

  return (
    <View style={[styles.container, { top: topOffset }]} pointerEvents="box-none">
      <View style={styles.counterCard}>
        <Text style={styles.eyebrow}>Drops Collected</Text>
        <View style={styles.counterRow}>
          <Text style={styles.counterValue}>{dropsCollected}</Text>
          <Text style={styles.coinValue}>+{coinsCollected} coins</Text>
        </View>
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.flashOverlay,
          {
            opacity: flash.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.9],
            }),
          },
        ]}
      />

      <View style={styles.chipsRow}>
        {multiplierValue ? (
          <AnimatedChip
            style={styles.multiplierChip}
            title={`⚡ x${multiplierValue}`}
            copy={`${formatRemaining(multiplierRemainingMs)} remaining`}
          />
        ) : null}

        {ghostRemainingMs > 0 ? (
          <AnimatedChip
            style={styles.ghostChip}
            title="👻 Ghost"
            copy={formatRemaining(ghostRemainingMs)}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 168,
    left: 16,
    right: 16,
  },
  counterCard: {
    alignSelf: 'flex-start',
    minWidth: 148,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(7, 20, 36, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(41, 240, 215, 0.24)',
  },
  eyebrow: {
    color: '#8BA6C3',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  counterRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  counterValue: {
    color: '#F6FBFF',
    fontSize: 26,
    fontWeight: '900',
  },
  coinValue: {
    color: '#F5C24F',
    fontSize: 13,
    fontWeight: '800',
  },
  flashOverlay: {
    position: 'absolute',
    top: -6,
    left: -8,
    right: -8,
    bottom: -10,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 188, 92, 0.22)',
  },
  chipsRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  multiplierChip: {
    backgroundColor: 'rgba(255, 152, 82, 0.18)',
    borderColor: 'rgba(255, 152, 82, 0.36)',
  },
  ghostChip: {
    backgroundColor: 'rgba(197, 233, 255, 0.18)',
    borderColor: 'rgba(197, 233, 255, 0.34)',
  },
  chipTitle: {
    color: '#F5F9FD',
    fontSize: 12,
    fontWeight: '900',
  },
  chipCopy: {
    color: '#AAC1D7',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
