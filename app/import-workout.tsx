import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { StandardScreenHeader } from "@/components/StandardScreenHeader";
import { useCurrentSession } from "@/hooks/use-current-session";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useTrainerBranding } from "@/hooks/use-trainer-branding";
import {
  StudentProfile,
  createStudentProfile,
  listStudentProfilesForTrainer,
} from "@/services/student-profile-store";
import {
  MigrationDataType,
  MigrationExtractedStudent,
  MigrationExtractedWorkout,
  MigrationFileItem,
  MigrationOrigin,
  MigrationSession,
  analyzeMigrationSession,
  calculatePreImportSummary,
  createDemoMigrationSession,
  createNewMigrationSession,
  executeMigrationImport,
  listRecentMigrationSessions,
  saveMigrationSession,
} from "@/services/mobile-migration-store";

import { MigrationStepper } from "@/components/migration/MigrationStepper";
import { MigrationHomeView } from "@/components/migration/MigrationHomeView";
import { MigrationOriginSelector } from "@/components/migration/MigrationOriginSelector";
import { MigrationHelpModal } from "@/components/migration/MigrationHelpModal";
import { MigrationFilesManager } from "@/components/migration/MigrationFilesManager";
import { MigrationAnalyzingView } from "@/components/migration/MigrationAnalyzingView";
import { MigrationReviewTabs } from "@/components/migration/MigrationReviewTabs";
import { MigrationConfirmModal } from "@/components/migration/MigrationConfirmModal";
import { MigrationSuccessView } from "@/components/migration/MigrationSuccessView";

