import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import GlassPanel from '../components/ui/GlassPanel';
import { STAT_FONT, TITLE_FONT, UI_FONT } from '../theme/fonts';

const ACTIVITY_TYPES = ['Run', 'Cycle', 'Swim', 'HIIT', 'Climb', 'Walk'] as const;
const HUB_TABS = ['Discover', 'My Squad', 'Create Race', 'Rankings'] as const;
const DETAIL_TABS = ['Overview', 'Rankings', 'Territories', 'Chat'] as const;
const START_OPTIONS = ['Apr 5, 7:30 PM', 'Apr 6, 6:15 AM', 'Apr 6, 8:00 PM', 'Apr 7, 5:45 AM'] as const;
const REACTIONS = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F525}'] as const;
const MY_SQUAD_ID = 'iron-legion';
const USER_ID = 'astra';
const USER_NAME = 'Astra';
const INIT_JOINED = [MY_SQUAD_ID] as const;
const STATUSES = ['Owned', 'Contested', 'Enemy', 'Neutral'] as const;
const ROLE_COLORS = { Titan: '#F5C15D', Captain: '#67E6FF', Guardian: '#7EF0AF', Soldier: '#D6E2F0' } as const;
const STATUS_COLORS = {
  Owned: { bg: '#183A2B', line: '#3FD598', text: '#8BF2C4' },
  Contested: { bg: '#3A2615', line: '#F5B942', text: '#FFD987' },
  Enemy: { bg: '#381B22', line: '#F06A7B', text: '#FFB3BD' },
  Neutral: { bg: '#1A2A3C', line: '#7D9CBF', text: '#C4D3E7' },
} as const;

type ActivityType = (typeof ACTIVITY_TYPES)[number];
type HubTab = (typeof HUB_TABS)[number];
type DetailTab = (typeof DETAIL_TABS)[number];
type ZoneStatus = (typeof STATUSES)[number];
type Reaction = (typeof REACTIONS)[number];
type AccessMode = 'Open' | 'Squad Only';
type Role = keyof typeof ROLE_COLORS;

type Message = {
  id: string;
  userId: string;
  username: string;
  timestamp: string;
  reactions: Record<Reaction, number>;
} & (
  | { type: 'text'; text: string }
  | { type: 'activity'; activityType: ActivityType; distance: string; duration: string; xp: number }
);

const seeds = [
  ['iron-legion', 'Iron Legion', 'Own the waterfront before sunrise.', ['#651B2A', '#0B1730'], '#F5C15D', 'shield-outline', 184, 12, 'Run', 486200],
  ['velocity-vault', 'Velocity Vault', 'Breakaway packs, no mercy on the climbs.', ['#18396A', '#071A33'], '#67E6FF', 'flash-outline', 132, 9, 'Cycle', 392450],
  ['tidal-kin', 'Tidal Kin', 'Every split moves the shoreline.', ['#0A4E63', '#082335'], '#7EF0AF', 'water-outline', 96, 7, 'Swim', 274880],
  ['pulse-collective', 'Pulse Collective', 'Short rounds, brutal takeovers.', ['#612B10', '#1A1629'], '#FF9361', 'pulse-outline', 148, 11, 'HIIT', 418900],
  ['summit-syndicate', 'Summit Syndicate', 'No wall stays enemy for long.', ['#3A404C', '#101722'], '#D6E2F0', 'triangle-outline', 78, 6, 'Climb', 198340],
  ['city-striders', 'City Striders', 'Walk lanes, collect blocks, hold the grid.', ['#35532D', '#112116'], '#9FE870', 'footsteps-outline', 205, 14, 'Walk', 364500],
] as const;

