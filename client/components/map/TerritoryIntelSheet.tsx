import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export interface TerritoryIntel {
  id: string;
  name: string;
  ownerName: string;
  status: 'owned' | 'enemy' | 'contested';
  daysHeld: number;
  decayHoursRemaining: number;
  areaM2: number;
  strength: number;
}

const HEADER_FONT = Platform.select({
  ios: 'AvenirNextCondensed-Heavy',
  android: 'sans-serif-condensed',
  default: undefined,
});

interface TerritoryIntelSheetProps {
  selectedTerritory: TerritoryIntel | null;
  territoryCount: number;
  enemyCount: number;
  contestedCount: number;
  distanceKm: number;
  durationLabel: string;
  averageSpeed: string;
  onStartRun: () => void;
  onChallengeTerritory: () => void;
  onViewOwner: () => void;
}

function formatDecay(hoursRemaining: number) {
  const days = Math.floor(hoursRemaining / 24);
  const hours = hoursRemaining % 24;
  return `${days}d ${hours}h`;
}

function getStatusAccent(status: TerritoryIntel['status']) {
  switch (status) {
    case 'owned':
      return {
        background: '#103C37',
        color: '#29F0D7',
        icon: 'shield-outline',
      };
    case 'contested':
      return {
        background: '#56420B',
        color: '#FFD34D',
        icon: 'flame-outline',
      };
    default:
      return {
        background: '#4A2416',
        color: '#FF7A45',
        icon: 'warning-outline',
      };
  }
}

export default function TerritoryIntelSheet({
  selectedTerritory,
  territoryCount,
  enemyCount,
  contestedCount,
  distanceKm,
  durationLabel,
  averageSpeed,
  onStartRun,
  onChallengeTerritory,
  onViewOwner,
}: TerritoryIntelSheetProps) {
  return (
    <View style={styles.content}>
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{distanceKm.toFixed(2)}</Text>
          <Text style={styles.metricLabel}>KM today</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{durationLabel}</Text>
          <Text style={styles.metricLabel}>Session</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{averageSpeed}</Text>
          <Text style={styles.metricLabel}>KM/H</Text>
        </View>
      </View>

      {selectedTerritory ? (
        <View style={styles.intelCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Territory Intel</Text>
              <Text style={styles.territoryName}>{selectedTerritory.name}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: getStatusAccent(selectedTerritory.status).background,
                },
              ]}
            >
              <Icon
                name={getStatusAccent(selectedTerritory.status).icon}
                size={14}
                color={getStatusAccent(selectedTerritory.status).color}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusAccent(selectedTerritory.status).color },
                ]}
              >
                {selectedTerritory.status}
              </Text>
            </View>
          </View>

          <View style={styles.ownerRow}>
            <View style={styles.ownerAvatar}>
              <Text style={styles.ownerAvatarText}>
                {selectedTerritory.ownerName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.ownerMeta}>
              <Text style={styles.ownerTitle}>{selectedTerritory.ownerName}</Text>
              <Text style={styles.ownerSubtitle}>
                {selectedTerritory.daysHeld} day hold • decay in{' '}
                {formatDecay(selectedTerritory.decayHoursRemaining)}
              </Text>
            </View>
          </View>

          <View style={styles.rewardGrid}>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardValue}>
                {selectedTerritory.areaM2.toFixed(0)}
              </Text>
              <Text style={styles.rewardLabel}>m²</Text>
            </View>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardValue}>{selectedTerritory.strength}%</Text>
              <Text style={styles.rewardLabel}>Integrity</Text>
            </View>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardValue}>
                {selectedTerritory.status === 'owned' ? 'Guarded' : 'Raidable'}
              </Text>
              <Text style={styles.rewardLabel}>State</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailPill}>
              <Icon name="walk-outline" size={14} color="#FFD34D" />
              <Text style={styles.detailText}>
                Any valid loop can carve a new blob
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onViewOwner}>
              <Icon name="person-circle-outline" size={18} color="#E3E9F5" />
              <Text style={styles.secondaryButtonText}>Owner</Text>
            </TouchableOpacity>

            {selectedTerritory.status === 'owned' ? (
              <TouchableOpacity style={styles.primaryButtonDisabled} disabled>
                <Icon name="shield-outline" size={18} color="#172027" />
                <Text style={styles.primaryButtonTextMuted}>Fortified</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onChallengeTerritory}
              >
                <Icon name="flash-outline" size={18} color="#101114" />
                <Text style={styles.primaryButtonText}>Challenge</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.intelCard}>
          <Text style={styles.sectionEyebrow}>Blob Control</Text>
          <Text style={styles.territoryName}>No territory selected</Text>
          <Text style={styles.summaryText}>
            Every completed loop can become its own irregular territory blob. Overlaps
            are allowed, and your own blobs stay brighter and heavier on the map.
          </Text>

          <View style={styles.rewardGrid}>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardValue}>{territoryCount}</Text>
              <Text style={styles.rewardLabel}>Owned</Text>
            </View>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardValue}>{enemyCount}</Text>
              <Text style={styles.rewardLabel}>Enemy</Text>
            </View>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardValue}>{contestedCount}</Text>
              <Text style={styles.rewardLabel}>Contested</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={onStartRun}>
            <Icon name="walk-outline" size={18} color="#101114" />
            <Text style={styles.primaryButtonText}>Start Run</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingBottom: 38,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(7, 11, 20, 0.88)',
    borderRadius: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  metricValue: {
    color: '#F7F8FC',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: HEADER_FONT,
  },
  metricLabel: {
    color: '#9EA8BF',
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  intelCard: {
    backgroundColor: 'rgba(13, 18, 30, 0.98)',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 211, 77, 0.14)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionEyebrow: {
    color: '#FFD34D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  territoryName: {
    color: '#F8FAFE',
    fontSize: 27,
    fontWeight: '900',
    fontFamily: HEADER_FONT,
    marginTop: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  ownerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#10202B',
    borderWidth: 1,
    borderColor: 'rgba(41, 240, 215, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAvatarText: {
    color: '#DFFBFF',
    fontSize: 14,
    fontWeight: '900',
  },
  ownerMeta: {
    flex: 1,
    marginLeft: 12,
  },
  ownerTitle: {
    color: '#EFF4FF',
    fontSize: 16,
    fontWeight: '800',
  },
  ownerSubtitle: {
    color: '#98A6C0',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 18,
  },
  rewardGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  rewardCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  rewardValue: {
    color: '#F9FBFF',
    fontSize: 17,
    fontWeight: '900',
    fontFamily: HEADER_FONT,
  },
  rewardLabel: {
    color: '#98A6C0',
    fontSize: 11,
    marginTop: 3,
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  detailText: {
    color: '#E6EDF9',
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  secondaryButton: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#E3E9F5',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1.2,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFD34D',
    borderWidth: 2,
    borderColor: '#FFEEA9',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#FFD34D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonDisabled: {
    flex: 1.2,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#5E6A73',
    borderWidth: 2,
    borderColor: '#8898A3',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    opacity: 0.8,
  },
  primaryButtonText: {
    color: '#101114',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  primaryButtonTextMuted: {
    color: '#172027',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryText: {
    color: '#A3ADC2',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
});
