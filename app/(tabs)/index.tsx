import WaterCard from "@/components/WaterCard";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";



export default function HomeScreen() {
  const router = useRouter();
  const [filtroAtivo, setFiltroAtivo] = useState("Todos Movimentos");
  const [textoPesquisa, setTextoPesquisa] = useState("");
  const [aguaBebida, setAguaBebida] = useState(1200); // ml
  const metaAgua = 2000; // ml

  const filtros = [
    "Todos Movimentos",
    "Força",
    "Cardio",
    "Flexibilidade",
    "HIIT",
    "Iniciante",
    "Intermediário",
    "Avançado",
  ];



  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image
              source={require("@/assets/images/logo-name.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <TouchableOpacity onPress={() => router.push("/profile")}>
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
        <TouchableOpacity
          style={styles.progressContainer}
          onPress={() => router.push("/weight-progress")}
        >
          <LinearGradient
            colors={["#7448ff", "#7448ff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.progressCard}
          >
            <View style={styles.progressContent}>
              <View style={styles.progressLeft}>
                <Text style={styles.progressTitle}>Progresso de Peso</Text>
                <Text style={styles.progressSubtitle}>Meta mensal</Text>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarFill} />
                </View>
              </View>
            </View>
          </LinearGradient>
          <Image
            source={require("@/assets/images/person.png")}
            style={styles.personImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Botão Planilha */}
        <TouchableOpacity
          style={styles.planilhaCard}
          onPress={() => router.push("/training")}
        >
          <View style={styles.planilhaLeft}>
            <View style={styles.planilhaIconContainer}>
              <Ionicons name="document-text" size={24} color="#7448ff" />
            </View>
            <View style={styles.planilhaInfo}>
              <Text style={styles.planilhaTitle}>Planilha de Treino</Text>
              <View style={styles.planilhaStats}>
                <View style={styles.statItem}>
                  <Ionicons
                    name="barbell-outline"
                    size={14}
                    color="#545961ff"
                  />
                  <Text style={styles.statText}>8 exercícios</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Card de Hidratação */}
        <WaterCard
          aguaBebida={aguaBebida}
          metaAgua={metaAgua}
          setAguaBebida={setAguaBebida}
          onPress={() => router.push("/hydration")}
        />

        {/* Card Premium */}
        <View style={styles.premiumCard}>
          <View style={styles.premiumHeader}>
            <View style={styles.premiumIconContainer}>
              <Ionicons name="diamond" size={20} color="#7448ff" />
            </View>
            <Text style={styles.premiumTitle}>Desbloqueie o Premium</Text>
          </View>
          <Text style={styles.premiumSubtitle}>
            Acesse movimentos avançados e conteúdo exclusivo
          </Text>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={16} color="#7448ff" />
              <Text style={styles.benefitText}>50+ movimentos avançados</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={16} color="#7448ff" />
              <Text style={styles.benefitText}>
                Programas de treino personalizados
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={16} color="#7448ff" />
              <Text style={styles.benefitText}>
                Análise de performance detalhada
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.premiumButton}>
            <Text style={styles.premiumButtonText}>Assinar Premium</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0fff",
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 50,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 95,
    height: 45,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#7448ff",
  },
  welcomeSection: {
    marginBottom: 10,
  },
  welcome: {
    color: "#ECEDEE",
    fontSize: 25,
    fontWeight: "700",
  },
  name: {
    color: "#7448ff",
    fontSize: 30,
    fontWeight: "700",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
    marginBottom: 15,
    paddingHorizontal: 4,
  },
  statCard: {
    backgroundColor: "#1c1c1c",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#7448ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statIconContainer: {
    backgroundColor: "#7448ff20",
    padding: 12,
    borderRadius: 15,
    marginBottom: 12,
  },
  statNumber: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    color: "#8a8a8a",
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressContainer: {
    position: "relative",
    marginTop: 20,
  },
  progressCard: {
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
  },
  progressContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLeft: {
    flex: 1,
    paddingRight: 20,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: "#fff",
    opacity: 1,
    fontWeight: "500",
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    width: "59%",
    backgroundColor: "#000",
    borderRadius: 4,
  },
  personImage: {
    width: "45%",
    height: undefined,
    aspectRatio: 1,
    position: "absolute",
    right: "5%",
    top: "-47%",
    zIndex: 2,
  },
  planilhaCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1c1c1c",
    padding: 15,
    borderRadius: 16,
    marginTop: 10,
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
    backgroundColor: "#7448ff",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  premiumCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    padding: 15,
    marginTop: 10,
    borderWidth: 2,
    borderColor: "#7448ff",
  },
  premiumHeader: {
    flexDirection: "row",
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
  },
  premiumTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  premiumSubtitle: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  benefitsList: {
    gap: 8,
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  benefitText: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },
  premiumButton: {
    backgroundColor: "#7448ff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  premiumButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  waterCard: {
    backgroundColor: "#1a1a1aff",
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
  },
  waterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  waterTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  waterIconContainer: {
    backgroundColor: "#4A90E220",
    padding: 8,
    borderRadius: 10,
  },
  waterTitle: {
    color: "#ECEDEE",
    fontSize: 20,
    fontWeight: "700",
  },
  waterBadge: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  waterBadgeText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700",
  },
  waterMainContent: {
    marginBottom: 20,
  },
  waterVisualization: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  waterBottleContainer: {
    alignItems: "center",
    gap: 8,
  },
  waterBottle: {
    width: 45,
    height: 110,
    backgroundColor: "#0f0f0f",
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#333",
    position: "relative",
    overflow: "hidden",
  },
  waterFill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#4A90E2",
    borderRadius: 20,
  },
  waterBottleTop: {
    position: "absolute",
    top: -6,
    left: "50%",
    marginLeft: -8,
    width: 16,
    height: 6,
    backgroundColor: "#333",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  waterLevelMark: {
    position: "absolute",
    right: -8,
    width: 6,
    height: 1,
    backgroundColor: "#666",
  },
  waterBottleLabel: {
    color: "#666",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  waterStats: {
    flex: 1,
    marginLeft: 24,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  waterStatItem: {
    alignItems: "center",
  },
  waterStatNumber: {
    color: "#ECEDEE",
    fontSize: 24,
    fontWeight: "700",
  },
  waterStatLabel: {
    color: "#666",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  waterStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#2a2a2a",
  },
  waterGlassesContainer: {
    marginTop: 16,
  },
  waterGlassesTitle: {
    color: "#666",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 12,
  },
  waterGlasses: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  waterGlass: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  waterProgressContainer: {
    marginTop: 16,
  },
  waterProgressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  waterProgressLabel: {
    color: "#666",
    fontSize: 13,
    fontWeight: "500",
  },
  waterProgressPercentage: {
    color: "#4A90E2",
    fontSize: 14,
    fontWeight: "700",
  },
  waterProgressTrack: {
    height: 6,
    backgroundColor: "#2a2a2a",
    borderRadius: 3,
    overflow: "hidden",
  },
  waterProgressFill: {
    height: "100%",
    backgroundColor: "#4A90E2",
    borderRadius: 3,
  },
  addWaterButton: {
    backgroundColor: "#4A90E2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  addWaterText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 25,
    marginBottom: 15,
  },
  filtersContainer: {
    marginBottom: 20,
    paddingLeft: 4,
  },
  filterChip: {
    backgroundColor: "transparent",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    marginRight: 12,
  },
  filterChipActive: {
    backgroundColor: "#7448ff",
  },
  filterChipText: {
    color: "#888",
    fontSize: 15,
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#000",
    fontWeight: "600",
  },
  searchBox: {
    backgroundColor: "#1c1c1c",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 24,
    gap: 12,
  },
  searchText: {
    color: "#666",
    fontSize: 14,
    flex: 1,
  },
  movementsList: {
    gap: 16,
    paddingBottom: 20,
  },
  movementCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    overflow: "hidden",
    flexDirection: "row",
    height: 165,
  },
  imageContainer: {
    width: 140,
    height: "100%",
    position: "relative",
  },
  exerciseImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#222",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  imageGradient: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 30,
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardBody: {
    flex: 1,
    justifyContent: "flex-start",
    gap: 6,
  },
  difficultyBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#7448ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1c1c1c",
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseStats: {
    flexDirection: "row",
    gap: 16,
  },
  playButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#7448ff",
    justifyContent: "center",
    alignItems: "center",
  },
  lockedCard: {
    opacity: 0.7,
    borderColor: "#7448ff",
    borderWidth: 2,
  },
  lockedImage: {
    opacity: 0.3,
  },
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  unlockButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#7448ff",
    justifyContent: "center",
    alignItems: "center",
  },
  lockedText: {
    opacity: 0.6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#7448ff46",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadge: {
    color: "#7448ff",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  levelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  levelText: {
    color: "#7448ff",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  playIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1c1c1c",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  exerciseTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  exerciseDesc: {
    color: "#999",
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  durationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  durationText: {
    color: "#666",
    fontSize: 13,
    fontWeight: "500",
  },
  startButton: {
    backgroundColor: "#7448ff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700",
  },

  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: "#1c1c1c",
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
    color: "#7448ff",
    fontSize: 12,
  },
});
