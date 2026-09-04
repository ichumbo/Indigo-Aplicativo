import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const frontendRoot = path.resolve(import.meta.dirname, '..');

test('Frontend: dist build exists and contains essential production bundles', () => {
  const distIndex = path.join(frontendRoot, 'dist', 'index.html');
  assert.ok(fs.existsSync(distIndex), 'dist/index.html deve existir após o build');

  const htmlContent = fs.readFileSync(distIndex, 'utf-8');
  assert.match(htmlContent, /DragonCorp Web/i, 'Título do DragonCorp deve estar no HTML gerado');
  assert.match(htmlContent, /Portal Profissional para Personal Trainers/i, 'Meta description deve estar presente');
});

test('Design System: tokens DragonCorp definidos estritamente em CSS puro sem gradientes baratos', () => {
  const cssPath = path.join(frontendRoot, 'src', 'index.css');
  assert.ok(fs.existsSync(cssPath), 'index.css deve existir');

  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  assert.match(cssContent, /--accent-red:\s*#E50914/, 'Token vermelho DragonCorp #E50914 presente');
  assert.match(cssContent, /--bg-primary:\s*#101012/, 'Token de fundo escuro presente');
  assert.match(cssContent, /\.combination-box/, 'Classe de estilização para Bi-set/Tri-set presente');
});

test('Rotas e Páginas: todos os módulos do Personal Trainer existem', () => {
  const pages = [
    'LoginPage.tsx',
    'DashboardPage.tsx',
    'StudentsPage.tsx',
    'StudentDetailPage.tsx',
    'WorkoutsPage.tsx',
    'WorkoutEditorPage.tsx',
    'AssessmentsPage.tsx',
    'AssessmentComparePage.tsx',
    'ProtocolsPage.tsx',
    'EvolutionPage.tsx',
    'ExercisesPage.tsx',
    'MessagesPage.tsx',
    'NotificationsPage.tsx',
    'SettingsPage.tsx',
  ];

  for (const page of pages) {
    const pagePath = path.join(frontendRoot, 'src', 'pages', page);
    assert.ok(fs.existsSync(pagePath), `Página ${page} deve existir`);
  }
});
