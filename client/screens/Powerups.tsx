import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { STAT_FONT, TITLE_FONT, UI_FONT } from '../theme/fonts';
import { getUser } from '../utils/storage';

type InventoryState = {
  coins: number;
};

const POWERUPS = [
  {
    id: 'shield',
    title: 'Shield',
    description:
      'Save your territory when another user tries to invade it.',
    unlockCoins: 150,
    image: require('../assets/img/stone_6.png'),
  },
  {
    id: 'snatch',
    title: 'Snatch',
    description:
      'Take a fraction of another user territory for yourself.',
    unlockCoins: 200,
    image: require('../assets/img/stone_3.png'),
  },
  {
    id: 'stamina',
    title: 'Stamina',
    description:
      'Earn more coins when you cover a short-distance territory.',
    unlockCoins: 50,
    image: require('../assets/img/stone_1.png'),
  },
  {
    id: 'streek-freeze',
    title: 'Streek Freeze',
    description:
      'Maintain your streak even without walking or running that day.',
    unlockCoins: 100,
    image: require('../assets/img/stone_2.png'),
  },
  {
    id: 'time-machine',
    title: 'Time Machine',
    description:
      'Subtract time from your marathon metric and sharpen your record.',
    unlockCoins: 250,
    image: require('../assets/img/stone_5.png'),
  },
  {
    id: 'vanish',
    title: 'Vanish',
    description:
      'Destroy another user whole territory and claim it as your own.',
    unlockCoins: 300,
    image: require('../assets/img/stone_4.png'),
  },
] as const;

function PowerupCard({
  title,
  description,
  unlockCoins,
  image,
  coins,
  cardWidth,
  cardHeight,
  imageHeight,
}: {
  title: string;
  description: string;
  unlockCoins: number;
  image: any;
  coins: number;
  cardWidth: number;
  cardHeight: number;
  imageHeight: number;
}) {
  const unlocked = coins > unlockCoins;

  return (
    <View style={[styles.card, { width: cardWidth, minHeight: cardHeight }]}>
      <Image source={image} style={[styles.cardImage, { height: imageHeight }]} />

      <Text style={styles.cardTitle} numberOfLines={1} adjustsFontSizeToFit>
        {title}
      </Text>

      <Text style={styles.cardDescription} numberOfLines={3}>
        {description}
      </Text>

      <View style={styles.cardFooter}>
        <View
          style={[
            styles.statePill,
            unlocked ? styles.statePillLive : styles.statePillLocked,
          ]}
        >
          <Ionicons
            name={unlocked ? 'lock-open-outline' : 'lock-closed-outline'}
            size={13}
            color={unlocked ? '#F5C15D' : '#AFC7E8'}
          />
          <Text
            style={[
              styles.stateText,
              unlocked ? styles.stateTextLive : styles.stateTextLocked,
            ]}
          >
            {unlocked ? 'Unlocked' : 'Locked'}
          </Text>
        </View>

        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Cost</Text>
          <View style={styles.costValueRow}>
            <Ionicons name="logo-bitcoin" size={14} color="#F5C15D" />
            <Text style={styles.costValue}>{unlockCoins}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function Powerups({ navigation }: { navigation: any }) {
  const [inventory, setInventory] = useState<InventoryState>({
    coins: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const layout = useMemo(() => {
    const horizontalPadding = 18;
    const columnGap = 14;
    const topArea = 118 + insets.top;
    const subheadArea = 40;
    const bottomArea = 28 + insets.bottom;
    const rowGap = 12;
    const availableHeight = height - topArea - subheadArea - bottomArea;
    const cardHeight = Math.max(
      150,
      Math.min(182, (availableHeight - rowGap * 2) / 3),
    );
    const cardWidth = (width - horizontalPadding * 2 - columnGap) / 2;
    const imageHeight = Math.max(52, Math.min(70, cardHeight * 0.34));

    return {
      cardHeight,
      cardWidth,
      columnGap,
      imageHeight,
      rowGap,
    };
  }, [height, insets.bottom, insets.top, width]);

  const loadInventory = useCallback(async () => {
    const user = await getUser();
    setInventory({
      coins: user?.coins ?? 0,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInventory();
    }, [loadInventory]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadInventory();
    } finally {
      setRefreshing(false);
    }
  }, [loadInventory]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#081223', '#10203A', '#1A2546']}
        style={styles.background}
      />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 10 + insets.top,
            paddingBottom: 18 + insets.bottom,
          },
        ]}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#67E6FF']}
            tintColor="#67E6FF"
            progressBackgroundColor="#10203A"
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color="#F5C15D" />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>War Room Intel</Text>
            <Text style={styles.headerTitle}>Powerups</Text>
          </View>

          <View style={styles.wallet}>
            <Ionicons name="logo-bitcoin" size={15} color="#F5C15D" />
            <Text style={styles.walletText}>{inventory.coins}</Text>
          </View>
        </View>

        <View style={styles.subheadWrap}>
          <Text style={styles.subhead}>
            Unlock powerups as your coin balance climbs.
          </Text>
        </View>

        <View
          style={[
            styles.list,
            {
              columnGap: layout.columnGap,
              rowGap: layout.rowGap,
            },
          ]}
        >
          {POWERUPS.map(powerup => (
            <PowerupCard
              key={powerup.id}
              title={powerup.title}
              description={powerup.description}
              unlockCoins={powerup.unlockCoins}
              image={powerup.image}
              coins={inventory.coins}
              cardWidth={layout.cardWidth}
              cardHeight={layout.cardHeight}
              imageHeight={layout.imageHeight}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081223',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  glowTop: {
    position: 'absolute',
    top: -70,
    right: -30,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(103, 230, 255, 0.12)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: 30,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(166, 28, 40, 0.16)',
  },
  content: {
    paddingHorizontal: 18,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 193, 93, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  headerEyebrow: {
    color: '#7FA8D8',
    fontSize: 14,
    letterSpacing: 1.2,
    fontFamily: TITLE_FONT,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 34,
    marginTop: 2,
    fontFamily: TITLE_FONT,
  },
  wallet: {
    minWidth: 78,
    height: 42,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 193, 93, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  walletText: {
    color: '#F5C15D',
    fontSize: 18,
    lineHeight: 18,
    fontFamily: STAT_FONT,
  },
  subheadWrap: {
    marginTop: 8,
    marginBottom: 12,
  },
  subhead: {
    color: '#AFC7E8',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: UI_FONT,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(103, 230, 255, 0.12)',
  },
  cardImage: {
    width: '100%',
    borderRadius: 14,
    resizeMode: 'contain',
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 22,
    marginBottom: 4,
    fontFamily: TITLE_FONT,
  },
  cardDescription: {
    color: '#C9D7EA',
    fontSize: 11,
    lineHeight: 14,
    minHeight: 42,
    fontFamily: UI_FONT,
  },
  cardFooter: {
    marginTop: 'auto',
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  costLabel: {
    color: '#7FA8D8',
    fontSize: 11,
    fontFamily: UI_FONT,
  },
  costValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  costValue: {
    color: '#F5C15D',
    fontSize: 15,
    lineHeight: 15,
    fontFamily: STAT_FONT,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statePillLive: {
    backgroundColor: 'rgba(245, 193, 93, 0.12)',
    borderColor: 'rgba(245, 193, 93, 0.28)',
  },
  statePillLocked: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(103, 230, 255, 0.12)',
  },
  stateText: {
    fontSize: 10,
    lineHeight: 11,
    fontFamily: UI_FONT,
  },
  stateTextLive: {
    color: '#F5C15D',
  },
  stateTextLocked: {
    color: '#AFC7E8',
  },
});
