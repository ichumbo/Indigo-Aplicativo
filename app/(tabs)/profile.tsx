import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Animated, Image, ImageBackground, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(30);
  const router = useRouter();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Dados dinâmicos dos stats
  const stats = {
    totalWorkouts: 127,
    currentStreak: 12,
    personalRecord: 85,
    weeklyGoal: 85, // porcentagem
    monthlyCalories: 28470,
    avgWorkoutTime: 68 // minutos
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <Animated.ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}
      >
        {/* Header com Avatar */}
        <View style={styles.header}>
          <ImageBackground
            source={{ uri: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=400&fit=crop" }}
            style={styles.headerBackground}
            imageStyle={styles.headerBackgroundImage}
          >
            <LinearGradient
              colors={['rgba(116, 72, 255, 0.9)', 'rgba(116, 72, 255, 0.7)', 'rgba(116, 72, 255, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <TouchableOpacity style={styles.editBackgroundButton}>
                <Ionicons name="image" size={16} color="#000" />
              </TouchableOpacity>
              <View style={styles.headerContent}>
                <View style={styles.avatarContainer}>
                  <Image
                    source={{ uri: "https://i.pravatar.cc/150?img=12" }}
                    style={styles.avatar}
                  />
                  <TouchableOpacity style={styles.editAvatarButton}>
                    <Ionicons name="camera" size={18} color="#7448ff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>João Silva</Text>
                  <View style={styles.levelContainer}>
                    <Ionicons name="star" size={14} color="#fff" />
                    <Text style={styles.userLevel}>Atleta Intermediário</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="fitness" size={28} color="#7448ff" />
              </View>
              <Text style={styles.statNumber}>{stats.totalWorkouts}</Text>
              <Text style={styles.statLabel}>Total de Treinos</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="flame" size={28} color="#ff6b35" />
              </View>
              <Text style={styles.statNumber}>{stats.currentStreak}</Text>
              <Text style={styles.statLabel}>Sequência Atual</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="trophy" size={28} color="#4CAF50" />
              </View>
              <Text style={styles.statNumber}>{stats.personalRecord}kg</Text>
              <Text style={styles.statLabel}>Record Pessoal</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="time" size={28} color="#2196F3" />
              </View>
              <Text style={styles.statNumber}>{stats.avgWorkoutTime}min</Text>
              <Text style={styles.statLabel}>Tempo Médio</Text>
            </View>
          </View>
        </View>

        {/* Menu Options */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="person-outline" size={20} color="#7448ff" />
              </View>
              <Text style={styles.menuText}>Dados Pessoais</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="fitness-outline" size={20} color="#7448ff" />
              </View>
              <Text style={styles.menuText}>Histórico de Treinos</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="analytics-outline" size={20} color="#7448ff" />
              </View>
              <Text style={styles.menuText}>Estatísticas</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="diamond-outline" size={20} color="#7448ff" />
              </View>
              <Text style={styles.menuText}>Plano Premium</Text>
            </View>
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>PRO</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Configurações */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Configurações</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="notifications-outline" size={20} color="#7448ff" />
              </View>
              <Text style={styles.menuText}>Notificações</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="shield-outline" size={20} color="#7448ff" />
              </View>
              <Text style={styles.menuText}>Privacidade</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="help-circle-outline" size={20} color="#7448ff" />
              </View>
              <Text style={styles.menuText}>Ajuda & Suporte</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => router.push('/login')}>
          <Ionicons name="log-out-outline" size={20} color="#ff4444" />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Image 
            source={require('@/assets/images/logo.png')} 
            style={styles.appLogo}
            resizeMode="contain"
          />
          <Text style={styles.appVersion}>CrossPlan v1.0.0</Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0fff',
  },
  header: {
    marginTop: 50,
    marginHorizontal: 20,
    marginBottom: 15,
  },
  headerBackground: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  headerBackgroundImage: {
    borderRadius: 24,
  },
  headerGradient: {
    borderRadius: 24,
    padding: 32,
    position: 'relative',
  },
  editBackgroundButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#fff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  userLevel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    marginLeft: 6,
  },
  statsContainer: {
    marginHorizontal: 15,
    marginBottom: 15,
    gap: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#1c1c1c',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    minHeight: 120,
    justifyContent: 'center',
  },
  statCardWide: {
    width: '100%',
    alignItems: 'stretch',
  },
  statRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  statIconContainer: {
    backgroundColor: 'rgba(116, 72, 255, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignSelf: 'center',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(116, 72, 255, 0.2)',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7448ff',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.3,
    lineHeight: 16,
  },
  statSubLabel: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    fontWeight: '600',
    opacity: 0.8,
    lineHeight: 14,
  },
  progressContainer: {
    flex: 1,
    marginLeft: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9C27B0',
    borderRadius: 4,
  },
  menuSection: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  menuItem: {
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    backgroundColor: 'rgba(116, 72, 255, 0.1)',
    padding: 10,
    borderRadius: 10,
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(116, 72, 255, 0.2)',
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  premiumBadge: {
    backgroundColor: '#7448ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  premiumBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1c',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#ff4444',
    gap: 12,
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
  appInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appLogo: {
    width: 40,
    height: 18,
    marginBottom: 8,
  },
  appVersion: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
});
