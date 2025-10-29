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
  const [treinoConfirmado, setTreinoConfirmado] = useState(false);

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

        {/* Check-in Card */}
        <View style={styles.checkinCardContainer}>
          <View style={styles.weekContainer}>
            {['Seg', 'Ter', 'Hoje', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.dayButton,
                  day === 'Hoje' && styles.dayButtonToday,
                  ['Seg', 'Ter', 'Hoje'].includes(day) && styles.dayButtonChecked,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    day === 'Hoje' && styles.dayTextToday,
                    ['Seg', 'Ter', 'Hoje'].includes(day) && styles.dayTextChecked,
                  ]}
                >
                  {day}
                </Text>
                {['Seg', 'Ter', 'Hoje'].includes(day) && (
                  <Ionicons name="checkmark" size={14} color="#00ff88" style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.checkinContainer}>
            <View style={styles.checkinHeader}>
              <Text style={styles.checkinTitle}>Confirme seu treino de hoje</Text>
              <Ionicons name="chevron-forward" size={18} color="#00ff88" />
            </View>
            <Text style={styles.checkinSubtitle}>
              Você pode fazer um novo check-in amanhã
            </Text>

            <TouchableOpacity 
              style={styles.gymCard}
              onPress={() => setTreinoConfirmado(true)}
              disabled={treinoConfirmado}
            >
              <Ionicons 
                name={treinoConfirmado ? "checkmark-circle" : "add-circle-outline"} 
                size={22} 
                color={treinoConfirmado ? "#00ff88" : "#00ff88"} 
              />
              <View>
                <Text style={styles.gymName}>
                  {treinoConfirmado ? "Treino confirmado!" : "Confirmar treino"}
                </Text>
                <Text style={styles.gymSubtitle}>
                  {treinoConfirmado ? "Smart Fit Queimados" : "Toque para confirmar"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

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
    bottom: "-4%",
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
  // Check-in Card Styles
  checkinCardContainer: {
    marginTop: 10,
    gap: 12,
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#162118',
    padding: 10,
    borderRadius: 16,
  },
  dayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    minWidth: 35,
  },
  dayButtonChecked: {
    backgroundColor: '#0d1b12',
  },
  dayButtonToday: {
    backgroundColor: '#00ff8844',
  },
  dayText: {
    color: '#888',
    fontWeight: '700',
  },
  dayTextChecked: {
    color: '#00ff88',
  },
  dayTextToday: {
    color: '#00ff88',
  },
  checkIcon: {
    marginTop: 2,
  },
  checkinContainer: {
    backgroundColor: '#162118',
    padding: 14,
    borderRadius: 16,
  },
  checkinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  checkinTitle: {
    color: '#00ff88',
    fontWeight: '700',
    fontSize: 14,
  },
  checkinSubtitle: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 12,
  },
  gymCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1310',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  gymName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  gymSubtitle: {
    color: '#888',
    fontSize: 12,
  },
});