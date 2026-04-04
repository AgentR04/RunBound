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
        background: 'rgba(96, 198, 118, 0.18)',
        color: '#60C676',
        icon: 'shield-outline',
      };
    case 'contested':
      return {
        background: 'rgba(247, 183, 51, 0.2)',
        color: '#D7931E',
        icon: 'flame-outline',
      };
    default:
      return {
        background: 'rgba(255, 139, 94, 0.16)',
        color: '#FF8B5E',
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
              <Icon name="walk-outline" size={14} color="#D7931E" />
              <Text style={styles.detailText}>
                Any valid loop can carve a new blob
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onViewOwner}>
              <Icon name="person-circle-outline" size={18} color="#57718D" />
              <Text style={styles.secondaryButtonText}>Owner</Text>
            </TouchableOpacity>

            {selectedTerritory.status === 'owned' ? (
              <TouchableOpacity style={styles.primaryButtonDisabled} disabled>
                <Icon name="shield-outline" size={18} color="#7A9AB8" />
                <Text style={styles.primaryButtonTextMuted}>Fortified</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onChallengeTerritory}
              >
                <Icon name="flash-outline" size={18} color="#0D4D7A" />
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
            <Icon name="walk-outline" size={18} color="#0D4D7A" />
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
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 18,
    paddingVertical: 12,
  },
  metricValue: {
    color: '#2A4361',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: HEADER_FONT,
  },
  metricLabel: {
    color: '#8096AF',
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  intelCard: {
    backgroundColor: 'rgba(255, 250, 243, 0.96)',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(242, 220, 182, 0.65)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionEyebrow: {
    color: '#D58A15',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  territoryName: {
    color: '#2A4361',
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
    backgroundColor: '#F2FAFF',
    borderWidth: 1,
    borderColor: 'rgba(87, 184, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAvatarText: {
    color: '#2A4361',
    fontSize: 14,
    fontWeight: '900',
  },
  ownerMeta: {
    flex: 1,
    marginLeft: 12,
  },
  ownerTitle: {
    color: '#2A4361',
    fontSize: 16,
    fontWeight: '800',
  },
  ownerSubtitle: {
    color: '#7990AB',
    fontSize: 12,
    marginTop: 2,
  },
  rewardGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  rewardCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 13,
    backgroundColor: '#F6FAFF',
  },
  rewardValue: {
    color: '#2A4361',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: HEADER_FONT,
  },
  rewardLabel: {
    color: '#7D93AC',
    fontSize: 11,
    marginTop: 3,
    textTransform: 'uppercase',
  },
  detailRow: {
    marginTop: 16,
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF6E6',
  },
  detailText: {
    flex: 1,
    color: '#7A90A9',
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  secondaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#F3F8FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#56718D',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#AEE4FF',
    borderWidth: 1,
    borderColor: '#D3F0FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonDisabled: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#ECF2F8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#0D4D7A',
    fontSize: 14,
    fontWeight: '900',
  },
  primaryButtonTextMuted: {
    color: '#7A9AB8',
    fontSize: 14,
    fontWeight: '800',
  },
  summaryText: {
    marginTop: 10,
    color: '#7A90A9',
    fontSize: 14,
    lineHeight: 21,
  },
});
