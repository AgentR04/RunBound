import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ActiveRun from './screens/ActiveRun';
import Feed from './screens/Feed';
import Home from './screens/Home';
import RunMap from './screens/Map';
import Powerups from './screens/Powerups';
import Profile from './screens/Profile';
import Run from './screens/Run';
import LoginScreen from './screens/auth/LoginScreen';
import OnboardingScreen from './screens/auth/OnboardingScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import { BODY_FONT, TITLE_FONT, UI_FONT } from './theme/fonts';

function AuthStack() {
  const Stack = createNativeStackNavigator();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <Image
        source={require('./assets/logo/RunBound White.png')}
        style={styles.loadingLogo}
      />
      <ActivityIndicator size="large" color="#4FB9FF" style={styles.spinner} />
      <Text style={styles.loadingText}>Loading RunBound...</Text>
    </View>
  );
}

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
                style={styles.headerLogo}
              />
            </View>
            <TouchableOpacity style={styles.addButton}>
              <Ionicons name="add" size={18} color="#FFF1D8" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.chatButton}>
            <Ionicons name="chatbubble-outline" size={26} color="#F5C15D" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <Tab.Navigator
        screenOptions={{
          tabBarInactiveBackgroundColor: '#081223',
          tabBarActiveBackgroundColor: '#081223',
          tabBarInactiveTintColor: '#7F9DBB',
          tabBarActiveTintColor: '#67E6FF',
          tabBarStyle: {
            backgroundColor: '#081223',
            borderTopColor: 'rgba(166, 28, 40, 0.34)',
            height: 82,
            paddingTop: 7,
            paddingBottom: 8,
          },
          tabBarLabelStyle: { fontFamily: UI_FONT, fontSize: 11 },
          headerTitleStyle: {
            color: '#F4F8FF',
            fontFamily: TITLE_FONT,
          },
          headerStyle: { backgroundColor: '#0B1730' },
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
      <StatusBar barStyle="light-content" showHideTransition="slide" />
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
        <Stack.Screen
          name="Powerups"
          component={Powerups}
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    </>
  );
}

function AppNavigator() {
  const { isAuthenticated, isLoading, needsOnboarding, onboardingLoading, completeOnboarding } =
    useAuth();

  if (isLoading || onboardingLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated && needsOnboarding) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return isAuthenticated ? <RootStack /> : <AuthStack />;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SocketProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0B1730',
    paddingTop: 60,
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
    backgroundColor: '#13253D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#0B1730',
    shadowColor: '#081223',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 7,
  },
  headerLogo: {
    width: 40,
    height: 40,
    resizeMode: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: -10,
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: '#A61C28',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0B1730',
  },
  chatButton: {
    position: 'absolute',
    right: 20,
    top: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#081223',
  },
  loadingLogo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  spinner: {
    marginTop: 20,
  },
  loadingText: {
    color: '#D8E5F3',
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: BODY_FONT,
  },
});
