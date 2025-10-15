import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const blockedItems = {
  "1": {
    title: "Advanced Muscle-ups",
    type: "Força Avançada",
    description: "Movimento complexo que combina pull-up e dip em uma única execução fluida. Requer força excepcional e técnica refinada.",
    unlockRequirement: "Complete 50 pull-ups consecutivos",
    level: "Elite",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
    muscles: ["Latíssimo", "Deltoides", "Tríceps", "Core"],
    prerequisites: [
      "Dominar pull-ups com peso adicional",
      "Executar dips com perfeição técnica",
      "Desenvolver força de transição",
      "Treinar kipping pull-ups"
    ],
    benefits: [
      "Força funcional extrema",
      "Coordenação avançada",
      "Desenvolvimento atlético completo",
      "Prestígio no CrossFit"
    ],
    unlockTips: [
      "Pratique pull-ups com diferentes pegadas",
      "Fortaleça a transição com exercícios específicos",
      "Trabalhe a flexibilidade dos ombros",
      "Use bandas elásticas para assistência"
    ]
  },
  "2": {
    title: "Handstand Push-ups",
    type: "Ginástica",
    description: "Flexão executada em posição invertida contra a parede. Desenvolve força vertical e estabilidade do core.",
    unlockRequirement: "Manter handstand por 60 segundos",
    level: "Avançado",
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400",
    muscles: ["Deltoides", "Tríceps", "Core", "Trapézio"],
    prerequisites: [
      "Dominar handstand contra parede",
      "Força suficiente em ombros",
      "Estabilidade do core desenvolvida",
      "Flexibilidade nos punhos"
    ],
    benefits: [
      "Força vertical excepcional",
      "Estabilidade do core",
      "Coordenação e equilíbrio",
      "Confiança corporal"
    ],
    unlockTips: [
      "Pratique hollow body holds",
      "Fortaleça ombros com pike push-ups",
      "Trabalhe mobilidade dos punhos",
      "Use progressões com caixas"
    ]
  },
  "3": {
    title: "Double Unders",
    type: "Cardio Avançado",
    description: "Pular corda com duas passadas por salto. Requer coordenação, timing e resistência cardiovascular.",
    unlockRequirement: "Complete 500 single unders sem parar",
    level: "Intermediário",
    image: "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=400",
    muscles: ["Panturrilhas", "Core", "Ombros", "Antebraços"],
    prerequisites: [
      "Dominar single unders",
      "Desenvolver ritmo consistente",
      "Coordenação mão-pé",
      "Resistência cardiovascular"
    ],
    benefits: [
      "Condicionamento cardiovascular intenso",
      "Coordenação motora refinada",
      "Agilidade e velocidade",
      "Queima calórica elevada"
    ],
    unlockTips: [
      "Mantenha cotovelos próximos ao corpo",
      "Use movimentos de punho, não braços",
      "Pratique o timing com single unders",
      "Comece com séries curtas"
    ]
  }
};

