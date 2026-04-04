import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Image,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ActiveRun from './screens/ActiveRun';
import Feed from './screens/Feed';
import Home from './screens/Home';
import RunMap from './screens/Map';
import Profile from './screens/Profile';
import Run from './screens/Run';

function RootStack() {
  const Stack = createNativeStackNavigator();
  
  function TabsScreen() {
    const Tab = createBottomTabNavigator();

    function CustomHeader() {
      return (
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Image
                source={require('./assets/logo/RunBound White.png')}
                style={{
                  width: 40,
                  height: 40,
                  resizeMode: 'center',
                }}
              />
            </View>
            <TouchableOpacity style={styles.addButton}>
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.chatButton}>
            <Ionicons name="chatbubble-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <Tab.Navigator
        screenOptions={{
          tabBarInactiveBackgroundColor: '#252525',
          tabBarActiveBackgroundColor: '#252525',
          tabBarActiveTintColor: '#52FF30',
          tabBarStyle: {
            backgroundColor: '#252525',
            borderTopColor: '#252525',
            height: 80,
            paddingTop: 7,
          },
          headerTitleStyle: { color: '#FFFFFF' },
          headerStyle: { backgroundColor: '#252525' },
        }}
      >
        <Tab.Screen
          name="Home"
          component={Home}
          options={{
            header: () => <CustomHeader />,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Map"
          component={RunMap}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map-outline" color={color} size={size} />
            ),
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="Run"
          component={Run}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="walk" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Feed"
          component={Feed}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="compass-outline" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={Profile}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" showHideTransition={'slide'} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="MainTabs" component={TabsScreen} />
        <Stack.Screen 
          name="ActiveRun" 
          component={ActiveRun}
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Navigator>
    </>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <RootStack />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#252525',
    paddingTop: 60,
    // paddingBottom: 20,
    // paddingHorizontal: 20,
    height: 100,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#252525',
  },
  addButton: {
    position: 'absolute',
    bottom: -10,
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#252525',
  },
  chatButton: {
    position: 'absolute',
    right: 20,
    top: 60,
  },
});
