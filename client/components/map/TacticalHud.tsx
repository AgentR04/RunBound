import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

const HEADER_FONT = Platform.select({
  ios: 'AvenirNextCondensed-Heavy',
  android: 'sans-serif-condensed',
  default: undefined,
});

interface TacticalHudProps {
  playerName: string;
  territoryCount: number;
  visibleEnemyCount: number;
  contestedCount: number;
  rankTitle: string;
  gpsReady: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function TacticalHud({
  playerName,
  territoryCount,
  visibleEnemyCount,
  contestedCount,
  rankTitle: _rankTitle,
  gpsReady: _gpsReady,
  collapsed = false,
  onToggle,
}: TacticalHudProps) {
  if (collapsed) {
    return (
      <View style={[styles.container, styles.containerCollapsed]}>
        <View style={styles.compactBeacon} />
        <Text style={styles.compactLabel}>AVENGERS WAR ROOM</Text>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={onToggle}
          disabled={!onToggle}
        >
          <Icon name="chevron-down" size={16} color="#F5C15D" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['rgba(8, 18, 35, 0.96)', 'rgba(21, 34, 58, 0.94)']}
      style={styles.container}
    >
      <View style={styles.glowOrb} />
      <View style={styles.topRow}>
        <View style={styles.identity}>
          <Text style={styles.eyebrow}>AVENGERS SATELLITE</Text>
          <Text style={styles.playerName} numberOfLines={1}>
            {playerName}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={onToggle}
          disabled={!onToggle}
        >
          <Icon name="chevron-up" size={16} color="#F5C15D" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{territoryCount}</Text>
          <Text style={styles.statLabel}>Owned</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{visibleEnemyCount}</Text>
          <Text style={styles.statLabel}>Enemies</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{contestedCount}</Text>
          <Text style={styles.statLabel}>Contested</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 22,
    left: 16,
    right: 88,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 157, 214, 0.34)',
    shadowColor: '#081223',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.36,
    shadowRadius: 22,
    elevation: 10,
    overflow: 'hidden',
  },
  containerCollapsed: {
    right: undefined,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(11, 20, 36, 0.94)',
    borderColor: 'rgba(173, 39, 45, 0.48)',
  },
  glowOrb: {
    position: 'absolute',
    top: -42,
    right: -18,
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: 'rgba(91, 214, 255, 0.12)',
  },
  compactBeacon: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#67E6FF',
    shadowColor: '#67E6FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  compactLabel: {
    color: '#F5C15D',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  identity: {
    flex: 1,
  },
  eyebrow: {
    color: '#F5C15D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  playerName: {
    color: '#EFF7FF',
    fontSize: 24,
    fontWeight: '900',
    fontFamily: HEADER_FONT,
    letterSpacing: 0.6,
    marginTop: 2,
  },
  toggleButton: {
    width: 30,
    height: 30,
    marginLeft: 8,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 193, 93, 0.28)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(103, 230, 255, 0.14)',
  },
  statValue: {
    color: '#F5FBFF',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: HEADER_FONT,
  },
  statLabel: {
    color: '#8EB5D8',
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
