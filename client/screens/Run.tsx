import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import GlassPanel from '../components/ui/GlassPanel';

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
        colors={['#BDE8FF', '#EAF7FF', '#FFF4E2']}
        style={styles.background}
      />
      <View style={styles.cloudTop} />
      <View style={styles.cloudBottom} />

      <View style={styles.content}>
        <GlassPanel
          style={styles.heroShell}
          accentColors={['rgba(255, 208, 122, 0.7)', 'rgba(143, 221, 255, 0.55)']}
        >
          <LinearGradient
            colors={['#FFF8EE', '#FFF1DA']}
            style={styles.heroCard}
          >
            <Text style={styles.heroEyebrow}>Run Center</Text>
            <Text style={styles.heroTitle}>Choose your next mission</Text>
            <Text style={styles.heroCopy}>
              Launch a quick run, protect your streak, or open the live map and scout
              fresh blobs around Mumbai.
            </Text>

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
              <Ionicons name="play" size={18} color="#0B4A78" />
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

        <GlassPanel style={styles.tipShell}>
          <View style={styles.tipCard}>
            <Ionicons name="bulb-outline" size={18} color="#F2A12D" />
            <Text style={styles.tipText}>
              Best capture window tonight: Marine Drive, Bandra Fort, and Shivaji Park.
            </Text>
          </View>
        </GlassPanel>
      </View>
    </View>
  );
};

export default Run;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF7FF',
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
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  cloudBottom: {
    position: 'absolute',
    bottom: 100,
    left: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  content: {
    flex: 1,
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
    color: '#D59017',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  heroTitle: {
    marginTop: 6,
    color: '#46300F',
    fontSize: 29,
    fontWeight: '900',
  },
  heroCopy: {
    marginTop: 8,
    color: '#6E88A4',
    fontSize: 14,
    lineHeight: 21,
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
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  heroStatValue: {
    color: '#223B57',
    fontSize: 22,
    fontWeight: '900',
  },
  heroStatLabel: {
    marginTop: 2,
    color: '#738CAB',
    fontSize: 12,
  },
  primaryButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#AEE4FF',
    borderWidth: 1,
    borderColor: '#D7F1FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#0B4A78',
    fontSize: 15,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#37516E',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
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
    color: '#223B57',
    fontSize: 16,
    fontWeight: '800',
  },
  programSubtitle: {
    marginTop: 4,
    color: '#738CAA',
    fontSize: 13,
    lineHeight: 19,
  },
  programReward: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFF6E7',
  },
  programRewardText: {
    color: '#B77810',
    fontSize: 12,
    fontWeight: '800',
  },
  tipShell: {
    marginTop: 'auto',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  tipText: {
    flex: 1,
    color: '#6B85A3',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});
