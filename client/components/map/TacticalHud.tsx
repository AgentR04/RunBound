import { Platform, StyleSheet, Text, View } from 'react-native';
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
}

function buildInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'RB';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function TacticalHud({
  playerName,
  territoryCount,
  visibleEnemyCount,
  contestedCount,
  rankTitle,
  gpsReady,
}: TacticalHudProps) {
  return (
    <LinearGradient
      colors={['rgba(255, 248, 236, 0.97)', 'rgba(255, 252, 245, 0.92)']}
      style={styles.container}
    >
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{buildInitials(playerName)}</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.eyebrow}>WAR ROOM</Text>
          <Text style={styles.playerName} numberOfLines={1}>
            {playerName}
          </Text>
        </View>
        <View style={styles.rankBadge}>
          <Icon name="shield-outline" size={16} color="#D7931E" />
          <Text style={styles.rankText}>{rankTitle}</Text>
        </View>
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

      <View style={styles.footerRow}>
        <View style={styles.signalPill}>
          <Icon
            name={gpsReady ? 'shield-checkmark' : 'warning-outline'}
            size={14}
            color={gpsReady ? '#60C676' : '#FF8B5E'}
          />
          <Text style={styles.signalText}>
            {gpsReady ? 'GPS lock confirmed' : 'Awaiting GPS lock'}
          </Text>
        </View>
        <View style={styles.signalPill}>
          <Icon name="flame-outline" size={14} color="#F2A12D" />
          <Text style={styles.signalText}>{contestedCount} contested</Text>
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
    borderColor: 'rgba(240, 210, 156, 0.62)',
    shadowColor: '#CFE3F4',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#F3FBFF',
    borderWidth: 2,
    borderColor: '#2AB8D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#23415E',
    fontSize: 16,
    fontWeight: '800',
  },
  identity: {
    flex: 1,
    marginLeft: 12,
  },
  eyebrow: {
    color: '#D58A15',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  playerName: {
    color: '#2A4361',
    fontSize: 24,
    fontWeight: '900',
    fontFamily: HEADER_FONT,
    letterSpacing: 0.6,
    marginTop: 2,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 217, 140, 0.28)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(240, 184, 74, 0.28)',
  },
  rankText: {
    color: '#8C651B',
    fontSize: 12,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: {
    color: '#2A4361',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: HEADER_FONT,
  },
  statLabel: {
    color: '#8096AF',
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  signalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  signalText: {
    color: '#6E88A5',
    fontSize: 11,
    fontWeight: '700',
  },
});
