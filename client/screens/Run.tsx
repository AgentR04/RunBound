import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import GlassPanel from '../components/ui/GlassPanel';
import { TITLE_FONT, UI_FONT } from '../theme/fonts';

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

const Run = ({ navigation }: any) => {
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
  heroCard: {
    paddingHorizontal: 18,
    paddingVertical: 18,
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
    fontFamily: TITLE_FONT,
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
    fontWeight: '900',
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
    fontWeight: '800',
    fontFamily: UI_FONT,
  },
});
