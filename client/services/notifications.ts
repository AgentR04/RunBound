import { Alert, PermissionsAndroid, Platform, ToastAndroid } from 'react-native';

// Lazy-load notifee so a missing native module doesn't crash the app
let notifee: typeof import('@notifee/react-native').default | null = null;
let AndroidImportance: typeof import('@notifee/react-native').AndroidImportance | null = null;
let AndroidStyle: typeof import('@notifee/react-native').AndroidStyle | null = null;
let AndroidTriggerType: typeof import('@notifee/react-native').TriggerType | null = null;
let AuthorizationStatus: typeof import('@notifee/react-native').AuthorizationStatus | null = null;

try {
  const mod = require('@notifee/react-native');
  notifee = mod.default;
  AndroidImportance = mod.AndroidImportance;
  AndroidStyle = mod.AndroidStyle;
  AndroidTriggerType = mod.TriggerType;
  AuthorizationStatus = mod.AuthorizationStatus;
  console.log('[Notifications] notifee loaded OK');
} catch (e) {
  console.warn('[Notifications] notifee native module not available — skipping.', e);
}

export function isNotifeeAvailable() {
  return notifee !== null;
}

export async function sendTestNotification() {
  console.log('[Notifications] sendTestNotification called, notifee=', !!notifee);
  if (!notifee || !AndroidImportance) {
    Alert.alert(
      'Notifee not loaded',
      'Native module missing. Run: react-native run-android (full rebuild needed)',
    );
    return;
  }
  try {
    await ensureChannel();
    await notifee.displayNotification({
      title: '✅ Test Notification',
      body: 'RunBound notifications are working!',
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
    });
    console.log('[Notifications] test notification sent');
  } catch (e) {
    console.warn('[Notifications] test failed', e);
    Alert.alert('Test failed', String(e));
  }
}

const CHANNEL_ID = 'runbound_main';
const INACTIVITY_NOTIF_ID = 'inactivity_reminder';
// Hours of inactivity before we nudge the user
const INACTIVITY_HOURS = 6;

async function showFallbackNotification(title: string, body: string) {
  const message = `${title}\n${body}`;

  if (Platform.OS === 'android') {
    ToastAndroid.showWithGravity(
      message,
      ToastAndroid.LONG,
      ToastAndroid.TOP,
    );
    return;
  }

  Alert.alert(title, body);
}

async function ensureChannel() {
  if (!notifee || !AndroidImportance) return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'RunBound',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  if (!notifee || !AuthorizationStatus) return Platform.OS !== 'android';
  try {
    const settings = await notifee.requestPermission();
    return (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

export async function notifyTerritorySecured(territoryName?: string) {
  const body = territoryName
    ? `You claimed ${territoryName}. The sector is yours.`
    : 'You carved a new sector. Mumbai bows to your run.';

  if (!notifee || !AndroidImportance || !AndroidStyle) {
    await showFallbackNotification('Territory Secured!', body);
    return;
  }
  try {
    await ensureChannel();
    await notifee.displayNotification({
      title: '⚔️ Territory Secured!',
      body,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        style: { type: AndroidStyle.BIGTEXT, text: body },
        color: '#A61C28',
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
      ios: { sound: 'default' },
    });
  } catch (e) {
    console.warn('[Notifications] notifyTerritorySecured failed', e);
  }
}

export async function notifyRunComplete(distanceKm: number, coins: number) {
  const body = `${distanceKm.toFixed(2)} km covered · +${coins} war coins earned`;

  if (!notifee || !AndroidImportance) {
    await showFallbackNotification('Run Complete', body);
    return;
  }
  try {
    await ensureChannel();
    await notifee.displayNotification({
      title: '🏁 Run Complete',
      body,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        color: '#57B8FF',
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
      ios: { sound: 'default' },
    });
  } catch (e) {
    console.warn('[Notifications] notifyRunComplete failed', e);
  }
}

export async function notifyKmMilestone(km: number) {
  const messages: Record<number, { title: string; body: string }> = {
    0.5: { title: '🏃 500m In!', body: 'Half a kilometre down. Keep the pace, Commander.' },
    1:   { title: '🔥 1 KM!', body: "First kilometre locked in. Mumbai's watching." },
    2:   { title: '⚡ 2 KM!', body: 'Two klicks covered. Territory is yours to take.' },
    5:   { title: '💀 5 KM Beast!', body: 'Five kilometres. Absolute domination.' },
    10:  { title: '👑 10 KM Legend!', body: "Ten kilometres. You own Mumbai's streets." },
  };
  const msg = messages[km];
  if (!msg) return;

  if (!notifee || !AndroidImportance) {
    await showFallbackNotification(msg.title, msg.body);
    return;
  }
  try {
    await ensureChannel();
    await notifee.displayNotification({
      title: msg.title,
      body: msg.body,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        color: '#F7B733',
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
      ios: { sound: 'default' },
    });
  } catch (e) {
    console.warn('[Notifications] notifyKmMilestone failed', e);
  }
}

export async function notifyHeroSummoned(heroName: string) {
  const body = `${heroName} has answered your call. Command them wisely.`;

  if (!notifee || !AndroidImportance) {
    await showFallbackNotification('Hero Summoned', body);
    return;
  }
  try {
    await ensureChannel();
    await notifee.displayNotification({
      title: '⚡ Hero Summoned',
      body,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        color: '#F7B733',
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
      ios: { sound: 'default' },
    });
  } catch (e) {
    console.warn('[Notifications] notifyHeroSummoned failed', e);
  }
}

/** Schedule an inactivity nudge X hours from now. Call after every run ends. */
export async function scheduleInactivityReminder() {
  if (!notifee || !AndroidTriggerType || !AndroidImportance) return;
  try {
    await ensureChannel();
    // Cancel any existing inactivity reminder first
    await notifee.cancelNotification(INACTIVITY_NOTIF_ID);

    const fireAt = Date.now() + INACTIVITY_HOURS * 60 * 60 * 1000;
    await notifee.createTriggerNotification(
      {
        id: INACTIVITY_NOTIF_ID,
        title: '⚠️ Sectors at Risk!',
        body: `You haven't run in ${INACTIVITY_HOURS} hours. Your territories are being contested.`,
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          color: '#FF8B5E',
          smallIcon: 'ic_launcher',
          pressAction: { id: 'default' },
        },
        ios: { sound: 'default' },
      },
      {
        type: AndroidTriggerType.TIMESTAMP,
        timestamp: fireAt,
      },
    );
  } catch (e) {
    console.warn('[Notifications] scheduleInactivityReminder failed', e);
  }
}

/** Cancel inactivity reminder when the user starts a new run. */
export async function cancelInactivityReminder() {
  if (!notifee) return;
  try {
    await notifee.cancelNotification(INACTIVITY_NOTIF_ID);
  } catch {
    // ignore
  }
}

export async function notifyDailyStreak(streakDays: number) {
  const body = `${streakDays} day streak active. Run before midnight to keep it burning.`;

  if (!notifee || !AndroidImportance) {
    await showFallbackNotification('Streak Alive!', body);
    return;
  }
  try {
    await ensureChannel();
    await notifee.displayNotification({
      title: '🔥 Streak Alive!',
      body,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        color: '#FF8B5E',
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
      ios: { sound: 'default' },
    });
  } catch (e) {
    console.warn('[Notifications] notifyDailyStreak failed', e);
  }
}
