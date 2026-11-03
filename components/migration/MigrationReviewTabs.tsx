import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  MigrationExtractedAssessment,
  MigrationExtractedMedia,
  MigrationExtractedStudent,
  MigrationExtractedWorkout,
  MigrationIssue,
  StudentResolution,
} from "@/services/mobile-migration-store";
import { StudentProfile } from "@/services/student-profile-store";
import { ParsedExercise } from "@/services/workout-import-parser";

interface MigrationReviewTabsProps {
  students: MigrationExtractedStudent[];
  workouts: MigrationExtractedWorkout[];
  assessments: MigrationExtractedAssessment[];
  media: MigrationExtractedMedia[];
  issues: MigrationIssue[];
  existingStudents: StudentProfile[];
  onUpdateStudent: (studentId: string, updates: Partial<MigrationExtractedStudent>) => void;
  onUpdateWorkout: (workoutId: string, updates: Partial<MigrationExtractedWorkout>) => void;
  onResolveIssue: (issueId: string) => void;
  onAddNewStudentInline: (fullName: string, email: string, phone: string, goal: string) => Promise<string>;
  activeColor: string;
  theme: {
    card: string;
    cardSecondary: string;
    cardBorder: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    placeholder: string;
  };
}

type ActiveTab = "summary" | "students" | "workouts" | "assessments" | "media" | "issues";

