import { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import GlassPanel from '../components/ui/GlassPanel';
import { useAuth } from '../context/AuthContext';
import { STAT_FONT, TITLE_FONT, UI_FONT } from '../theme/fonts';
import { sendTestNotification } from '../services/notifications';

function MiniStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <GlassPanel
      style={styles.miniStatShell}
      accentColors={[`${accent}66`, 'rgba(103, 230, 255, 0.12)']}
    >
      <View style={styles.miniStatCard}>
        <View style={[styles.miniStatIcon, { backgroundColor: `${accent}20` }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <Text style={styles.miniStatLabel}>{label}</Text>
        <Text style={styles.miniStatValue}>{value}</Text>
      </View>
    </GlassPanel>
  );
}

const Home = ({ navigation }: any) => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const commanderName = useMemo(
    () =>
      user?.user_metadata?.username ??
      user?.email?.split('@')[0] ??
      'Aarav',
    [user],
  );

  const warLog = [
    {
      id: '1',
      title: 'Rohan captured Worli Seaface',
      subtitle: '12 min ago',
      accent: '#FF8B5E',
      icon: 'flame-outline',
    },
    {
      id: '2',
      title: 'Meera defended Dadar Maidan',
      subtitle: '38 min ago',
      accent: '#57B8FF',
      icon: 'shield-checkmark-outline',
    },
    {
      id: '3',
      title: 'Three new routes surfaced near Bandra',
      subtitle: '1 hr ago',
      accent: '#F7B733',
      icon: 'navigate-outline',
    },
  ];

  const missions = [
    {
      id: 'm1',
      title: 'Daily Streak',
      subtitle: 'Run before 10 PM to keep the chain alive',
      reward: '+1.5x XP',
      accent: '#FF8B5E',
    },
    {
      id: 'm2',
      title: 'Marine Drive Loop',
      subtitle: 'Complete a 1 km loop and mint a new blob',
      reward: '+180 coins',
      accent: '#57B8FF',
    },
    {
      id: 'm3',
      title: 'Scout Colaba',
      subtitle: 'Visit two unclaimed territories this evening',
      reward: '+90 intel',
      accent: '#F7B733',
    },
  ];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#081223', '#10203A', '#1A2546']}
        style={styles.background}
      />
      <View style={styles.cloudTop} />
      <View style={styles.cloudBottom} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#67E6FF']}
            tintColor="#67E6FF"
            progressBackgroundColor="#10203A"
          />
        }
      >
        <GlassPanel
          style={styles.headerShell}
          accentColors={['rgba(166, 28, 40, 0.72)', 'rgba(103, 230, 255, 0.34)']}
        >
          <LinearGradient
            colors={['#0D1A31', '#13253D']}
            style={styles.headerCard}
          >
            <View style={styles.headerLeft}>
              <View style={styles.avatarRing}>
                <View style={styles.avatarCore}>
                  <Text style={styles.avatarText}>
                    {commanderName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              </View>
              <View>
                <Text style={styles.headerName}>{commanderName}</Text>
                <View style={styles.pointsPill}>
                  <Ionicons name="diamond" size={12} color="#F5C15D" />
                  <Text style={styles.pointsText}>12,563 war coins</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.headerBell} onPress={sendTestNotification}>
              <Ionicons name="notifications-outline" size={20} color="#F5C15D" />
            </TouchableOpacity>
          </LinearGradient>
        </GlassPanel>

        <GlassPanel
          style={styles.heroShell}
          accentColors={['rgba(103, 230, 255, 0.42)', 'rgba(166, 28, 40, 0.72)']}
        >
          <LinearGradient
            colors={['#101D36', '#142645', '#1D294A']}
            style={styles.heroCard}
          >
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Mumbai Command</Text>
            </View>
            <Text style={styles.heroTitle}>Territory Bank</Text>
            <View style={styles.heroValueRow}>
              <Ionicons name="diamond" size={34} color="#67E6FF" />
              <Text style={styles.heroValue}>100 390</Text>
            </View>
            <Text style={styles.heroSubtitle}>
              Two nearby blobs are ready for capture and your streak bonus is active.
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonBlue]}
                onPress={() => navigation.navigate('Map')}
              >
                <Ionicons name="play-outline" size={18} color="#FFF1D8" />
                <Text style={styles.actionText}>Start Run</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonPeach]}
                onPress={() => navigation.navigate('Map')}
              >
                <Ionicons name="map-outline" size={18} color="#FFF1D8" />
                <Text style={styles.actionText}>View Map</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </GlassPanel>

        <View style={styles.miniStatsRow}>
          <MiniStat
            icon="shield-outline"
            label="Territories"
            value="14"
            accent="#57B8FF"
          />
          <MiniStat
            icon="flame-outline"
            label="Contested"
            value="3"
            accent="#FF8B5E"
          />
          <MiniStat
            icon="navigate-outline"
            label="Nearby"
            value="8"
            accent="#F7B733"
          />
        </View>

        <GlassPanel style={styles.sectionShell}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>Daily Missions</Text>
                <Text style={styles.sectionTitle}>Earn coins every day</Text>
              </View>
              <View style={styles.sectionChip}>
                <Text style={styles.sectionChipText}>Live</Text>
              </View>
            </View>

            {missions.map(item => (
              <View key={item.id} style={styles.missionRow}>
                <View style={[styles.missionIcon, { backgroundColor: `${item.accent}25` }]}>
                  <Ionicons name="sparkles-outline" size={18} color={item.accent} />
                </View>
                <View style={styles.missionInfo}>
                  <Text style={styles.missionTitle}>{item.title}</Text>
                  <Text style={styles.missionSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={styles.missionReward}>
                  <Text style={styles.missionRewardText}>{item.reward}</Text>
                </View>
              </View>
            ))}
          </View>
        </GlassPanel>

        <GlassPanel style={styles.sectionShell}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>War Log</Text>
                <Text style={styles.sectionTitle}>Recent activity</Text>
              </View>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('Feed')}
                accessibilityLabel="Open feed"
              >
                <Ionicons name="arrow-forward" size={16} color="#4A8CC4" />
              </TouchableOpacity>
            </View>

            {warLog.map(item => (
              <View key={item.id} style={styles.logRow}>
                <View style={[styles.logIcon, { backgroundColor: `${item.accent}24` }]}>
                  <Ionicons name={item.icon} size={18} color={item.accent} />
                </View>
                <View style={styles.logInfo}>
                  <Text style={styles.logTitle}>{item.title}</Text>
                  <Text style={styles.logSubtitle}>{item.subtitle}</Text>
                </View>
                <TouchableOpacity style={styles.logArrow}>
                  <Ionicons name="arrow-forward" size={16} color="#57B8FF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </GlassPanel>
      </ScrollView>
    </View>
  );
};

export default Home;

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
    top: 30,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(103, 230, 255, 0.14)',
  },
  cloudBottom: {
    position: 'absolute',
    bottom: 110,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(166, 28, 40, 0.14)',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 26,
    gap: 12,
  },
  headerShell: {
    marginTop: 4,
  },
  headerCard: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#172844',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F5C15D',
  },
  avatarCore: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0C1A30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#E7F7FF',
    fontSize: 15,
    fontWeight: '900',
  },
  headerName: {
    color: '#F5F8FD',
    fontSize: 22,
    fontFamily: TITLE_FONT,
  },
  pointsPill: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 193, 93, 0.16)',
  },
  pointsText: {
    color: '#F5C15D',
    fontSize: 11,
    fontFamily: UI_FONT,
  },
  headerBell: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroShell: {},
  heroCard: {
    padding: 15,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 193, 93, 0.12)',
  },
  heroBadgeText: {
    color: '#F5C15D',
    fontSize: 11,
    fontFamily: UI_FONT,
  },
  heroTitle: {
    marginTop: 14,
    color: '#F4F8FF',
    fontSize: 16,
    fontFamily: TITLE_FONT,
  },
  heroValueRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroValue: {
    color: '#F4FBFF',
    fontSize: 38,
    fontFamily: STAT_FONT,
  },
  heroSubtitle: {
    color: '#A9C0D8',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    fontFamily: UI_FONT,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonBlue: {
    backgroundColor: '#A61C28',
  },
  actionButtonPeach: {
    backgroundColor: '#162944',
    borderWidth: 1,
    borderColor: 'rgba(103, 230, 255, 0.18)',
  },
  actionText: {
    color: '#FFF1D8',
    fontSize: 14,
    fontFamily: UI_FONT,
  },
  miniStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniStatShell: {
    flex: 1,
  },
  miniStatCard: {
    minHeight: 96,
    paddingVertical: 12,
    alignItems: 'center',
  },
  miniStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  miniStatLabel: {
    color: '#8EB5D8',
    fontSize: 11,
    textTransform: 'uppercase',
    fontFamily: UI_FONT,
  },
  miniStatValue: {
    color: '#F3F8FF',
    fontSize: 24,
    marginTop: 6,
    fontFamily: STAT_FONT,
  },
  sectionShell: {},
  sectionCard: {
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionEyebrow: {
    color: '#F5C15D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: UI_FONT,
  },
  sectionTitle: {
    color: '#F4F8FF',
    fontSize: 19,
    marginTop: 2,
    fontFamily: TITLE_FONT,
  },
  sectionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(103, 230, 255, 0.12)',
  },
  sectionChipText: {
    color: '#67E6FF',
    fontSize: 11,
    fontFamily: UI_FONT,
  },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  missionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionInfo: {
    flex: 1,
  },
  missionTitle: {
    color: '#F1F6FC',
    fontSize: 14,
    fontFamily: TITLE_FONT,
  },
  missionSubtitle: {
    color: '#9AB5D1',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
    fontFamily: UI_FONT,
  },
  missionReward: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 193, 93, 0.16)',
  },
  missionRewardText: {
    color: '#F5C15D',
    fontSize: 11,
    fontFamily: UI_FONT,
  },
  linkButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  logIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logInfo: {
    flex: 1,
  },
  logTitle: {
    color: '#F1F6FC',
    fontSize: 14,
    fontFamily: TITLE_FONT,
  },
  logSubtitle: {
    color: '#9AB5D1',
    fontSize: 11,
    marginTop: 3,
    fontFamily: UI_FONT,
  },
  logArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