const communities = seeds.map((seed, i) => {
  const [id, name, tagline, bannerColors, accent, emblemIcon, memberCount, territoryCount, activityType, totalXp] = seed;
  const zones = ['Harbor Gate', 'Signal Ridge', 'Dockline', 'Neon Stair', 'Pulse Yard', 'Atlas Turn', 'Summit Cut', 'Breaker Lane'].map((n, z) => {
    const status = STATUSES[(z + i) % STATUSES.length];
    return { id: `${id}-z${z}`, name: n, status, strength: 35 + ((z + i) * 13) % 60, lastCaptured: status === 'Contested' ? `${z + 8}m ago` : `${z + 1}h ago` };
  });
  const activeRaces = [
    { id: `${id}-r1`, name: `${name} Dawn Push`, activityType, distanceKm: 18, startLabel: 'Today, 7:30 PM', stakes: [zones[1].name, zones[4].name], xpPool: 1200, access: 'Open' as AccessMode, participants: [{ id: 'p1', name: 'Nova', progress: 82, remaining: 3.2 }, { id: USER_ID, name: USER_NAME, progress: 67, remaining: 5.9 }, { id: 'p3', name: 'Blaze', progress: 56, remaining: 7.9 }] },
    { id: `${id}-r2`, name: `${activityType} Blitz`, activityType, distanceKm: 12, startLabel: 'Tomorrow, 6:15 AM', stakes: [zones[2].name], xpPool: 850, access: 'Squad Only' as AccessMode, participants: [{ id: 'p4', name: 'Vex', progress: 91, remaining: 1.1 }, { id: 'p5', name: 'Rune', progress: 73, remaining: 3.4 }] },
  ];
  const leaderboard = [
    { rank: 1, userId: `${id}-1`, username: 'NovaPrime', role: 'Titan' as Role, xp: 18420, zonesOwned: 14 },
    { rank: 2, userId: `${id}-2`, username: 'Torque', role: 'Captain' as Role, xp: 16990, zonesOwned: 12 },
    { rank: 3, userId: `${id}-3`, username: 'Mako', role: 'Guardian' as Role, xp: 15120, zonesOwned: 11 },
    { rank: 4, userId: `${id}-4`, username: 'Orbit', role: 'Guardian' as Role, xp: 14280, zonesOwned: 9 },
    { rank: 5, userId: `${id}-5`, username: 'Kite', role: 'Soldier' as Role, xp: 13840, zonesOwned: 8 },
    { rank: id === MY_SQUAD_ID ? 6 : 8, userId: USER_ID, username: USER_NAME, role: (id === MY_SQUAD_ID ? 'Captain' : 'Soldier') as Role, xp: id === MY_SQUAD_ID ? 12940 : 9840, zonesOwned: id === MY_SQUAD_ID ? 7 : 4 },
    { rank: id === MY_SQUAD_ID ? 7 : 6, userId: `${id}-6`, username: 'Echo', role: 'Soldier' as Role, xp: 12110, zonesOwned: 6 },
  ].sort((a, b) => a.rank - b.rank);
  const feed = [
    { id: `${id}-e1`, username: 'NovaPrime', text: `captured ${zones[0].name}`, timestamp: '2m ago', tint: accent },
    { id: `${id}-e2`, username: 'Rook', text: 'joined the squad', timestamp: '14m ago', tint: '#67E6FF' },
    { id: `${id}-e3`, username: 'Torque', text: `${activeRaces[0].name} completed`, timestamp: '38m ago', tint: '#F06A7B' },
  ];
  const chat: Message[] = [
    { id: `${id}-m1`, type: 'text', userId: 'n1', username: 'NovaPrime', timestamp: '7:12 PM', text: `Contest at ${zones[1].name} is heating up.`, reactions: { '\u{1F44D}': 3, '\u{2764}\u{FE0F}': 1, '\u{1F525}': 4 } },
    { id: `${id}-m2`, type: 'activity', userId: 'n2', username: 'Mako', timestamp: '7:18 PM', activityType, distance: activityType === 'Swim' ? '2.4 km' : '10.8 km', duration: activityType === 'HIIT' ? '32 min' : '46 min', xp: 420, reactions: { '\u{1F44D}': 6, '\u{2764}\u{FE0F}': 2, '\u{1F525}': 8 } },
    { id: `${id}-m3`, type: 'text', userId: 'n3', username: 'Rune', timestamp: '7:24 PM', text: `Rotate to ${zones[3].name}. Keep pressure high.`, reactions: { '\u{1F44D}': 2, '\u{2764}\u{FE0F}': 0, '\u{1F525}': 3 } },
  ];
  return { id, name, tagline, bannerColors, accent, emblemIcon, memberCount, territoryCount, activityType: activityType as ActivityType, totalXp, zones, activeRaces, leaderboard, feed, chat };
});

