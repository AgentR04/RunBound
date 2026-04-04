import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { STAT_FONT, TITLE_FONT, UI_FONT } from '../../theme/fonts';

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

interface TerritoryIntelSheetProps {
  selectedTerritory: TerritoryIntel | null;
  territoryCount: number;
  enemyCount: number;
  contestedCount: number;
  distanceKm: number;
  durationLabel: string;
  stepCount: number;
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
        background: 'rgba(91, 214, 255, 0.16)',
        color: '#67E6FF',
        icon: 'shield-outline',
      };
    case 'contested':
      return {
        background: 'rgba(245, 193, 93, 0.18)',
        color: '#F5C15D',
        icon: 'flame-outline',
      };
    default:
      return {
        background: 'rgba(201, 52, 64, 0.16)',
        color: '#F05A67',
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
  stepCount,
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
          <Text style={styles.metricValue}>{stepCount}</Text>
          <Text style={styles.metricLabel}>Steps</Text>
        </View>
      </View>

      {selectedTerritory ? (
        <View style={styles.intelCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Mission Intel</Text>
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
                {selectedTerritory.daysHeld} day hold | decay in{' '}
                {formatDecay(selectedTerritory.decayHoursRemaining)}
              </Text>
            </View>
          </View>

          <View style={styles.rewardGrid}>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardValue}>
                {selectedTerritory.areaM2.toFixed(0)}
              </Text>
              <Text style={styles.rewardLabel}>m2</Text>
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
              <Icon name="walk-outline" size={14} color="#F5C15D" />
              <Text style={styles.detailText}>
                Avengers protocol: complete a clean loop to carve a new zone
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onViewOwner}>
              <Icon name="person-circle-outline" size={18} color="#C7D9EC" />
              <Text style={styles.secondaryButtonText}>Owner</Text>
            </TouchableOpacity>

            {selectedTerritory.status === 'owned' ? (
              <TouchableOpacity style={styles.primaryButtonDisabled} disabled>
                <Icon name="shield-outline" size={18} color="#8299B4" />
                <Text style={styles.primaryButtonTextMuted}>Fortified</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onChallengeTerritory}
              >
                <Icon name="flash-outline" size={18} color="#FFF3E0" />
                <Text style={styles.primaryButtonText}>Engage</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.intelCard}>
          <Text style={styles.sectionEyebrow}>Avengers Initiative</Text>
          <Text style={styles.territoryName}>Choose a sector or launch patrol</Text>

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

          <TouchableOpacity
            style={[styles.primaryButton, styles.summaryPrimaryButton]}
            onPress={onStartRun}
          >
            <Icon name="walk-outline" size={18} color="#FFF3E0" />
            <Text style={styles.primaryButtonText}>Assemble Run</Text>
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
    backgroundColor: 'rgba(13, 24, 41, 0.92)',
    borderRadius: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(91, 214, 255, 0.18)',
  },
  metricValue: {
    color: '#F5FBFF',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: STAT_FONT,
  },
  metricLabel: {
    color: '#8EB5D8',
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    fontFamily: UI_FONT,
  },
  intelCard: {
    backgroundColor: 'rgba(10, 20, 36, 0.96)',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(176, 38, 50, 0.45)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionEyebrow: {
    color: '#F5C15D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontFamily: UI_FONT,
  },
  territoryName: {
    color: '#F4F8FF',
    fontSize: 27,
    fontFamily: TITLE_FONT,
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
    fontFamily: UI_FONT,
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
    backgroundColor: '#13253D',
    borderWidth: 1,
    borderColor: 'rgba(103, 230, 255, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAvatarText: {
    color: '#EAF7FF',
    fontSize: 14,
    fontFamily: UI_FONT,
  },
  ownerMeta: {
    flex: 1,
    marginLeft: 12,
  },
  ownerTitle: {
    color: '#F4F8FF',
    fontSize: 16,
    fontFamily: UI_FONT,
  },
  ownerSubtitle: {
    color: '#9DB7D4',
    fontSize: 12,
    marginTop: 2,
    fontFamily: UI_FONT,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(103, 230, 255, 0.12)',
  },
  rewardValue: {
    color: '#F4F8FF',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: STAT_FONT,
  },
  rewardLabel: {
    color: '#8EB5D8',
    fontSize: 11,
    marginTop: 3,
    textTransform: 'uppercase',
    fontFamily: UI_FONT,
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
    backgroundColor: 'rgba(245, 193, 93, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 193, 93, 0.22)',
  },
  detailText: {
    flex: 1,
    color: '#DCE8F7',
    fontSize: 13,
    fontFamily: UI_FONT,
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(103, 230, 255, 0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#C7D9EC',
    fontSize: 14,
    fontFamily: UI_FONT,
  },
  primaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#A61C28',
    borderWidth: 1,
    borderColor: '#D74B5B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonDisabled: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFF3E0',
    fontSize: 14,
    fontFamily: UI_FONT,
  },
  primaryButtonTextMuted: {
    color: '#8299B4',
    fontSize: 14,
    fontFamily: UI_FONT,
  },
  summaryPrimaryButton: {
    marginTop: 24,
  },
  summaryText: {
    marginTop: 10,
    color: '#7A90A9',
    fontSize: 14,
    lineHeight: 21,
  },
});
