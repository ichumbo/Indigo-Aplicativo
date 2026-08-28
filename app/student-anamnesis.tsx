import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  Platform,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCurrentSession } from "@/hooks/use-current-session";
import { shareAnamnesisAsPdf } from "@/services/student-anamnesis-pdf-service";

interface AnamnesisData {
  medicalConditions: string[];
  injuriesOrPain: string[];
  medications: string;
  cardiacRisk: "Baixo" | "Moderado" | "Alto";
  surgeryHistory: string;
  trainingExperienceYears: string;
  weeklyAvailabilityDays: number;
  sleepHoursPerNight: number;
  stressLevel: "Baixo" | "Médio" | "Alto";
  smokingOrAlcohol: string;
  dietaryRestrictions: string;
  medicalClearance: boolean;
  notes: string;
  reviewedAt: string;
}

const DEFAULT_ANAMNESIS: AnamnesisData = {
  medicalConditions: ["Nenhuma patologia crônica declarada", "Pressão arterial normal"],
  injuriesOrPain: ["Desconforto leve no joelho esquerdo em agachamentos profundos"],
  medications: "Nenhuma medicação contínua",
  cardiacRisk: "Baixo",
  surgeryHistory: "Nenhuma cirurgia prévia",
  trainingExperienceYears: "2 anos de musculação intermitente",
  weeklyAvailabilityDays: 4,
  sleepHoursPerNight: 7,
  stressLevel: "Médio",
  smokingOrAlcohol: "Não fuma • Consumo social eventual de álcool",
  dietaryRestrictions: "Intolerância leve à lactose",
  medicalClearance: true,
  notes: "Aluno liberado para treinamento resistido com foco em hipertrofia e fortalecimento articular.",
  reviewedAt: "Hoje",
};

