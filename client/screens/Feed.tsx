import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
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
import { Activity, fetchActivities } from '../services/api';
import { STAT_FONT, TITLE_FONT, UI_FONT } from '../theme/fonts';
import { getRuns, getTerritories } from '../utils/storage';

const MAX_FEED_ITEMS = 100;
const FEED_PANEL_MIN_HEIGHT = 210;

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getActivityTheme(type: Activity['type']) {
  switch (type) {
    case 'territory_claimed':
      return {
        icon: 'flag-outline',
        accent: '#57B8FF',
        label: 'Capture',
      };
    case 'territory_defended':
      return {
        icon: 'shield-checkmark-outline',
        accent: '#F7B733',
        label: 'Defense',
      };
    default:
      return {
        icon: 'footsteps-outline',
        accent: '#FF8B5E',
        label: 'Run',
      };
  }
}

function buildLocalActivities(params: {
  currentUserId?: string;
  currentUsername?: string;
  currentColor?: string;
  territories: Awaited<ReturnType<typeof getTerritories>>;
  runs: Awaited<ReturnType<typeof getRuns>>;
}): Activity[] {
  const territoryActivities: Activity[] = params.territories.map(territory => ({
    id: `local-territory-${territory.id}`,
    type: 'territory_claimed',
    userId: territory.ownerId,
    username:
      territory.ownerId === params.currentUserId
        ? params.currentUsername ?? territory.ownerName
        : territory.ownerName,
    userColor:
      territory.ownerId === params.currentUserId
        ? params.currentColor ?? territory.ownerColor
        : territory.ownerColor,
    timestamp: new Date(territory.claimedAt).toISOString(),
    message: `${territory.ownerName} captured a new blob`,
    data: {
      territoryId: territory.id,
      area: territory.area,
    },
  }));

  const runActivities: Activity[] = params.runs.map(run => ({
    id: `local-run-${run.id}`,
    type: 'run_completed',
    userId: run.userId,
    username:
      run.userId === params.currentUserId
        ? params.currentUsername ?? 'You'
        : 'Commander',
    userColor: params.currentColor ?? '#57B8FF',
    timestamp: new Date(run.endTime ?? run.startTime).toISOString(),
    message: `Completed a ${run.distance.toFixed(2)} km run`,
    data: {
      distance: run.distance,
      duration: run.duration,
      territoryId: run.territoryClaimed ?? undefined,
    },
  }));

  return [...territoryActivities, ...runActivities]
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    )
    .slice(0, MAX_FEED_ITEMS);
}

