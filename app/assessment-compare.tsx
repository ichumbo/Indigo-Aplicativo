import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  PERIMETER_LABELS,
  PHOTO_VIEWS,
  PerimeterKey,
  PhysicalAssessment,
  formatAssessmentDate,
  listAssessmentsForTrainer,
} from "@/services/assessment-store";
import { useCurrentSession } from "@/hooks/use-current-session";

const empty = "Não informado";

export default function AssessmentCompareScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { session, loadingSession } = useCurrentSession();
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
  const [firstId, setFirstId] = useState<string | undefined>();
  const [secondId, setSecondId] = useState<string | undefined>();
  const [selectedView, setSelectedView] = useState(PHOTO_VIEWS[0].id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAssessments = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      if (session.user.role !== "TRAINER") {
        throw new Error("Somente o treinador pode comparar avaliacoes.");
      }

      const items = (await listAssessmentsForTrainer(session.user.id)).filter((item) => item.status === "concluida");
      setAssessments(items);
      const current = params.id ? items.find((item) => item.id === params.id) : items[0];
      const previous = items.find((item) => item.id !== current?.id && item.studentId === current?.studentId);
      setFirstId(previous?.id ?? items[1]?.id);
      setSecondId(current?.id ?? items[0]?.id);
      setError("");
    } catch {
      setError("Não foi possível carregar a comparação.");
    } finally {
      setLoading(false);
    }
  }, [params.id, session]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const first = useMemo(() => assessments.find((item) => item.id === firstId), [assessments, firstId]);
  const second = useMemo(() => assessments.find((item) => item.id === secondId), [assessments, secondId]);

  if (loadingSession || loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#D90000" />
        <Text style={styles.centerText}>Preparando comparação...</Text>
      </View>
    );
  }

  if (error || assessments.length < 2 || !first || !second) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="git-compare-outline" size={42} color="#D90000" />
        <Text style={styles.centerTitle}>Comparação indisponível</Text>
        <Text style={styles.centerText}>
          {error || "Conclua pelo menos duas avaliações liberadas do mesmo aluno para comparar evolução."}
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const firstPhoto = first.photos.find((photo) => photo.view === selectedView);
  const secondPhoto = second.photos.find((photo) => photo.view === selectedView);
  const firstProtocol = first.composition.protocolSnapshot;
  const secondProtocol = second.composition.protocolSnapshot;
  const protocolsComparable =
    !!firstProtocol?.protocolId &&
    !!secondProtocol?.protocolId &&
    firstProtocol.protocolId === secondProtocol.protocolId &&
    firstProtocol.formulaVersion === secondProtocol.formulaVersion;
  const firstCardio = first.cardioTests.find((test) => typeof test.snapshot?.primaryResult?.value === "number");
  const secondCardio = second.cardioTests.find((test) => typeof test.snapshot?.primaryResult?.value === "number");
  const cardioComparable =
    !!firstCardio?.snapshot &&
    !!secondCardio?.snapshot &&
    firstCardio.snapshot.protocolId === secondCardio.snapshot.protocolId &&
    firstCardio.snapshot.protocolVersion === secondCardio.snapshot.protocolVersion &&
    firstCardio.snapshot.primaryResult?.unit === secondCardio.snapshot.primaryResult?.unit;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Comparar evolução</Text>
          <Text style={styles.subtitle}>{second.studentName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.selectorCard}>
          <Text style={styles.sectionTitle}>Datas selecionadas</Text>
          <View style={styles.selectWrap}>
            {assessments.map((item) => (
              <TouchableOpacity
                key={`first-${item.id}`}
                style={[styles.dateChip, firstId === item.id && styles.dateChipActive]}
                onPress={() => setFirstId(item.id)}
              >
                <Text style={[styles.dateChipText, firstId === item.id && styles.dateChipTextActive]}>
                  Antes {formatAssessmentDate(item.assessedAt)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.selectWrap}>
            {assessments.map((item) => (
              <TouchableOpacity
                key={`second-${item.id}`}
                style={[styles.dateChip, secondId === item.id && styles.dateChipActive]}
                onPress={() => setSecondId(item.id)}
              >
                <Text style={[styles.dateChipText, secondId === item.id && styles.dateChipTextActive]}>
                  Depois {formatAssessmentDate(item.assessedAt)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Indicadores</Text>
          <View style={styles.methodBox}>
            <Text style={styles.methodText}>
              Antes: {firstProtocol?.protocolName ?? "sem protocolo salvo"} • Depois: {secondProtocol?.protocolName ?? "sem protocolo salvo"}
            </Text>
            {!protocolsComparable && (
              <Text style={styles.methodWarning}>
                Métodos diferentes ou sem versão salva. A comparação é visual e não deve ser tratada como evolução precisa.
              </Text>
            )}
          </View>
          <CompareRow label="Peso" before={first.composition.weightKg} after={second.composition.weightKg} suffix="kg" />
          <CompareRow label="Gordura" before={first.composition.bodyFatPercent} after={second.composition.bodyFatPercent} suffix="%" />
          <CompareRow label="Massa magra" before={first.composition.leanMassKg} after={second.composition.leanMassKg} suffix="kg" />
          <CompareRow label="IMC" before={first.composition.bmi} after={second.composition.bmi} />
          <View style={styles.methodBox}>
            <Text style={styles.methodText}>
              Cardio: {firstCardio?.snapshot?.protocolName ?? "sem protocolo salvo"} • {secondCardio?.snapshot?.protocolName ?? "sem protocolo salvo"}
            </Text>
            {!cardioComparable && (
              <Text style={styles.methodWarning}>
                Protocolos cardiorrespiratórios diferentes ou sem snapshot compatível. Compare apenas como referência visual.
              </Text>
            )}
          </View>
          <CompareRow
            label={secondCardio?.snapshot?.primaryResult?.label ?? "Cardiorrespiratório"}
            before={firstCardio?.snapshot?.primaryResult?.value}
            after={secondCardio?.snapshot?.primaryResult?.value}
            suffix={cardioComparable ? secondCardio?.snapshot?.primaryResult?.unit : undefined}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Perímetros</Text>
          {(Object.keys(PERIMETER_LABELS) as PerimeterKey[]).map((key) => (
            <CompareRow
              key={key}
              label={PERIMETER_LABELS[key]}
              before={first.perimeters[key]?.valueCm}
              after={second.perimeters[key]?.valueCm}
              suffix="cm"
            />
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Fotos padronizadas</Text>
          <View style={styles.selectWrap}>
            {PHOTO_VIEWS.map((view) => (
              <TouchableOpacity
                key={view.id}
                style={[styles.dateChip, selectedView === view.id && styles.dateChipActive]}
                onPress={() => setSelectedView(view.id)}
              >
                <Text style={[styles.dateChipText, selectedView === view.id && styles.dateChipTextActive]}>{view.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.photoCompare}>
            <View style={styles.photoColumn}>
              <Text style={styles.photoLabel}>Antes • {formatAssessmentDate(first.assessedAt)}</Text>
              {firstPhoto ? <Image source={{ uri: firstPhoto.uri }} style={styles.photo} /> : <EmptyPhoto />}
            </View>
            <View style={styles.photoColumn}>
              <Text style={styles.photoLabel}>Depois • {formatAssessmentDate(second.assessedAt)}</Text>
              {secondPhoto ? <Image source={{ uri: secondPhoto.uri }} style={styles.photo} /> : <EmptyPhoto />}
            </View>
          </View>
          <Text style={styles.helperText}>As fotos não são distorcidas para coincidir. Compare mantendo proporção e vista padronizada.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <CompareText label="Antes" value={first.conclusion.notes || first.conclusion.attentionPoints} />
          <CompareText label="Depois" value={second.conclusion.notes || second.conclusion.attentionPoints} />
        </View>

        <View style={{ height: 34 }} />
      </ScrollView>
    </View>
  );
}

function CompareRow({ label, before, after, suffix }: { label: string; before?: number; after?: number; suffix?: string }) {
  const diff = typeof before === "number" && typeof after === "number" ? after - before : undefined;
  return (
    <View style={styles.compareRow}>
      <Text style={styles.compareLabel}>{label}</Text>
      <View style={styles.compareValues}>
        <Text style={styles.compareValue}>{typeof before === "number" ? `${before}${suffix ? ` ${suffix}` : ""}` : empty}</Text>
        <Text style={styles.compareValue}>{typeof after === "number" ? `${after}${suffix ? ` ${suffix}` : ""}` : empty}</Text>
        <Text style={styles.diffValue}>{typeof diff === "number" ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)}` : empty}</Text>
      </View>
    </View>
  );
}

function CompareText({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.textCompare}>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={styles.textValue}>{value || empty}</Text>
    </View>
  );
}

function EmptyPhoto() {
  return (
    <View style={styles.emptyPhoto}>
      <Ionicons name="image-outline" size={26} color="#666" />
      <Text style={styles.emptyPhotoText}>Sem foto</Text>
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
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  subtitle: {
    color: "#888",
    marginTop: 3,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  selectorCard: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    padding: 16,
    marginBottom: 12,
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
  selectWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  dateChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#101010",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dateChipActive: {
    backgroundColor: "#D90000",
    borderColor: "#D90000",
  },
  dateChipText: {
    color: "#888",
    fontWeight: "800",
  },
  dateChipTextActive: {
    color: "#fff",
  },
  compareRow: {
    backgroundColor: "#101010",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  compareLabel: {
    color: "#fff",
    fontWeight: "900",
    marginBottom: 8,
  },
  compareValues: {
    flexDirection: "row",
    gap: 8,
  },
  compareValue: {
    flex: 1,
    color: "#888",
    fontWeight: "800",
  },
  diffValue: {
    flex: 1,
    color: "#D90000",
    fontWeight: "900",
    textAlign: "right",
  },
  methodBox: {
    borderRadius: 12,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#333",
    padding: 12,
    marginBottom: 10,
  },
  methodText: {
    color: "#ddd",
    fontWeight: "800",
    lineHeight: 19,
  },
  methodWarning: {
    color: "#f4c542",
    lineHeight: 19,
    marginTop: 6,
  },
  photoCompare: {
    flexDirection: "row",
    gap: 10,
  },
  photoColumn: {
    flex: 1,
  },
  photoLabel: {
    color: "#888",
    fontWeight: "800",
    marginBottom: 8,
  },
  photo: {
    width: "100%",
    height: 220,
    borderRadius: 12,
  },
  emptyPhoto: {
    height: 220,
    borderRadius: 12,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyPhotoText: {
    color: "#666",
    marginTop: 6,
  },
  helperText: {
    color: "#666",
    lineHeight: 18,
    marginTop: 10,
  },
  textCompare: {
    backgroundColor: "#101010",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  textValue: {
    color: "#ddd",
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 14,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "900",
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
