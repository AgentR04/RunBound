import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
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

function ActivityIcon({ type }: { type: Activity['type'] }) {
  const icons: Record<Activity['type'], string> = {
    territory_claimed: 'flag',
    run_completed: 'footsteps',
    territory_defended: 'shield',
  };
  return <Icon name={icons[type]} size={18} color="#52FF30" />;
}

function FeedItem({ item }: { item: Activity }) {
  const areaText =
    item.data.area != null
      ? `${Math.round(item.data.area * 1_000_000).toLocaleString()}m²`
      : null;
  const distText =
    item.data.distance != null ? `${item.data.distance.toFixed(2)}km` : null;

  return (
    <View style={styles.card}>
      <View style={[styles.colorDot, { backgroundColor: item.userColor }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <ActivityIcon type={item.type} />
          <Text style={styles.cardMessage} numberOfLines={2}>
            {item.message}
          </Text>
        </View>
        <View style={styles.cardMeta}>
          {areaText && (
            <View style={styles.metaChip}>
              <Icon name="map" size={11} color="#aaa" />
              <Text style={styles.metaText}>{areaText}</Text>
            </View>
          )}
          {distText && (
            <View style={styles.metaChip}>
              <Icon name="navigate" size={11} color="#aaa" />
              <Text style={styles.metaText}>{distText}</Text>
            </View>
          )}
          <Text style={styles.timeText}>{timeAgo(item.timestamp)}</Text>
        </View>
      </View>
    </View>
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

  // Initial load
  useEffect(() => {
    load();
  }, [load]);

  // Real-time: prepend new activities as they arrive via socket
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#52FF30" />
        <Text style={styles.loadingText}>Loading feed...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Connection status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isConnected ? '#52FF30' : '#FF3B30' },
            ]}
          />
          <Text style={styles.statusText}>
            {isConnected ? `Live · ${onlineUsers} online` : 'Offline'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => load(true)} style={styles.refreshButton}>
          <Icon name="refresh" size={16} color="#aaa" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Icon name="warning-outline" size={14} color="#FF9500" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={activities}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <FeedItem item={item} />}
        contentContainerStyle={
          activities.length === 0 ? styles.emptyContent : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            colors={['#52FF30']}
            tintColor="#52FF30"
            progressBackgroundColor="#252525"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="compass-outline" size={48} color="#444" />
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptySubtitle}>
              Claim your first territory to see it here
            </Text>
          </View>
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
    backgroundColor: '#1a1a1a',
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
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  refreshButton: {
    padding: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 12,
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
  listContent: {
    padding: 12,
  },
  emptyContent: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    alignItems: 'flex-start',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardMessage: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  metaText: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: '500',
  },
  timeText: {
    color: '#666',
    fontSize: 11,
    marginLeft: 'auto',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: '#444',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
