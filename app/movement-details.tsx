import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const movementDetails = {
  "1": {
    title: "Deadlift",
    type: "Força",
    description: "O deadlift é um dos movimentos mais fundamentais do CrossFit, trabalhando toda a cadeia posterior do corpo.",
    duration: "45 min",
    level: "Avançado",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    muscles: ["Glúteos", "Isquiotibiais", "Lombar", "Trapézio"],
    technique: [
      "Posicione-se com os pés na largura dos quadris",
      "Agarre a barra com as mãos na largura dos ombros",
      "Mantenha o peito erguido e as costas retas",
      "Levante a barra estendendo quadris e joelhos",
      "Finalize em pé com ombros para trás"
    ],
    benefits: [
      "Desenvolve força funcional completa",
      "Fortalece toda a cadeia posterior",
      "Melhora a postura corporal",
      "Aumenta a densidade óssea",
      "Queima muitas calorias"
    ],
    commonErrors: [
      "Arredondar as costas durante o movimento",
      "Afastar a barra do corpo",
      "Não ativar o core adequadamente",
      "Hiperextender a lombar no topo",
      "Usar carga excessiva sem técnica"
    ]
  },
  "2": {
    title: "Pull-ups",
    type: "Força",
    description: "Exercício de tração que desenvolve força na parte superior do corpo, especialmente costas e bíceps.",
    duration: "30 min",
    level: "Intermediário",
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    muscles: ["Latíssimo", "Bíceps", "Romboides", "Deltoides"],
    technique: [
      "Agarre a barra com pegada pronada",
      "Pendure-se com braços estendidos",
      "Puxe o corpo até o queixo passar da barra",
      "Desça controladamente"
    ],
    benefits: [
      "Fortalece toda a musculatura das costas",
      "Desenvolve força de tração funcional",
      "Melhora a postura corporal",
      "Aumenta a força do core",
      "Desenvolve coordenação motora"
    ],
    commonErrors: [
      "Balançar o corpo durante o movimento",
      "Não descer completamente",
      "Usar apenas a força dos braços",
      "Subir muito rápido sem controle",
      "Não ativar o core"
    ]
  },
  "3": {
    title: "Burpees",
    type: "Cardio",
    description: "Exercício completo que combina agachamento, prancha, flexão e salto.",
    duration: "25 min",
    level: "Iniciante",
    image: "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=400",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    muscles: ["Pernas", "Glúteos", "Core", "Peitorais"],
    technique: [
      "Comece em pé, pés na largura dos ombros",
      "Agache e coloque as mãos no chão",
      "Salte para posição de prancha",
      "Salte de volta e pule para cima"
    ],
    benefits: [
      "Queima muitas calorias rapidamente",
      "Melhora o condicionamento cardiovascular",
      "Trabalha o corpo inteiro",
      "Aumenta a resistência muscular",
      "Pode ser feito em qualquer lugar"
    ],
    commonErrors: [
      "Aterrissar com impacto excessivo",
      "Não manter a prancha correta",
      "Fazer muito rápido perdendo a forma",
      "Não estender completamente no salto",
      "Arquear as costas na prancha"
    ]
  },
  "4": {
    title: "Squats",
    type: "Força",
    description: "O agachamento é um movimento fundamental que trabalha principalmente pernas e glúteos.",
    duration: "40 min",
    level: "Iniciante",
    image: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=400",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    muscles: ["Quadríceps", "Glúteos", "Isquiotibiais", "Core"],
    technique: [
      "Fique em pé com pés na largura dos ombros",
      "Empurre o quadril para trás",
      "Desça até coxas paralelas ao chão",
      "Suba empurrando o chão"
    ],
    benefits: [
      "Fortalece pernas e glúteos",
      "Melhora a mobilidade do quadril",
      "Desenvolve força funcional",
      "Queima calorias eficientemente",
      "Base para outros exercícios"
    ],
    commonErrors: [
      "Joelhos caírem para dentro",
      "Não descer o suficiente",
      "Inclinar muito o tronco para frente",
      "Levantar os calcanhares",
      "Não ativar o core"
    ]
  }
};

