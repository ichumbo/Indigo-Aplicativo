import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function HydrationScreen() {
  const router = useRouter();
  const [aguaBebida, setAguaBebida] = useState(1200);
  const metaAgua = 2000;
  
  const copos = [250, 300, 500, 750];
  
  const adicionarAgua = (quantidade: number) => {
    setAguaBebida(prev => Math.min(prev + quantidade, metaAgua));
  };

  const removerAgua = (quantidade: number) => {
    setAguaBebida(prev => Math.max(prev - quantidade, 0));
  };

  const porcentagem = Math.round((aguaBebida / metaAgua) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#7448ff" />
        </TouchableOpacity>
        <Text style={styles.title}>Hidratação</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.progressContainer}>
          <View style={styles.waterBottle}>
            <View style={[styles.waterLevel, { height: `${porcentagem}%` }]} />
            <View style={styles.waterIcon}>
              <Ionicons name="water" size={40} color="#4A90E2" />
            </View>
          </View>
          
          <View style={styles.statsContainer}>
            <Text style={styles.currentAmount}>{aguaBebida}ml</Text>
            <Text style={styles.goalAmount}>de {metaAgua}ml</Text>
            <Text style={styles.percentage}>{porcentagem}% da meta</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Adicionar água</Text>
          <View style={styles.cupsContainer}>
            {copos.map((quantidade) => (
              <TouchableOpacity
                key={quantidade}
                style={styles.cupButton}
                onPress={() => adicionarAgua(quantidade)}
              >
                <Ionicons name="water" size={20} color="#4A90E2" />
                <Text style={styles.cupText}>{quantidade}ml</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Hoje</Text>
          <View style={styles.historyList}>
            <View style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <Ionicons name="add" size={16} color="#4A90E2" />
              </View>
              <Text style={styles.historyText}>Adicionou 250ml</Text>
              <Text style={styles.historyTime}>14:30</Text>
            </View>
            <View style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <Ionicons name="add" size={16} color="#4A90E2" />
              </View>
              <Text style={styles.historyText}>Adicionou 500ml</Text>
              <Text style={styles.historyTime}>12:15</Text>
            </View>
            <View style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <Ionicons name="add" size={16} color="#4A90E2" />
              </View>
              <Text style={styles.historyText}>Adicionou 300ml</Text>
              <Text style={styles.historyTime}>09:45</Text>
            </View>
          </View>
        </View>

        <View style={styles.removeSection}>
          <Text style={styles.sectionTitle}>Remover água</Text>
          <View style={styles.removeButtons}>
            {copos.map((quantidade) => (
              <TouchableOpacity
                key={`remove-${quantidade}`}
                style={styles.removeButton}
                onPress={() => removerAgua(quantidade)}
              >
                <Ionicons name="remove" size={16} color="#e74c3c" />
                <Text style={styles.removeText}>{quantidade}ml</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1c1629ff",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ECEDEE",
  },
  placeholder: {
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  progressContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  waterBottle: {
    width: 120,
    height: 200,
    backgroundColor: "#e6f3ff",
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#4A90E2",
    position: "relative",
    overflow: "hidden",
    marginBottom: 20,
    justifyContent: "flex-end",
  },
  waterLevel: {
    backgroundColor: "#4A90E2",
    width: "100%",
    borderRadius: 57,
    opacity: 0.7,
  },
  waterIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  statsContainer: {
    alignItems: "center",
  },
  currentAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#4A90E2",
  },
  goalAmount: {
    fontSize: 16,
    color: "#7f8c8d",
    marginBottom: 8,
  },
  percentage: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ECEDEE",
  },
  quickActions: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ECEDEE",
    marginBottom: 15,
  },
  cupsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  cupButton: {
    flex: 1,
    backgroundColor: "#1c1629ff",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4A90E2",
  },
  cupText: {
    color: "#4A90E2",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 5,
  },
  historySection: {
    marginBottom: 30,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1629ff",
    padding: 15,
    borderRadius: 12,
  },
  historyIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e6f3ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  historyText: {
    flex: 1,
    fontSize: 14,
    color: "#ECEDEE",
    fontWeight: "500",
  },
  historyTime: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  removeSection: {
    marginBottom: 20,
  },
  removeButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  removeButton: {
    flex: 1,
    backgroundColor: "#1c1629ff",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e74c3c",
  },
  removeText: {
    color: "#e74c3c",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
});