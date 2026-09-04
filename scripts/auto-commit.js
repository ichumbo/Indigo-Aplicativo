#!/usr/bin/env node

/**
 * Sistema de Auto-Commit Inteligente para Git
 * 
 * Modos de uso:
 * 1. Watch Mode (monitora alterações e commita automaticamente com debounce):
 *    node scripts/auto-commit.js --watch
 *    node scripts/auto-commit.js --watch --push
 * 
 * 2. One-shot Mode (executa um commit imediato das alterações pendentes):
 *    node scripts/auto-commit.js
 *    node scripts/auto-commit.js --push
 * 
 * 3. Parâmetros customizáveis:
 *    --delay <segundos>   (Tempo de espera após última alteração, padrão: 5s)
 *    --push               (Faz git push automaticamente após commitar)
 *    --msg "mensagem"     (Mensagem personalizada)
 */

const { execSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

// Argumentos da linha de comando
const args = process.argv.slice(2);
const isWatchMode = args.includes("--watch") || args.includes("-w");
const shouldPush = args.includes("--push") || args.includes("-p");
const customMsgIdx = args.findIndex((a) => a === "--msg" || a === "-m");
const customMessage = customMsgIdx !== -1 ? args[customMsgIdx + 1] : null;
const delayIdx = args.findIndex((a) => a === "--delay" || a === "-d");
const debounceDelayMs = delayIdx !== -1 ? parseInt(args[delayIdx + 1], 10) * 1000 : 5000;

// Pastas e arquivos a serem ignorados pelo watcher
const IGNORED_PATHS = [
  ".git",
  "node_modules",
  "vendor",
  ".expo",
  "dist",
  ".temp",
  ".DS_Store",
  ".npm",
  "build",
  "coverage",
  "storage",
  ".phpunit.result.cache",
  "database.sqlite",
  "package-lock.json.bak",
];

function runGit(command) {
  try {
    return execSync(`git ${command}`, { cwd: rootDir, encoding: "utf-8", stdio: "pipe" }).trim();
  } catch (error) {
    return null;
  }
}

function getChangedFiles() {
  const statusOutput = runGit("status --porcelain");
  if (!statusOutput) return [];

  return statusOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const code = line.substring(0, 2).trim();
      const file = line.substring(2).trim().replace(/^"|"$/g, "");
      return { code, file };
    });
}

function generateSmartCommitMessage(changedFiles) {
  if (customMessage) return customMessage;

  const timestamp = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  if (changedFiles.length === 0) {
    return `chore: auto-commit sync [${timestamp}]`;
  }

  const paths = changedFiles.map((f) => f.file);

  // Classificação semântica automática
  if (paths.some((p) => p.includes("web/frontend"))) {
    return `feat(web-frontend): auto-sync DragonCorp Web portal [${timestamp}]`;
  }
  if (paths.some((p) => p.includes("web/backend"))) {
    return `feat(web-backend): auto-sync Laravel central API & models [${timestamp}]`;
  }
  if (paths.some((p) => p.includes("api-sync") || p.includes("sync"))) {
    return `feat(sync): auto-sync Web <-> Mobile integration [${timestamp}]`;
  }
  if (paths.some((p) => p.includes("subscription") || p.includes("billing") || p.includes("paywall"))) {
    return `feat(billing): auto-sync subscription & Google Play billing [${timestamp}]`;
  }
  if (paths.some((p) => p.includes("auth") || p.includes("login") || p.includes("security"))) {
    return `fix(auth): auto-sync authentication & profile changes [${timestamp}]`;
  }
  if (paths.some((p) => p.includes("workout") || p.includes("exercise") || p.includes("training"))) {
    return `feat(workouts): auto-sync training plan updates [${timestamp}]`;
  }
  if (paths.some((p) => p.includes("assessment") || p.includes("protocol"))) {
    return `feat(assessments): auto-sync physical assessment updates [${timestamp}]`;
  }
  if (paths.some((p) => p.includes("test"))) {
    return `test: auto-sync test suites [${timestamp}]`;
  }
  if (paths.some((p) => p.includes("app.json") || p.includes("package.json") || p.includes("eas.json"))) {
    return `chore(config): auto-sync build & app configuration [${timestamp}]`;
  }

  const summary = paths.length <= 2 
    ? paths.map((p) => path.basename(p)).join(", ") 
    : `${path.basename(paths[0])} e mais ${paths.length - 1} arquivos`;

  return `chore: auto-sync updates in ${summary} [${timestamp}]`;
}

function performCommit() {
  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    console.log("ℹ️  Nenhuma alteração detectada para commit.");
    return false;
  }

  console.log(`\n📦 Alterações detectadas (${changedFiles.length} arquivos):`);
  changedFiles.forEach((f) => console.log(`   • [${f.code || "M"}] ${f.file}`));

  const commitMsg = generateSmartCommitMessage(changedFiles);

  try {
    console.log("⏳ Executando git add .");
    runGit("add -A");

    console.log(`💬 Criando commit: "${commitMsg}"`);
    execSync(`git commit -m "${commitMsg}"`, { cwd: rootDir, stdio: "inherit" });

    console.log("✅ Commit realizado com sucesso!");

    if (shouldPush) {
      console.log("🚀 Enviando para o repositório remoto (git push)...");
      try {
        execSync("git push", { cwd: rootDir, stdio: "inherit" });
        console.log("🌟 Push concluído com sucesso!");
      } catch (pushErr) {
        console.error("⚠️  Falha ao executar git push:", pushErr.message);
      }
    }

    return true;
  } catch (err) {
    console.error("❌ Erro ao commitar alterações:", err.message);
    return false;
  }
}

// -------------------------------------------------------------
// EXECUÇÃO
// -------------------------------------------------------------

if (!isWatchMode) {
  console.log("🚀 Executando auto-commit one-shot...");
  performCommit();
  process.exit(0);
}

// MODO WATCH
console.log("═════════════════════════════════════════════════════════════");
console.log("👁️  SISTEMA DE AUTO-COMMIT ATIVO (WATCH MODE)");
console.log(`📁 Diretório: ${rootDir}`);
console.log(`⏱️  Cooldown (debounce): ${debounceDelayMs / 1000}s`);
console.log(`🚀 Auto-Push: ${shouldPush ? "ATIVADO" : "DESATIVADO (use --push para ativar)"}`);
console.log("═════════════════════════════════════════════════════════════\n");

let debounceTimer = null;
let isCommitting = false;

function scheduleCommit(triggerFile) {
  if (isCommitting) return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  console.log(`📝 Alteração detectada em: ${triggerFile || "arquivo"} — agendando commit em ${debounceDelayMs / 1000}s...`);

  debounceTimer = setTimeout(async () => {
    isCommitting = true;
    try {
      performCommit();
    } finally {
      isCommitting = false;
    }
  }, debounceDelayMs);
}

// Inicia o watcher recursivo do diretório
try {
  fs.watch(rootDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;

    // Ignora arquivos/pastas de sistema e temporários
    const isIgnored = IGNORED_PATHS.some((ignored) => filename.startsWith(ignored) || filename.includes(`/${ignored}/`));
    if (isIgnored) return;

    scheduleCommit(filename);
  });

  console.log("👀 Observando alterações no código... (Pressione Ctrl+C para encerrar)\n");
} catch (err) {
  console.error("Erro ao iniciar fs.watch:", err.message);
}
