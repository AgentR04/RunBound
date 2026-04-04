import React, { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import GlassPanel from '../../components/ui/GlassPanel';
import { TITLE_FONT, UI_FONT } from '../../theme/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PANELS = [
  {
    id: 'blob',
    eyebrow: 'Territory Play',
    title: 'Turn any loop into a blob',
    body:
      'Your route does not need a fixed grid. Jog any irregular loop and RunBound turns it into a living territory on the map.',
    icon: 'planet-outline',
    accent: '#57B8FF',
    highlight: '#CBEFFF',
    badge: 'Freeform conquest',
    stats: ['Irregular blobs', 'Overlapping play', 'Loop capture'],
  },
  {
    id: 'run',
    eyebrow: 'Live Tracking',
    title: 'See your run evolve in real time',
    body:
      'Distance, pace, streaks, and capture progress stay visible while you move so every run feels like an active mission.',
    icon: 'pulse-outline',
    accent: '#FF8B5E',
    highlight: '#FFE0D4',
    badge: 'Mission telemetry',
    stats: ['Live stats', 'Anti-cheat checks', 'Progress HUD'],
  },
  {
    id: 'feed',
    eyebrow: 'Social Layer',
    title: 'Compete with the city',
    body:
      'Follow the war log, challenge rival blobs, and climb the leaderboard as more runners move through Mumbai.',
    icon: 'trophy-outline',
    accent: '#F7B733',
    highlight: '#FFF1C9',
    badge: 'Daily rivalry',
    stats: ['Feed updates', 'Leaderboard races', 'Challenge alerts'],
  },
  {
    id: 'ready',
    eyebrow: 'Ready To Launch',
    title: 'Your command room is ready',
    body:
      'Home, map, run center, and profile all work together so you can train, capture ground, and keep your streak alive.',
    icon: 'rocket-outline',
    accent: '#60C676',
    highlight: '#DDF6E3',
    badge: 'Start with your first loop',
    stats: ['Quick start', 'Profile progress', 'Reward system'],
  },
] as const;

interface OnboardingScreenProps {
  onComplete: () => Promise<void>;
}

const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const scrollRef = useRef<ScrollView | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const currentPanel = useMemo(() => PANELS[currentIndex], [currentIndex]);
  const isLastPanel = currentIndex === PANELS.length - 1;

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
    );
    setCurrentIndex(nextIndex);
  };

  const scrollToIndex = (index: number) => {
    scrollRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
    setCurrentIndex(index);
  };

  const handleNext = async () => {
    if (!isLastPanel) {
      scrollToIndex(currentIndex + 1);
      return;
    }

    setSubmitting(true);
    try {
      await onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {PANELS.map(panel => (
          <LinearGradient
            key={panel.id}
            colors={['#081223', '#10203A', '#1A2546']}
            style={styles.page}
          >
            <View style={[styles.orbLarge, { backgroundColor: panel.highlight }]} />
            <View style={styles.orbSmall} />

            <View style={styles.pageInner}>
              <Text style={[styles.pageEyebrow, { color: panel.accent }]}>
                {panel.eyebrow}
              </Text>

              <GlassPanel
                style={styles.heroShell}
                accentColors={['rgba(166, 28, 40, 0.52)', `${panel.accent}66`]}
              >
                <LinearGradient
                  colors={['#0D1A31', '#13253D']}
                  style={styles.heroCard}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: `${panel.accent}16` },
                    ]}
                  >
                    <Ionicons name={panel.icon} size={54} color={panel.accent} />
                  </View>

                  <Text style={styles.title}>{panel.title}</Text>
                  <Text style={styles.body}>{panel.body}</Text>

                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: `${panel.accent}16` },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: panel.accent }]}>
                      {panel.badge}
                    </Text>
                  </View>

                  <View style={styles.statsList}>
                    {panel.stats.map(stat => (
                      <View key={stat} style={styles.statRow}>
                        <View
                          style={[
                            styles.statDot,
                            { backgroundColor: panel.accent },
                          ]}
                        />
                        <Text style={styles.statText}>{stat}</Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </GlassPanel>
            </View>
          </LinearGradient>
        ))}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={() => scrollToIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          style={[
            styles.navButton,
            currentIndex === 0 && styles.navButtonDisabled,
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={currentIndex === 0 ? '#A7B8C9' : '#36506C'}
          />
        </TouchableOpacity>

        <View style={styles.dotsRow}>
          {PANELS.map((panel, index) => (
            <View
              key={panel.id}
              style={[
                styles.dot,
                index === currentIndex
                  ? [styles.dotActive, { backgroundColor: currentPanel.accent }]
                  : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          disabled={submitting}
          style={styles.navButtonWrap}
        >
          <LinearGradient
            colors={['#A61C28', currentPanel.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.navButton}
          >
            <Ionicons
              name={isLastPanel ? 'rocket-outline' : 'chevron-forward'}
              size={24}
              color="#FFF1D8"
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081223',
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    minHeight: '100%',
  },
  orbLarge: {
    position: 'absolute',
    top: -30,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.42,
  },
  orbSmall: {
    position: 'absolute',
    left: -36,
    bottom: 150,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(166, 28, 40, 0.14)',
  },
  pageInner: {
    flex: 1,
    paddingTop: 86,
    paddingHorizontal: 24,
    paddingBottom: 124,
  },
  pageEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 14,
    fontFamily: UI_FONT,
  },
  heroShell: {
    flex: 1,
  },
  heroCard: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 108,
    height: 108,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  title: {
    marginTop: 24,
    color: '#F4F8FF',
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    fontFamily: TITLE_FONT,
  },
  body: {
    marginTop: 12,
    color: '#9AB5D1',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontFamily: UI_FONT,
  },
  badge: {
    marginTop: 22,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: UI_FONT,
  },
  statsList: {
    width: '100%',
    marginTop: 28,
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(103, 230, 255, 0.14)',
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statText: {
    color: '#E7F1FB',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: UI_FONT,
  },
  bottomBar: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButtonWrap: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  navButton: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.55,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    width: 28,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(103, 230, 255, 0.18)',
  },
});

export default OnboardingScreen;
