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
import { BODY_FONT, TITLE_FONT, UI_FONT } from '../../theme/fonts';

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
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#081223', '#10203A', '#1A2546']}
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
          accentColors={['rgba(166, 28, 40, 0.72)', 'rgba(103, 230, 255, 0.34)']}
        >
          <LinearGradient
            colors={['#0D1A31', '#13253D']}
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
                colors={['#A61C28', '#D74B5B']}
                style={styles.ctaGradient}
              >
                <Ionicons name="arrow-forward" size={18} color="#FFF1D8" />
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
    backgroundColor: '#081223',
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
    backgroundColor: 'rgba(103, 230, 255, 0.14)',
  },
  orbBottom: {
    position: 'absolute',
    left: -40,
    bottom: 80,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(166, 28, 40, 0.14)',
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
    backgroundColor: '#172844',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#081223',
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
    color: '#F4F8FF',
    fontSize: 32,
    fontFamily: TITLE_FONT,
  },
  subtitle: {
    marginTop: 8,
    color: '#9AB5D1',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: BODY_FONT,
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(103, 230, 255, 0.14)',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    color: '#E8F1FA',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: BODY_FONT,
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
    color: '#FFF1D8',
    fontSize: 16,
    fontFamily: UI_FONT,
  },
  secondaryLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryLinkText: {
    color: '#9AB5D1',
    fontSize: 13,
    fontFamily: UI_FONT,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 'auto',
  },
  footerText: {
    color: '#9AB5D1',
    fontSize: 14,
    fontFamily: UI_FONT,
  },
  footerLink: {
    color: '#F5C15D',
    fontSize: 14,
    fontFamily: UI_FONT,
  },
});

export default LoginScreen;
