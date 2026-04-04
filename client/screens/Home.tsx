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
      accentColors={[`${accent}55`, 'rgba(255,255,255,0.7)']}
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
        colors={['#BEE8FF', '#D8F1FF', '#FFF5E4']}
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
            colors={['#57B8FF']}
            tintColor="#57B8FF"
            progressBackgroundColor="#FFF8EE"
          />
        }
      >
        <GlassPanel
          style={styles.headerShell}
          accentColors={['rgba(255, 208, 122, 0.65)', 'rgba(154, 216, 255, 0.55)']}
        >
          <LinearGradient
            colors={['#FFF8ED', '#FFF1D8']}
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
                  <Ionicons name="diamond" size={12} color="#F2A12D" />
                  <Text style={styles.pointsText}>12,563 war coins</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.headerBell}>
              <Ionicons name="notifications-outline" size={20} color="#6E4D15" />
            </TouchableOpacity>
          </LinearGradient>
        </GlassPanel>

        <GlassPanel
          style={styles.heroShell}
          accentColors={['rgba(121, 208, 255, 0.72)', 'rgba(255, 229, 173, 0.6)']}
        >
          <LinearGradient
            colors={['#FFECC3', '#FFF5DE', '#F1FBFF']}
            style={styles.heroCard}
          >
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Mumbai Command</Text>
            </View>
            <Text style={styles.heroTitle}>Territory Bank</Text>
            <View style={styles.heroValueRow}>
              <Ionicons name="diamond" size={34} color="#57B8FF" />
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
                <Ionicons name="play-outline" size={18} color="#0E4B79" />
                <Text style={styles.actionText}>Start Run</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonPeach]}
                onPress={() => navigation.navigate('Map')}
              >
                <Ionicons name="map-outline" size={18} color="#8A4C0C" />
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
              <TouchableOpacity onPress={() => navigation.navigate('Feed')}>
                <Text style={styles.linkText}>Open feed</Text>
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
    backgroundColor: '#EAF7FF',
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
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  cloudBottom: {
    position: 'absolute',
    bottom: 110,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 34,
    gap: 16,
  },
  headerShell: {
    marginTop: 4,
  },
  headerCard: {
    paddingHorizontal: 16,
    paddingVertical: 18,
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
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFDF9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFD48A',
  },
  avatarCore: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#D7F1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#275079',
    fontSize: 18,
    fontWeight: '900',
  },
  headerName: {
    color: '#543811',
    fontSize: 28,
    fontWeight: '900',
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
    backgroundColor: '#FFF3D4',
  },
  pointsText: {
    color: '#7A5511',
    fontSize: 12,
    fontWeight: '700',
  },
  headerBell: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.74)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroShell: {},
  heroCard: {
    padding: 18,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  heroBadgeText: {
    color: '#9A6C1C',
    fontSize: 11,
    fontWeight: '800',
  },
  heroTitle: {
    marginTop: 18,
    color: '#6C4C14',
    fontSize: 18,
    fontWeight: '700',
  },
  heroValueRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroValue: {
    color: '#29476A',
    fontSize: 48,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: '#7C8CA2',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  actionButton: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonBlue: {
    backgroundColor: '#D9F2FF',
  },
  actionButtonPeach: {
    backgroundColor: '#FFE7BF',
  },
  actionText: {
    color: '#5A4116',
    fontSize: 14,
    fontWeight: '800',
  },
  miniStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniStatShell: {
    flex: 1,
  },
  miniStatCard: {
    minHeight: 120,
    paddingVertical: 16,
    alignItems: 'center',
  },
  miniStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  miniStatLabel: {
    color: '#8C99AE',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  miniStatValue: {
    color: '#2C476B',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 8,
  },
  sectionShell: {},
  sectionCard: {
    padding: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionEyebrow: {
    color: '#7EB8E5',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: '#533A14',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  sectionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E6F7FF',
  },
  sectionChipText: {
    color: '#4E83B0',
    fontSize: 11,
    fontWeight: '700',
  },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2E8D4',
  },
  missionIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionInfo: {
    flex: 1,
  },
  missionTitle: {
    color: '#3B2A11',
    fontSize: 15,
    fontWeight: '800',
  },
  missionSubtitle: {
    color: '#8F9CB0',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  missionReward: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: '#FFF3D5',
  },
  missionRewardText: {
    color: '#8A6117',
    fontSize: 12,
    fontWeight: '800',
  },
  linkText: {
    color: '#4A8CC4',
    fontSize: 12,
    fontWeight: '700',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2E8D4',
  },
  logIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logInfo: {
    flex: 1,
  },
  logTitle: {
    color: '#3B2A11',
    fontSize: 15,
    fontWeight: '800',
  },
  logSubtitle: {
    color: '#8F9CB0',
    fontSize: 12,
    marginTop: 4,
  },
  logArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EAF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
