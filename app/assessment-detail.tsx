import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  PERIMETER_LABELS,
  PHOTO_VIEWS,
  POSTURAL_REGION_LABELS,
  PhysicalAssessment,
  formatAssessmentDate,
  formatAssessmentDateTime,
  getAssessmentById,
  getAssessmentStatusLabel,
  getAssessmentSummary,
  getAssessmentTypeLabel,
  reopenAssessment,
} from "@/services/assessment-store";
import { useCurrentSession } from "@/hooks/use-current-session";

const empty = "Não informado";
const display = (value?: string | number | boolean) => {
  if (value === undefined || value === null || value === "") return empty;
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
};

export default function AssessmentDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; role?: "student" | "trainer" }>();
  const { session, loadingSession } = useCurrentSession();
  const role = session?.user.role === "STUDENT" ? "student" : "trainer";
  const userId = session?.user.id;
  const [assessment, setAssessment] = useState<PhysicalAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAssessment = useCallback(async () => {
    if (!params.id || !userId) {
      setError("Avaliação não encontrada.");
      setLoading(false);
      return;
    }

    try {
      const item = await getAssessmentById(params.id, userId, role);
      setAssessment(item);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível abrir esta avaliação.");
    } finally {
      setLoading(false);
    }
  }, [params.id, role, userId]);

  useEffect(() => {
    loadAssessment();
  }, [loadAssessment]);

  const summary = useMemo(() => (assessment ? getAssessmentSummary(assessment) : null), [assessment]);

  const handleReopen = async () => {
    if (!assessment || role !== "trainer") return;
    const updated = await reopenAssessment(assessment.id);
    router.replace({ pathname: "/assessment-editor" as never, params: { id: updated.id } });
  };

  if (loadingSession || loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" />
        <Text style={styles.centerText}>Abrindo relatório...</Text>
      </View>
    );
  }

  if (error || !assessment || !summary) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={40} color="#ff4444" />
        <Text style={styles.centerTitle}>Não foi possível abrir</Text>
        <Text style={styles.centerText}>{error || "Avaliação não encontrada."}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const compositionSnapshot = assessment.composition.protocolSnapshot;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Relatório de avaliação</Text>
          <Text style={styles.headerSubtitle}>{getAssessmentStatusLabel(assessment.status)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.studentCard}>
          {assessment.studentAvatar ? (
            <Image source={{ uri: assessment.studentAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={20} color="#D90000" />
            </View>
          )}
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{assessment.studentName}</Text>
            <Text style={styles.mutedText}>
              {getAssessmentTypeLabel(assessment.type)} • {formatAssessmentDate(assessment.assessedAt)}
            </Text>
            <Text style={styles.mutedText}>Avaliador: {assessment.trainerName}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{summary.progressPercent}%</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resumo</Text>
          <InfoRow label="Status" value={getAssessmentStatusLabel(assessment.status)} />
          <InfoRow label="Criada em" value={formatAssessmentDateTime(assessment.createdAt)} />
          <InfoRow label="Concluída em" value={formatAssessmentDateTime(assessment.completedAt)} />
          <InfoRow label="Próxima avaliação" value={formatAssessmentDate(assessment.nextAssessmentAt)} />
          <InfoRow label="Etapas concluídas" value={`${summary.completedSteps}/${summary.totalSteps}`} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informações gerais</Text>
          <InfoRow label="Objetivo principal" value={display(assessment.general.mainGoal)} />
          <InfoRow label="Objetivos secundários" value={display(assessment.general.secondaryGoals)} />
          <InfoRow label="Experiência" value={display(assessment.general.experienceLevel)} />
          <InfoRow label="Frequência semanal" value={assessment.general.weeklyTrainingFrequency ? `${assessment.general.weeklyTrainingFrequency}x` : empty} />
          <InfoRow label="Profissão" value={display(assessment.general.profession)} />
          <InfoRow label="Rotina" value={display(assessment.general.dailyRoutine)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Anamnese</Text>
          <InfoRow label="Sono" value={display(assessment.anamnesis.sleepQuality)} />
          <InfoRow label="Estresse" value={display(assessment.anamnesis.stressLevel)} />
          <InfoRow label="Água" value={assessment.anamnesis.waterIntakeLiters ? `${assessment.anamnesis.waterIntakeLiters} L/dia` : empty} />
          <InfoRow label="Dores atuais" value={display(assessment.anamnesis.currentPainDetails || assessment.anamnesis.currentPain)} />
          <InfoRow label="Lesões" value={display(assessment.anamnesis.previousInjuriesDetails || assessment.anamnesis.previousInjuries)} />
          <InfoRow label="Medicamentos" value={display(assessment.anamnesis.medicationsDetails || assessment.anamnesis.medications)} />
          <InfoRow label="Liberação médica" value={display(assessment.anamnesis.needsMedicalClearance)} />
          <Text style={styles.disclaimer}>Registro informativo. Esta avaliação não representa diagnóstico médico.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Composição corporal</Text>
          <InfoRow label="Protocolo" value={display(compositionSnapshot?.protocolName)} />
          <InfoRow label="Versão da fórmula" value={display(compositionSnapshot?.formulaVersion)} />
          <InfoRow label="Peso" value={assessment.composition.weightKg ? `${assessment.composition.weightKg} kg` : empty} />
          <InfoRow label="Altura" value={assessment.composition.heightCm ? `${assessment.composition.heightCm} cm` : empty} />
          <InfoRow label="IMC" value={display(assessment.composition.bmi)} />
          <InfoRow label="Classificação IMC" value={display(compositionSnapshot?.results.bmiClassification)} />
          <InfoRow label="Gordura" value={assessment.composition.bodyFatPercent ? `${assessment.composition.bodyFatPercent}%` : empty} />
          <InfoRow label="Classificação gordura" value={display(compositionSnapshot?.results.bodyFatClassification)} />
          <InfoRow label="Massa de gordura" value={assessment.composition.fatMassKg ? `${assessment.composition.fatMassKg} kg` : empty} />
          <InfoRow label="Massa magra" value={assessment.composition.leanMassKg ? `${assessment.composition.leanMassKg} kg` : empty} />
          <InfoRow label="Peso-alvo estimado" value={compositionSnapshot?.results.targetWeightKg ? `${compositionSnapshot.results.targetWeightKg} kg` : empty} />
          <InfoRow label="TMB" value={assessment.composition.basalMetabolicRateKcal ? `${assessment.composition.basalMetabolicRateKcal} kcal` : empty} />
          <InfoRow label="Soma das dobras" value={compositionSnapshot?.intermediate.skinfoldSumMm ? `${compositionSnapshot.intermediate.skinfoldSumMm} mm` : empty} />
          <InfoRow label="Densidade corporal" value={display(compositionSnapshot?.intermediate.bodyDensity)} />
          <InfoRow label="Referência" value={display(compositionSnapshot?.formulaReference)} />
          {compositionSnapshot?.validation.warnings.length ? (
            <Text style={styles.disclaimer}>{compositionSnapshot.validation.warnings.join(" ")}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Perímetros</Text>
          {(Object.keys(PERIMETER_LABELS) as (keyof typeof PERIMETER_LABELS)[]).map((key) => (
            <InfoRow
              key={key}
              label={PERIMETER_LABELS[key]}
              value={assessment.perimeters[key]?.valueCm ? `${assessment.perimeters[key]?.valueCm} cm` : empty}
            />
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Dobras cutâneas</Text>
          <InfoRow label="Protocolo" value={display(assessment.skinfolds.protocol)} />
          <InfoRow label="Resultado" value={assessment.skinfolds.resultBodyFatPercent ? `${assessment.skinfolds.resultBodyFatPercent}%` : empty} />
          <InfoRow label="Fórmula" value={display(assessment.skinfolds.formulaReference)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Avaliação cardiorrespiratória</Text>
          {assessment.cardioTests.length === 0 ? (
            <Text style={styles.mutedText}>{empty}</Text>
          ) : (
            assessment.cardioTests.map((test) => (
              <View key={test.id} style={styles.innerItem}>
                <Text style={styles.itemTitle}>{test.snapshot?.protocolName ?? test.config?.protocolName ?? test.protocolId}</Text>
                <InfoRow label="Status" value={display(test.status)} />
                <InfoRow label="Protocolo" value={display(test.snapshot?.protocolVersion ?? test.protocolVersion)} />
                <InfoRow
                  label={test.snapshot?.primaryResult?.label ?? "Resultado"}
                  value={
                    test.snapshot?.primaryResult?.value !== undefined
                      ? `${test.snapshot.primaryResult.value}${test.snapshot.primaryResult.unit ? ` ${test.snapshot.primaryResult.unit}` : ""}`
                      : empty
                  }
                />
                {test.snapshot?.vo2MaxEstimate !== undefined && (
                  <InfoRow label="VO₂máx estimado" value={`${test.snapshot.vo2MaxEstimate} ml/kg/min`} />
                )}
                {test.snapshot?.conconi && (
                  <>
                    <InfoRow label="Conconi" value={display(test.snapshot.conconi.message)} />
                    <InfoRow
                      label="Ponto estimado"
                      value={
                        test.snapshot.conconi.loadValue !== undefined
                          ? `${test.snapshot.conconi.loadValue} ${test.snapshot.conconi.loadUnit ?? ""} • ${test.snapshot.conconi.heartRateBpm ?? empty} bpm`
                          : empty
                      }
                    />
                  </>
                )}
                <InfoRow label="Queda FC 1 min" value={test.snapshot?.recoveryDrop1Min !== undefined ? `${test.snapshot.recoveryDrop1Min} bpm` : empty} />
                <InfoRow label="Referência" value={display(test.snapshot?.reference)} />
                {test.snapshot?.validation.warnings.map((warning) => (
                  <Text key={warning} style={styles.disclaimer}>{warning}</Text>
                ))}
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Neuromotora e funcional</Text>
          <InfoRow label="Triagem" value={display(assessment.functionalScreening?.readinessStatus)} />
          {assessment.functionalTests.length === 0 ? (
            <Text style={styles.mutedText}>{empty}</Text>
          ) : (
            assessment.functionalTests.map((test) => (
              <View key={test.id} style={styles.innerItem}>
                <Text style={styles.itemTitle}>{test.snapshot?.testName ?? test.customDefinition?.name ?? test.testId}</Text>
                <InfoRow label="Status" value={display(test.status)} />
                <InfoRow
                  label="Resultado"
                  value={
                    test.snapshot?.primaryResult?.value !== undefined
                      ? `${test.snapshot.primaryResult.value}${test.snapshot.primaryResult.unit ? ` ${test.snapshot.primaryResult.unit}` : ""}`
                      : empty
                  }
                />
                <InfoRow label="Lado" value={display(test.side)} />
                <InfoRow label="Assimetria" value={test.snapshot?.asymmetry?.absoluteDifference !== undefined ? `${test.snapshot.asymmetry.absoluteDifference}` : empty} />
                <InfoRow label="Dor" value={display(test.pain?.notes || test.pain?.present)} />
                <InfoRow label="Referência" value={display(test.snapshot?.reference)} />
                {test.snapshot?.attentionFlags.map((flag) => (
                  <Text key={flag} style={styles.disclaimer}>{flag}</Text>
                ))}
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Fotos e postura</Text>
          {PHOTO_VIEWS.map((view) => {
            const photo = assessment.photos.find((item) => item.view === view.id);
            return (
              <View key={view.id} style={styles.photoReport}>
                <Text style={styles.itemTitle}>{view.label}</Text>
                {photo ? (
                  <>
                    <Image source={{ uri: photo.uri }} style={styles.photo} />
                    <Text style={styles.mutedText}>{photo.annotations.length} marcação(ões) não destrutiva(s)</Text>
                    {photo.annotations.map((annotation) => (
                      <Text key={annotation.id} style={styles.annotationText}>
                        {POSTURAL_REGION_LABELS[annotation.region]}: {annotation.note || empty}
                      </Text>
                    ))}
                  </>
                ) : (
                  <Text style={styles.mutedText}>{empty}</Text>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Conclusão</Text>
          <InfoRow label="Pontos de atenção" value={display(assessment.conclusion.attentionPoints)} />
          <InfoRow label="Objetivos" value={display(assessment.conclusion.definedGoals)} />
          <InfoRow label="Recomendações" value={display(assessment.conclusion.trainerRecommendations)} />
          <InfoRow label="Liberada ao aluno" value={display(assessment.conclusion.releaseToStudent)} />
        </View>

        {role === "trainer" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push({ pathname: "/assessment-compare" as never, params: { id: assessment.id } })}
            >
              <Ionicons name="git-compare-outline" size={18} color="#D90000" />
              <Text style={styles.secondaryButtonText}>Comparar evolução</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleReopen}>
              <Text style={styles.primaryButtonText}>Reabrir avaliação</Text>
              <Ionicons name="refresh" size={18} color="#000" />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 34 }} />
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1c1c1c",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#D90000",
    fontWeight: "800",
    marginTop: 3,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    padding: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#D90000",
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
  statusBadge: {
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusText: {
    color: "#D90000",
    fontWeight: "900",
  },
  card: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 7,
  },
  infoLabel: {
    color: "#888",
    fontWeight: "800",
    flex: 0.45,
  },
  infoValue: {
    color: "#fff",
    textAlign: "right",
    flex: 1,
    lineHeight: 20,
  },
  mutedText: {
    color: "#888",
    lineHeight: 20,
  },
  disclaimer: {
    color: "#f6c343",
    lineHeight: 19,
    marginTop: 8,
  },
  innerItem: {
    backgroundColor: "#101010",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  itemTitle: {
    color: "#fff",
    fontWeight: "900",
    marginBottom: 6,
  },
  photoReport: {
    backgroundColor: "#101010",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  photo: {
    width: "100%",
    height: 240,
    borderRadius: 12,
    marginBottom: 8,
  },
  annotationText: {
    color: "#ddd",
    lineHeight: 19,
    marginTop: 4,
  },
  actions: {
    gap: 10,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#1c1c1c",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  centerState: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 10,
    textAlign: "center",
  },
  centerText: {
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
});
