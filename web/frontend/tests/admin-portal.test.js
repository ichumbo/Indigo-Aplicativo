import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Admin Portal: Todos os componentes e páginas administrativas existem', () => {
  const requiredFiles = [
    'src/admin.css',
    'src/types/admin.ts',
    'src/api/adminClient.ts',
    'src/context/AdminAuthContext.tsx',
    'src/components/admin/AdminLayout.tsx',
    'src/components/admin/AdminProtectedRoute.tsx',
    'src/components/admin/AdminConfirmModal.tsx',
    'src/pages/admin/AdminLoginPage.tsx',
    'src/pages/admin/AdminOverviewPage.tsx',
    'src/pages/admin/AdminUsersPage.tsx',
    'src/pages/admin/AdminUserDetailPage.tsx',
    'src/pages/admin/AdminPersonalsPage.tsx',
    'src/pages/admin/AdminStudentsPage.tsx',
    'src/pages/admin/AdminLinksPage.tsx',
    'src/pages/admin/AdminSubscriptionsPage.tsx',
    'src/pages/admin/AdminNotificationsPage.tsx',
    'src/pages/admin/AdminAuditPage.tsx',
    'src/pages/admin/AdminSecurityPage.tsx',
    'src/pages/admin/AdminSettingsPage.tsx',
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.join(rootDir, relPath);
    assert.ok(fs.existsSync(fullPath), `Arquivo mandatório do portal admin ausente: ${relPath}`);
  }
});

test('Admin Routing: App.tsx contém todas as rotas administrativas sob /admin', () => {
  const appContent = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf-8');
  assert.ok(appContent.includes('/admin/login'), 'Rota /admin/login ausente em App.tsx');
  assert.ok(appContent.includes('path="/admin"'), 'Rota base /admin ausente em App.tsx');
  assert.ok(appContent.includes('path="users"'), 'Rota users ausente em App.tsx');
  assert.ok(appContent.includes('path="users/:id"'), 'Rota users/:id ausente em App.tsx');
  assert.ok(appContent.includes('path="personals"'), 'Rota personals ausente em App.tsx');
  assert.ok(appContent.includes('path="students"'), 'Rota students ausente em App.tsx');
  assert.ok(appContent.includes('path="links"'), 'Rota links ausente em App.tsx');
  assert.ok(appContent.includes('path="subscriptions"'), 'Rota subscriptions ausente em App.tsx');
  assert.ok(appContent.includes('path="notifications"'), 'Rota notifications ausente em App.tsx');
  assert.ok(appContent.includes('path="audit"'), 'Rota audit ausente em App.tsx');
  assert.ok(appContent.includes('path="security"'), 'Rota security ausente em App.tsx');
  assert.ok(appContent.includes('path="settings"'), 'Rota settings ausente em App.tsx');
});

test('Admin Design: admin.css respeita paleta DragonCorp pura e sem gradientes', () => {
  const cssContent = fs.readFileSync(path.join(rootDir, 'src/admin.css'), 'utf-8');
  assert.ok(cssContent.includes('--admin-primary: #D90000;'), 'Cor primária oficial DragonCorp #D90000 ausente');
  assert.ok(cssContent.includes('--admin-bg: #0A0A0A;'), 'Fundo escuro oficial #0A0A0A ausente');
  assert.ok(!cssContent.toLowerCase().includes('linear-gradient'), 'Gradientes são proibidos na regra de design');
});

test('Admin Segurança: Modal de confirmação exige palavras de trava operacional', () => {
  const usersPage = fs.readFileSync(path.join(rootDir, 'src/pages/admin/AdminUsersPage.tsx'), 'utf-8');
  const linksPage = fs.readFileSync(path.join(rootDir, 'src/pages/admin/AdminLinksPage.tsx'), 'utf-8');
  const userDetail = fs.readFileSync(path.join(rootDir, 'src/pages/admin/AdminUserDetailPage.tsx'), 'utf-8');

  assert.ok(usersPage.includes('requiredConfirmText="SUSPENDER"'), 'Confirmação SUSPENDER ausente em AdminUsersPage');
  assert.ok(linksPage.includes('confirm_text !== \'TRANSFERIR\'') || linksPage.includes('TRANSFERIR'), 'Confirmação TRANSFERIR ausente em AdminLinksPage');
  assert.ok(userDetail.includes('requiredConfirmText="ANONIMIZAR"'), 'Confirmação ANONIMIZAR ausente em AdminUserDetailPage');
});
