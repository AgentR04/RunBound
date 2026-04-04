import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSocket } from '../context/SocketContext';
import { fetchLeaderboard, fetchUser, UserProfile } from '../services/api';
import { MOCK_USER } from '../types/game';

const CURRENT_USER_ID = MOCK_USER.id;

function StatCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: string;
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Icon name={icon} size={18} color="#52FF30" />
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        {unit && <Text style={styles.statUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

function LeaderboardRow({
  user,
  rank,
  isMe,
}: {
  user: UserProfile;
  rank: number;
  isMe: boolean;
}) {
  const rankColor =
    rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#666';

  return (
    <View style={[styles.leaderRow, isMe && styles.leaderRowMe]}>
      <Text style={[styles.leaderRank, { color: rankColor }]}>
        {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
      </Text>
      <View style={[styles.leaderDot, { backgroundColor: user.color }]} />
      <View style={styles.leaderInfo}>
        <Text style={[styles.leaderName, isMe && styles.leaderNameMe]}>
          {user.username} {isMe ? '(you)' : ''}
        </Text>
        <Text style={styles.leaderSub}>
          {user.totalDistance.toFixed(1)}km · {user.territoriesOwned ?? user.territories?.length ?? 0} territories
        </Text>
      </View>
      <Text style={styles.leaderDistance}>{user.totalDistance.toFixed(1)}</Text>
    </View>
  );
}

const Profile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, onlineUsers } = useSocket();

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [profileData, leaderData] = await Promise.all([
        fetchUser(CURRENT_USER_ID),
        fetchLeaderboard(),
      ]);

      setProfile(profileData);
      // Sort by total distance descending
      setLeaderboard(leaderData.sort((a, b) => b.totalDistance - a.totalDistance));
    } catch {
      setError('Could not load profile. Is the server running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#52FF30" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          colors={['#52FF30']}
          tintColor="#52FF30"
          progressBackgroundColor="#252525"
        />
      }
    >
      {/* Connection badge */}
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: isConnected ? '#52FF30' : '#FF3B30' }]} />
        <Text style={styles.statusText}>
          {isConnected ? `Live · ${onlineUsers} online` : 'Offline'}
        </Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Icon name="warning-outline" size={14} color="#FF9500" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Avatar + name */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: profile?.color ?? MOCK_USER.color }]}>
          <Icon name="person" size={32} color="#000" />
        </View>
        <Text style={styles.username}>{profile?.username ?? MOCK_USER.username}</Text>
        <Text style={styles.userId}>ID: {CURRENT_USER_ID}</Text>
      </View>

      {/* Stats grid */}
      <Text style={styles.sectionTitle}>Your Stats</Text>
      <View style={styles.statsGrid}>
        <StatCard
          icon="footsteps-outline"
          label="Total Distance"
          value={(profile?.totalDistance ?? 0).toFixed(1)}
          unit="km"
        />
        <StatCard
          icon="flag-outline"
          label="Territories"
          value={profile?.territories?.length ?? 0}
        />
        <StatCard
          icon="walk-outline"
          label="Total Runs"
          value={profile?.totalRuns ?? 0}
        />
        <StatCard
          icon="map-outline"
          label="Area Owned"
          value={Math.round((profile?.totalArea ?? 0) * 1_000_000).toLocaleString()}
          unit="m²"
        />
      </View>

      {/* Leaderboard */}
      <Text style={styles.sectionTitle}>Leaderboard</Text>
      <View style={styles.leaderboard}>
        {leaderboard.length === 0 ? (
          <View style={styles.emptyLeader}>
            <Text style={styles.emptyLeaderText}>No runners yet. Go claim territory!</Text>
          </View>
        ) : (
          leaderboard.map((user, index) => (
            <LeaderboardRow
              key={user.id}
              user={user}
              rank={index + 1}
              isMe={user.id === CURRENT_USER_ID}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#aaa',
    fontSize: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
    borderRadius: 8,
  },
  errorText: {
    color: '#FF9500',
    fontSize: 13,
    flex: 1,
  },
  retryText: {
    color: '#52FF30',
    fontSize: 13,
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  userId: {
    color: '#555',
    fontSize: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  statLabel: {
    color: '#777',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  statUnit: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
    paddingBottom: 4,
  },
  leaderboard: {
    backgroundColor: '#252525',
    borderRadius: 12,
    overflow: 'hidden',
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  leaderRowMe: {
    backgroundColor: 'rgba(82, 255, 48, 0.07)',
  },
  leaderRank: {
    fontSize: 16,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
  leaderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  leaderInfo: {
    flex: 1,
    gap: 2,
  },
  leaderName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  leaderNameMe: {
    color: '#52FF30',
  },
  leaderSub: {
    color: '#666',
    fontSize: 11,
  },
  leaderDistance: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyLeader: {
    padding: 24,
    alignItems: 'center',
  },
  emptyLeaderText: {
    color: '#555',
    fontSize: 14,
  },
});
