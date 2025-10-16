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

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);
  const logoAnim = new Animated.Value(0);
  const formAnim = new Animated.Value(30);
  const circleAnim = new Animated.Value(0);
  const buttonScale = new Animated.Value(1);

  useEffect(() => {
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
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 1000,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(formAnim, {
        toValue: 0,
        duration: 800,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.timing(circleAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const handleSendEmail = () => {
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
      setLoading(false);
      setEmailSent(true);
    }, 2000);
  };

  const handleBackToLogin = () => {
    router.back();
  };

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
          <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
            <Ionicons name="arrow-back" size={24} color="#7448ff" />
          </TouchableOpacity>

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
              Esqueceu sua
            </Text>
            <Text style={styles.subtitle}>Senha?</Text>
            <Text style={styles.info}>
              {emailSent 
                ? 'Enviamos um link de recuperação para seu email. Verifique sua caixa de entrada.'
                : 'Digite seu email e enviaremos um link para redefinir sua senha'
              }
            </Text>
          </Animated.View>

          {!emailSent ? (
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

              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity 
                  style={[styles.sendButton, loading && styles.sendButtonDisabled]}
                  onPress={handleSendEmail}
                  disabled={loading || !email}
                >
                  <Text style={styles.sendButtonText}>
                    {loading ? 'Enviando...' : 'Enviar Link'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          ) : (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color="#7448ff" />
              </View>
              <TouchableOpacity 
                style={styles.backToLoginButton}
                onPress={handleBackToLogin}
              >
                <Text style={styles.backToLoginText}>Voltar ao Login</Text>
              </TouchableOpacity>
            </View>
          )}
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    padding: 8,
  },
  header: {
    marginBottom: 40,
    alignItems: 'flex-start',
  },
  logo: {
    width: 100,
    height: 40,
    marginBottom: 40,
    alignSelf: 'center',
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
    marginBottom: 16,
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
  inputWrapper: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 56,
    backgroundColor: '#1c1c1c',
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
  sendButton: {
    backgroundColor: '#7448ff',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#666',
  },
  sendButtonText: {
    color: '#ffffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  successContainer: {
    alignItems: 'center',
    gap: 32,
  },
  successIcon: {
    marginBottom: 16,
  },
  backToLoginButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#7448ff',
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToLoginText: {
    color: '#7448ff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
