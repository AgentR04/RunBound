import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useSocket } from '../context/SocketContext';
import { Activity, fetchActivities } from '../services/api';

const MAX_FEED_ITEMS = 100;

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
      accentColors={[`${theme.accent}55`, 'rgba(255,255,255,0.78)']}
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
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const data = await fetchActivities(50);
      setActivities(data);
    } catch {
      setError('Could not load feed. Is the server running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
          colors={['#BEE8FF', '#E8F7FF', '#FFF5E5']}
          style={styles.background}
        />
        <ActivityIndicator size="large" color="#57B8FF" />
        <Text style={styles.loadingText}>Loading command feed...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#BEE8FF', '#EAF7FF', '#FFF5E5']}
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
              accentColors={['rgba(255, 208, 122, 0.68)', 'rgba(143, 221, 255, 0.52)']}
            >
              <LinearGradient
                colors={['#FFF8ED', '#FFF1D9']}
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
                  <TouchableOpacity style={styles.refreshButton} onPress={() => load(true)}>
                    <Icon name="refresh" size={18} color="#7D510B" />
                    <Text style={styles.refreshButtonText}>Refresh</Text>
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
            colors={['#57B8FF']}
            tintColor="#57B8FF"
            progressBackgroundColor="#FFF8EE"
          />
        }
        ListEmptyComponent={
          <GlassPanel style={styles.emptyShell}>
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Icon name="compass-outline" size={40} color="#57B8FF" />
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
    backgroundColor: '#EAF7FF',
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
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  cloudBottom: {
    position: 'absolute',
    bottom: 160,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7FF',
    gap: 10,
  },
  loadingText: {
    color: '#6C86A5',
    fontSize: 14,
    fontWeight: '600',
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
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  heroEyebrow: {
    color: '#D58A15',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: '#46300E',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotLive: {
    backgroundColor: '#60C676',
  },
  statusDotOffline: {
    backgroundColor: '#FF8B5E',
  },
  statusText: {
    color: '#6A85A2',
    fontSize: 12,
    fontWeight: '700',
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
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  heroStatValue: {
    color: '#233B57',
    fontSize: 22,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: '#6D85A0',
    fontSize: 12,
    marginTop: 2,
  },
  refreshButton: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFD98C',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshButtonText: {
    color: '#7D510B',
    fontSize: 13,
    fontWeight: '800',
  },
  errorBanner: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 139, 94, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#A05A42',
    fontSize: 13,
    fontWeight: '600',
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
    color: '#223B57',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  feedSubtitle: {
    color: '#7A91AD',
    fontSize: 12,
    marginTop: 4,
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
    backgroundColor: '#F3F8FF',
  },
  metaChipText: {
    color: '#65809F',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyShell: {
    marginTop: 10,
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(87, 184, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 16,
    color: '#26405C',
    fontSize: 22,
    fontWeight: '900',
  },
  emptySubtitle: {
    marginTop: 8,
    color: '#7A93AE',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
});
