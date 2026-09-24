import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ConfirmAccountPage } from './pages/ConfirmAccountPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { WorkoutsPage } from './pages/WorkoutsPage';
import { WorkoutEditorPage } from './pages/WorkoutEditorPage';
import { AssessmentsPage } from './pages/AssessmentsPage';
import { AssessmentComparePage } from './pages/AssessmentComparePage';
import { AgendaPage } from './pages/AgendaPage';
import { ProtocolsPage } from './pages/ProtocolsPage';
import { EvolutionPage } from './pages/EvolutionPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { MessagesPage } from './pages/MessagesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { DeleteAccountPage } from './pages/DeleteAccountPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfUsePage } from './pages/TermsOfUsePage';
import { Loader } from './components/common/Loader';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)' }}>
        <Loader text="Autenticando sessão..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/cadastro" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
            <Route path="/confirm-account" element={<ConfirmAccountPage />} />
            <Route path="/confirmar-conta" element={<ConfirmAccountPage />} />
            <Route path="/delete-account" element={<DeleteAccountPage />} />
            <Route path="/exclusao-de-conta" element={<DeleteAccountPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/privacidade" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfUsePage />} />
            <Route path="/termos" element={<TermsOfUsePage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="alunos" element={<StudentsPage />} />
              <Route path="alunos/:id" element={<StudentDetailPage />} />
              <Route path="treinos" element={<WorkoutsPage />} />
              <Route path="treinos/novo" element={<WorkoutEditorPage />} />
              <Route path="treinos/:id/editar" element={<WorkoutEditorPage />} />
              <Route path="avaliacoes" element={<AssessmentsPage />} />
              <Route path="avaliacoes/comparativo" element={<AssessmentComparePage />} />
              <Route path="agenda" element={<AgendaPage />} />
              <Route path="protocolos" element={<ProtocolsPage />} />
              <Route path="evolucao" element={<EvolutionPage />} />
              <Route path="exercicios" element={<ExercisesPage />} />
              <Route path="mensagens" element={<MessagesPage />} />
              <Route path="notificacoes" element={<NotificationsPage />} />
              <Route path="configuracoes" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
