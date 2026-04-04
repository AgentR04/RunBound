import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

interface RegisterScreenProps {
  navigation: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const validateForm = () => {
    if (
      !email.trim() ||
      !username.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters long');
      return false;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await register(email.trim(), username.trim(), password);
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error.message || 'Unable to create account',
      );
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
        colors={['#BDE8FF', '#EAF7FF', '#FFF3E0']}
        style={styles.background}
      />
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/logo/RunBound White.png')}
              style={styles.logo}
            />
          </View>
          <Text style={styles.title}>Join RunBound</Text>
          <Text style={styles.subtitle}>
            Create your command profile and start painting Mumbai with your routes.
          </Text>
        </View>

        <GlassPanel
          style={styles.formShell}
          accentColors={['rgba(255, 208, 122, 0.72)', 'rgba(143, 221, 255, 0.55)']}
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
              <Ionicons name="person-outline" size={20} color="#7B90AA" />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#93A5BC"
                value={username}
                onChangeText={setUsername}
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

            <View style={styles.inputWrap}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#7B90AA" />
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor="#93A5BC"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(prev => !prev)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#7B90AA"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.requirementBanner}>
              <Ionicons name="sparkles-outline" size={16} color="#E3911E" />
              <Text style={styles.requirementText}>
                Use 8+ characters so your profile is battle ready.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <LinearGradient
                colors={['#AEE4FF', '#87D1FF']}
                style={styles.ctaGradient}
              >
                <Ionicons name="rocket-outline" size={18} color="#0D4D7A" />
                <Text style={styles.ctaText}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </GlassPanel>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    top: -22,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  orbBottom: {
    position: 'absolute',
    left: -45,
    bottom: 90,
    width: 185,
    height: 185,
    borderRadius: 92.5,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
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
    lineHeight: 22,
    textAlign: 'center',
  },
  formShell: {
    marginTop: 4,
  },
  formCard: {
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 58,
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
  requirementBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 217, 140, 0.32)',
    marginTop: 4,
  },
  requirementText: {
    flex: 1,
    color: '#8C651B',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  ctaButton: {
    marginTop: 16,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 22,
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

export default RegisterScreen;
