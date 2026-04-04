import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import GlassPanel from '../../components/ui/GlassPanel';
import { useAuth } from '../../context/AuthContext';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await login(email.trim(), password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#BEE8FF', '#EAF7FF', '#FFF3E0']}
        style={styles.background}
      />
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/logo/RunBound White.png')}
              style={styles.logo}
            />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Continue your Mumbai conquest and pick up where your last run ended.
          </Text>
        </View>

        <GlassPanel
          style={styles.formShell}
          accentColors={['rgba(255, 208, 122, 0.7)', 'rgba(143, 221, 255, 0.55)']}
        >
          <LinearGradient
            colors={['#FFF9EF', '#FFF3DF']}
            style={styles.formCard}
          >
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={20} color="#7B90AA" />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#93A5BC"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color="#7B90AA" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#93A5BC"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#7B90AA"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={['#AEE4FF', '#87D1FF']}
                style={styles.ctaGradient}
              >
                <Ionicons name="arrow-forward" size={18} color="#0D4D7A" />
                <Text style={styles.ctaText}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryLink}>
              <Text style={styles.secondaryLinkText}>Forgot password?</Text>
            </TouchableOpacity>
          </LinearGradient>
        </GlassPanel>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New commander?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Create account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF7FF',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  orbTop: {
    position: 'absolute',
    top: -24,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  orbBottom: {
    position: 'absolute',
    left: -40,
    bottom: 80,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoWrap: {
    width: 92,
    height: 92,
    borderRadius: 32,
    backgroundColor: '#FFF9F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#CFE6F8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 7,
  },
  logo: {
    width: 54,
    height: 54,
    resizeMode: 'contain',
  },
  title: {
    marginTop: 18,
    color: '#2A4361',
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 8,
    color: '#728CAA',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  formShell: {
    marginTop: 6,
  },
  formCard: {
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    color: '#28435F',
    fontSize: 16,
    fontWeight: '600',
  },
  ctaButton: {
    marginTop: 6,
    borderRadius: 18,
    overflow: 'hidden',
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaGradient: {
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ctaText: {
    color: '#0D4D7A',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryLinkText: {
    color: '#7A90A9',
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 'auto',
  },
  footerText: {
    color: '#7A90A9',
    fontSize: 14,
  },
  footerLink: {
    color: '#E3911E',
    fontSize: 14,
    fontWeight: '900',
  },
});

export default LoginScreen;
