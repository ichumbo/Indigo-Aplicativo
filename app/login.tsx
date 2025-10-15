import { useEffect, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import LoadingScreen from '@/components/loading-screen';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [senhaFocused, setSenhaFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);
  const logoAnim = new Animated.Value(0);
  const formAnim = new Animated.Value(30);
  const circleAnim = new Animated.Value(0);
  const buttonScale = new Animated.Value(1);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(formAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.timing(circleAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const handleLogin = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setLoading(true);
    
    setTimeout(() => {
      router.push('/(tabs)');
    }, 2500);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[
        styles.backgroundElements,
        {
          transform: [{
            rotate: circleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            })
          }]
        }
      ]}>
        <Animated.View style={[
          styles.circle1,
          {
            transform: [{
              scale: circleAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 1.2, 1],
              })
            }]
          }
        ]} />
        <Animated.View style={[
          styles.circle2,
          {
            transform: [{
              translateY: circleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -20],
              })
            }]
          }
        ]} />
        <Animated.View style={[
          styles.circle3,
          {
            opacity: circleAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.06, 0.12, 0.06],
            })
          }
        ]} />
        <View style={styles.wave} />
        <View style={styles.triangle} />
      </Animated.View>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}>
          <Animated.View style={[
            styles.header,
            {
              opacity: logoAnim,
              transform: [{ translateY: logoAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              })}]
            }
          ]}>
            <Animated.Image 
              source={require('@/assets/images/logo-name.png')} 
              style={[
                styles.logo,
                {
                  transform: [{ scale: logoAnim }]
                }
              ]}
              resizeMode="contain"
            />
            <Text style={styles.title}>
              Bem-vindo de volta,
            </Text>
            <Text style={styles.subtitle}>Atleta!</Text>
            <Text style={styles.info}>
              Entre na sua conta para continuar seu progresso
            </Text>
          </Animated.View>

          <Animated.View style={[
            styles.form,
            {
              opacity: fadeAnim,
              transform: [{ translateY: formAnim }]
            }
          ]}>
            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, emailFocused && styles.inputFocused]}>
                <Ionicons name="mail-outline" size={20} color={emailFocused ? "#7448ff" : "#7448ff"} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Digite seu email"
                  placeholderTextColor="#888"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, senhaFocused && styles.inputFocused]}>
                <Ionicons name="lock-closed-outline" size={20} color={senhaFocused ? "#7448ff" : "#7448ff"} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Digite sua senha"
                  placeholderTextColor="#888"
                  secureTextEntry={!mostrarSenha}
                  value={senha}
                  onChangeText={setSenha}
                  onFocus={() => setSenhaFocused(true)}
                  onBlur={() => setSenhaFocused(false)}
                />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => setMostrarSenha(!mostrarSenha)}
                >
                  <Ionicons 
                    name={mostrarSenha ? "eye-off" : "eye"} 
                    size={20} 
                    color={senhaFocused ? "#7448ff" : "#7448ff"} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity 
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity 
              style={styles.forgotButton}
              onPress={() => router.push('/forgot-password')}
            >
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </TouchableOpacity>

          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0fff',
  },
  backgroundElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  circle1: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#7448ff',
    opacity: 0.05,
  },
  circle2: {
    position: 'absolute',
    top: '60%',
    left: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7448ff',
    opacity: 0.08,
  },
  circle3: {
    position: 'absolute',
    bottom: '20%',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7448ff',
    opacity: 0.06,
  },
  wave: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#7448ff',
    opacity: 0.03,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
  triangle: {
    position: 'absolute',
    top: '30%',
    right: 30,
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 25,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#7448ff',
    opacity: 0.04,
  },
  keyboardView: {
    flex: 1,
  },
  logo: {
    width: 100,
    height: 40,
    marginBottom: 40,
    alignSelf: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  title: {
    color: '#ECEDEE',
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: '#7448ff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 10,
  },
  info: {
    color: '#8a8a8a',
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputWrapper: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 56,
    backgroundColor: '#1c1629ff',
  },
  inputFocused: {
    borderColor: '#7448ff',
    shadowColor: '#7448ff',
    shadowOpacity: 0.2,
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#ECEDEE',
    fontSize: 16,
    paddingVertical: 16,
  },
  passwordInput: {
    paddingRight: 12,
  },
  eyeButton: {
    padding: 8,
    marginLeft: 8,
  },
  forgotButton: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    color: '#7448ff',
    fontSize: 15,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#7448ff',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: '#666',
  },
  loginButtonText: {
    color: '#ffffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  registerContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  registerText: {
    color: '#8a8a8a',
    fontSize: 16,
  },
  registerLink: {
    color: '#7448ff',
    fontWeight: '600',
  },
});