const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K` : `${n}`);
const avg = (race: (typeof communities)[number]['activeRaces'][number]) => Math.round(race.participants.reduce((s, p) => s + p.progress, 0) / race.participants.length);
type Community = (typeof communities)[number];
type Race = Community['activeRaces'][number];

const Tabs = <T extends string,>({ items, value, onChange }: { items: readonly T[]; value: T; onChange: (v: T) => void }) => (
  <View style={styles.tabs}>{items.map(item => <TouchableOpacity key={item} style={[styles.tab, item === value && styles.tabOn]} onPress={() => onChange(item)}><Text style={[styles.tabText, item === value && styles.tabTextOn]}>{item}</Text></TouchableOpacity>)}</View>
);

const Bar = ({ value, color, bg = 'rgba(255,255,255,0.08)' }: { value: number; color: string; bg?: string }) => <View style={[styles.bar, { backgroundColor: bg }]}><View style={[styles.fill, { width: `${Math.max(value, 4)}%`, backgroundColor: color }]} /></View>;

const Pulse = () => {
  const v = useRef(new Animated.Value(0.3)).current;
  useEffect(() => { const a = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(v, { toValue: 0.3, duration: 700, useNativeDriver: true })])); a.start(); return () => a.stop(); }, [v]);
  return <Animated.View style={[styles.dot, { opacity: v }]} />;
};

export default function Feed() {
  const [hubTab, setHubTab] = useState<HubTab>('Discover');
  const [detailTab, setDetailTab] = useState<DetailTab>('Overview');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityType | 'All'>('All');
  const [joined, setJoined] = useState<string[]>([...INIT_JOINED]);
  const [extraRaces, setExtraRaces] = useState<Race[]>([]);
  const [extraFeed, setExtraFeed] = useState<Record<string, Community['feed']>>({});
  const [chats, setChats] = useState<Record<string, Message[]>>(() => Object.fromEntries(communities.map(c => [c.id, c.chat])));
  const [chatDraft, setChatDraft] = useState('');
  const [notice, setNotice] = useState('Three zones are unstable. Keep the push coordinated.');
  const [raceName, setRaceName] = useState('Harbor Lockdown');
  const [raceType, setRaceType] = useState<ActivityType>('Run');
  const [distance, setDistance] = useState('16');
  const [xp, setXp] = useState('900');
  const [startIdx, setStartIdx] = useState(1);
  const [stakes, setStakes] = useState<string[]>([]);
  const [access, setAccess] = useState<AccessMode>('Squad Only');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const getCommunity = (id: string | null) => {
    const c = communities.find(x => x.id === id);
    if (!c) return null;
    return { ...c, activeRaces: c.id === MY_SQUAD_ID ? [...extraRaces, ...c.activeRaces] : c.activeRaces, feed: [...(extraFeed[c.id] || []), ...c.feed], chat: chats[c.id] || c.chat };
  };
  const squad = getCommunity(MY_SQUAD_ID)!;
  const current = getCommunity(selectedId);
  const shown = filter === 'All' ? communities : communities.filter(c => c.activityType === filter);
  const memberCount = (c: (typeof communities)[number]) => c.memberCount + (INIT_JOINED.includes(c.id as any) === joined.includes(c.id) ? 0 : joined.includes(c.id) ? 1 : -1);
  const valid = raceName.trim() && Number(distance) > 0 && Number(xp) > 0 && stakes.length > 0;

  const toggleJoin = (id: string) => {
    const c = communities.find(x => x.id === id);
    const wasIn = joined.includes(id);
    setJoined(prev => wasIn ? prev.filter(x => x !== id) : [...prev, id]);
    if (id === MY_SQUAD_ID) setNotice(wasIn ? `${c?.name} moved you to observer status.` : `${c?.name} pulled you back into the frontline.`);
  };

  const send = () => {
    if (!current || !chatDraft.trim()) return;
    const out: Message = { id: `m-${Date.now()}`, type: 'text', userId: USER_ID, username: USER_NAME, timestamp: 'now', text: chatDraft.trim(), reactions: { '\u{1F44D}': 0, '\u{2764}\u{FE0F}': 0, '\u{1F525}': 0 } };
    setChats(prev => ({ ...prev, [current.id]: [...(prev[current.id] || []), out] }));
    setChatDraft('');
    const t = setTimeout(() => setChats(prev => ({ ...prev, [current.id]: [...(prev[current.id] || []), { id: `r-${Date.now()}`, type: 'text', userId: `${current.id}-ops`, username: 'Ops Relay', timestamp: 'just now', text: `Copy. Shift pressure toward ${current.zones.find(z => z.status === 'Contested')?.name || current.zones[0].name}.`, reactions: { '\u{1F44D}': 0, '\u{2764}\u{FE0F}': 0, '\u{1F525}': 1 } }] })), 1000 + Math.floor(Math.random() * 1000));
    timers.current.push(t);
  };

  const react = (communityId: string, msgId: string, emoji: Reaction) => setChats(prev => ({ ...prev, [communityId]: (prev[communityId] || []).map(m => m.id === msgId ? { ...m, reactions: { ...m.reactions, [emoji]: m.reactions[emoji] + 1 } } : m) }));

  const submitRace = () => {
    if (!valid) return;
    const race = { id: `cr-${Date.now()}`, name: raceName.trim(), activityType: raceType, distanceKm: Number(distance), startLabel: START_OPTIONS[startIdx], stakes, xpPool: Number(xp), access, participants: [{ id: USER_ID, name: USER_NAME, progress: 0, remaining: Number(distance) }, { id: 'ally', name: 'NovaPrime', progress: 0, remaining: Number(distance) }] };
    setExtraRaces(prev => [race, ...prev]);
    setExtraFeed(prev => ({ ...prev, [MY_SQUAD_ID]: [{ id: `e-${Date.now()}`, username: USER_NAME, text: `launched ${race.name} for ${stakes.join(', ')}`, timestamp: 'just now', tint: '#67E6FF' }, ...(prev[MY_SQUAD_ID] || [])] }));
    setRaceName(''); setDistance('12'); setXp('750'); setStakes([]); setAccess('Open'); setStartIdx(2); setHubTab('My Squad'); setNotice(`${race.name} is live for ${race.startLabel}. ${race.stakes.length} territories are on the line.`);
  };

  const rankings = (c: NonNullable<typeof current> | typeof squad, roles = false) => <>
    <GlassPanel style={styles.card}><View style={styles.inner}><Text style={styles.title}>Top 3 podium</Text><View style={styles.podium}>{[c.leaderboard[1], c.leaderboard[0], c.leaderboard[2]].map((x, i) => <View key={x.userId} style={[styles.podiumBox, { height: i === 1 ? 156 : 126, borderColor: ROLE_COLORS[x.role], backgroundColor: `${ROLE_COLORS[x.role]}33` }]}><Text style={styles.podiumRank}>#{x.rank}</Text><Text style={styles.podiumName}>{x.username}</Text><Text style={styles.sub}>{compact(x.xp)} XP</Text></View>)}</View></View></GlassPanel>
    <GlassPanel style={styles.card}><View style={styles.inner}><Text style={styles.title}>Leaderboard</Text>{c.leaderboard.map(x => <View key={x.userId} style={[styles.row, x.userId === USER_ID && styles.rowOn]}><Text style={styles.rank}>{x.rank}</Text><View style={styles.avatar}><Text style={styles.avatarText}>{x.username[0]}</Text></View><View style={{ flex: 1 }}><Text style={styles.body}>{x.username}</Text>{roles ? <View style={[styles.badge, { backgroundColor: `${ROLE_COLORS[x.role]}20`, borderColor: `${ROLE_COLORS[x.role]}55` }]}><Text style={[styles.badgeText, { color: ROLE_COLORS[x.role] }]}>{x.role}</Text></View> : null}</View><View style={styles.stat}><Text style={styles.statNum}>{compact(x.xp)}</Text><Text style={styles.mini}>XP</Text></View><View style={styles.stat}><Text style={styles.statNum}>{x.zonesOwned}</Text><Text style={styles.mini}>Zones</Text></View></View>)}</View></GlassPanel>
  </>;

  const hub = <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Tabs items={HUB_TABS} value={hubTab} onChange={setHubTab} />
    {hubTab === 'Discover' ? <>
      <GlassPanel style={styles.card}><LinearGradient colors={['#081223', '#10203A', '#1A2546']} style={styles.hero}><Text style={styles.kicker}>Community Hub</Text><Text style={styles.heroTitle}>Find squads worth backing</Text><Text style={styles.sub}>Pick an activity lane, scout the field, and open any community inline.</Text></LinearGradient></GlassPanel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{(['All', ...ACTIVITY_TYPES] as const).map(x => <TouchableOpacity key={x} style={[styles.pill, x === filter && styles.pillOn]} onPress={() => setFilter(x)}><Text style={[styles.pillText, x === filter && styles.pillTextOn]}>{x}</Text></TouchableOpacity>)}</ScrollView>
      <View style={styles.grid}>{shown.map(c => <Pressable key={c.id} style={styles.half} onPress={() => { setSelectedId(c.id); setDetailTab('Overview'); }}><GlassPanel style={styles.card}><LinearGradient colors={[...c.bannerColors]} style={styles.community}><View style={styles.between}><View style={[styles.iconBox, { backgroundColor: `${c.accent}22` }]}><Icon name={c.emblemIcon} size={20} color={c.accent} /></View><View style={[styles.tag, { backgroundColor: `${c.accent}22` }]}><Text style={[styles.tagText, { color: c.accent }]}>{c.activityType}</Text></View></View><Text style={styles.headline}>{c.name}</Text><Text style={styles.sub}>{c.tagline}</Text><View style={styles.metaRow}><View style={styles.meta}><Text style={styles.metaNum}>{compact(memberCount(c))}</Text><Text style={styles.mini}>Members</Text></View><View style={styles.meta}><Text style={styles.metaNum}>{c.territoryCount}</Text><Text style={styles.mini}>Territories</Text></View></View><TouchableOpacity style={[styles.action, joined.includes(c.id) && styles.actionOff]} onPress={() => toggleJoin(c.id)}><Text style={styles.actionText}>{joined.includes(c.id) ? 'Leave' : 'Join'}</Text></TouchableOpacity></LinearGradient></GlassPanel></Pressable>)}</View>
    </> : null}
    {hubTab === 'My Squad' ? <>
      <GlassPanel style={styles.card}><LinearGradient colors={[...squad.bannerColors]} style={styles.hero}><View style={styles.between}><View style={{ flex: 1 }}><Text style={styles.kicker}>My Squad</Text><Text style={styles.heroTitle}>{squad.name}</Text><Text style={styles.sub}>{squad.tagline}</Text></View><TouchableOpacity style={[styles.action, joined.includes(squad.id) && styles.actionOff, { marginTop: 0, width: 92 }]} onPress={() => toggleJoin(squad.id)}><Text style={styles.actionText}>{joined.includes(squad.id) ? 'Leave' : 'Join'}</Text></TouchableOpacity></View><View style={styles.metaRow}>{[['Members', compact(memberCount(squad))], ['Territories', `${squad.territoryCount}`], ['Active Races', `${squad.activeRaces.length}`]].map(x => <View key={x[0]} style={styles.meta}><Text style={styles.metaNum}>{x[1]}</Text><Text style={styles.mini}>{x[0]}</Text></View>)}</View><View style={styles.banner}><Icon name="radio-outline" size={14} color="#F5C15D" /><Text style={[styles.sub, { flex: 1, marginTop: 0 }]}>{notice}</Text></View></LinearGradient></GlassPanel>
      <GlassPanel style={styles.card}><View style={styles.inner}><Text style={styles.title}>Territory map</Text><View style={styles.legend}>{STATUSES.map(s => <View key={s} style={styles.legendItem}><View style={[styles.swatch, { backgroundColor: STATUS_COLORS[s].line }]} /><Text style={styles.mini}>{s}</Text></View>)}</View><View style={styles.grid}>{squad.zones.map(z => <View key={z.id} style={[styles.tile, { backgroundColor: STATUS_COLORS[z.status].bg, borderColor: STATUS_COLORS[z.status].line }]}><Text style={styles.body}>{z.name}</Text><Text style={[styles.mini, { color: STATUS_COLORS[z.status].text }]}>{z.status}</Text></View>)}</View></View></GlassPanel>
      <GlassPanel style={styles.card}><View style={styles.inner}><Text style={styles.title}>Live race tracker</Text>{squad.activeRaces.map(r => <View key={r.id} style={styles.block}><View style={styles.between}><View><Text style={styles.body}>{r.name}</Text><Text style={styles.mini}>{r.activityType} • {r.distanceKm} km • {r.startLabel}</Text></View><Text style={styles.statNum}>{r.xpPool} XP</Text></View>{r.participants.map(p => <View key={p.id} style={{ marginTop: 10 }}><View style={styles.between}><Text style={styles.miniBright}>{p.name}</Text><Text style={styles.mini}>{p.progress}% • {p.remaining.toFixed(1)} km left</Text></View><Bar value={p.progress} color="#67E6FF" /></View>)}</View>)}</View></GlassPanel>
      <View style={styles.metaRow}>{(['Create Race', 'Invite Member', 'View Map'] as const).map(x => <TouchableOpacity key={x} style={styles.quick} onPress={() => { if (x === 'Create Race') { setHubTab('Create Race'); setNotice('Race builder primed. Pick the zones to put on the line.'); } else if (x === 'Invite Member') setNotice('Invite beacon dispatched. Two prospects are viewing the squad card.'); else setNotice('Map uplink refreshed. Contested sectors are flashing hot.'); }}><Text style={styles.quickText}>{x}</Text></TouchableOpacity>)}</View>
    </> : null}
    {hubTab === 'Create Race' ? <GlassPanel style={styles.card}><View style={styles.inner}><Text style={styles.title}>Create race</Text><Text style={styles.label}>Race Name</Text><TextInput value={raceName} onChangeText={setRaceName} placeholder="Name the operation" placeholderTextColor="#6F88A8" style={styles.input} /><Text style={styles.label}>Activity Type</Text><View style={styles.wrap}>{ACTIVITY_TYPES.map(x => <TouchableOpacity key={x} style={[styles.pill, raceType === x && styles.tabOn]} onPress={() => setRaceType(x)}><Text style={[styles.pillText, raceType === x && styles.tabTextOn]}>{x}</Text></TouchableOpacity>)}</View><View style={styles.metaRow}><View style={styles.half}><Text style={styles.label}>Distance</Text><TextInput value={distance} onChangeText={setDistance} keyboardType="numeric" placeholder="12" placeholderTextColor="#6F88A8" style={styles.input} /></View><View style={styles.half}><Text style={styles.label}>XP Pool</Text><TextInput value={xp} onChangeText={setXp} keyboardType="numeric" placeholder="750" placeholderTextColor="#6F88A8" style={styles.input} /></View></View><Text style={styles.label}>Start Date/Time</Text><View style={styles.timeRow}><TouchableOpacity style={styles.navBtn} onPress={() => setStartIdx(i => (i - 1 + START_OPTIONS.length) % START_OPTIONS.length)}><Icon name="chevron-back" size={18} color="#DDE7F0" /></TouchableOpacity><View style={[styles.input, { flex: 1, justifyContent: 'center' }]}><Text style={styles.body}>{START_OPTIONS[startIdx]}</Text></View><TouchableOpacity style={styles.navBtn} onPress={() => setStartIdx(i => (i + 1) % START_OPTIONS.length)}><Icon name="chevron-forward" size={18} color="#DDE7F0" /></TouchableOpacity></View><Text style={styles.label}>Territory Stakes</Text><View style={styles.wrap}>{squad.zones.map(z => <TouchableOpacity key={z.id} style={[styles.check, stakes.includes(z.name) && styles.checkOn]} onPress={() => setStakes(prev => prev.includes(z.name) ? prev.filter(x => x !== z.name) : [...prev, z.name])}><View style={[styles.box, stakes.includes(z.name) && styles.boxOn]}>{stakes.includes(z.name) ? <Icon name="checkmark" size={14} color="#081223" /> : null}</View><Text style={styles.miniBright}>{z.name}</Text></TouchableOpacity>)}</View><Text style={styles.label}>Access Control</Text><View style={styles.metaRow}>{(['Open', 'Squad Only'] as const).map(x => <TouchableOpacity key={x} style={[styles.quick, access === x && styles.accessOn]} onPress={() => setAccess(x)}><Text style={styles.quickText}>{x}</Text></TouchableOpacity>)}</View><TouchableOpacity style={[styles.action, !valid && styles.dim]} onPress={submitRace} disabled={!valid}><Text style={styles.actionText}>Launch Race</Text></TouchableOpacity></View></GlassPanel> : null}
    {hubTab === 'Rankings' ? rankings(squad) : null}
  </ScrollView>;

  const detail = current ? <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <TouchableOpacity style={styles.back} onPress={() => setSelectedId(null)}><Icon name="chevron-back" size={18} color="#DDE7F0" /><Text style={styles.tabTextOn}>Back to hub</Text></TouchableOpacity>
    <GlassPanel style={styles.card}><LinearGradient colors={[...current.bannerColors]} style={styles.hero}><View style={styles.between}><View style={[styles.rowMini, { flex: 1, alignItems: 'flex-start' }]}><View style={[styles.bigIcon, { backgroundColor: `${current.accent}22` }]}><Icon name={current.emblemIcon} size={26} color={current.accent} /></View><View style={{ flex: 1 }}><Text style={styles.kicker}>Community Detail</Text><Text style={styles.heroTitle}>{current.name}</Text><Text style={styles.sub}>{current.tagline}</Text></View></View><TouchableOpacity style={[styles.action, joined.includes(current.id) && styles.actionOff, { marginTop: 0, width: 92 }]} onPress={() => toggleJoin(current.id)}><Text style={styles.actionText}>{joined.includes(current.id) ? 'Leave' : 'Join'}</Text></TouchableOpacity></View><View style={styles.metaRow}>{[['Members', compact(memberCount(current))], ['Territories', `${current.territoryCount}`], ['Active Races', `${current.activeRaces.length}`]].map(x => <View key={x[0]} style={styles.meta}><Text style={styles.metaNum}>{x[1]}</Text><Text style={styles.mini}>{x[0]}</Text></View>)}</View></LinearGradient></GlassPanel>
    <Tabs items={DETAIL_TABS} value={detailTab} onChange={setDetailTab} />
    {detailTab === 'Overview' ? <>
      <View style={styles.grid}>{[['Total XP', compact(current.totalXp)], ['Members', compact(memberCount(current))], ['Territories', `${current.territoryCount}`], ['Active Races', `${current.activeRaces.length}`]].map(x => <GlassPanel key={x[0]} style={styles.half}><View style={styles.inner}><Text style={styles.metaNum}>{x[1]}</Text><Text style={styles.mini}>{x[0]}</Text></View></GlassPanel>)}</View>
      <GlassPanel style={styles.card}><View style={styles.inner}><Text style={styles.title}>Active races</Text>{current.activeRaces.map(r => <View key={r.id} style={styles.block}><View style={styles.between}><View><Text style={styles.body}>{r.name}</Text><Text style={styles.mini}>{r.participants.map(p => p.name).join(', ')}</Text></View><Text style={styles.statNum}>{avg(r)}%</Text></View><Bar value={avg(r)} color={current.accent} /></View>)}</View></GlassPanel>
      <GlassPanel style={styles.card}><View style={styles.inner}><Text style={styles.title}>Activity feed</Text>{current.feed.map(e => <View key={e.id} style={styles.row}><View style={[styles.avatar, { backgroundColor: `${e.tint}22` }]}><Text style={styles.avatarText}>{e.username[0]}</Text></View><View style={{ flex: 1 }}><Text style={styles.body}><Text style={styles.miniBright}>{e.username}</Text> {e.text}</Text><Text style={styles.mini}>{e.timestamp}</Text></View></View>)}</View></GlassPanel>
    </> : null}
    {detailTab === 'Rankings' ? rankings(current, true) : null}
    {detailTab === 'Territories' ? <GlassPanel style={styles.card}><View style={styles.inner}><Text style={styles.title}>All territories</Text>{current.zones.map(z => <View key={z.id} style={styles.block}><View style={styles.between}><View><Text style={styles.body}>{z.name}</Text><View style={styles.rowMini}>{z.status === 'Contested' ? <Pulse /> : null}<Text style={[styles.mini, { color: STATUS_COLORS[z.status].text }]}>{z.status}</Text></View></View><Text style={styles.mini}>{z.lastCaptured}</Text></View><Bar value={z.strength} color={STATUS_COLORS[z.status].line} bg={`${STATUS_COLORS[z.status].line}22`} /><View style={styles.between}><Text style={styles.mini}>{z.strength}% strength</Text>{z.status === 'Contested' ? <TouchableOpacity style={styles.defend}><Text style={styles.defendText}>Defend</Text></TouchableOpacity> : null}</View></View>)}</View></GlassPanel> : null}
    {detailTab === 'Chat' ? <GlassPanel style={styles.card}><View style={styles.inner}><Text style={styles.title}>Squad chat</Text><ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 12, paddingBottom: 12 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>{current.chat.map(m => <View key={m.id} style={styles.block}><View style={styles.rowMini}><View style={styles.avatar}><Text style={styles.avatarText}>{m.username[0]}</Text></View><View style={{ flex: 1 }}><Text style={styles.body}>{m.username}</Text><Text style={styles.mini}>{m.timestamp}</Text></View></View>{m.type === 'text' ? <Text style={[styles.body, { marginTop: 10 }]}>{m.text}</Text> : <View style={styles.activity}><View style={styles.between}><Text style={styles.body}>{m.activityType} summary</Text><Text style={styles.statNum}>+{m.xp} XP</Text></View><Text style={styles.miniBright}>{m.distance} • {m.duration}</Text></View>}<View style={styles.rowMini}>{REACTIONS.map(r => <TouchableOpacity key={r} style={styles.react} onPress={() => react(current.id, m.id, r)}><Text style={styles.miniBright}>{r} {m.reactions[r]}</Text></TouchableOpacity>)}</View></View>)}</ScrollView><View style={styles.timeRow}><TextInput value={chatDraft} onChangeText={setChatDraft} placeholder="Send a message" placeholderTextColor="#6F88A8" style={[styles.input, { flex: 1 }]} /><TouchableOpacity style={[styles.action, !chatDraft.trim() && styles.dim, { marginTop: 0, width: 86 }]} onPress={send} disabled={!chatDraft.trim()}><Text style={styles.actionText}>Send</Text></TouchableOpacity></View></View></GlassPanel> : null}
  </ScrollView> : null;

  return <View style={styles.wrapAll}><LinearGradient colors={['#081223', '#10203A', '#1A2546']} style={StyleSheet.absoluteFill} /><View style={styles.glowA} /><View style={styles.glowB} />{detail || hub}</View>;
}

const styles = StyleSheet.create({
  wrapAll: { flex: 1, backgroundColor: '#081223' },
  glowA: { position: 'absolute', top: 40, right: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(103,230,255,0.14)' },
  glowB: { position: 'absolute', bottom: 150, left: -36, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(166,28,40,0.18)' },
  scroll: { flex: 1 }, content: { padding: 16, paddingBottom: 36 }, card: { marginBottom: 2 }, inner: { padding: 16 }, hero: { padding: 20, borderRadius: 27 }, tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }, tab: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }, tabOn: { backgroundColor: 'rgba(103,230,255,0.18)', borderColor: 'rgba(103,230,255,0.45)' }, tabText: { color: '#AEC3DA', fontSize: 12, fontFamily: UI_FONT }, tabTextOn: { color: '#F7FBFF', fontSize: 12, fontFamily: UI_FONT }, kicker: { color: '#F5C15D', fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', fontFamily: UI_FONT }, heroTitle: { marginTop: 4, color: '#F7FBFF', fontSize: 30, fontFamily: TITLE_FONT }, title: { color: '#F7FBFF', fontSize: 24, fontFamily: TITLE_FONT, marginBottom: 12 }, headline: { marginTop: 14, color: '#F7FBFF', fontSize: 23, fontFamily: TITLE_FONT }, body: { color: '#F2F7FD', fontSize: 14, lineHeight: 20, fontFamily: UI_FONT }, sub: { color: '#C3D3E5', fontSize: 13, lineHeight: 19, fontFamily: UI_FONT }, mini: { color: '#9FB5CA', fontSize: 11, fontFamily: UI_FONT }, miniBright: { color: '#F7FBFF', fontSize: 12, fontFamily: UI_FONT }, filters: { gap: 8, paddingRight: 8, marginBottom: 14 }, pill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: 'rgba(255,255,255,0.06)' }, pillOn: { backgroundColor: '#A61C28' }, pillText: { color: '#C9D7E7', fontSize: 12, fontFamily: UI_FONT }, pillTextOn: { color: '#FFF1D8', fontSize: 12, fontFamily: UI_FONT }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }, half: { width: '48%' }, community: { minHeight: 220, padding: 16, borderRadius: 27 }, between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, iconBox: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, bigIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, tag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }, tagText: { fontSize: 11, textTransform: 'uppercase', fontFamily: UI_FONT }, metaRow: { flexDirection: 'row', gap: 10, marginTop: 14 }, meta: { flex: 1, borderRadius: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.08)' }, metaNum: { color: '#F7FBFF', fontSize: 21, fontFamily: STAT_FONT }, action: { marginTop: 18, borderRadius: 16, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#67E6FF' }, actionOff: { backgroundColor: '#A61C28' }, actionText: { color: '#081223', fontSize: 13, fontFamily: UI_FONT }, banner: { borderRadius: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', gap: 8 }, legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, swatch: { width: 10, height: 10, borderRadius: 5 }, tile: { width: '48%', minHeight: 84, borderRadius: 18, borderWidth: 1, padding: 12, justifyContent: 'space-between' }, block: { marginTop: 10, borderRadius: 18, padding: 14, backgroundColor: 'rgba(255,255,255,0.05)' }, quick: { flex: 1, borderRadius: 18, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(103,230,255,0.2)', alignItems: 'center' }, quickText: { color: '#F3F8FF', fontSize: 12, fontFamily: UI_FONT }, accessOn: { backgroundColor: 'rgba(245,193,93,0.2)', borderColor: 'rgba(245,193,93,0.34)' }, label: { marginTop: 6, marginBottom: 8, color: '#BFD0E3', fontSize: 12, textTransform: 'uppercase', fontFamily: UI_FONT }, input: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', color: '#F7FBFF', fontSize: 14, fontFamily: UI_FONT }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }, navBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }, check: { minWidth: '48%', flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.06)' }, checkOn: { borderWidth: 1, borderColor: 'rgba(126,240,175,0.38)', backgroundColor: 'rgba(126,240,175,0.12)' }, box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)', alignItems: 'center', justifyContent: 'center' }, boxOn: { backgroundColor: '#7EF0AF', borderColor: '#7EF0AF' }, podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, paddingTop: 8 }, podiumBox: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 10, alignItems: 'center', justifyContent: 'flex-end' }, podiumRank: { color: '#F7FBFF', fontSize: 15, fontFamily: STAT_FONT }, podiumName: { marginTop: 8, color: '#F7FBFF', fontSize: 16, textAlign: 'center', fontFamily: UI_FONT }, row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }, rowOn: { borderRadius: 18, paddingHorizontal: 10, backgroundColor: 'rgba(103,230,255,0.12)', borderWidth: 1, borderColor: 'rgba(103,230,255,0.22)' }, rowMini: { flexDirection: 'row', alignItems: 'center', gap: 8 }, rank: { width: 26, color: '#F7FBFF', fontSize: 15, textAlign: 'center', fontFamily: STAT_FONT }, avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#F7FBFF', fontSize: 14, fontFamily: UI_FONT }, stat: { minWidth: 54, alignItems: 'flex-end' }, statNum: { color: '#F7FBFF', fontSize: 14, fontFamily: STAT_FONT }, badge: { alignSelf: 'flex-start', marginTop: 6, borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 }, badgeText: { fontSize: 10, textTransform: 'uppercase', fontFamily: UI_FONT }, back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.06)' }, bar: { height: 8, borderRadius: 999, overflow: 'hidden', marginTop: 6 }, fill: { height: '100%', borderRadius: 999 }, dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F5B942' }, defend: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(245,185,66,0.18)', borderWidth: 1, borderColor: 'rgba(245,185,66,0.4)' }, defendText: { color: '#FFD987', fontSize: 12, fontFamily: UI_FONT }, activity: { marginTop: 10, borderRadius: 16, padding: 12, backgroundColor: 'rgba(103,230,255,0.1)', borderWidth: 1, borderColor: 'rgba(103,230,255,0.2)' }, react: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.06)' }, dim: { opacity: 0.45 },
});
