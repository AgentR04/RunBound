import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';

const DROP_STYLES = {
  coin: {
    icon: 'logo-bitcoin',
    iconColor: '#F5C24F',
    ring: 'rgba(245, 194, 79, 0.34)',
    fill: '#30220A',
    border: '#F5C24F',
    glow: 'rgba(245, 194, 79, 0.28)',
  },
  shield: {
    icon: 'shield',
    iconColor: '#67BEFF',
    ring: 'rgba(103, 190, 255, 0.28)',
    fill: '#0F2338',
    border: '#67BEFF',
    glow: 'rgba(103, 190, 255, 0.24)',
  },
  capture_multiplier: {
    icon: 'flash',
    iconColor: '#FF9852',
    ring: 'rgba(255, 152, 82, 0.28)',
    fill: '#341C0C',
    border: '#FF9852',
    glow: 'rgba(255, 152, 82, 0.24)',
  },
  ghost_mode: {
    icon: 'sparkles',
    iconColor: '#D8F4FF',
    ring: 'rgba(216, 244, 255, 0.24)',
    fill: '#122538',
    border: '#D8F4FF',
    glow: 'rgba(216, 244, 255, 0.24)',
    emoji: '👻',
  },
};

function getPalette(type) {
  return DROP_STYLES[type] ?? DROP_STYLES.coin;
}

export default function DropMarker({ drop }) {
  const bob = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(drop.status === 'collecting' ? 1 : 0)).current;
  const palette = useMemo(() => getPalette(drop.type), [drop.type]);

  useEffect(() => {
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1000,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    bobLoop.start();
    pulseLoop.start();

    return () => {
      bobLoop.stop();
      pulseLoop.stop();
    };
  }, [bob, pulse]);

  useEffect(() => {
    if (drop.status === 'collecting') {
      burst.setValue(0);
      Animated.timing(burst, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }).start();
    } else {
      burst.setValue(0);
    }
  }, [burst, drop.status]);

  return (
    <Marker coordinate={drop.coordinate} anchor={{ x: 0.5, y: 0.85 }}>
      <Animated.View
        style={[
          styles.wrapper,
          {
            transform: [
              {
                translateY: bob.interpolate({
                  inputRange: [0, 1],
                  outputRange: [2, -8],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              borderColor: palette.border,
              backgroundColor: palette.ring,
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.24, 0.02],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.22],
                  }),
                },
              ],
            },
          ]}
        />

        {drop.status === 'collecting' ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.burst,
              {
                borderColor: palette.border,
                backgroundColor: palette.glow,
                opacity: burst.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 0],
                }),
                transform: [
                  {
                    scale: burst.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1.8],
                    }),
                  },
                ],
              },
            ]}
          />
        ) : null}

        <Animated.View
          style={[
            styles.marker,
            {
              backgroundColor: palette.fill,
              borderColor: palette.border,
              shadowColor: palette.border,
              opacity: burst.interpolate({
                inputRange: [0, 1],
                outputRange: [1, drop.status === 'collecting' ? 0 : 1],
              }),
              transform: [
                {
                  scale: burst.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, drop.status === 'collecting' ? 0.55 : 1],
                  }),
                },
              ],
            },
          ]}
        >
          {palette.emoji ? (
            <Text style={styles.emoji}>{palette.emoji}</Text>
          ) : (
            <Ionicons name={palette.icon} size={20} color={palette.iconColor} />
          )}
        </Animated.View>
      </Animated.View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 58,
    height: 74,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  ring: {
    position: 'absolute',
    bottom: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  burst: {
    position: 'absolute',
    bottom: 14,
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
  },
  marker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 7,
  },
  emoji: {
    fontSize: 20,
  },
});
