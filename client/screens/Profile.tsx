import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import GlassPanel from '../components/ui/GlassPanel';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { fetchLeaderboard, fetchUser, UserProfile } from '../services/api';

function StatTile({
  icon,
  label,
  value,
  unit,
}: {
  icon: string;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <GlassPanel style={styles.statShell}>
      <View style={styles.statCard}>
        <View style={styles.statIconWrap}>
          <Icon name={icon} size={18} color="#57B8FF" />
        </View>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={styles.statValueRow}>
          <Text style={styles.statValue}>{value}</Text>
          {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
        </View>
      </View>
    </GlassPanel>
  );
}

function LeaderCard({
  user,
  rank,
  isMe,
}: {
  user: UserProfile;
  rank: number;
  isMe: boolean;
}) {
  const accent = rank === 1 ? '#F7B733' : rank === 2 ? '#57B8FF' : '#FF8B5E';

  return (
    <GlassPanel
      style={styles.podiumShell}
      accentColors={[`${accent}55`, 'rgba(255,255,255,0.75)']}
    >
      <View style={styles.podiumCard}>
        <View style={[styles.rankBubble, { backgroundColor: `${accent}25` }]}>
          <Text style={[styles.rankBubbleText, { color: accent }]}>#{rank}</Text>
        </View>
        <View style={[styles.leaderAvatar, { borderColor: accent }]}>
          <Text style={styles.leaderAvatarText}>
            {user.username.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.podiumName} numberOfLines={1}>
          {user.username}
          {isMe ? ' (you)' : ''}
        </Text>
        <Text style={styles.podiumMeta}>
          {(user.territoriesOwned ?? user.territories?.length ?? 0).toString()} blobs
        </Text>
        <Text style={styles.podiumDistance}>{user.totalDistance.toFixed(1)} km</Text>
      </View>
    </GlassPanel>
  );
}

const Profile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, onlineUsers } = useSocket();
  const { user, signOut } = useAuth();
  const currentUserId = user?.id ?? '';

  const load = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const [profileData, leaderData] = await Promise.all([
          fetchUser(currentUserId),
          fetchLeaderboard(),
        ]);

        setProfile(profileData);
        setLeaderboard(
          leaderData.sort((left, right) => right.totalDistance - left.totalDistance),
        );
      } catch {
        setError('Could not load profile. Is the server running?');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUserId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const username =
    profile?.username ??
    user?.user_metadata?.username ??
    user?.email?.split('@')[0] ??
    'Aarav';
  const territoriesOwned =
    profile?.territoriesOwned ?? profile?.territories?.length ?? 0;
  const totalDistance = (profile?.totalDistance ?? 0).toFixed(1);
  const totalRuns = (profile?.totalRuns ?? 0).toString();
  const totalArea = Math.round((profile?.totalArea ?? 0) * 1_000_000).toLocaleString();
  const rankTitle = useMemo(() => {
    if (territoriesOwned >= 50) return 'Overlord';
    if (territoriesOwned >= 20) return 'Warlord';
    if (territoriesOwned >= 8) return 'Captain';
    return 'Scout';
  }, [territoriesOwned]);
  const badgeWall = [
    { id: 'b1', label: 'First Capture', unlocked: territoriesOwned >= 1 },
    { id: 'b2', label: '10km Club', unlocked: Number(totalDistance) >= 10 },
    { id: 'b3', label: 'Warlord', unlocked: territoriesOwned >= 20 },
    { id: 'b4', label: 'Speed Demon', unlocked: Number(totalDistance) >= 50 },
  ];
  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#57B8FF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#BDE8FF', '#EAF7FF', '#FFF4E2']}
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
            onRefresh={() => load(true)}
            colors={['#57B8FF']}
            tintColor="#57B8FF"
            progressBackgroundColor="#FFF8EE"
          />
        }
      >
        <GlassPanel
          style={styles.heroShell}
          accentColors={['rgba(255, 208, 122, 0.7)', 'rgba(143, 221, 255, 0.52)']}
        >
          <LinearGradient
            colors={['#FFF7EA', '#FFF1D8']}
            style={styles.heroCard}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.statusPill}>
                <View
                  style={[
                    styles.statusDot,
                    isConnected ? styles.statusDotLive : styles.statusDotOffline,
                  ]}
                />
                <Text style={styles.statusText}>
                  {isConnected ? `${onlineUsers} online` : 'Offline'}
                </Text>
              </View>
              <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
                <Icon name="log-out-outline" size={16} color="#8A4C0C" />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Icon name="warning-outline" size={14} color="#FF8B5E" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => load()}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.profileCenter}>
              <View style={styles.avatarOuter}>
                <View style={styles.avatarInner}>
                  <Text style={styles.avatarText}>
                    {username.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.rankTitle}>{rankTitle}</Text>
              <Text style={styles.username}>{username}</Text>
              <Text style={styles.email}>{user?.email}</Text>
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressLabel}>
                  LVL {Math.max(1, Math.floor(territoriesOwned / 5) + 1)}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(((territoriesOwned % 10) / 10) * 100, 8)}%` },
                  ]}
                />
              </View>
            </View>
          </LinearGradient>
        </GlassPanel>

        <View style={styles.statsGrid}>
          <StatTile icon="footsteps-outline" label="Distance" value={totalDistance} unit="km" />
          <StatTile icon="shield-outline" label="Territories" value={territoriesOwned.toString()} />
          <StatTile icon="walk-outline" label="Runs" value={totalRuns} />
          <StatTile icon="map-outline" label="Area Owned" value={totalArea} unit="m²" />
        </View>

        <GlassPanel style={styles.sectionShell}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>Badge Wall</Text>
                <Text style={styles.sectionTitle}>Profile milestones</Text>
              </View>
              <Text style={styles.sectionMeta}>
                {badgeWall.filter(item => item.unlocked).length}/4
              </Text>
            </View>

            <View style={styles.badgeGrid}>
              {badgeWall.map(item => (
                <View
                  key={item.id}
                  style={[styles.badgeCard, !item.unlocked && styles.badgeCardLocked]}
                >
                  <View
                    style={[
                      styles.badgeIcon,
                      item.unlocked ? styles.badgeIconLive : styles.badgeIconMuted,
                    ]}
                  >
                    <Icon
                      name={item.unlocked ? 'ribbon-outline' : 'lock-closed-outline'}
                      size={18}
                      color={item.unlocked ? '#57B8FF' : '#93A1B5'}
                    />
                  </View>
                  <Text style={[styles.badgeText, !item.unlocked && styles.badgeTextMuted]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </GlassPanel>

        <GlassPanel style={styles.sectionShell}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>Leaderboard</Text>
                <Text style={styles.sectionTitle}>Mumbai circuit</Text>
              </View>
              <Text style={styles.sectionMeta}>Weekly</Text>
            </View>

            <View style={styles.podiumRow}>
              {topThree.map((leader, index) => (
                <LeaderCard
                  key={leader.id}
                  user={leader}
                  rank={index + 1}
                  isMe={leader.id === currentUserId}
                />
              ))}
            </View>

            <View style={styles.listWrap}>
              {rest.length === 0 ? (
                <Text style={styles.emptyText}>No other commanders yet.</Text>
              ) : (
                rest.map((leader, index) => (
                  <View
                    key={leader.id}
                    style={[
                      styles.leaderRow,
                      leader.id === currentUserId && styles.leaderRowMe,
                    ]}
                  >
                    <Text style={styles.leaderRank}>#{index + 4}</Text>
                    <View style={[styles.leaderDot, { backgroundColor: leader.color }]} />
                    <View style={styles.leaderInfo}>
                      <Text style={styles.leaderName}>
                        {leader.username}
                        {leader.id === currentUserId ? ' (you)' : ''}
                      </Text>
                      <Text style={styles.leaderSub}>
                        {(leader.territoriesOwned ?? leader.territories?.length ?? 0).toString()} territories
                      </Text>
                    </View>
                    <Text style={styles.leaderDistance}>
                      {leader.totalDistance.toFixed(1)} km
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </GlassPanel>
      </ScrollView>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EAF7FF',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  cloudTop: {
    position: 'absolute',
    top: 20,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  cloudBottom: {
    position: 'absolute',
    bottom: 80,
    left: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 34,
    gap: 16,
  },
  center: {
    flex: 1,
    backgroundColor: '#EAF7FF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#8C99AE',
    fontSize: 14,
  },
  heroShell: {
    marginTop: 4,
  },
  heroCard: {
    padding: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFF9EF',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotLive: {
    backgroundColor: '#57B8FF',
  },
  statusDotOffline: {
    backgroundColor: '#FF8B5E',
  },
  statusText: {
    color: '#7F5B1D',
    fontSize: 12,
    fontWeight: '700',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFE6BF',
  },
  signOutText: {
    color: '#8A4C0C',
    fontSize: 12,
    fontWeight: '800',
  },
  errorBanner: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFF0E9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#B25730',
    fontSize: 13,
  },
  retryText: {
    color: '#4B89C0',
    fontSize: 13,
    fontWeight: '700',
  },
  profileCenter: {
    alignItems: 'center',
    marginTop: 24,
  },
  avatarOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF9EF',
    borderWidth: 2,
    borderColor: '#FFD48A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D9F2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#2A4D74',
    fontSize: 28,
    fontWeight: '900',
  },
  rankTitle: {
    color: '#C28320',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    marginTop: 14,
  },
  username: {
    color: '#543811',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 4,
  },
  email: {
    color: '#91A0B3',
    fontSize: 13,
    marginTop: 4,
  },
  progressSection: {
    marginTop: 22,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFF8EE',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: '#7F90A8',
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    marginTop: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E1EEF8',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#57B8FF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statShell: {
    width: '48.5%',
  },
  statCard: {
    minHeight: 126,
    padding: 16,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E8F6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    color: '#91A0B3',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  statValueRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  statValue: {
    color: '#2B476B',
    fontSize: 30,
    fontWeight: '900',
  },
  statUnit: {
    color: '#8C99AE',
    fontSize: 13,
    paddingBottom: 5,
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
    color: '#543811',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  sectionMeta: {
    color: '#8C99AE',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeCard: {
    width: '48.5%',
    minHeight: 104,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFF9EF',
  },
  badgeCardLocked: {
    opacity: 0.65,
  },
  badgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  badgeIconLive: {
    backgroundColor: '#E8F6FF',
  },
  badgeIconMuted: {
    backgroundColor: '#F1F2F4',
  },
  badgeText: {
    color: '#3B2A11',
    fontSize: 14,
    fontWeight: '800',
  },
  badgeTextMuted: {
    color: '#8C99AE',
  },
  podiumRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  podiumShell: {
    flex: 1,
  },
  podiumCard: {
    minHeight: 182,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  rankBubble: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  rankBubbleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  leaderAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    backgroundColor: '#FFFDF8',
  },
  leaderAvatarText: {
    color: '#2A4D74',
    fontSize: 18,
    fontWeight: '900',
  },
  podiumName: {
    color: '#3B2A11',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
  },
  podiumMeta: {
    color: '#8C99AE',
    fontSize: 11,
    marginTop: 4,
  },
  podiumDistance: {
    color: '#2B476B',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12,
  },
  listWrap: {
    borderRadius: 20,
    backgroundColor: '#FFF9EF',
    overflow: 'hidden',
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2E8D4',
  },
  leaderRowMe: {
    backgroundColor: '#E8F6FF',
  },
  leaderRank: {
    color: '#8C99AE',
    fontSize: 13,
    fontWeight: '800',
    width: 28,
  },
  leaderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    color: '#3B2A11',
    fontSize: 14,
    fontWeight: '800',
  },
  leaderSub: {
    color: '#8C99AE',
    fontSize: 11,
    marginTop: 3,
  },
  leaderDistance: {
    color: '#2B476B',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyText: {
    color: '#8C99AE',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