export default function StudentAnamnesisScreen() {
  const insets = useSafeAreaInsets();
  const topInset = insets.top > 0 ? insets.top + 6 : (Platform.OS === "ios" ? 48 : 16);
  const params = useLocalSearchParams<{ studentId?: string; studentName?: string }>();
  const { session } = useCurrentSession();
  const isTrainer = session?.user.role === "TRAINER";

  const storageKey = `@dragoncorp_student_anamnesis_${params.studentId || "default"}`;
  const [data, setData] = useState<AnamnesisData>(DEFAULT_ANAMNESIS);
  const [isEditing, setIsEditing] = useState(false);
  const [injuriesInput, setInjuriesInput] = useState("");
  const [medsInput, setMedsInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [medicalClearance, setMedicalClearance] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setData(parsed);
          setInjuriesInput(parsed.injuriesOrPain?.join(", ") || "");
          setMedsInput(parsed.medications || "");
          setNotesInput(parsed.notes || "");
          setMedicalClearance(parsed.medicalClearance ?? true);
        } else {
          setInjuriesInput(DEFAULT_ANAMNESIS.injuriesOrPain.join(", "));
          setMedsInput(DEFAULT_ANAMNESIS.medications);
          setNotesInput(DEFAULT_ANAMNESIS.notes);
          setMedicalClearance(DEFAULT_ANAMNESIS.medicalClearance);
        }
      } catch {}
    })();
  }, [storageKey]);

  const handleSave = async () => {
    const updated: AnamnesisData = {
      ...data,
      injuriesOrPain: injuriesInput.split(",").map((s) => s.trim()).filter(Boolean),
      medications: medsInput.trim(),
      notes: notesInput.trim(),
      medicalClearance,
      reviewedAt: new Date().toLocaleDateString("pt-BR"),
    };

    setData(updated);
    setIsEditing(false);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
      Alert.alert("Sucesso", "Ficha de Anamnese atualizada com sucesso!");
    } catch {}
  };

  const handleShareReport = async () => {
    Alert.alert(
      "Compartilhar Anamnese",
      "Como deseja compartilhar o relatório clínico?",
      [
        {
          text: "Gerar PDF Oficial",
          onPress: () => {
            void shareAnamnesisAsPdf({
              trainerId: session?.user.id,
              studentName: params.studentName || "Aluno",
              medicalConditions: data.medicalConditions,
              injuriesOrPain: data.injuriesOrPain,
              medications: data.medications,
              cardiacRisk: data.cardiacRisk,
              surgeryHistory: data.surgeryHistory,
              trainingExperienceYears: data.trainingExperienceYears,
              weeklyAvailabilityDays: data.weeklyAvailabilityDays,
              sleepHoursPerNight: data.sleepHoursPerNight,
              stressLevel: data.stressLevel,
              smokingOrAlcohol: data.smokingOrAlcohol,
              dietaryRestrictions: data.dietaryRestrictions,
              medicalClearance: data.medicalClearance,
              notes: data.notes,
              reviewedAt: data.reviewedAt,
            });
          },
        },
        {
          text: "Enviar no WhatsApp",
          onPress: async () => {
            const studentTitle = params.studentName ? ` - ${params.studentName}` : "";
            let message = `*RELATÓRIO CLÍNICO DE ANAMNESE${studentTitle.toUpperCase()}*\n\n`;
            message += `*Risco Cardiovascular:* ${data.cardiacRisk}\n`;
            message += `*Liberação Médica:* ${data.medicalClearance ? "Apto para treinar" : "Pendente de laudo"}\n`;
            message += `*Lesões / Desconfortos:* ${data.injuriesOrPain.join(", ") || "Nenhum"}\n`;
            message += `*Medicamentos:* ${data.medications}\n`;
            message += `*Experiência Prévia:* ${data.trainingExperienceYears}\n`;
            message += `*Frequência Semanal:* ${data.weeklyAvailabilityDays} dias/semana\n`;
            message += `*Sono / Estresse:* ${data.sleepHoursPerNight}h por noite • Estresse: ${data.stressLevel}\n\n`;
            message += `*Recomendações do Personal:*\n${data.notes}\n`;

            try {
              await Share.share({ message });
            } catch {}
          },
        },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: topInset }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color="#D90000" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Ficha de Anamnese</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {params.studentName || "Aluno"} • Saúde e Histórico
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerActionBtn} onPress={handleShareReport} activeOpacity={0.8} hitSlop={6}>
            <Ionicons name="share-social-outline" size={18} color="#D90000" />
          </TouchableOpacity>

          {isTrainer && (
            <TouchableOpacity
              style={[styles.headerActionBtn, isEditing && styles.headerSaveBtnActive]}
              onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
              activeOpacity={0.85}
              hitSlop={6}
            >
              <Ionicons
                name={isEditing ? "checkmark" : "create-outline"}
                size={18}
                color={isEditing ? "#FFFFFF" : "#D90000"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* STATUS BANNER */}
        <View style={[styles.statusBanner, data.medicalClearance ? styles.statusBannerGreen : styles.statusBannerYellow]}>
          <Ionicons
            name={data.medicalClearance ? "shield-checkmark" : "warning"}
            size={22}
            color={data.medicalClearance ? "#22C55E" : "#EAB308"}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusBannerTitle}>
              {data.medicalClearance ? "Aluno Liberado para Treinos" : "Atenção: Triagem Pendente"}
            </Text>
            <Text style={styles.statusBannerSub}>
              Risco Cardiovascular: <Text style={{ fontWeight: "900" }}>{data.cardiacRisk}</Text> • Revisado em {data.reviewedAt}
            </Text>
          </View>
        </View>

        {/* SECTION 1: SAÚDE & HISTÓRICO MÉDICO */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="heart-circle-outline" size={20} color="#D90000" />
            <Text style={styles.cardTitle}>Saúde & Condições Médicas</Text>
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Patologias & Condições Clínicas</Text>
            <View style={styles.pillList}>
              {data.medicalConditions.map((cond, idx) => (
                <View key={idx} style={styles.pillBadge}>
                  <Ionicons name="medkit" size={12} color="#D90000" />
                  <Text style={styles.pillBadgeText}>{cond}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Lesões, Dores ou Restrições Articulares</Text>
            {isEditing ? (
              <TextInput
                style={styles.inputBox}
                value={injuriesInput}
                onChangeText={setInjuriesInput}
                placeholder="Ex: Joelho esquerdo, Ombro"
                placeholderTextColor="#666"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {data.injuriesOrPain.length > 0 ? data.injuriesOrPain.join(" • ") : "Nenhuma lesão relatada"}
              </Text>
            )}
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Medicamentos de Uso Contínuo</Text>
            {isEditing ? (
              <TextInput
                style={styles.inputBox}
                value={medsInput}
                onChangeText={setMedsInput}
                placeholder="Ex: Nenhum"
                placeholderTextColor="#666"
              />
            ) : (
              <Text style={styles.fieldValue}>{data.medications || "Nenhum"}</Text>
            )}
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Histórico de Cirurgias</Text>
            <Text style={styles.fieldValue}>{data.surgeryHistory}</Text>
          </View>
        </View>

        {/* SECTION 2: HÁBITOS & ROTINA DE TREINO */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="barbell-outline" size={20} color="#D90000" />
            <Text style={styles.cardTitle}>Hábitos & Rotina de Treino</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{data.weeklyAvailabilityDays}x</Text>
              <Text style={styles.statLabel}>Frequência Semanal</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{data.sleepHoursPerNight}h</Text>
              <Text style={styles.statLabel}>Sono / Noite</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{data.stressLevel}</Text>
              <Text style={styles.statLabel}>Nível de Estresse</Text>
            </View>
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Experiência Prévia com Musculação</Text>
            <Text style={styles.fieldValue}>{data.trainingExperienceYears}</Text>
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Tabagismo & Bebidas Alcoólicas</Text>
            <Text style={styles.fieldValue}>{data.smokingOrAlcohol}</Text>
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Restrições Alimentares</Text>
            <Text style={styles.fieldValue}>{data.dietaryRestrictions}</Text>
          </View>
        </View>

        {/* SECTION 3: PARECER E RECOMENDAÇÕES */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="clipboard-outline" size={20} color="#D90000" />
            <Text style={styles.cardTitle}>Parecer do Personal Trainer</Text>
          </View>

          {isEditing ? (
            <TextInput
              style={[styles.inputBox, styles.textarea]}
              value={notesInput}
              onChangeText={setNotesInput}
              placeholder="Instruções para o treino..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
            />
          ) : (
            <Text style={styles.notesText}>{data.notes}</Text>
          )}

          {isEditing && (
            <View style={styles.clearanceRow}>
              <Text style={styles.clearanceLabel}>Liberação para Treino:</Text>
              <Switch
                value={medicalClearance}
                onValueChange={setMedicalClearance}
                trackColor={{ false: "#333", true: "#22C55E" }}
                thumbColor="#FFFFFF"
              />
            </View>
          )}
        </View>

        {/* CTA BUTTON */}
        <TouchableOpacity style={styles.shareReportBtn} onPress={handleShareReport} activeOpacity={0.85}>
          <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
          <Text style={styles.shareReportBtnText}>Compartilhar Laudo via WhatsApp</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#202020",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#303030",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    color: "#D90000",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    color: "#888888",
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#303030",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSaveBtnActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 16,
  },

  /* Status Banner */
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  statusBannerGreen: {
    backgroundColor: "#142416",
    borderColor: "#1C4A22",
  },
  statusBannerYellow: {
    backgroundColor: "#262010",
    borderColor: "#4D3D14",
  },
  statusBannerTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
  },
  statusBannerSub: {
    color: "#A0A0A0",
    fontSize: 11.5,
    marginTop: 2,
  },

  /* Card */
  card: {
    backgroundColor: "#181818",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "900",
  },
  fieldItem: {
    gap: 4,
  },
  fieldLabel: {
    color: "#888888",
    fontSize: 11.5,
    fontWeight: "700",
  },
  fieldValue: {
    color: "#DDDDDD",
    fontSize: 13,
    lineHeight: 18,
  },
  pillList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  pillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#221414",
    borderWidth: 1,
    borderColor: "#3D1C1C",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillBadgeText: {
    color: "#E2E2E2",
    fontSize: 11.5,
    fontWeight: "700",
  },
  inputBox: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#282828",
    borderRadius: 10,
    color: "#FFFFFF",
    fontSize: 13,
    paddingHorizontal: 12,
    height: 40,
    marginTop: 2,
  },
  textarea: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 10,
  },

  /* Stats Row */
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#121212",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 10,
    alignItems: "center",
    gap: 2,
  },
  statNumber: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  statLabel: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },

  /* Notes */
  notesText: {
    color: "#CCCCCC",
    fontSize: 13,
    lineHeight: 19,
    fontStyle: "italic",
  },
  clearanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#222222",
  },
  clearanceLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  /* Share CTA */
  shareReportBtn: {
    backgroundColor: "#25D366",
    borderRadius: 14,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  shareReportBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});