export default function MovementDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const movement = movementDetails[id as string];
  const [activeTab, setActiveTab] = useState("technique");
  const [isFavorite, setIsFavorite] = useState(false);

  if (!movement) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="alert-circle" size={48} color="#fab12f" />
        <Text style={styles.notFoundText}>Movimento não encontrado</Text>
        <TouchableOpacity style={styles.backButtonError} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header com imagem */}
        <View style={styles.imageHeader}>
          <Image source={{ uri: movement.image }} style={styles.headerImage} />
          
          {/* Gradiente principal na imagem */}
          <LinearGradient
            colors={["rgba(255, 255, 255, 0)", "rgba(0, 0, 0, 0.68)", "rgba(0, 0, 0, 0.9)"]}
            locations={[0, 0.3, 1]}
            style={styles.imageGradient}
          />
          
          {/* Gradiente secundário para profundidade */}
          <LinearGradient
            colors={["transparent", "rgba(0, 0, 0, 0.15)", "rgba(0, 0, 0, 0.8)"]} 
            locations={[0, 0.6, 1]}
            style={styles.shimmerGradient}
          />
          
          {/* Botão voltar aprimorado */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <View style={styles.backButtonInner}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Ícone de status desbloqueado */}
          <View style={styles.statusIconContainer}>
            <View style={styles.statusIconBg}>
              <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
            </View>
            <View style={styles.statusPulse} />
          </View>
          
          {/* Conteúdo do header melhorado */}
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Text style={styles.movementTitle}>{movement.title}</Text>
              <View style={styles.titleUnderline} />
            </View>
            
            <View style={styles.headerStats}>
              <View style={styles.statChip}>
                <View style={styles.statIconBg}>
                  <Ionicons name="time" size={16} color="#000" />
                </View>
                <Text style={styles.statText}>{movement.duration}</Text>
              </View>
              <View style={styles.statChip}>
                <View style={styles.statIconBg}>
                  <Ionicons name="trophy" size={16} color="#000" />
                </View>
                <Text style={styles.statText}>{movement.level}</Text>
              </View>
            </View>
            
            {/* Indicador de progresso */}
            <View style={styles.progressIndicator}>
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.progressText}>Disponível</Text>
            </View>
          </View>
        </View>

         {/* Vídeo de demonstração */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="play-circle" size={20} color="#fab12f" />
            </View>
            <Text style={styles.sectionTitle}>Demonstração Técnica</Text>
          </View>
          <View style={styles.videoContainer}>
            <Image source={{ uri: "https://img.youtube.com/vi/seivd3xz_pU/maxresdefault.jpg" }} style={styles.videoThumbnail} />
            <TouchableOpacity style={styles.playButton}>
              <Ionicons name="play" size={32} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Descrição */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="information-circle" size={20} color="#fab12f" />
            </View>
            <Text style={styles.sectionTitle}>Sobre o Movimento</Text>
          </View>
          <View style={styles.descriptionCard}>
            <Text style={styles.description}>{movement.description}</Text>
          </View>
        </View>

        {/* Músculos trabalhados */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="body" size={20} color="#fab12f" />
            </View>
            <Text style={styles.sectionTitle}>Músculos Trabalhados</Text>
          </View>
          <View style={styles.musclesContainer}>
            {movement.muscles.map((muscle, index) => (
              <View key={index} style={styles.muscleCard}>
                <View style={styles.muscleCardContent}>
                  <View style={styles.muscleIconContainer}>
                    <Ionicons name="fitness" size={18} color="#fab12f" />
                  </View>
                  <Text style={styles.muscleCardText}>{muscle}</Text>
                </View>
                <View style={styles.muscleCardAccent} />
              </View>
            ))}
          </View>
        </View>

        {/* Abas */}
        <View style={styles.section}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === "technique" && styles.activeTab]}
              onPress={() => setActiveTab("technique")}
            >
              <Text style={[styles.tabText, activeTab === "technique" && styles.activeTabText]}>Técnica</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === "benefits" && styles.activeTab]}
              onPress={() => setActiveTab("benefits")}
            >
              <Text style={[styles.tabText, activeTab === "benefits" && styles.activeTabText]}>Benefícios</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === "errors" && styles.activeTab]}
              onPress={() => setActiveTab("errors")}
            >
              <Text style={[styles.tabText, activeTab === "errors" && styles.activeTabText]}>Erros</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabContentCard}>
            {activeTab === "technique" && (
              <View style={styles.tabContent}>
                {movement.technique.map((step, index) => (
                  <View key={index} style={styles.stepItem}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === "benefits" && (
              <View style={styles.tabContent}>
                {movement.benefits.map((benefit, index) => (
                  <View key={index} style={styles.benefitItem}>
                    <View style={styles.benefitIcon}>
                      <Ionicons name="checkmark-circle" size={16} color="#fab12f" />
                    </View>
                    <Text style={styles.benefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === "errors" && (
              <View style={styles.tabContent}>
                {movement.commonErrors.map((error, index) => (
                  <View key={index} style={styles.errorItem}>
                    <View style={styles.errorIcon}>
                      <Ionicons name="close-circle" size={16} color="#ef4444" />
                    </View>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

      </ScrollView>
      
      {/* Botão de ação fixo */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={20} color="#fab12f" />
          <Text style={styles.footerText}>Voltar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerCenter}>
          <Ionicons name="play" size={24} color="#000" />
          <Text style={styles.footerCenterText}>Iniciar Treino</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerBtn} onPress={() => setIsFavorite(!isFavorite)}>
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={20} color={isFavorite ? "#ef4444" : "#fab12f"} />
          <Text style={styles.footerText}>Favorito</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030303",
  },
  imageHeader: {
    height: 320,
    position: "relative",
  },
  headerImage: {
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
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  imageGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backButtonInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(250,177,47,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  statusIconContainer: {
    position: "absolute",
    top: 50,
    right: 20,
  },
  statusIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#22c55e",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  statusPulse: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(34,197,94,0.3)",
    top: -8,
    left: -8,
  },
  headerContent: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
  },
  headerBadges: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: "#fab12f",
    shadowColor: "#fab12f",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fab12f",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: "#fab12f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  categoryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  levelText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  titleContainer: {
    marginBottom: 16,
  },
  movementTitle: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: -0.5,
  },
  titleUnderline: {
    width: 60,
    height: 4,
    backgroundColor: "#fab12f",
    borderRadius: 2,
    shadowColor: "#fab12f",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  headerStats: {
    flexDirection: "row",
    gap: 20,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(250,177,47,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  statIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  statText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "700",
  },
  progressIndicator: {
    marginTop: 16,
    gap: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    width: "100%",
    backgroundColor: "#22c55e",
    borderRadius: 3,
  },
  progressText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(250, 177, 47, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  descriptionCard: {
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#fab12f',
  },
  description: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },
  musclesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  muscleCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    overflow: "hidden",
    flex: 1,
    minWidth: "45%",
    borderLeftWidth: 4,
    borderLeftColor: '#fab12f',
  },
  muscleCardContent: {
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  muscleIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(250, 177, 47, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  muscleCardText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fab12f",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "700",
  },
  stepText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  tipText: {
    color: "#ccc",
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  footerBtn: {
    flexDirection: "column",
    alignItems: "center",
  },
  footerText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
  },
  footerCenter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fab12f",
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  footerCenterText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },
  videoContainer: {
    backgroundColor: "#1a1a1a",
    borderRadius: 15,
    overflow: "hidden",
    aspectRatio: 16/9,
    position: "relative",
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  videoThumbnail: {
    width: "100%",
    height: "100%",
    backgroundColor: "#222",
  },
  playButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -35,
    marginLeft: -35,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fab12f",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#fab12f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  playButtonLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fab12f",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tabsContainer: {
    flexDirection: "row",
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
    marginHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  activeTab: {
    fontWeight: "500",
    borderBottomWidth: 4,
    borderColor: "#fab12f",
  },
  tabText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#fab12f",
    fontWeight: "500",
  },
  tabContent: {
    gap: 7,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  benefitIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(250, 177, 47, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  benefitText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  errorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  errorIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  backButtonError: {
    backgroundColor: "#fab12f",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  notFoundText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
});