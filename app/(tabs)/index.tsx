
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const workouts = [
  {
    id: "1",
    title: "Deadlift",
    type: "Força",
    description: "Movimento fundamental que trabalha toda a cadeia posterior",
    duration: "45 min",
    level: "Avançado",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
  },
  {
    id: "2",
    title: "Pull-ups",
    type: "Força",
    description: "Exercício de tração que fortalece costas e bíceps",
    duration: "30 min",
    level: "Intermediário",
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400",
  },
  {
    id: "3",
    title: "Burpees",
    type: "Cardio",
    description: "Exercício completo que trabalha corpo todo",
    duration: "25 min",
    level: "Iniciante",
    image: "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=400",
  },
  {
    id: "4",
    title: "Squats",
    type: "Força",
    description: "Agachamento clássico para pernas e glúteos",
    duration: "40 min",
    level: "Iniciante",
    image: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=400",
  },
  {
    id: "5",
    title: "Thrusters",
    type: "HIIT",
    description: "Combinação de agachamento frontal com desenvolvimento",
    duration: "35 min",
    level: "Intermediário",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
  },
  {
    id: "6",
    title: "Box Jumps",
    type: "Cardio",
    description: "Saltos explosivos que desenvolvem potência",
    duration: "20 min",
    level: "Intermediário",
    image: "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=400",
  },
  {
    id: "7",
    title: "Muscle-ups",
    type: "Força",
    description: "Movimento avançado de tração e empurrada",
    duration: "50 min",
    level: "Avançado",
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400",
  },
  {
    id: "8",
    title: "Yoga Flow",
    type: "Flexibilidade",
    description: "Sequência de posturas para mobilidade e relaxamento",
    duration: "60 min",
    level: "Iniciante",
    image: "https://images.unsplash.com/photo-1506629905607-d405872a4d86?w=400",
  },
  {
    id: "9",
    title: "Kettlebell Swings",
    type: "HIIT",
    description: "Movimento balístico para força e condicionamento",
    duration: "30 min",
    level: "Intermediário",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
  },
  {
    id: "10",
    title: "Wall Balls",
    type: "Cardio",
    description: "Arremesso de medicine ball contra a parede",
    duration: "25 min",
    level: "Iniciante",
    image: "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=400",
  },
  {
    id: "11",
    title: "Handstand Push-ups",
    type: "Força",
    description: "Flexão em parada de mão para força de ombros",
    duration: "40 min",
    level: "Avançado",
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400",
  },
  {
    id: "12",
    title: "Stretching",
    type: "Flexibilidade",
    description: "Alongamentos estáticos para recuperação",
    duration: "30 min",
    level: "Iniciante",
    image: "https://images.unsplash.com/photo-1506629905607-d405872a4d86?w=400",
  },
  {
    id: "13",
    title: "Double Unders",
    type: "Cardio",
    description: "Pular corda com dupla passada por salto",
    duration: "15 min",
    level: "Intermediário",
    image: "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=400",
  },
  {
    id: "14",
    title: "Clean & Jerk",
    type: "Força",
    description: "Movimento olímpico completo de levantamento",
    duration: "55 min",
    level: "Avançado",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
  },
  {
    id: "15",
    title: "Tabata",
    type: "HIIT",
    description: "Protocolo de alta intensidade 20s/10s",
    duration: "20 min",
    level: "Intermediário",
    image: "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=400",
  },
  {
    id: "16",
    title: "Mobility Flow",
    type: "Flexibilidade",
    description: "Sequência dinâmica para mobilidade articular",
    duration: "35 min",
    level: "Iniciante",
    image: "https://images.unsplash.com/photo-1506629905607-d405872a4d86?w=400",
  },
  {
    id: "17",
    title: "Snatch",
    type: "Força",
    description: "Levantamento olímpico em um movimento",
    duration: "50 min",
    level: "Avançado",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
  },
  {
    id: "18",
    title: "Rowing",
    type: "Cardio",
    description: "Exercício cardiovascular no remo",
    duration: "40 min",
    level: "Intermediário",
    image: "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=400",
  },
  {
    id: "19",
    title: "EMOM",
    type: "HIIT",
    description: "Every Minute On the Minute - treino estruturado",
    duration: "30 min",
    level: "Intermediário",
    image: "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=400",
  },
  {
    id: "20",
    title: "Pistol Squats",
    type: "Força",
    description: "Agachamento unilateral avançado",
    duration: "35 min",
    level: "Avançado",
    image: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=400",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [filtroAtivo, setFiltroAtivo] = useState("Todos Movimentos");
  const [textoPesquisa, setTextoPesquisa] = useState("");
  
  const filtros = ["Todos Movimentos", "Força", "Cardio", "Flexibilidade", "HIIT", "Iniciante", "Intermediário", "Avançado"];
  
  let workoutsFiltrados = filtroAtivo === "Todos Movimentos" 
    ? workouts 
    : workouts.filter(workout => workout.type === filtroAtivo || workout.level === filtroAtivo);
    
  if (textoPesquisa) {
    workoutsFiltrados = workoutsFiltrados.filter(workout => 
      workout.title.toLowerCase().includes(textoPesquisa.toLowerCase()) ||
      workout.description.toLowerCase().includes(textoPesquisa.toLowerCase())
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image 
              source={require('@/assets/images/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <TouchableOpacity onPress={() => router.push('/profile')}>
              <Image
                source={{ uri: "https://i.pravatar.cc/150?img=12" }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcome}>Bem-vindo</Text>
            <Text style={styles.name}>João!</Text>
          </View>
        </View>

        {/* Card de Progresso */}
        <View style={styles.progressContainer}>
          <LinearGradient
            colors={["#fab12f", "#fab12f"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.progressCard}
          >
            <View style={styles.progressContent}>
              <View style={styles.progressLeft}>
                <Text style={styles.progressTitle}>Progresso CrossFit</Text>
                <Text style={styles.progressSubtitle}>Meta mensal</Text>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarFill} />
                </View>
              </View>
            </View>
          </LinearGradient>
          <Image 
            source={require('@/assets/images/person.png')}
            style={styles.personImage}
            resizeMode="contain"
          />
        </View>

        {/* Botão Planilha */}
        <TouchableOpacity style={styles.planilhaCard} onPress={() => router.push('/training')}>
          <View style={styles.planilhaLeft}>
            <View style={styles.planilhaIconContainer}>
              <Ionicons name="document-text" size={24} color="#fab12f" />
            </View>
            <View style={styles.planilhaInfo}>
              <Text style={styles.planilhaTitle}>Planilha de Treino</Text>
              <View style={styles.planilhaStats}>
                <View style={styles.statItem}>
                  <Ionicons name="barbell-outline" size={14} color="#545961ff" />
                  <Text style={styles.statText}>8 exercícios</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Card Premium */}
        <View style={styles.premiumCard}>
          <View style={styles.premiumHeader}>
            <View style={styles.premiumIconContainer}>
              <Ionicons name="diamond" size={20} color="#fab12f" />
            </View>
            <Text style={styles.premiumTitle}>Desbloqueie o Premium</Text>
          </View>
          <Text style={styles.premiumSubtitle}>Acesse movimentos avançados e conteúdo exclusivo</Text>
          
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={16} color="#fab12f" />
              <Text style={styles.benefitText}>50+ movimentos avançados</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={16} color="#fab12f" />
              <Text style={styles.benefitText}>Programas de treino personalizados</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={16} color="#fab12f" />
              <Text style={styles.benefitText}>Análise de performance detalhada</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.premiumButton}>
            <Text style={styles.premiumButtonText}>Assinar Premium</Text>
            <Ionicons name="arrow-forward" size={16} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Título da Seção */}
        <Text style={styles.sectionTitle}>Movimentos e Técnicas</Text>

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          {filtros.map((filtro, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.filterChip,
                filtro === filtroAtivo && styles.filterChipActive,
              ]}
              onPress={() => setFiltroAtivo(filtro)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filtro === filtroAtivo && styles.filterChipTextActive,
                ]}
              >
                {filtro}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Campo de Pesquisa */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#888" />
          <TextInput
            style={styles.searchText}
            placeholder="Buscar exercícios..."
            placeholderTextColor="#666"
            value={textoPesquisa}
            onChangeText={setTextoPesquisa}
          />
        </View>

        <View style={styles.movementsList}>
          {workoutsFiltrados.map((item, index) => {
            const isLocked = index > 0;
            return (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.movementCard, isLocked && styles.lockedCard]}
                onPress={() => isLocked ? router.push(`/blocked-details?id=${item.id}`) : router.push(`/movement-details?id=${item.id}`)}
              >
                <View style={styles.imageContainer}>
                  <Image source={{ uri: item.image }} style={[styles.exerciseImage, isLocked && styles.lockedImage]} />
                  <View style={styles.imageOverlay} />
                  {isLocked && (
                    <View style={styles.lockOverlay}>
                      <Ionicons name="lock-closed" size={24} color="#fab12f" />
                    </View>
                  )}
                </View>
                
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <View style={styles.categoryContainer}>
                      <Ionicons name="fitness" size={12} color="#fab12f" />
                      <Text style={styles.categoryBadge}>{item.type}</Text>
                    </View>
                    {isLocked ? (
                      <TouchableOpacity 
                        style={styles.unlockButton}
                        onPress={() => router.push(`/blocked-details?id=${item.id}`)}
                      >
                        <Ionicons name="diamond" size={14} color="#000" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        style={styles.playButton}
                        onPress={() => router.push(`/movement-details?id=${item.id}`)}
                      >
                        <Ionicons name="play" size={16} color="#000" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <View style={styles.cardBody}>
                    <Text style={[styles.exerciseTitle, isLocked && styles.lockedText]}>{item.title}</Text>
                    <Text style={[styles.exerciseDesc, isLocked && styles.lockedText]}>{item.description}</Text>
                  </View>
                  
                  <View style={styles.cardFooter}>
                    <View style={styles.levelContainer}>
                      <Ionicons name={isLocked ? "diamond" : "trophy"} size={12} color="#fab12f" />
                      <Text style={[styles.levelText, isLocked && styles.lockedText]}>
                        {isLocked ? "Premium" : item.level}
                      </Text>
                    </View>
                    <View style={styles.durationContainer}>
                      <Ionicons name="time-outline" size={12} color="#666" />
                      <Text style={[styles.durationText, isLocked && styles.lockedText]}>{item.duration}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030303",
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 50,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 35,
    height: 15,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fab12f',
  },
  welcomeSection: {
    marginBottom: 10,
  },
  welcome: {
    color: '#fff',
    fontSize: 25,
    fontWeight: '700',
  },
  name: {
    color: '#fab12f',
    fontSize: 30,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    marginBottom: 15,
    paddingHorizontal: 4,
  },
  statCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#fab12f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statIconContainer: {
    backgroundColor: '#fab12f20',
    padding: 12,
    borderRadius: 15,
    marginBottom: 12,
  },
  statNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: '#8a8a8a',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressContainer: {
    position: 'relative',
    marginTop: 20,
  },
  progressCard: {
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLeft: {
    flex: 1,
    paddingRight: 20,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#000',
    opacity: 1,
    fontWeight: '500',
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    width: '59%',
    backgroundColor: '#000',
    borderRadius: 4,
  },
  personImage: {
    width: 190,
    height: 190,
    position: 'absolute',
    right: 10,
    top: -70,
    zIndex: 2,
  },
  planilhaCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111111ff",
    padding: 15,
    borderRadius: 16,
    marginTop: 15,
  },
  planilhaLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  planilhaIconContainer: {
    backgroundColor: "#000",
    padding: 12,
    borderRadius: 15,
    marginRight: 15,
  },
  planilhaInfo: {
    flex: 1,
  },
  planilhaTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  planilhaSubtitle: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 8,
  },
  planilhaStats: {
    flexDirection: "row",
    gap: 15,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
  },
  arrowContainer: {
    backgroundColor: "#fab12f",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  premiumCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 15,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#fab12f',
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  premiumIconContainer: {
   backgroundColor: "#000",
    padding: 12,
    borderRadius: 15,
    marginRight: 15,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  premiumSubtitle: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  benefitsList: {
    gap: 8,
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  premiumButton: {
    backgroundColor: '#fab12f',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  premiumButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 25,
    marginBottom: 15,
  },
  filtersContainer: {
    marginBottom: 20,
    paddingLeft: 4,
  },
  filterChip: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    marginRight: 12,
  },
  filterChipActive: {
    backgroundColor: '#fab12f',
  },
  filterChipText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  searchBox: {
    backgroundColor: '#111',
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 24,
    gap: 12,
  },
  searchText: {
    color: '#666',
    fontSize: 14,
    flex: 1,
  },
  movementsList: {
    gap: 16,
    paddingBottom: 20,
  },
  movementCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
    flexDirection: 'row',
    height: 165,
  },
  imageContainer: {
    width: 140,
    height: '100%',
    position: 'relative',
  },
  exerciseImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  imageGradient: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 30,
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 6,
  },
  difficultyBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#fab12f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseStats: {
    flexDirection: 'row',
    gap: 16,
  },
  playButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fab12f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedCard: {
    opacity: 0.7,
    borderColor: '#fab12f',
    borderWidth: 2,
  },
  lockedImage: {
    opacity: 0.3,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fab12f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedText: {
    opacity: 0.6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#faaf2f46',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadge: {
    color: '#fab12f',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  levelText: {
    color: '#fab12f',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  playIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  exerciseTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  exerciseDesc: {
    color: '#999',
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  startButton: {
    backgroundColor: '#fab12f',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },

  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: "#111",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#333",
  },
  navItem: {
    alignItems: "center",
  },
  navText: {
    color: "#aaa",
    fontSize: 12,
  },
  navTextActive: {
    color: "#fab12f",
    fontSize: 12,
  },
});