export default function BlockedDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const item = blockedItems[id as string];
  const [activeTab, setActiveTab] = useState("prerequisites");
  const [isPremium] = useState(false); // Simula status premium do usuário

  if (!item) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="lock-closed" size={48} color="#fab12f" />
        <Text style={styles.notFoundText}>Item não encontrado</Text>
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
          <Image source={{ uri: item.image }} style={styles.headerImage} />
          
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

          {/* Ícone de bloqueado com animação */}
          <View style={styles.lockIconContainer}>
            <View style={styles.lockIconBg}>
              <Ionicons name="lock-closed" size={28} color="#fab12f" />
            </View>
            <View style={styles.lockPulse} />
          </View>
          
          {/* Conteúdo do header melhorado */}
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <View style={styles.titleUnderline} />
            </View>
            
            <View style={styles.headerStats}>
              <View style={styles.statChip}>
                <View style={styles.statIconBg}>
                  <Ionicons name="trophy" size={16} color="#000" />
                </View>
                <Text style={styles.statText}>{item.level}</Text>
              </View>
              <View style={styles.statChip}>
                <View style={styles.statIconBg}>
                  <Ionicons name="fitness" size={16} color="#000" />
                </View>
                <Text style={styles.statText}>{item.type}</Text>
              </View>
            </View>
            
            {/* Indicador de progresso */}
            <View style={styles.progressIndicator}>
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.progressText}>Bloqueado</Text>
            </View>
          </View>
        </View>

        {/* Requisito para desbloqueio */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="key" size={20} color="#fab12f" />
            </View>
            <Text style={styles.sectionTitle}>Requisito para Desbloqueio</Text>
          </View>
          <View style={styles.unlockCard}>
            <View style={styles.unlockIconContainer}>
              <Ionicons name="trophy" size={24} color="#fab12f" />
            </View>
            <Text style={styles.unlockText}>{item.unlockRequirement}</Text>
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
            <Text style={styles.description}>{item.description}</Text>
          </View>
        </View>

        {/* Card Premium */}
        {!isPremium && (
          <View style={styles.section}>
            <View style={styles.premiumCard}>
              <LinearGradient
                colors={["#fab12f", "#ff8c00"]}
                style={styles.premiumGradient}
              >
                <View style={styles.premiumContent}>
                  <View style={styles.premiumIcon}>
                    <Ionicons name="diamond" size={32} color="#fab12f" />
                  </View>
                  <View style={styles.premiumText}>
                    <Text style={styles.premiumTitle}>CrossPlan Premium</Text>
                    <Text style={styles.premiumSubtitle}>Desbloqueie conteúdo completo</Text>
                  </View>
                  <TouchableOpacity style={styles.premiumButton}>
                    <Text style={styles.premiumButtonText}>Assinar</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </View>
        )}

        {/* Músculos trabalhados */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="body" size={20} color="#fab12f" />
            </View>
            <Text style={styles.sectionTitle}>Músculos Trabalhados</Text>
            {!isPremium && <Ionicons name="lock-closed" size={16} color="#666" />}
          </View>
          {isPremium ? (
            <View style={styles.musclesContainer}>
              {item.muscles.map((muscle, index) => (
                <View key={index} style={styles.muscleCard}>
                  <View style={styles.muscleCardContent}>
                    <View style={styles.muscleIconContainer}>
                      <Ionicons name="fitness" size={18} color="#fab12f" />
                    </View>
                    <Text style={styles.muscleCardText}>{muscle}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.blockedContent}>
              <Ionicons name="lock-closed" size={24} color="#666" />
              <Text style={styles.blockedText}>Conteúdo disponível apenas para assinantes Premium</Text>
            </View>
          )}
        </View>

        {/* Abas */}
        <View style={styles.section}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === "prerequisites" && styles.activeTab]}
              onPress={() => setActiveTab("prerequisites")}
            >
              <Text style={[styles.tabText, activeTab === "prerequisites" && styles.activeTabText]}>Pré-requisitos</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === "benefits" && styles.activeTab]}
              onPress={() => setActiveTab("benefits")}
            >
              <Text style={[styles.tabText, activeTab === "benefits" && styles.activeTabText]}>Benefícios</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === "tips" && styles.activeTab]}
              onPress={() => setActiveTab("tips")}
            >
              <Text style={[styles.tabText, activeTab === "tips" && styles.activeTabText]}>Dicas</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabContentCard}>
            {activeTab === "prerequisites" && (
              <View style={styles.tabContent}>
                {isPremium ? (
                  item.prerequisites.map((prereq, index) => (
                    <View key={index} style={styles.prereqItem}>
                      <View style={styles.prereqIcon}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#fab12f" />
                      </View>
                      <Text style={styles.prereqText}>{prereq}</Text>
                    </View>
                  ))
                ) : (
                  <>
                    {item.prerequisites.slice(0, 2).map((prereq, index) => (
                      <View key={index} style={styles.prereqItem}>
                        <View style={styles.prereqIcon}>
                          <Ionicons name="checkmark-circle-outline" size={16} color="#fab12f" />
                        </View>
                        <Text style={styles.prereqText}>{prereq}</Text>
                      </View>
                    ))}
                    <View style={styles.blockedContent}>
                      <Ionicons name="lock-closed" size={20} color="#666" />
                      <Text style={styles.blockedText}>+{item.prerequisites.length - 2} pré-requisitos disponíveis no Premium</Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {activeTab === "benefits" && (
              <View style={styles.tabContent}>
                {isPremium ? (
                  item.benefits.map((benefit, index) => (
                    <View key={index} style={styles.benefitItem}>
                      <View style={styles.benefitIcon}>
                        <Ionicons name="star" size={16} color="#fab12f" />
                      </View>
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))
                ) : (
                  <>
                    {item.benefits.slice(0, 1).map((benefit, index) => (
                      <View key={index} style={styles.benefitItem}>
                        <View style={styles.benefitIcon}>
                          <Ionicons name="star" size={16} color="#fab12f" />
                        </View>
                        <Text style={styles.benefitText}>{benefit}</Text>
                      </View>
                    ))}
                    <View style={styles.blockedContent}>
                      <Ionicons name="lock-closed" size={20} color="#666" />
                      <Text style={styles.blockedText}>+{item.benefits.length - 1} benefícios disponíveis no Premium</Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {activeTab === "tips" && (
              <View style={styles.tabContent}>
                {isPremium ? (
                  item.unlockTips.map((tip, index) => (
                    <View key={index} style={styles.tipItem}>
                      <View style={styles.tipIcon}>
                        <Ionicons name="bulb" size={16} color="#fab12f" />
                      </View>
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.blockedContent}>
                    <Ionicons name="lock-closed" size={20} color="#666" />
                    <Text style={styles.blockedText}>Dicas exclusivas disponíveis no Premium</Text>
                  </View>
                )}
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
          <Ionicons name="lock-closed" size={24} color="#000" />
          <Text style={styles.footerCenterText}>Bloqueado</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerBtn}>
          <Ionicons name="information-circle-outline" size={20} color="#fab12f" />
          <Text style={styles.footerText}>Info</Text>
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
    opacity: 0.6,
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
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
  lockIconContainer: {
    position: "absolute",
    top: 50,
    right: 20,
  },
  lockIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fab12f",
    shadowColor: "#fab12f",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  lockPulse: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(250,177,47,0.3)",
    top: -8,
    left: -8,
  },
  headerContent: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
  },
  titleContainer: {
    marginBottom: 16,
  },
  itemTitle: {
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
    width: "0%",
    backgroundColor: "#fab12f",
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
    marginBottom: 15,
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
  unlockCard: {
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#fab12f',
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  unlockIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(250, 177, 47, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  unlockText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    lineHeight: 22,
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
  tabContentCard: {
    backgroundColor: "transparent",
  },
  tabContent: {
    gap: 7,
  },
  prereqItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  prereqIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(250, 177, 47, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  prereqText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
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
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  tipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(250, 177, 47, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  tipText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
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
    backgroundColor: "#666",
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
  premiumCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  premiumGradient: {
    padding: 20,
  },
  premiumContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  premiumIcon: {
    backgroundColor: "#000",
    borderRadius: 15,
    width: 65,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumText: {
    flex: 1,
  },
  premiumTitle: {
    color: "#000",
    fontSize: 18,
    fontWeight: "700",
  },
  premiumSubtitle: {
    color: "rgba(0,0,0,0.7)",
    fontSize: 14,
    marginTop: 2,
  },
  premiumButton: {
    backgroundColor: "#000",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  premiumButtonText: {
    color: "#fab12f",
    fontSize: 14,
    fontWeight: "600",
  },
  blockedContent: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#333",
    borderStyle: "dashed",
  },
  blockedText: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },
});