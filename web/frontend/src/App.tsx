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

// Admin Portal Imports
import { AdminAuthProvider } from './context/AdminAuthContext';
import { AdminProtectedRoute } from './components/admin/AdminProtectedRoute';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminUserDetailPage } from './pages/admin/AdminUserDetailPage';
import { AdminPersonalsPage } from './pages/admin/AdminPersonalsPage';
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage';
import { AdminLinksPage } from './pages/admin/AdminLinksPage';
import { AdminSubscriptionsPage } from './pages/admin/AdminSubscriptionsPage';
import { AdminNotificationsPage } from './pages/admin/AdminNotificationsPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';
import { AdminSecurityPage } from './pages/admin/AdminSecurityPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

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
        <AdminAuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Rotas Administrativas DragonCorp (/admin) */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route
                path="/admin"
                element={
                  <AdminProtectedRoute>
                    <AdminLayout />
                  </AdminProtectedRoute>
                }
              >
                <Route index element={<AdminOverviewPage />} />
                <Route path="overview" element={<AdminOverviewPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="users/:id" element={<AdminUserDetailPage />} />
                <Route path="personals" element={<AdminPersonalsPage />} />
                <Route path="students" element={<AdminStudentsPage />} />
                <Route path="links" element={<AdminLinksPage />} />
                <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
                <Route path="notifications" element={<AdminNotificationsPage />} />
                <Route path="audit" element={<AdminAuditPage />} />
                <Route path="security" element={<AdminSecurityPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>

              {/* Rotas Públicas do App Principal */}
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

              {/* Rotas Autenticadas do Aplicativo Personal/Aluno */}
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
        </AdminAuthProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;