function FeedItem({ item }: { item: Activity }) {
  const theme = getActivityTheme(item.type);
  const areaText =
    item.data.area != null
      ? `${Math.round(item.data.area * 1_000_000).toLocaleString()} m²`
      : null;
  const distText =
    item.data.distance != null ? `${item.data.distance.toFixed(2)} km` : null;

  return (
    <GlassPanel
      style={styles.feedShell}
      accentColors={[`${theme.accent}66`, 'rgba(103, 230, 255, 0.12)']}
    >
      <View style={styles.feedCard}>
        <View style={styles.feedTopRow}>
          <View style={[styles.feedIconWrap, { backgroundColor: `${theme.accent}20` }]}>
            <Icon name={theme.icon} size={18} color={theme.accent} />
          </View>
          <View style={styles.feedTextWrap}>
            <Text style={styles.feedTitle}>{item.message}</Text>
            <Text style={styles.feedSubtitle}>
              {item.username} • {timeAgo(item.timestamp)}
            </Text>
          </View>
          <View style={[styles.feedTypePill, { backgroundColor: `${theme.accent}18` }]}>
            <Text style={[styles.feedTypeText, { color: theme.accent }]}>
              {theme.label}
            </Text>
          </View>
        </View>

        <View style={styles.feedMetaRow}>
          {areaText ? (
            <View style={styles.metaChip}>
              <Icon name="map-outline" size={12} color="#6F88A8" />
              <Text style={styles.metaChipText}>{areaText}</Text>
            </View>
          ) : null}
          {distText ? (
            <View style={styles.metaChip}>
              <Icon name="navigate-outline" size={12} color="#6F88A8" />
              <Text style={styles.metaChipText}>{distText}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </GlassPanel>
  );
}

const Feed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { socket, isConnected, onlineUsers } = useSocket();
  const { user } = useAuth();
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const data = await fetchActivities(50);
        setActivities(data);
        setError(null);
      } catch {
        const [localRuns, localTerritories] = await Promise.all([
          getRuns(),
          getTerritories(),
        ]);
        setActivities(
          buildLocalActivities({
            currentUserId: user?.id,
            currentUsername:
              user?.user_metadata?.username ?? user?.email?.split('@')[0],
            currentColor: '#57B8FF',
            territories: localTerritories,
            runs: localRuns,
          }),
        );
        setError('Showing local feed while the server is unavailable.');
      }
    } catch {
      setError('Could not load feed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.email, user?.id, user?.user_metadata?.username]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (!socket) return;

    const onActivity = (activity: Activity) => {
      setActivities(prev => {
        const updated = [activity, ...prev];
        return updated.slice(0, MAX_FEED_ITEMS);
      });
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    };

    socket.on('activity:new', onActivity);
    return () => {
      socket.off('activity:new', onActivity);
    };
  }, [socket]);

  const highlightCount = useMemo(
    () =>
      activities.filter(
        item =>
          item.type === 'territory_claimed' || item.type === 'territory_defended',
      ).length,
    [activities],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <LinearGradient
          colors={['#081223', '#10203A', '#1A2546']}
          style={styles.background}
        />
        <ActivityIndicator size="large" color="#67E6FF" />
        <Text style={styles.loadingText}>Loading command feed...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#081223', '#10203A', '#1A2546']}
        style={styles.background}
      />
      <View style={styles.cloudTop} />
      <View style={styles.cloudBottom} />

      <FlatList
        ref={listRef}
        data={activities}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <FeedItem item={item} />}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <GlassPanel
              style={styles.heroShell}
              accentColors={['rgba(166, 28, 40, 0.72)', 'rgba(103, 230, 255, 0.34)']}
            >
              <LinearGradient
                colors={['#0D1A31', '#13253D']}
                style={styles.heroCard}
              >
                <View style={styles.heroTop}>
                  <View>
                    <Text style={styles.heroEyebrow}>Live Feed</Text>
                    <Text style={styles.heroTitle}>Mumbai war log</Text>
                  </View>
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
                </View>

                <View style={styles.heroStats}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatValue}>{activities.length}</Text>
                    <Text style={styles.heroStatLabel}>Recent updates</Text>
                  </View>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatValue}>{highlightCount}</Text>
                    <Text style={styles.heroStatLabel}>Blob battles</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={() => load(true)}
                    accessibilityLabel="Refresh feed"
                  >
                    <Icon name="refresh" size={18} color="#FFF1D8" />
                  </TouchableOpacity>
                </View>

                {error ? (
                  <View style={styles.errorBanner}>
                    <Icon name="warning-outline" size={15} color="#FF8B5E" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}
              </LinearGradient>
            </GlassPanel>
          </View>
        }
        contentContainerStyle={
          activities.length === 0 ? styles.emptyContent : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            colors={['#67E6FF']}
            tintColor="#67E6FF"
            progressBackgroundColor="#10203A"
          />
        }
        ListEmptyComponent={
          <GlassPanel style={styles.emptyShell}>
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Icon name="compass-outline" size={40} color="#67E6FF" />
              </View>
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptySubtitle}>
                Capture your first territory around Bandra or Marine Drive to light up the feed.
              </Text>
            </View>
          </GlassPanel>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default Feed;

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
    top: 26,
    right: -24,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(103, 230, 255, 0.14)',
  },
  cloudBottom: {
    position: 'absolute',
    bottom: 160,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(166, 28, 40, 0.14)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#081223',
    gap: 10,
  },
  loadingText: {
    color: '#D6E3F2',
    fontSize: 14,
    fontFamily: UI_FONT,
  },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  heroShell: {
    marginBottom: 2,
  },
  heroCard: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    minHeight: FEED_PANEL_MIN_HEIGHT,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
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
    color: '#F4F8FF',
    fontSize: 28,
    marginTop: 4,
    fontFamily: TITLE_FONT,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
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
    color: '#D7E5F2',
    fontSize: 12,
    fontFamily: UI_FONT,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
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
    color: '#9AB5D1',
    fontSize: 12,
    marginTop: 2,
    fontFamily: UI_FONT,
  },
  refreshButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  emptyContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  feedShell: {
    marginBottom: 12,
  },
  feedCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  feedTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  feedIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedTextWrap: {
    flex: 1,
  },
  feedTitle: {
    color: '#F1F6FC',
    fontSize: 15,
    lineHeight: 21,
    fontFamily: TITLE_FONT,
  },
  feedSubtitle: {
    color: '#9AB5D1',
    fontSize: 12,
    marginTop: 4,
    fontFamily: UI_FONT,
  },
  feedTypePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  feedTypeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    fontFamily: UI_FONT,
  },
  feedMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  metaChipText: {
    color: '#C8D8E8',
    fontSize: 12,
    fontFamily: UI_FONT,
  },
  emptyShell: {
    marginTop: 10,
    flex: 1,
  },
  empty: {
    flex: 1,
    minHeight: FEED_PANEL_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(103, 230, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 16,
    color: '#F4F8FF',
    fontSize: 22,
    fontFamily: TITLE_FONT,
  },
  emptySubtitle: {
    marginTop: 8,
    color: '#9AB5D1',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    fontFamily: UI_FONT,
  },
});