export default function ImportWorkoutScreen() {
  const params = useLocalSearchParams<{ studentId?: string }>();
  const { session: authSession, loadingSession } = useCurrentSession();
  const { theme, isDark } = useAppTheme();
  const { primaryColor } = useTrainerBranding();

  const trainerId = authSession?.user.id || "trainer-main";
  const activeColor = primaryColor || theme.primary || "#D90000";

  // Estado da tela: "home" (visão limpa inicial) ou "wizard" (assistente guiado)
  const [currentView, setCurrentView] = useState<"home" | "wizard">("home");

  // Sessão de migração ativa e histórico recente
  const [migrationSession, setMigrationSession] = useState<MigrationSession | null>(null);
  const [recentSessions, setRecentSessions] = useState<MigrationSession[]>([]);
  const [existingStudents, setExistingStudents] = useState<StudentProfile[]>([]);

  // Modais
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpOriginTarget, setHelpOriginTarget] = useState<MigrationOrigin>("mfit");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [preImportSummary, setPreImportSummary] = useState<any>(null);

  // Estados de processamento
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState("");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Carrega alunos e sessões recentes
  const loadInitialData = useCallback(async () => {
    if (!authSession || authSession.user.role !== "TRAINER") return;
    try {
      const [studentsList, recents] = await Promise.all([
        listStudentProfilesForTrainer(trainerId),
        listRecentMigrationSessions(trainerId),
      ]);
      setExistingStudents(studentsList);
      setRecentSessions(recents);

      // Se houver uma sessão em rascunho recente não concluída, define como ativa
      const inProgress = recents.find(
        (s) => s.status !== "completed" && s.status !== "rolled_back" && s.status !== "failed"
      );
      if (inProgress) {
        setMigrationSession(inProgress);
      }
    } catch {
      // ignora
    }
  }, [authSession, trainerId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Se veio com studentId nos parâmetros, inicializa no wizard para esse aluno
  useEffect(() => {
    if (params.studentId && !migrationSession) {
      const sess = createNewMigrationSession(trainerId, "spreadsheet", ["workouts", "assessments"]);
      setMigrationSession(sess);
      setCurrentView("wizard");
    }
  }, [params.studentId, trainerId, migrationSession]);

  // Ações da tela inicial
  const handleStartNewMigration = () => {
    const sess = createNewMigrationSession(trainerId, "spreadsheet", ["students", "workouts", "assessments"]);
    setMigrationSession(sess);
    setCurrentView("wizard");
  };

  const handleResumeActive = () => {
    if (migrationSession) {
      setCurrentView("wizard");
    }
  };

  const handleLoadDemo = () => {
    const demoSess = createDemoMigrationSession(trainerId);
    setMigrationSession(demoSess);
    setCurrentView("wizard");
  };

  const handleSelectRecentSession = (selected: MigrationSession) => {
    setMigrationSession(selected);
    setCurrentView("wizard");
  };

  // Navegação do Stepper
  const handleStepBack = () => {
    if (!migrationSession) return;
    if (migrationSession.currentStep === 1 || migrationSession.currentStep === 5) {
      setCurrentView("home");
      return;
    }
    const prevStep = (migrationSession.currentStep - 1) as 1 | 2 | 3 | 4 | 5;
    const updated = { ...migrationSession, currentStep: prevStep };
    setMigrationSession(updated);
    void saveMigrationSession(updated);
  };

  const handleStepProceed = async () => {
    if (!migrationSession) return;

    if (migrationSession.currentStep === 1) {
      // Origem -> Arquivos
      const updated = { ...migrationSession, currentStep: 2 as const };
      setMigrationSession(updated);
      await saveMigrationSession(updated);
      return;
    }

    if (migrationSession.currentStep === 2) {
      // Arquivos -> Análise
      const updated = { ...migrationSession, currentStep: 3 as const };
      setMigrationSession(updated);
      await saveMigrationSession(updated);

      // Inicia análise automática
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      try {
        const analyzed = await analyzeMigrationSession(
          updated,
          existingStudents,
          (stage, prog) => {
            setAnalysisStage(stage);
            setAnalysisProgress(prog);
          }
        );
        setMigrationSession(analyzed);
      } catch (err) {
        Alert.alert("Erro na Análise", "Não foi possível analisar os arquivos enviados.");
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    if (migrationSession.currentStep === 3) {
      // Análise -> Revisão
      const updated = { ...migrationSession, currentStep: 4 as const };
      setMigrationSession(updated);
      await saveMigrationSession(updated);
      return;
    }

    if (migrationSession.currentStep === 4) {
      // Revisão -> Resumo Pré-Importação Modal
      const summary = await calculatePreImportSummary(migrationSession, trainerId);
      setPreImportSummary(summary);
      setShowConfirmModal(true);
      return;
    }

    if (migrationSession.currentStep === 5) {
      // Conclusão -> Retorna para Home
      setCurrentView("home");
      await loadInitialData();
    }
  };

  // Execução final da importação (Etapa 5)
  const handleExecuteImport = async () => {
    if (!migrationSession) return;
    setIsSaving(true);
    try {
      const res = await executeMigrationImport(migrationSession, trainerId);
      if (res.success) {
        setShowConfirmModal(false);
        const updated = {
          ...migrationSession,
          currentStep: 5 as const,
          status: "completed" as const,
        };
        setMigrationSession(updated);
        await loadInitialData();
      } else {
        Alert.alert("Falha na Importação", res.error || "Tente novamente.");
      }
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsSaving(false);
    }
  };

  // Modificadores de dados na revisão
  const handleUpdateStudent = (studentId: string, updates: Partial<MigrationExtractedStudent>) => {
    if (!migrationSession) return;
    const updatedStudents = migrationSession.students.map((st) =>
      st.id === studentId ? { ...st, ...updates } : st
    );
    const updated = { ...migrationSession, students: updatedStudents };
    setMigrationSession(updated);
    void saveMigrationSession(updated);
  };

  const handleUpdateWorkout = (workoutId: string, updates: Partial<MigrationExtractedWorkout>) => {
    if (!migrationSession) return;
    const updatedWorkouts = migrationSession.workouts.map((wk) =>
      wk.id === workoutId ? { ...wk, ...updates } : wk
    );
    const updated = { ...migrationSession, workouts: updatedWorkouts };
    setMigrationSession(updated);
    void saveMigrationSession(updated);
  };

  const handleResolveIssue = (issueId: string) => {
    if (!migrationSession) return;
    const updatedIssues = migrationSession.issues.map((i) =>
      i.id === issueId ? { ...i, resolved: true } : i
    );
    const updated = { ...migrationSession, issues: updatedIssues };
    setMigrationSession(updated);
    void saveMigrationSession(updated);
  };

  const handleAddNewStudentInline = async (
    fullName: string,
    email: string,
    phone: string,
    goal: string
  ): Promise<string> => {
    if (!migrationSession) return "";
    const created = await createStudentProfile(
      {
        trainerId,
        fullName,
        email: email || `${fullName.toLowerCase().replace(/\s+/g, ".")}@aluno.dragoncorp.app`,
        phone: phone || "(11) 99999-0000",
        birthDate: "2000-01-01",
        mainGoal: goal || "Hipertrofia",
      },
      trainerId
    );

    // Atualiza a lista de alunos existentes e adiciona o aluno mapeado à migração
    await loadInitialData();

    const newExtracted: MigrationExtractedStudent = {
      id: `st-inline-${created.id}`,
      originalName: fullName,
      mappedName: fullName,
      email,
      phone,
      mainGoal: goal,
      isDuplicate: false,
      resolution: "link_existing",
      duplicateWithStudentId: created.id,
      status: "confirmed",
    };

    const updated = {
      ...migrationSession,
      students: [...migrationSession.students, newExtracted],
    };
    setMigrationSession(updated);
    await saveMigrationSession(updated);
    return created.id;
  };

  // Validação de continuação para o botão da barra inferior
  const getCanProceed = () => {
    if (!migrationSession) return false;
    if (migrationSession.currentStep === 1) {
      return migrationSession.selectedDataTypes.length > 0;
    }
    if (migrationSession.currentStep === 2) {
      return migrationSession.files.length > 0 || Boolean(migrationSession.rawText?.trim());
    }
    if (migrationSession.currentStep === 3) {
      return !isAnalyzing;
    }
    if (migrationSession.currentStep === 4) {
      return true;
    }
    if (migrationSession.currentStep === 5) {
      return true;
    }
    return false;
  };

  const getDisabledReason = () => {
    if (!migrationSession) return undefined;
    if (migrationSession.currentStep === 1 && migrationSession.selectedDataTypes.length === 0) {
      return "Selecione ao menos 1 tipo de dado para importar.";
    }
    if (migrationSession.currentStep === 2 && migrationSession.files.length === 0 && !migrationSession.rawText?.trim()) {
      return "Adicione ao menos 1 arquivo, foto, vídeo ou texto para continuar.";
    }
    return undefined;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

        {/* CABEÇALHO PADRONIZADO */}
        <StandardScreenHeader
          title="Importador Inteligente"
          subtitle={
            currentView === "wizard" && migrationSession
              ? `Migração • ${migrationSession.origin.toUpperCase()}`
              : "Traga seus alunos, treinos e avaliações sem começar do zero"
          }
          onBack={() => {
            if (currentView === "wizard") {
              handleStepBack();
            } else {
              router.back();
            }
          }}
          actions={[
            {
              icon: "help-circle-outline",
              onPress: () => {
                setHelpOriginTarget(migrationSession?.origin || "mfit");
                setShowHelpModal(true);
              },
              accessibilityLabel: "Ajuda de Migração",
            },
          ]}
        />

        {/* STEPPER COMPACTO (Apenas quando em modo Wizard) */}
        {currentView === "wizard" && migrationSession && (
          <MigrationStepper
            currentStep={migrationSession.currentStep}
            activeColor={activeColor}
            theme={theme}
          />
        )}

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            currentView === "wizard" && { paddingBottom: 110 }, // Espaço para não cobrir a barra inferior fixa
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* TELA INICIAL LIMPA (FASE 2) */}
          {currentView === "home" && (
            <MigrationHomeView
              activeSession={migrationSession}
              recentSessions={recentSessions}
              onStartNew={handleStartNewMigration}
              onResumeActive={handleResumeActive}
              onOpenHelp={() => {
                setHelpOriginTarget("mfit");
                setShowHelpModal(true);
              }}
              onLoadDemo={handleLoadDemo}
              onSelectSession={handleSelectRecentSession}
              activeColor={activeColor}
              theme={theme}
            />
          )}

          {/* WIZARD: ETAPA 1 — ORIGEM (FASE 4) */}
          {currentView === "wizard" && migrationSession && migrationSession.currentStep === 1 && (
            <MigrationOriginSelector
              selectedOrigin={migrationSession.origin}
              onSelectOrigin={(origin) => {
                const updated = { ...migrationSession, origin };
                setMigrationSession(updated);
                void saveMigrationSession(updated);
              }}
              selectedDataTypes={migrationSession.selectedDataTypes}
              onToggleDataType={(type) => {
                const current = migrationSession.selectedDataTypes;
                const next = current.includes(type)
                  ? current.filter((t) => t !== type)
                  : [...current, type];
                const updated = { ...migrationSession, selectedDataTypes: next };
                setMigrationSession(updated);
                void saveMigrationSession(updated);
              }}
              onOpenHelp={(origin) => {
                setHelpOriginTarget(origin);
                setShowHelpModal(true);
              }}
              activeColor={activeColor}
              theme={theme}
            />
          )}

          {/* WIZARD: ETAPA 2 — ARQUIVOS (FASE 6 & 7) */}
          {currentView === "wizard" && migrationSession && migrationSession.currentStep === 2 && (
            <MigrationFilesManager
              files={migrationSession.files}
              onAddFiles={(newFiles) => {
                const updated = {
                  ...migrationSession,
                  files: [...migrationSession.files, ...newFiles],
                };
                setMigrationSession(updated);
                void saveMigrationSession(updated);
              }}
              onRemoveFile={(fileId) => {
                const updated = {
                  ...migrationSession,
                  files: migrationSession.files.filter((f) => f.id !== fileId),
                };
                setMigrationSession(updated);
                void saveMigrationSession(updated);
              }}
              rawText={migrationSession.rawText || ""}
              onChangeRawText={(text) => {
                const updated = { ...migrationSession, rawText: text };
                setMigrationSession(updated);
                void saveMigrationSession(updated);
              }}
              onLoadDemo={handleLoadDemo}
              activeColor={activeColor}
              theme={theme}
            />
          )}

          {/* WIZARD: ETAPA 3 — ANÁLISE (FASE 9) */}
          {currentView === "wizard" && migrationSession && migrationSession.currentStep === 3 && (
            <MigrationAnalyzingView
              session={migrationSession}
              isAnalyzing={isAnalyzing}
              currentStage={analysisStage}
              progressPercent={analysisProgress}
              onCancel={() => {
                setIsAnalyzing(false);
                handleStepBack();
              }}
              onProceedToReview={handleStepProceed}
              activeColor={activeColor}
              theme={theme}
            />
          )}

          {/* WIZARD: ETAPA 4 — REVISÃO (FASE 10 a 17) */}
          {currentView === "wizard" && migrationSession && migrationSession.currentStep === 4 && (
            <MigrationReviewTabs
              students={migrationSession.students}
              workouts={migrationSession.workouts}
              assessments={migrationSession.assessments}
              media={migrationSession.media}
              issues={migrationSession.issues}
              existingStudents={existingStudents}
              onUpdateStudent={handleUpdateStudent}
              onUpdateWorkout={handleUpdateWorkout}
              onResolveIssue={handleResolveIssue}
              onAddNewStudentInline={handleAddNewStudentInline}
              activeColor={activeColor}
              theme={theme}
            />
          )}

          {/* WIZARD: ETAPA 5 — CONCLUSÃO & RESULTADO (FASE 20) */}
          {currentView === "wizard" && migrationSession && migrationSession.currentStep === 5 && (
            <MigrationSuccessView
              session={migrationSession}
              trainerId={trainerId}
              onStartNew={handleStartNewMigration}
              activeColor={activeColor}
              theme={theme}
            />
          )}
        </ScrollView>

        {/* BARRA DE AÇÃO FIXA INFERIOR (FASE 8) */}
        {currentView === "wizard" && migrationSession && (
          <MigrationBottomBar
            currentStep={migrationSession.currentStep}
            canGoBack={true}
            canProceed={getCanProceed()}
            onBack={handleStepBack}
            onProceed={handleStepProceed}
            disabledReason={getDisabledReason()}
            activeColor={activeColor}
            theme={theme}
          />
        )}

        {/* MODAL DE AJUDA ESPECÍFICA (FASE 5) */}
        <MigrationHelpModal
          visible={showHelpModal}
          onClose={() => setShowHelpModal(false)}
          origin={helpOriginTarget}
          activeColor={activeColor}
          theme={theme}
        />

        {/* MODAL DE CONFIRMAÇÃO & AUDITORIA DE LIMITES (FASE 18) */}
        <MigrationConfirmModal
          visible={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleExecuteImport}
          isSaving={isSaving}
          summary={preImportSummary}
          activeColor={activeColor}
          theme={theme}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
