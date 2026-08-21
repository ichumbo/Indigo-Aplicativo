import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Alert,
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
import {
  getCurrentSession,
  getHomeRouteForRole,
  signInWithCredentials,
} from '@/services/auth-store';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [codigoPersonal, setCodigoPersonal] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [temPersonal, setTemPersonal] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(30)).current;
  const circleAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const redirectedRef = useRef(false);

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
  }, [buttonScale, circleAnim, fadeAnim, formAnim, logoAnim, slideAnim]);

  useEffect(() => {
    let mounted = true;

    getCurrentSession()
      .then((session) => {
        if (!mounted || !session || redirectedRef.current) return;
        redirectedRef.current = true;
        router.replace(getHomeRouteForRole(session.user.role) as never);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleLogin = async () => {
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

    try {
      const session = await signInWithCredentials(email, senha);
      redirectedRef.current = true;
      router.replace(getHomeRouteForRole(session.user.role) as never);
    } catch (loginError) {
      setLoading(false);
      Alert.alert(
        'Nao foi possivel entrar',
        loginError instanceof Error ? loginError.message : 'Revise os dados e tente novamente.'
      );
    }
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
      ]} pointerEvents="none">
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
              source={require('@/assets/images/logotipo-principal.png')} 
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
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#D90000" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Digite seu email"
                  placeholderTextColor="#888"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  editable={!loading}
                />
              </View>
              
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#D90000" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Digite sua senha"
                  placeholderTextColor="#888"
                  secureTextEntry={!mostrarSenha}
                  value={senha}
                  onChangeText={setSenha}
                  returnKeyType="done"
                  editable={!loading}
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => setMostrarSenha(!mostrarSenha)}
                >
                  <Ionicons 
                    name={mostrarSenha ? "eye-off" : "eye"} 
                    size={20} 
                    color="#D90000" 
                  />
                </TouchableOpacity>
              </View>
               <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setTemPersonal(!temPersonal)}
            >
              <Ionicons 
                name={temPersonal ? "checkbox" : "square-outline"} 
                size={20} 
                color="#D90000" 
              />
              <Text style={styles.checkboxText}>Tenho código de personal</Text>
            </TouchableOpacity>

            {temPersonal && (
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#D90000" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Código do Personal"
                    placeholderTextColor="#888"
                    value={codigoPersonal}
                    onChangeText={setCodigoPersonal}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="done"
                    editable={!loading}
                  />
                </View>
              </View>
            )}
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
    backgroundColor: '#D90000',
    opacity: 0.05,
  },
  circle2: {
    position: 'absolute',
    top: '60%',
    left: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D90000',
    opacity: 0.08,
  },
  circle3: {
    position: 'absolute',
    bottom: '20%',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D90000',
    opacity: 0.06,
  },
  wave: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#D90000',
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
    borderBottomColor: '#D90000',
    opacity: 0.04,
  },
  keyboardView: {
    flex: 1,
  },
  logo: {
    width: 180,
    height: 48,
    marginBottom: 24,
    alignSelf: 'flex-start',
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
    color: '#D90000',
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
    backgroundColor: '#1c1c1c',
  },
  inputFocused: {
    borderColor: '#D90000',
    shadowColor: '#D90000',
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
    color: '#D90000',
    fontSize: 15,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#D90000',
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
    color: '#D90000',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#D90000',
  },
  checkboxText: {
    color: '#8a8a8a',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
});
