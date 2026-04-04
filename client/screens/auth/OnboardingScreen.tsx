import React, { useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Dimensions,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PANELS = [
  {
    id: 'shield',
    eyebrow: 'Avengers Briefing',
    title: 'Claim the city one run at a time',
    body:
      'Track every route like a hero patrol. Each run helps you capture fresh ground and defend the blocks you already own.',
    icon: 'shield-half-outline',
    accent: '#4DA3FF',
    glow: '#D7263D',
    gradient: ['#07111F', '#13294B', '#2C4E80'],
    badge: 'Captain territory mode',
    stats: ['Live map control', 'Path-based claiming', 'Rival pressure'],
  },
  {
    id: 'arc',
    eyebrow: 'Arc Reactor',
    title: 'See your run data in real time',
    body:
      'RunBound turns your movement into a battle console with active distance, movement state, and live territory updates while you move.',
    icon: 'flash-outline',
    accent: '#FFB703',
    glow: '#E63946',
    gradient: ['#190A05', '#4A1206', '#8B2E00'],
    badge: 'Iron run telemetry',
    stats: ['Active run mode', 'Distance feedback', 'Instant updates'],
  },
  {
    id: 'storm',
    eyebrow: 'Thunder Feed',
    title: 'Compete with the leaderboard and live feed',
    body:
      'Stack distance, territory, and momentum against the rest of the city. Every run pushes you higher on the board.',
    icon: 'trophy-outline',
    accent: '#76E4F7',
    glow: '#7B61FF',
    gradient: ['#070B1E', '#1B1F45', '#27377A'],
    badge: 'Storm-powered ranking',
    stats: ['Leaderboard races', 'Feed activity', 'Online rivals'],
  },
  {
    id: 'assemble',
    eyebrow: 'Avengers Assemble',
    title: 'Your squad hub is ready',
    body:
      'Profile, map, run tools, and social screens all work together so you can train, claim, and return stronger every session.',
    icon: 'people-outline',
    accent: '#52FF30',
    glow: '#FFD166',
    gradient: ['#04120A', '#0B3A22', '#165A33'],
    badge: 'Ready for deployment',
    stats: ['Profile progress', 'Map dominance', 'One-tap launch'],
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
            colors={panel.gradient}
            style={styles.page}
          >
            <View
              style={[
                styles.orbLarge,
                styles.orbLargeBase,
                { backgroundColor: panel.accent },
              ]}
            />
            <View
              style={[
                styles.orbSmall,
                styles.orbSmallBase,
                { backgroundColor: panel.glow },
              ]}
            />
            <View
              style={[
                styles.ring,
                {
                  borderColor: `${panel.accent}33`,
                },
              ]}
            />

            <View style={styles.content}>
              <View style={styles.headerBlock}>
                <Text style={[styles.eyebrow, { color: panel.accent }]}>
                  {panel.eyebrow}
                </Text>
                <View
                  style={[
                    styles.iconWrap,
                    {
                      borderColor: panel.accent,
                      shadowColor: panel.accent,
                    },
                  ]}
                >
                  <Ionicons name={panel.icon} size={48} color={panel.accent} />
                </View>
              </View>

              <Text style={styles.title}>{panel.title}</Text>
              <Text style={styles.body}>{panel.body}</Text>

              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: `${panel.accent}22`,
                    borderColor: `${panel.accent}66`,
                  },
                ]}
              >
                <Text style={[styles.badgeText, { color: panel.accent }]}>
                  {panel.badge}
                </Text>
              </View>

              <View style={styles.statGrid}>
                {panel.stats.map(stat => (
                  <View key={stat} style={styles.statChip}>
                    <Ionicons
                      name="sparkles-outline"
                      size={14}
                      color={panel.accent}
                    />
                    <Text style={styles.statText}>{stat}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.panelFooter}>
                <Text style={styles.footerLabel}>Mission focus</Text>
                <Text style={styles.footerCopy}>
                  {panel.id === 'assemble'
                    ? 'Launch your first session and start taking ground.'
                    : 'Swipe or tap the right control to continue the briefing.'}
                </Text>
              </View>
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
            color={currentIndex === 0 ? '#5A6172' : '#F2F5FF'}
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
            colors={[currentPanel.accent, currentPanel.glow]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.navButton}
          >
            <Ionicons
              name={isLastPanel ? 'rocket-outline' : 'chevron-forward'}
              size={24}
              color="#05070D"
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
    backgroundColor: '#05070D',
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    minHeight: '100%',
    overflow: 'hidden',
  },
  orbLarge: {
    position: 'absolute',
  },
  orbLargeBase: {
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -40,
    right: -30,
    opacity: 0.16,
  },
  orbSmall: {
    position: 'absolute',
  },
  orbSmallBase: {
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: 148,
    left: -28,
    opacity: 0.22,
  },
  ring: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1,
    top: 84,
    right: -110,
  },
  content: {
    flex: 1,
    paddingTop: 86,
    paddingHorizontal: 28,
    paddingBottom: 120,
  },
  headerBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.2,
    maxWidth: '58%',
  },
  iconWrap: {
    width: 92,
    height: 92,
    borderRadius: 28,
    borderWidth: 1.5,
    backgroundColor: 'rgba(7, 9, 15, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  title: {
    color: '#F8FBFF',
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '900',
    maxWidth: '88%',
  },
  body: {
    color: '#D2D9E9',
    fontSize: 17,
    lineHeight: 26,
    marginTop: 18,
    maxWidth: '94%',
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 26,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  statGrid: {
    marginTop: 30,
    gap: 12,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(7, 10, 16, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statText: {
    color: '#EFF3FF',
    fontSize: 14,
    fontWeight: '600',
  },
  panelFooter: {
    marginTop: 'auto',
    paddingTop: 34,
  },
  footerLabel: {
    color: '#94A0BA',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  footerCopy: {
    color: '#E7ECFA',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotActive: {
    width: 12,
    height: 12,
  },
  dotInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#AEB7CD',
  },
  navButtonWrap: {
    borderRadius: 24,
  },
  navButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A344D',
    backgroundColor: '#141B2B',
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
});

export default OnboardingScreen;
