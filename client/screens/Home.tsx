import { useCallback, useState } from 'react';
import {
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

const Home = ({ navigation }: any) => {
  const weekDays = [
    { day: 'Mon', date: '11' },
    { day: 'Tue', date: '12' },
    { day: 'Wed', date: '13' },
    { day: 'Thu', date: '14' },
    { day: 'Fri', date: '15' },
    { day: 'Sat', date: '16' },
    { day: 'Sun', date: '17' },
  ];

  const activities = [
    {
      id: 1,
      title: 'Morning Walk',
      date: '29/12/2025',
      distance: '45.3',
      bpm: '91 bpm',
      calories: '1390 kcal',
    },
    {
      id: 2,
      title: 'Morning Walk',
      date: '29/12/2025',
      distance: '45.3',
      bpm: '91 bpm',
      calories: '1390 kcal',
    },
    {
      id: 3,
      title: 'Morning Walk',
      date: '29/12/2025',
      distance: '45.3',
      bpm: '91 bpm',
      calories: '1390 kcal',
    },
  ];

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1, paddingBottom: 25 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#43DB25', '#fff']}
            progressBackgroundColor="#252525"
            progressViewOffset={19}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Week Calendar */}
        <View style={styles.weekContainer}>
          {weekDays.map((item, index) => (
            <View key={index}>
              {index === 3 ? (
                <LinearGradient
                  colors={['#43DB25', '#203b19']}
                  style={styles.activeDayContainer}
                >
                  <View style={styles.activeDayTop}>
                    <Text style={styles.activeDayText}>{item.day}</Text>
                  </View>
                  <View style={styles.activeDayBottom}>
                    <Text style={styles.activeDayDate}>{item.date}</Text>
                  </View>
                </LinearGradient>
              ) : (
                <LinearGradient
                  style={styles.dayCircle}
                  colors={['#43DB25', '#203b19']}
                >
                  <View style={styles.innerDayCircle}>
                    <Text style={styles.dayText}>{item.day}</Text>
                    <Text style={styles.dayText}>{item.date}</Text>
                  </View>
                </LinearGradient>
              )}
            </View>
          ))}
        </View>

        {/* Your Progress */}
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionTitleBold}>Your</Text> Progress
        </Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressLeft}>
            {/* Distance */}
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Ionicons name="footsteps-outline" size={16} color="#777" />
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  gap: 4,
                }}
              >
                <Text style={styles.statValue}>45.3</Text>
                <Text style={styles.statUnit}>km</Text>
              </View>
            </View>

            {/* Territories */}
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Ionicons name="flag-outline" size={16} color="#777" />
                <Text style={styles.statLabel}>Territories</Text>
              </View>
              <Text style={styles.statValue}>14</Text>
            </View>
          </View>

          {/* Routes */}
          <TouchableOpacity
            style={styles.routesCard}
            onPress={() => navigation.navigate('Map')}
          >
            <ImageBackground
              source={require('../assets/map.jpg')}
              style={styles.routesCard}
            >
              <LinearGradient
                locations={[0.2, 0.8]}
                colors={['#00000000', '#191919']}
                style={styles.routesOverlay}
              >
                <Text style={styles.routesLabel}>Routes</Text>
              </LinearGradient>
            </ImageBackground>
          </TouchableOpacity>
        </View>

        {/* Recent Activities */}
        <View style={styles.activitiesHeader}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.sectionTitleBold}>Recent</Text> Activities
          </Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        {activities.map(activity => (
          <View key={activity.id} style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <View style={styles.innerActivityIcon}>
                <Ionicons name="walk" size={28} color="#1F1F1D" />
              </View>
            </View>

            <View style={styles.activityInfo}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <Text style={styles.activityTitle}>{activity.title}</Text>
                {/* <Text
                  style={{
                    color: '#888',
                    fontSize: 24,
                    marginHorizontal: 4,
                  }}
                >
                  •
                </Text> */}
                <Text style={styles.activityDate}>{activity.date}</Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  gap: 9,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 9,
                  }}
                >
                  <View
                    style={{
                      alignItems: 'flex-end',
                      flexDirection: 'row',
                      gap: 2,
                    }}
                  >
                    <Text style={styles.activityDistance}>
                      {activity.distance}
                    </Text>
                    <Text
                      style={{
                        color: '#e9e9e9',
                        fontSize: 16,
                        fontWeight: 'bold',
                        marginBottom: 5.5,
                        fontStyle: 'italic',
                      }}
                    >
                      km
                    </Text>
                  </View>
                  <View style={styles.activityStats}>
                    <View style={styles.activityStat}>
                      <Ionicons name="heart-outline" size={14} color="#888" />
                      <Text style={styles.activityStatText}>
                        {activity.bpm}
                      </Text>
                    </View>
                    <View style={styles.activityStat}>
                      <Ionicons name="flame-outline" size={14} color="#888" />
                      <Text style={styles.activityStatText}>
                        {activity.calories}
                      </Text>
                    </View>
                  </View>
                </View>
                <View>
                  <TouchableOpacity style={styles.activityArrow}>
                    <Ionicons name="arrow-forward" size={18} color="#52FF30" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141412',
    paddingHorizontal: 16,
    paddingTop: 22,
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    alignItems: 'center',
  },
  dayCircle: {
    height: 72,
    width: 42,
    borderRadius: 20,
  },
  innerDayCircle: {
    flex: 1,
    margin: 1.5,
    borderRadius: 20,
    backgroundColor: '#252525',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 6,
  },
  activeDayContainer: {
    width: 42,
    height: 72,
    borderRadius: 20,
    overflow: 'hidden',
  },
  activeDayTop: {
    height: 72,
    // backgroundColor: '#52FF30',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 8,
  },
  activeDayBottom: {
    width: 38,
    height: 38,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 2.5,
    left: 2,
  },
  activeDayText: {
    color: '#fff',
    fontSize: 12,
  },
  activeDayDate: {
    color: '#000000',
    fontSize: 12,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 18,
    marginBottom: 16,
  },
  sectionTitleBold: {
    color: '#fff',
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  progressLeft: {
    flex: 1,
    gap: 10,
  },
  statCard: {
    backgroundColor: '#1F1F1D',
    borderRadius: 16,
    padding: 10,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    color: '#777',
    fontSize: 16,
  },
  statValue: {
    color: '#fff',
    fontSize: 42,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  statUnit: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  routesCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    height: '100%',
  },
  routesOverlay: {
    height: '100%',
    width: '100%',

    backgroundColor: 'rgba(20, 20, 18, 0.6)',
  },
  routesLabel: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    fontStyle: 'italic',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  activitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // marginBottom: 16,
  },
  viewAllText: {
    color: '#777',
    fontSize: 14,
    marginBottom: 16,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#1F1F1D',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    height: 100,
  },
  activityIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#35A91E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  innerActivityIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#43DB25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  activityTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  activityDate: {
    color: '#888',
    fontSize: 14,
  },
  activityDistance: {
    color: '#e9e9e9',
    fontSize: 24,
    fontWeight: 'bold',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  activityStats: {
    flexDirection: 'column',
    gap: 1,
  },
  activityStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityStatText: {
    color: '#888',
    fontSize: 12,
  },
  activityArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#252525',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#52FF30',
  },
});
