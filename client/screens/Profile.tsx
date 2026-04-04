import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import {
  fetchLeaderboard,
  fetchUser,
  upsertUserProfile,
  UserProfile,
} from '../services/api';
import {
  ensureLocalUserProfile,
  getRuns,
  getTerritories,
  getUser,
} from '../utils/storage';
import { TITLE_FONT, UI_FONT } from '../theme/fonts';

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

function buildFallbackProfile(params: {
  id: string;
  username: string;
  email?: string | null;
  color?: string;
  territoriesOwned: number;
  totalDistance: number;
  totalRuns: number;
  totalArea: number;
  createdAt?: Date | string;
}): UserProfile {
  return {
    id: params.id,
    username: params.username,
    color: params.color ?? '#57B8FF',
    territories: Array.from({ length: params.territoriesOwned }, (_, index) => `local-${index}`),
    territoriesOwned: params.territoriesOwned,
    totalRuns: params.totalRuns,
    totalDistance: params.totalDistance,
    totalArea: params.totalArea,
    createdAt:
      params.createdAt instanceof Date
        ? params.createdAt.toISOString()
        : params.createdAt ?? new Date().toISOString(),
  };
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
      if (!currentUserId) {
        setProfile(null);
        setLeaderboard([]);
        setError('No signed-in user found.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const fallbackUsername =
          user?.user_metadata?.username ?? user?.email?.split('@')[0] ?? 'Aarav';
        const localUser = await ensureLocalUserProfile({
          id: currentUserId,
          username: fallbackUsername,
        });
        const [localRuns, localTerritories, storedUser] = await Promise.all([
          getRuns(),
          getTerritories(),
          getUser(),
        ]);
        const ownedLocalTerritories = localTerritories.filter(
          territory => territory.ownerId === currentUserId,
        );
        const userRuns = localRuns.filter(run => run.userId === currentUserId);
        const localProfile = buildFallbackProfile({
          id: currentUserId,
          username: fallbackUsername,
          email: user?.email,
          color: storedUser?.color ?? localUser.color,
          territoriesOwned: Math.max(
            storedUser?.territories.length ?? 0,
            ownedLocalTerritories.length,
          ),
          totalDistance: Math.max(
            storedUser?.totalDistance ?? 0,
            userRuns.reduce((sum, run) => sum + run.distance, 0),
          ),
          totalRuns: Math.max(storedUser?.totalRuns ?? 0, userRuns.length),
          totalArea: Math.max(
            storedUser?.totalArea ?? 0,
            ownedLocalTerritories.reduce((sum, territory) => sum + territory.area, 0),
          ),
          createdAt: storedUser?.createdAt ?? localUser.createdAt,
        });

        await upsertUserProfile({
          id: currentUserId,
          username: fallbackUsername,
          color: storedUser?.color ?? localUser.color,
        }).catch(() => null);

        const [profileResult, leaderboardResult] = await Promise.allSettled([
          fetchUser(currentUserId),
          fetchLeaderboard(),
        ]);

        const profileData =
          profileResult.status === 'fulfilled'
            ? {
                ...localProfile,
                ...profileResult.value,
                territories:
                  profileResult.value.territories ?? localProfile.territories,
                territoriesOwned:
                  profileResult.value.territoriesOwned ??
                  profileResult.value.territories?.length ??
                  localProfile.territoriesOwned,
              }
            : localProfile;

        const leaderData =
          leaderboardResult.status === 'fulfilled' && leaderboardResult.value.length > 0
            ? leaderboardResult.value
            : [localProfile];

        setProfile(profileData);
        setLeaderboard(
          [...leaderData]
            .filter(Boolean)
            .map(leader =>
              leader.id === profileData.id
                ? {
                    ...leader,
                    ...profileData,
                    territoriesOwned:
                      leader.territoriesOwned ?? profileData.territoriesOwned,
                  }
                : leader,
            )
            .sort((left, right) => right.totalDistance - left.totalDistance),
        );
        setError(
          profileResult.status === 'fulfilled'
            ? null
            : 'Showing local profile while the server is unavailable.',
        );
      } catch {
        setError('Could not load profile data.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUserId, user?.email, user?.user_metadata?.username],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
            onRefresh={() => load(true)}
            colors={['#67E6FF']}
            tintColor="#67E6FF"
            progressBackgroundColor="#10203A"
          />
        }
      >
        <GlassPanel
          style={styles.heroShell}
          accentColors={['rgba(166, 28, 40, 0.72)', 'rgba(103, 230, 255, 0.34)']}
        >
          <LinearGradient
            colors={['#0D1A31', '#13253D']}
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
              <TouchableOpacity
                style={styles.signOutButton}
                onPress={signOut}
                accessibilityLabel="Sign out"
              >
                <Icon name="log-out-outline" size={18} color="#FFF1D8" />
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Icon name="warning-outline" size={14} color="#FF8B5E" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => load()}
                  accessibilityLabel="Retry profile load"
                >
                  <Icon name="refresh" size={16} color="#4B89C0" />
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
    backgroundColor: '#081223',
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
    backgroundColor: 'rgba(103, 230, 255, 0.14)',
  },
  cloudBottom: {
    position: 'absolute',
    bottom: 80,
    left: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(166, 28, 40, 0.14)',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 34,
    gap: 16,
  },
  center: {
    flex: 1,
    backgroundColor: '#081223',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#D6E3F2',
    fontSize: 14,
    fontFamily: UI_FONT,
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
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotLive: {
    backgroundColor: '#67E6FF',
  },
  statusDotOffline: {
    backgroundColor: '#FF8B5E',
  },
  statusText: {
    color: '#D9E6F3',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: UI_FONT,
  },
  signOutButton: {
    width: 38,
    height: 38,
    borderRadius: 16,
    backgroundColor: '#A61C28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(166, 28, 40, 0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#F2C0C6',
    fontSize: 13,
    fontFamily: UI_FONT,
  },
  retryButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  profileCenter: {
    alignItems: 'center',
    marginTop: 24,
  },
  avatarOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#172844',
    borderWidth: 2,
    borderColor: '#F5C15D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0C1A30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#E7F7FF',
    fontSize: 28,
    fontFamily: TITLE_FONT,
  },
  rankTitle: {
    color: '#F5C15D',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    marginTop: 14,
    fontFamily: UI_FONT,
  },
  username: {
    color: '#F4F8FF',
    fontSize: 30,
    marginTop: 4,
    fontFamily: TITLE_FONT,
  },
  email: {
    color: '#9AB5D1',
    fontSize: 13,
    marginTop: 4,
    fontFamily: UI_FONT,
  },
  progressSection: {
    marginTop: 22,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: '#9AB5D1',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: UI_FONT,
  },
  progressTrack: {
    marginTop: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#67E6FF',
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
    backgroundColor: 'rgba(103, 230, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    color: '#9AB5D1',
    fontSize: 11,
    textTransform: 'uppercase',
    fontFamily: UI_FONT,
  },
  statValueRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  statValue: {
    color: '#F4F8FF',
    fontSize: 30,
    fontFamily: TITLE_FONT,
  },
  statUnit: {
    color: '#9AB5D1',
    fontSize: 13,
    paddingBottom: 5,
    fontFamily: UI_FONT,
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
    color: '#F5C15D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: UI_FONT,
  },
  sectionTitle: {
    color: '#F4F8FF',
    fontSize: 24,
    marginTop: 2,
    fontFamily: TITLE_FONT,
  },
  sectionMeta: {
    color: '#9AB5D1',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: UI_FONT,
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
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    backgroundColor: 'rgba(103, 230, 255, 0.12)',
  },
  badgeIconMuted: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  badgeText: {
    color: '#F1F6FC',
    fontSize: 14,
    fontFamily: TITLE_FONT,
  },
  badgeTextMuted: {
    color: '#9AB5D1',
    fontFamily: UI_FONT,
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
    fontFamily: UI_FONT,
  },
  leaderAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    backgroundColor: '#172844',
  },
  leaderAvatarText: {
    color: '#E7F7FF',
    fontSize: 18,
    fontFamily: TITLE_FONT,
  },
  podiumName: {
    color: '#F1F6FC',
    fontSize: 14,
    marginTop: 12,
    fontFamily: TITLE_FONT,
  },
  podiumMeta: {
    color: '#9AB5D1',
    fontSize: 11,
    marginTop: 4,
    fontFamily: UI_FONT,
  },
  podiumDistance: {
    color: '#F4F8FF',
    fontSize: 18,
    marginTop: 12,
    fontFamily: TITLE_FONT,
  },
  listWrap: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  leaderRowMe: {
    backgroundColor: 'rgba(103, 230, 255, 0.12)',
  },
  leaderRank: {
    color: '#9AB5D1',
    fontSize: 13,
    fontWeight: '800',
    width: 28,
    fontFamily: UI_FONT,
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
    color: '#F1F6FC',
    fontSize: 14,
    fontFamily: TITLE_FONT,
  },
  leaderSub: {
    color: '#9AB5D1',
    fontSize: 11,
    marginTop: 3,
    fontFamily: UI_FONT,
  },
  leaderDistance: {
    color: '#F4F8FF',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: UI_FONT,
  },
  emptyText: {
    color: '#9AB5D1',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
    fontFamily: UI_FONT,
  },
});