export const MigrationReviewTabs: React.FC<MigrationReviewTabsProps> = ({
  students,
  workouts,
  assessments,
  media,
  issues,
  existingStudents,
  onUpdateStudent,
  onUpdateWorkout,
  onResolveIssue,
  onAddNewStudentInline,
  activeColor,
  theme,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("workouts");
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(
    workouts[0]?.id || null
  );

  // Modal para vincular aluno existente
  const [linkingStudentTarget, setLinkingStudentTarget] = useState<MigrationExtractedStudent | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  // Modal para criar novo aluno inline
  const [showNewStudentModal, setShowNewStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentGoal, setNewStudentGoal] = useState("Hipertrofia");

  // Modal para edição rápida de exercício
  const [editingExercise, setEditingExercise] = useState<{
    workoutId: string;
    exercise: ParsedExercise;
  } | null>(null);

  // Helper de mascaramento
  const maskPhone = (phone?: string) => {
    if (!phone) return "-";
    const clean = phone.replace(/\D/g, "");
    if (clean.length >= 10) {
      return `(${clean.slice(0, 2)}) *****-${clean.slice(-4)}`;
    }
    return phone;
  };

  const maskEmail = (email?: string) => {
    if (!email) return "-";
    const parts = email.split("@");
    if (parts.length < 2) return email;
    const user = parts[0];
    const maskedUser = user.length > 3 ? `${user.slice(0, 2)}***${user.slice(-1)}` : `${user.slice(0, 1)}***`;
    return `${maskedUser}@${parts[1]}`;
  };

  // Tabs do header de revisão
  const tabsList: { id: ActiveTab; label: string; count: number }[] = [
    { id: "summary", label: "Resumo", count: 0 },
    { id: "students", label: "Alunos", count: students.length },
    { id: "workouts", label: "Treinos", count: workouts.length },
    { id: "assessments", label: "Avaliações", count: assessments.length },
    { id: "media", label: "Mídias", count: media.length },
    { id: "issues", label: "Pendências", count: issues.filter((i) => !i.resolved).length },
  ];

  // Ações de exercício no treino
  const handleDeleteExercise = (workoutId: string, exId: string) => {
    const wk = workouts.find((w) => w.id === workoutId);
    if (!wk) return;
    const updatedExercises = wk.exercises.filter((e) => e.id !== exId);
    onUpdateWorkout(workoutId, { exercises: updatedExercises });
  };

  const handleSaveExerciseEdit = () => {
    if (!editingExercise) return;
    const { workoutId, exercise } = editingExercise;
    const wk = workouts.find((w) => w.id === workoutId);
    if (!wk) return;

    const updatedExercises = wk.exercises.map((e) =>
      e.id === exercise.id ? exercise : e
    );
    onUpdateWorkout(workoutId, { exercises: updatedExercises });
    setEditingExercise(null);
  };

  // Submissão de novo aluno inline
  const handleCreateNewStudentSubmit = async () => {
    if (!newStudentName.trim()) {
      Alert.alert("Nome Obrigatório", "Preencha o nome do aluno.");
      return;
    }
    try {
      await onAddNewStudentInline(
        newStudentName.trim(),
        newStudentEmail.trim(),
        newStudentPhone.trim(),
        newStudentGoal.trim()
      );
      setShowNewStudentModal(false);
      setNewStudentName("");
      setNewStudentEmail("");
      setNewStudentPhone("");
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Falha ao cadastrar aluno.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Abas Superiores com Contador */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRail}>
        {tabsList.map((t) => {
          const isActive = activeTab === t.id;
          const isIssue = t.id === "issues" && t.count > 0;

          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.tabChip,
                {
                  backgroundColor: isActive ? theme.card : theme.cardSecondary,
                  borderColor: isActive ? activeColor : theme.cardBorder,
                },
              ]}
              onPress={() => setActiveTab(t.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabChipText,
                  { color: isActive ? theme.text : theme.textSecondary, fontWeight: isActive ? "700" : "500" },
                ]}
              >
                {t.label}
              </Text>
              {t.count > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    { backgroundColor: isIssue ? "#F59E0B" : isActive ? activeColor : theme.cardBorder },
                  ]}
                >
                  <Text style={styles.tabBadgeText}>{t.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Conteúdo da Aba Selecionada */}
      <View style={styles.tabBody}>
        {/* 1. ABA RESUMO */}
        {activeTab === "summary" && (
          <View style={styles.summaryTab}>
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Visão Geral da Importação</Text>
              <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                Confira os registros identificados nas outras abas antes de avançar para a gravação definitiva.
              </Text>

              <View style={styles.summaryStatsList}>
                <View style={styles.summaryStatRow}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Alunos para criar / vincular:</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{students.length}</Text>
                </View>
                <View style={styles.summaryStatRow}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Treinos em rascunho:</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{workouts.length}</Text>
                </View>
                <View style={styles.summaryStatRow}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Exercícios mapeados:</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {workouts.reduce((acc, w) => acc + w.exercises.length, 0)}
                  </Text>
                </View>
                <View style={styles.summaryStatRow}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Avaliações físicas:</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{assessments.length}</Text>
                </View>
                <View style={styles.summaryStatRow}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Mídias / Links de vídeo:</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{media.length}</Text>
                </View>
                <View style={styles.summaryStatRow}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pendências não resolvidas:</Text>
                  <Text style={[styles.statValue, { color: issues.length > 0 ? "#F59E0B" : "#10B981" }]}>
                    {issues.filter((i) => !i.resolved).length}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 2. ABA ALUNOS */}
        {activeTab === "students" && (
          <View style={styles.studentsTab}>
            <View style={styles.tabActionHeader}>
              <Text style={[styles.tabSectionTitle, { color: theme.text }]}>
                Alunos Identificados ({students.length})
              </Text>
              <TouchableOpacity
                style={[styles.smallActionBtn, { borderColor: activeColor }]}
                onPress={() => setShowNewStudentModal(true)}
              >
                <Ionicons name="person-add-outline" size={14} color={activeColor} />
                <Text style={[styles.smallActionBtnText, { color: activeColor }]}>+ Cadastrar Aluno</Text>
              </TouchableOpacity>
            </View>

            {students.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                <Ionicons name="people-outline" size={24} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Nenhum aluno identificado.</Text>
                <TouchableOpacity
                  style={[styles.createFirstBtn, { backgroundColor: activeColor }]}
                  onPress={() => setShowNewStudentModal(true)}
                >
                  <Text style={styles.createFirstBtnText}>Cadastrar Primeiro Aluno</Text>
                </TouchableOpacity>
              </View>
            ) : (
              students.map((st) => {
                const linkedExisting = existingStudents.find((ex) => ex.id === st.duplicateWithStudentId);

                return (
                  <View
                    key={st.id}
                    style={[styles.studentReviewCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                  >
                    <View style={styles.studentCardHeader}>
                      <View style={styles.studentCardHeaderLeft}>
                        <View style={[styles.avatarBox, { backgroundColor: theme.cardSecondary }]}>
                          <Ionicons name="person" size={16} color={activeColor} />
                        </View>
                        <View>
                          <Text style={[styles.studentOrigName, { color: theme.text }]}>{st.originalName}</Text>
                          <Text style={[styles.studentMeta, { color: theme.textMuted }]}>
                            {st.email ? maskEmail(st.email) : "Sem e-mail"} • {st.phone ? maskPhone(st.phone) : "Sem celular"}
                          </Text>
                        </View>
                      </View>

                      {st.isDuplicate && (
                        <View style={styles.duplicatePill}>
                          <Ionicons name="alert-circle" size={12} color="#F59E0B" />
                          <Text style={styles.duplicatePillText}>Possível duplicidade</Text>
                        </View>
                      )}
                    </View>

                    {/* Resolução de Destino */}
                    <View style={[styles.destinationBox, { backgroundColor: theme.cardSecondary }]}>
                      <Text style={[styles.destinationLabel, { color: theme.textMuted }]}>Destino no DragonCorp:</Text>

                      <View style={styles.resolutionChoices}>
                        <TouchableOpacity
                          style={[
                            styles.choiceBtn,
                            st.resolution === "create_new" && { backgroundColor: activeColor, borderColor: activeColor },
                          ]}
                          onPress={() => onUpdateStudent(st.id, { resolution: "create_new" })}
                        >
                          <Text
                            style={[
                              styles.choiceBtnText,
                              { color: st.resolution === "create_new" ? "#FFFFFF" : theme.textSecondary },
                            ]}
                          >
                            Criar Novo
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.choiceBtn,
                            st.resolution === "link_existing" && { backgroundColor: activeColor, borderColor: activeColor },
                          ]}
                          onPress={() => {
                            setLinkingStudentTarget(st);
                            setStudentSearchQuery("");
                          }}
                        >
                          <Text
                            style={[
                              styles.choiceBtnText,
                              { color: st.resolution === "link_existing" ? "#FFFFFF" : theme.textSecondary },
                            ]}
                          >
                            {linkedExisting ? `Vincular a: ${linkedExisting.registration.fullName}` : "Vincular a Existente"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.choiceBtn,
                            st.status === "ignored" && { backgroundColor: "#EF4444", borderColor: "#EF4444" },
                          ]}
                          onPress={() =>
                            onUpdateStudent(st.id, {
                              status: st.status === "ignored" ? "pending_review" : "ignored",
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.choiceBtnText,
                              { color: st.status === "ignored" ? "#FFFFFF" : theme.textSecondary },
                            ]}
                          >
                            {st.status === "ignored" ? "Ignorado" : "Ignorar"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* 3. ABA TREINOS */}
        {activeTab === "workouts" && (
          <View style={styles.workoutsTab}>
            <View style={styles.tabActionHeader}>
              <Text style={[styles.tabSectionTitle, { color: theme.text }]}>
                Divisões de Treino ({workouts.length})
              </Text>
              <View style={[styles.badgePill, { backgroundColor: theme.cardSecondary }]}>
                <Text style={[styles.badgePillText, { color: theme.textMuted }]}>
                  {workouts.reduce((acc, w) => acc + w.exercises.length, 0)} exercícios
                </Text>
              </View>
            </View>

            {workouts.map((wk) => {
              const isExpanded = expandedWorkoutId === wk.id;

              return (
                <View
                  key={wk.id}
                  style={[styles.workoutCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  <TouchableOpacity
                    style={styles.workoutCardHeader}
                    onPress={() => setExpandedWorkoutId(isExpanded ? null : wk.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.workoutHeaderLeft}>
                      <View style={[styles.divisionBadge, { backgroundColor: activeColor }]}>
                        <Text style={styles.divisionBadgeText}>{wk.divisionLabel}</Text>
                      </View>
                      <View>
                        <Text style={[styles.workoutName, { color: theme.text }]}>{wk.name}</Text>
                        <Text style={[styles.workoutMuscles, { color: theme.textMuted }]}>
                          Foco: {wk.muscleGroups.join(", ") || "Geral"} • {wk.exercises.length} exercícios
                        </Text>
                      </View>
                    </View>

                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={theme.textMuted}
                    />
                  </TouchableOpacity>

                  {/* Exercícios expandidos */}
                  {isExpanded && (
                    <View style={[styles.workoutExercisesBody, { borderTopColor: theme.cardBorder }]}>
                      {wk.exercises.map((ex, idx) => (
                        <View
                          key={ex.id}
                          style={[styles.exerciseItemRow, { backgroundColor: theme.cardSecondary }]}
                        >
                          <View style={styles.exerciseIndexCircle}>
                            <Text style={styles.exerciseIndexText}>{idx + 1}</Text>
                          </View>

                          <View style={styles.exerciseMainInfo}>
                            <View style={styles.exerciseTitleRow}>
                              <Text style={[styles.exerciseName, { color: theme.text }]} numberOfLines={1}>
                                {ex.name}
                              </Text>
                              <View style={styles.matchedBadge}>
                                <Text style={styles.matchedBadgeText}>{ex.muscleGroup || "Geral"}</Text>
                              </View>
                            </View>

                            <View style={styles.exerciseSpecs}>
                              <Text style={[styles.specItem, { color: theme.textSecondary }]}>
                                {ex.sets} séries × {ex.reps}
                              </Text>
                              <Text style={[styles.specDot, { color: theme.textMuted }]}>•</Text>
                              <Text style={[styles.specItem, { color: theme.textSecondary }]}>
                                {ex.restSeconds}s desc.
                              </Text>
                              {ex.load ? (
                                <>
                                  <Text style={[styles.specDot, { color: theme.textMuted }]}>•</Text>
                                  <Text style={[styles.specItem, { color: theme.textSecondary }]}>
                                    {ex.load}
                                  </Text>
                                </>
                              ) : null}
                            </View>

                            {ex.notes ? (
                              <Text style={[styles.exerciseNote, { color: theme.textMuted }]}>
                                Obs: {ex.notes}
                              </Text>
                            ) : null}
                          </View>

                          {/* Ações: Editar e Excluir */}
                          <View style={styles.exerciseActions}>
                            <TouchableOpacity
                              style={styles.exActionBtn}
                              onPress={() => setEditingExercise({ workoutId: wk.id, exercise: { ...ex } })}
                              hitSlop={6}
                            >
                              <Ionicons name="pencil-outline" size={16} color={activeColor} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.exActionBtn}
                              onPress={() => handleDeleteExercise(wk.id, ex.id)}
                              hitSlop={6}
                            >
                              <Ionicons name="trash-outline" size={16} color="#777777" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* 4. ABA AVALIAÇÕES */}
        {activeTab === "assessments" && (
          <View style={styles.assessmentsTab}>
            <Text style={[styles.tabSectionTitle, { color: theme.text, marginBottom: 12 }]}>
              Avaliações Históricas ({assessments.length})
            </Text>

            {assessments.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                <Ionicons name="clipboard-outline" size={24} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Nenhuma avaliação física identificada nos arquivos.
                </Text>
              </View>
            ) : (
              assessments.map((as) => (
                <View
                  key={as.id}
                  style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder, marginBottom: 10 }]}
                >
                  <View style={styles.assessmentHeader}>
                    <View>
                      <Text style={[styles.cardTitle, { color: theme.text }]}>{as.protocol}</Text>
                      <Text style={[styles.cardDesc, { color: theme.textMuted }]}>
                        Aluno: {as.studentName} • Data: {as.date}
                      </Text>
                    </View>
                    {as.bodyFatPct ? (
                      <View style={[styles.fatBadge, { backgroundColor: activeColor }]}>
                        <Text style={styles.fatBadgeText}>{as.bodyFatPct}% GC</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.assessmentMetricsRow}>
                    {as.weightKg ? (
                      <Text style={[styles.metricText, { color: theme.textSecondary }]}>
                        Peso: <Text style={{ color: theme.text, fontWeight: "700" }}>{as.weightKg} kg</Text>
                      </Text>
                    ) : null}
                    {as.heightCm ? (
                      <Text style={[styles.metricText, { color: theme.textSecondary }]}>
                        Altura: <Text style={{ color: theme.text, fontWeight: "700" }}>{as.heightCm} cm</Text>
                      </Text>
                    ) : null}
                  </View>

                  {as.notes ? (
                    <Text style={[styles.assessmentNotes, { color: theme.textMuted }]}>
                      {as.notes}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}

        {/* 5. ABA MÍDIAS */}
        {activeTab === "media" && (
          <View style={styles.mediaTab}>
            <Text style={[styles.tabSectionTitle, { color: theme.text, marginBottom: 12 }]}>
              Fotos, Vídeos e Mídias ({media.length})
            </Text>

            {media.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                <Ionicons name="images-outline" size={24} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Nenhuma imagem ou vídeo adicionado.
                </Text>
              </View>
            ) : (
              media.map((med) => (
                <View
                  key={med.id}
                  style={[styles.mediaCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                >
                  <View style={styles.mediaIconBox}>
                    <Ionicons
                      name={med.type === "youtube" ? "logo-youtube" : med.type === "video" ? "videocam" : "image"}
                      size={20}
                      color={med.type === "youtube" ? "#FF0000" : activeColor}
                    />
                  </View>
                  <View style={styles.mediaInfo}>
                    <Text style={[styles.mediaTitle, { color: theme.text }]} numberOfLines={1}>
                      {med.title}
                    </Text>
                    <Text style={[styles.mediaSubtitle, { color: theme.textMuted }]}>
                      Associação: {med.associatedType} {med.youtubeId ? `• ID: ${med.youtubeId}` : ""}
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* 6. ABA PENDÊNCIAS */}
        {activeTab === "issues" && (
          <View style={styles.issuesTab}>
            <Text style={[styles.tabSectionTitle, { color: theme.text, marginBottom: 12 }]}>
              Pendências para Resolução ({issues.filter((i) => !i.resolved).length})
            </Text>

            {issues.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
                <Ionicons name="checkmark-circle-outline" size={28} color="#10B981" />
                <Text style={[styles.emptyText, { color: "#10B981" }]}>
                  Tudo limpo! Não há nenhuma pendência aberta.
                </Text>
              </View>
            ) : (
              issues.map((iss) => (
                <View
                  key={iss.id}
                  style={[
                    styles.issueCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: iss.resolved ? theme.cardBorder : "#F59E0B",
                    },
                  ]}
                >
                  <View style={styles.issueTopRow}>
                    <Ionicons
                      name={iss.resolved ? "checkmark-circle" : "alert-circle"}
                      size={18}
                      color={iss.resolved ? "#10B981" : "#F59E0B"}
                    />
                    <Text style={[styles.issueTitle, { color: theme.text }]}>{iss.title}</Text>
                  </View>
                  <Text style={[styles.issueDesc, { color: theme.textSecondary }]}>{iss.description}</Text>

                  {!iss.resolved && (
                    <TouchableOpacity
                      style={[styles.resolveBtn, { borderColor: activeColor }]}
                      onPress={() => onResolveIssue(iss.id)}
                    >
                      <Ionicons name="checkmark" size={14} color={activeColor} />
                      <Text style={[styles.resolveBtnText, { color: activeColor }]}>
                        Marcar como Resolvido
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </View>

      {/* Modal: Vincular a Aluno Existente */}
      <Modal visible={!!linkingStudentTarget} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Vincular Aluno</Text>
              <TouchableOpacity onPress={() => setLinkingStudentTarget(null)}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
              Selecione a qual aluno do DragonCorp você deseja associar os treinos de "{linkingStudentTarget?.originalName}":
            </Text>

            <TextInput
              style={[styles.searchInput, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, color: theme.text }]}
              value={studentSearchQuery}
              onChangeText={setStudentSearchQuery}
              placeholder="Buscar por nome ou CPF..."
              placeholderTextColor={theme.placeholder}
            />

            <ScrollView style={{ maxHeight: 240, marginVertical: 10 }}>
              {existingStudents
                .filter((ex) =>
                  ex.registration.fullName.toLowerCase().includes(studentSearchQuery.toLowerCase())
                )
                .map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={[styles.existingStudentOption, { backgroundColor: theme.cardSecondary }]}
                    onPress={() => {
                      if (linkingStudentTarget) {
                        onUpdateStudent(linkingStudentTarget.id, {
                          resolution: "link_existing",
                          duplicateWithStudentId: ex.id,
                          mappedName: ex.registration.fullName,
                        });
                      }
                      setLinkingStudentTarget(null);
                    }}
                  >
                    <Ionicons name="person-outline" size={16} color={activeColor} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.existingStudentName, { color: theme.text }]}>
                        {ex.registration.fullName}
                      </Text>
                      <Text style={[styles.existingStudentPhone, { color: theme.textMuted }]}>
                        {maskPhone(ex.registration.phone)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Cadastrar Novo Aluno Inline */}
      <Modal visible={showNewStudentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Novo Aluno</Text>
              <TouchableOpacity onPress={() => setShowNewStudentModal(false)}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
              Preencha os dados básicos. O aluno será criado como convite pendente.
            </Text>

            <TextInput
              style={[styles.singleInput, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, color: theme.text }]}
              value={newStudentName}
              onChangeText={setNewStudentName}
              placeholder="Nome completo do aluno..."
              placeholderTextColor={theme.placeholder}
            />

            <TextInput
              style={[styles.singleInput, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, color: theme.text, marginTop: 8 }]}
              value={newStudentEmail}
              onChangeText={setNewStudentEmail}
              placeholder="E-mail (opcional)..."
              placeholderTextColor={theme.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={[styles.singleInput, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, color: theme.text, marginTop: 8 }]}
              value={newStudentPhone}
              onChangeText={setNewStudentPhone}
              placeholder="Celular (11) 99999-0000..."
              placeholderTextColor={theme.placeholder}
              keyboardType="phone-pad"
            />

            <TextInput
              style={[styles.singleInput, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, color: theme.text, marginTop: 8 }]}
              value={newStudentGoal}
              onChangeText={setNewStudentGoal}
              placeholder="Objetivo principal (ex: Hipertrofia)..."
              placeholderTextColor={theme.placeholder}
            />

            <TouchableOpacity
              style={[styles.modalPrimaryBtn, { backgroundColor: activeColor, marginTop: 14 }]}
              onPress={handleCreateNewStudentSubmit}
            >
              <Text style={styles.modalPrimaryBtnText}>Salvar Aluno</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Edição Rápida de Exercício */}
      <Modal visible={!!editingExercise} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Editar Exercício</Text>
              <TouchableOpacity onPress={() => setEditingExercise(null)}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {editingExercise && (
              <>
                <TextInput
                  style={[styles.singleInput, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, color: theme.text }]}
                  value={editingExercise.exercise.name}
                  onChangeText={(val) =>
                    setEditingExercise({
                      ...editingExercise,
                      exercise: { ...editingExercise.exercise, name: val },
                    })
                  }
                  placeholder="Nome do exercício..."
                  placeholderTextColor={theme.placeholder}
                />

                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <TextInput
                    style={[styles.singleInput, { flex: 1, backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, color: theme.text }]}
                    value={String(editingExercise.exercise.sets)}
                    onChangeText={(val) =>
                      setEditingExercise({
                        ...editingExercise,
                        exercise: { ...editingExercise.exercise, sets: parseInt(val, 10) || 3 },
                      })
                    }
                    placeholder="Séries"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.singleInput, { flex: 1.5, backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, color: theme.text }]}
                    value={editingExercise.exercise.reps}
                    onChangeText={(val) =>
                      setEditingExercise({
                        ...editingExercise,
                        exercise: { ...editingExercise.exercise, reps: val },
                      })
                    }
                    placeholder="Reps"
                    placeholderTextColor={theme.placeholder}
                  />
                  <TextInput
                    style={[styles.singleInput, { flex: 1, backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, color: theme.text }]}
                    value={String(editingExercise.exercise.restSeconds)}
                    onChangeText={(val) =>
                      setEditingExercise({
                        ...editingExercise,
                        exercise: { ...editingExercise.exercise, restSeconds: parseInt(val, 10) || 60 },
                      })
                    }
                    placeholder="Descanso (s)"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="numeric"
                  />
                </View>

                <TextInput
                  style={[styles.singleInput, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, color: theme.text, marginTop: 8 }]}
                  value={editingExercise.exercise.load || ""}
                  onChangeText={(val) =>
                    setEditingExercise({
                      ...editingExercise,
                      exercise: { ...editingExercise.exercise, load: val },
                    })
                  }
                  placeholder="Carga sugerida (ex: 20kg)..."
                  placeholderTextColor={theme.placeholder}
                />

                <TextInput
                  style={[styles.singleInput, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, color: theme.text, marginTop: 8 }]}
                  value={editingExercise.exercise.notes || ""}
                  onChangeText={(val) =>
                    setEditingExercise({
                      ...editingExercise,
                      exercise: { ...editingExercise.exercise, notes: val },
                    })
                  }
                  placeholder="Observação técnica..."
                  placeholderTextColor={theme.placeholder}
                />

                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, { backgroundColor: activeColor, marginTop: 14 }]}
                  onPress={handleSaveExerciseEdit}
                >
                  <Text style={styles.modalPrimaryBtnText}>Salvar Alterações</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  tabsRail: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 13,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tabBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  tabBody: {
    gap: 12,
  },
  summaryTab: {
    gap: 12,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 14,
  },
  summaryStatsList: {
    gap: 10,
  },
  summaryStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 13,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  studentsTab: {
    gap: 10,
  },
  tabActionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tabSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  smallActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  studentReviewCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  studentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  studentCardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatarBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  studentOrigName: {
    fontSize: 14,
    fontWeight: "700",
  },
  studentMeta: {
    fontSize: 11.5,
    marginTop: 2,
  },
  duplicatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  duplicatePillText: {
    fontSize: 11,
    color: "#F59E0B",
    fontWeight: "600",
  },
  destinationBox: {
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  destinationLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  resolutionChoices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  choiceBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  choiceBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  workoutsTab: {
    gap: 10,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  workoutCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  workoutCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  workoutHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  divisionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  divisionBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  workoutName: {
    fontSize: 14,
    fontWeight: "700",
  },
  workoutMuscles: {
    fontSize: 11.5,
    marginTop: 2,
  },
  workoutExercisesBody: {
    borderTopWidth: 1,
    padding: 10,
    gap: 8,
  },
  exerciseItemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    gap: 10,
  },
  exerciseIndexCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseIndexText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  exerciseMainInfo: {
    flex: 1,
  },
  exerciseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  matchedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  matchedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#AAAAAA",
  },
  exerciseSpecs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  specItem: {
    fontSize: 11.5,
  },
  specDot: {
    fontSize: 11,
  },
  exerciseNote: {
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 2,
  },
  exerciseActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  exActionBtn: {
    padding: 4,
  },
  assessmentsTab: {
    gap: 10,
  },
  assessmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  fatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fatBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  assessmentMetricsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 6,
  },
  metricText: {
    fontSize: 12.5,
  },
  assessmentNotes: {
    fontSize: 11.5,
    fontStyle: "italic",
    marginTop: 4,
  },
  mediaTab: {
    gap: 10,
  },
  mediaCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  mediaIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaInfo: {
    flex: 1,
  },
  mediaTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  mediaSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    padding: 4,
  },
  issuesTab: {
    gap: 10,
  },
  issueCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  issueTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  issueTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  issueDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  resolveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  resolveBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  emptyBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "600",
  },
  createFirstBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  createFirstBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalDesc: {
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 12,
  },
  searchInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  existingStudentOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    gap: 10,
    marginBottom: 6,
  },
  existingStudentName: {
    fontSize: 13,
    fontWeight: "600",
  },
  existingStudentPhone: {
    fontSize: 11,
  },
  singleInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  modalPrimaryBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

