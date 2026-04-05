import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import GlassPanel from '../components/ui/GlassPanel';
import { STAT_FONT, TITLE_FONT, UI_FONT } from '../theme/fonts';

const RUN_PROGRAMS = [
  {
    id: 'loop',
    title: 'Blob Capture',
    subtitle: 'Complete a loop to mint a fresh territory',
    reward: '+180 coins',
    accent: '#57B8FF',
    icon: 'planet-outline',
  },
  {
    id: 'streak',
    title: 'Streak Saver',
    subtitle: '15 min sweep to protect your daily bonus',
    reward: '+1.5x XP',
    accent: '#FF8B5E',
    icon: 'flame-outline',
  },
  {
    id: 'raid',
    title: 'Enemy Raid',
    subtitle: 'Challenge a nearby rival blob in Mumbai',
    reward: '+240 XP',
    accent: '#F7B733',
    icon: 'flash-outline',
  },
];

const SPEED_PRESETS = [
  { id: 'easy', label: 'Easy', kmh: 8, color: '#57B8FF' },
  { id: 'tempo', label: 'Tempo', kmh: 12, color: '#F7B733' },
  { id: 'sprint', label: 'Sprint', kmh: 16, color: '#FF8B5E' },
] as const;

const RUN_DURATION_SECONDS = 60;
const TRACK_WIDTH = 280;
const TRACK_HEIGHT = 170;
const TRACK_RADIUS = TRACK_HEIGHT / 2;
const TRACK_LAP_METERS = 400;
const RUNNER_SIZE = 14;

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
    .toString()
    .padStart(2, '0')}`;
}

function calculateScore(speedKmh: number, elapsedSeconds: number, distanceKm: number) {
  const speedScore = Math.round(speedKmh * 18);
  const timeScore = Math.round(elapsedSeconds * 3);
  const distanceScore = Math.round(distanceKm * 280);
  return speedScore + timeScore + distanceScore;
}

function getTrackPosition(progress: number) {
  const normalizedProgress = ((progress % 1) + 1) % 1;
  const straightLength = TRACK_WIDTH - TRACK_RADIUS * 2;
  const arcLength = Math.PI * TRACK_RADIUS;
  const totalLength = straightLength * 2 + arcLength * 2;
  const distanceOnTrack = normalizedProgress * totalLength;

  if (distanceOnTrack <= straightLength) {
    return { x: TRACK_RADIUS + distanceOnTrack, y: 0 };
  }

  if (distanceOnTrack <= straightLength + arcLength) {
    const arcProgress = (distanceOnTrack - straightLength) / arcLength;
    const angle = -Math.PI / 2 + Math.PI * arcProgress;
    const centerX = TRACK_WIDTH - TRACK_RADIUS;
    return {
      x: centerX + TRACK_RADIUS * Math.cos(angle),
      y: TRACK_RADIUS + TRACK_RADIUS * Math.sin(angle),
    };
  }

  if (distanceOnTrack <= straightLength * 2 + arcLength) {
    const bottomProgress = distanceOnTrack - (straightLength + arcLength);
    return { x: TRACK_WIDTH - TRACK_RADIUS - bottomProgress, y: TRACK_HEIGHT };
  }

  const leftArcProgress =
    (distanceOnTrack - (straightLength * 2 + arcLength)) / arcLength;
  const leftAngle = Math.PI / 2 + Math.PI * leftArcProgress;
  return {
    x: TRACK_RADIUS + TRACK_RADIUS * Math.cos(leftAngle),
    y: TRACK_RADIUS + TRACK_RADIUS * Math.sin(leftAngle),
  };
}

const Run = ({ navigation }: any) => {
  const [selectedSpeedId, setSelectedSpeedId] =
    useState<(typeof SPEED_PRESETS)[number]['id']>('tempo');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const selectedSpeed =
    SPEED_PRESETS.find(preset => preset.id === selectedSpeedId) ?? SPEED_PRESETS[1];
  const distanceKm = useMemo(
    () => (selectedSpeed.kmh * elapsedSeconds) / 3600,
    [selectedSpeed.kmh, elapsedSeconds],
  );
  const liveScore = useMemo(
    () => calculateScore(selectedSpeed.kmh, elapsedSeconds, distanceKm),
    [selectedSpeed.kmh, elapsedSeconds, distanceKm],
  );
  const lapProgress = useMemo(
    () => ((distanceKm * 1000) % TRACK_LAP_METERS) / TRACK_LAP_METERS,
    [distanceKm],
  );
  const runnerPosition = useMemo(() => getTrackPosition(lapProgress), [lapProgress]);
  const runProgressPercent = Math.round(
    (elapsedSeconds / RUN_DURATION_SECONDS) * 100,
  );

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds(previous => previous + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning || elapsedSeconds < RUN_DURATION_SECONDS) {
      return;
    }

    const cappedDistance = (selectedSpeed.kmh * RUN_DURATION_SECONDS) / 3600;
    const scoreAtFinish = calculateScore(
      selectedSpeed.kmh,
      RUN_DURATION_SECONDS,
      cappedDistance,
    );
    setFinalScore(scoreAtFinish);
    setIsRunning(false);
  }, [elapsedSeconds, isRunning, selectedSpeed.kmh]);

  const handleStartRun = () => {
    setElapsedSeconds(0);
    setFinalScore(null);
    setIsRunning(true);
  };

  const handleStopRun = () => {
    setFinalScore(liveScore);
    setIsRunning(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#081223', '#10203A', '#1A2546']}
        style={styles.background}
      />
      <View style={styles.cloudTop} />
      <View style={styles.cloudBottom} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <GlassPanel
          style={styles.heroShell}
          accentColors={['rgba(166, 28, 40, 0.72)', 'rgba(103, 230, 255, 0.34)']}
        >
          <LinearGradient
            colors={['#0D1A31', '#13253D']}
            style={styles.heroCard}
          >
            <Text style={styles.heroEyebrow}>Run Center</Text>
            <Text style={styles.heroTitle}>Choose your next mission</Text>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>2.4 km</Text>
                <Text style={styles.heroStatLabel}>Today</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>4</Text>
                <Text style={styles.heroStatLabel}>Nearby blobs</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Map')}
            >
              <Ionicons name="play" size={18} color="#FFF1D8" />
              <Text style={styles.primaryButtonText}>Open Map & Start</Text>
            </TouchableOpacity>
          </LinearGradient>
        </GlassPanel>

        <GlassPanel
          style={styles.simShell}
          accentColors={['rgba(87, 184, 255, 0.55)', 'rgba(245, 193, 93, 0.34)']}
        >
          <LinearGradient colors={['#0E1B34', '#12253F']} style={styles.simCard}>
            <Text style={styles.simEyebrow}>Mock Track Simulation</Text>
            <Text style={styles.simTitle}>Start run and score by speed + time</Text>

            <View style={styles.speedRow}>
              {SPEED_PRESETS.map(preset => (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.speedChip,
                    selectedSpeedId === preset.id && styles.speedChipActive,
                  ]}
                  onPress={() => !isRunning && setSelectedSpeedId(preset.id)}
                  disabled={isRunning}
                >
                  <View
                    style={[
                      styles.speedDot,
                      preset.id === 'easy' && styles.speedDotEasy,
                      preset.id === 'tempo' && styles.speedDotTempo,
                      preset.id === 'sprint' && styles.speedDotSprint,
                    ]}
                  />
                  <Text style={styles.speedChipText}>
                    {preset.label} ({preset.kmh} km/h)
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.trackWrapper}>
              <View style={styles.trackLane}>
                <View
                  style={[
                    styles.runner,
                    {
                      left: runnerPosition.x - RUNNER_SIZE / 2,
                      top: runnerPosition.y - RUNNER_SIZE / 2,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.simStatsRow}>
              <View style={styles.simStat}>
                <Text style={styles.simStatValue}>{formatClock(elapsedSeconds)}</Text>
                <Text style={styles.simStatLabel}>Time</Text>
              </View>
              <View style={styles.simStat}>
                <Text style={styles.simStatValue}>{selectedSpeed.kmh.toFixed(0)}</Text>
                <Text style={styles.simStatLabel}>Speed km/h</Text>
              </View>
              <View style={styles.simStat}>
                <Text style={styles.simStatValue}>{distanceKm.toFixed(2)}</Text>
                <Text style={styles.simStatLabel}>Distance km</Text>
              </View>
            </View>

            <View style={styles.scorePanel}>
              <Text style={styles.scoreLabel}>Live Score</Text>
              <Text style={styles.scoreValue}>{liveScore}</Text>
              <Text style={styles.scoreHint}>
                Progress: {Math.min(runProgressPercent, 100)}% of 60s run
              </Text>
              {finalScore !== null && (
                <Text style={styles.finalScoreText}>Final Score: {finalScore}</Text>
              )}
            </View>

            {isRunning ? (
              <TouchableOpacity style={styles.stopRunButton} onPress={handleStopRun}>
                <Ionicons name="stop" size={18} color="#FFF1D8" />
                <Text style={styles.primaryButtonText}>Stop Run</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.startRunButton} onPress={handleStartRun}>
                <Ionicons name="play" size={18} color="#FFF1D8" />
                <Text style={styles.primaryButtonText}>Start Run</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </GlassPanel>

        <Text style={styles.sectionTitle}>Mission Queue</Text>

        {RUN_PROGRAMS.map(program => (
          <GlassPanel
            key={program.id}
            style={styles.programShell}
            accentColors={[`${program.accent}55`, 'rgba(255,255,255,0.78)']}
          >
            <View style={styles.programCard}>
              <View style={[styles.programIcon, { backgroundColor: `${program.accent}18` }]}>
                <Ionicons name={program.icon} size={20} color={program.accent} />
              </View>
              <View style={styles.programInfo}>
                <Text style={styles.programTitle}>{program.title}</Text>
                <Text style={styles.programSubtitle}>{program.subtitle}</Text>
              </View>
              <View style={styles.programReward}>
                <Text style={styles.programRewardText}>{program.reward}</Text>
              </View>
            </View>
          </GlassPanel>
        ))}
      </ScrollView>
    </View>
  );
};

export default Run;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081223',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  cloudTop: {
    position: 'absolute',
    top: 24,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(103, 230, 255, 0.14)',
  },
  cloudBottom: {
    position: 'absolute',
    bottom: 100,
    left: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(166, 28, 40, 0.14)',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
  },
  heroShell: {
    marginBottom: 18,
  },
  simShell: {
    marginBottom: 18,
  },
  heroCard: {
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  simCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  simEyebrow: {
    color: '#67E6FF',
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: UI_FONT,
  },
  simTitle: {
    marginTop: 6,
    color: '#F4F8FF',
    fontSize: 21,
    fontFamily: TITLE_FONT,
  },
  speedRow: {
    marginTop: 14,
    gap: 8,
  },
  speedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(103, 230, 255, 0.24)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  speedChipActive: {
    borderColor: '#F5C15D',
    backgroundColor: 'rgba(245, 193, 93, 0.14)',
  },
  speedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  speedDotEasy: {
    backgroundColor: '#57B8FF',
  },
  speedDotTempo: {
    backgroundColor: '#F7B733',
  },
  speedDotSprint: {
    backgroundColor: '#FF8B5E',
  },
  speedChipText: {
    color: '#E8F1FF',
    fontSize: 13,
    fontFamily: UI_FONT,
  },
  trackWrapper: {
    marginTop: 16,
    alignItems: 'center',
  },
  trackLane: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_RADIUS,
    borderWidth: 7,
    borderColor: 'rgba(103, 230, 255, 0.6)',
    backgroundColor: 'rgba(8, 18, 35, 0.72)',
    overflow: 'hidden',
  },
  runner: {
    position: 'absolute',
    width: RUNNER_SIZE,
    height: RUNNER_SIZE,
    borderRadius: RUNNER_SIZE / 2,
    backgroundColor: '#F5C15D',
    borderWidth: 2,
    borderColor: '#FFF1D8',
    shadowColor: '#F5C15D',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  simStatsRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  simStat: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  simStatValue: {
    color: '#F3F8FF',
    fontSize: 18,
    fontFamily: STAT_FONT,
  },
  simStatLabel: {
    marginTop: 3,
    color: '#9AB5D1',
    fontSize: 11,
    fontFamily: UI_FONT,
  },
  scorePanel: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(166, 28, 40, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(215, 75, 91, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scoreLabel: {
    color: '#F3C96A',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: UI_FONT,
  },
  scoreValue: {
    marginTop: 2,
    color: '#FFF1D8',
    fontSize: 28,
    fontFamily: STAT_FONT,
  },
  scoreHint: {
    color: '#D8E5F3',
    fontSize: 12,
    fontFamily: UI_FONT,
  },
  finalScoreText: {
    marginTop: 6,
    color: '#67E6FF',
    fontSize: 13,
    fontFamily: UI_FONT,
  },
  startRunButton: {
    marginTop: 12,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#A61C28',
    borderWidth: 1,
    borderColor: '#D74B5B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stopRunButton: {
    marginTop: 12,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#20334F',
    borderWidth: 1,
    borderColor: '#57B8FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroEyebrow: {
    color: '#F5C15D',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: UI_FONT,
  },
  heroTitle: {
    marginTop: 6,
    color: '#F4F8FF',
    fontSize: 29,
    fontFamily: TITLE_FONT,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    marginBottom: 16,
  },
  heroStat: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(103, 230, 255, 0.12)',
  },
  heroStatValue: {
    color: '#F3F8FF',
    fontSize: 22,
    fontFamily: STAT_FONT,
  },
  heroStatLabel: {
    marginTop: 2,
    color: '#9AB5D1',
    fontSize: 12,
    fontFamily: UI_FONT,
  },
  primaryButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#A61C28',
    borderWidth: 1,
    borderColor: '#D74B5B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFF1D8',
    fontSize: 15,
    fontFamily: UI_FONT,
  },
  sectionTitle: {
    color: '#F5C15D',
    fontSize: 18,
    marginBottom: 10,
    fontFamily: TITLE_FONT,
  },
  programShell: {
    marginBottom: 12,
  },
  programCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  programIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programInfo: {
    flex: 1,
  },
  programTitle: {
    color: '#F1F6FC',
    fontSize: 16,
    fontFamily: TITLE_FONT,
  },
  programSubtitle: {
    marginTop: 4,
    color: '#9AB5D1',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: UI_FONT,
  },
  programReward: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(245, 193, 93, 0.16)',
  },
  programRewardText: {
    color: '#F5C15D',
    fontSize: 12,
    fontFamily: UI_FONT,
  },
});
