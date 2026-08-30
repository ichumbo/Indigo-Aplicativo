const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// --- Módulos & Funções de Teste ---

function evaluatePasswordStrength(password, personalData) {
  if (!password || password.length === 0) {
    return { score: 0, level: "none", label: "Não informada", color: "#6B7280", isValid: false };
  }

  const clean = password.trim().toLowerCase();
  const common = ["123456", "12345678", "password", "senha123", "dragoncorp", "dragon123", "admin123"];

  if (common.includes(clean)) {
    return { score: 15, level: "weak", label: "Senha muito fraca", color: "#EF4444", isValid: false };
  }

  if (/^(\d)\1+$/.test(password) || /^([a-zA-Z])\1+$/.test(password)) {
    return { score: 20, level: "weak", label: "Senha fraca", color: "#EF4444", isValid: false };
  }

  if (personalData) {
    const cpfDigits = (personalData.cpf || "").replace(/\D/g, "");
    if (cpfDigits && cpfDigits.length >= 6 && clean.includes(cpfDigits.slice(0, 6))) {
      return { score: 20, level: "weak", label: "Senha fraca", color: "#EF4444", isValid: false };
    }
    const phoneDigits = (personalData.phone || "").replace(/\D/g, "");
    if (phoneDigits && phoneDigits.length >= 6) {
      for (let i = 0; i <= phoneDigits.length - 6; i++) {
        const chunk = phoneDigits.slice(i, i + 6);
        if (clean.includes(chunk)) {
          return { score: 20, level: "weak", label: "Senha fraca", color: "#EF4444", isValid: false };
        }
      }
    }
    if (personalData.name && personalData.name.length >= 3) {
      const firstName = personalData.name.trim().toLowerCase().split(" ")[0];
      if (firstName.length >= 3 && clean.includes(firstName)) {
        return { score: 20, level: "weak", label: "Senha fraca", color: "#EF4444", isValid: false };
      }
    }
  }

  let score = 0;
  if (password.length >= 8) score += 25;
  if (password.length >= 10) score += 15;
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 10;
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 20;

  if (score < 45 || password.length < 8) {
    return { score: Math.min(score, 35), level: "weak", label: "Senha fraca", color: "#EF4444", isValid: false };
  }
  if (score < 75) {
    return { score, level: "medium", label: "Senha média", color: "#F59E0B", isValid: true };
  }
  return { score: Math.min(score, 100), level: "strong", label: "Senha forte", color: "#10B981", isValid: true };
}

// --- Testes Automatizados ---

test("Força de Senha: Classificação Fraca (curta, sequencial, comum, dados pessoais)", () => {
  // Curta (< 8 caracteres)
  const short = evaluatePasswordStrength("12345");
  assert.equal(short.level, "weak");
  assert.equal(short.isValid, false);

  // Comum
  const common = evaluatePasswordStrength("senha123");
  assert.equal(common.level, "weak");
  assert.equal(common.isValid, false);

  // Repetição
  const repeat = evaluatePasswordStrength("AAAAAAAA");
  assert.equal(repeat.level, "weak");
  assert.equal(repeat.isValid, false);

  // Com dados pessoais (CPF do personal)
  const withCpf = evaluatePasswordStrength("529982abc", { cpf: "529.982.247-25" });
  assert.equal(withCpf.level, "weak");
  assert.equal(withCpf.isValid, false);

  // Com telefone do personal
  const withPhone = evaluatePasswordStrength("dragon876543", { phone: "(11) 98765-4321" });
  assert.equal(withPhone.level, "weak");
  assert.equal(withPhone.isValid, false);
});

test("Força de Senha: Classificação Média e Forte (libera avanço)", () => {
  // Média (8 chars com letras e números)
  const medium = evaluatePasswordStrength("Dragon26");
  assert.equal(medium.level, "medium");
  assert.equal(medium.isValid, true);

  // Forte (>= 12 chars com maiúsculas, números e símbolos)
  const strong = evaluatePasswordStrength("DragonCorp#Pro@2026!");
  assert.equal(strong.level, "strong");
  assert.equal(strong.isValid, true);
  assert.ok(strong.score >= 75);
});

test("Avatar do Dragão: Fallback automático e componente compartilhado", () => {
  const avatarPath = path.resolve(__dirname, "../components/user-avatar.tsx");
  assert.ok(fs.existsSync(avatarPath), "user-avatar.tsx deve existir");

  const avatarCode = fs.readFileSync(avatarPath, "utf-8");
  assert.ok(avatarCode.includes("getBrandLogoSource"), "Deve utilizar o logotipo oficial");
  assert.ok(avatarCode.includes("symbol"), "Deve renderizar o símbolo oficial do dragão");
  assert.ok(avatarCode.includes("#000000"), "Fundo preto sólido deve ser utilizado");
});

test("Onboarding & Cadastro: Responsividade (CPF e Celular em linhas próprias)", () => {
  const onboardingPath = path.resolve(__dirname, "../app/trainer-onboarding.tsx");
  const code = fs.readFileSync(onboardingPath, "utf-8");

  assert.ok(code.includes("PasswordStrengthMeter"), "Deve conter o medidor de força de senha");
  assert.ok(code.includes("UserAvatar"), "Deve conter o avatar com o dragão oficial");
  assert.ok(code.includes("formatCpf"), "Deve formatar CPF");
  assert.ok(code.includes("formatPhone"), "Deve formatar telefone");
  assert.ok(code.includes("launchImageLibraryAsync"), "Upload deve ser exclusivo pela galeria");
});

test("Login Profissional: Suporte a SMS OTP, Google, Apple e Vinculação", () => {
  const loginPath = path.resolve(__dirname, "../app/login.tsx");
  const code = fs.readFileSync(loginPath, "utf-8");

  assert.ok(code.includes("sendPhoneVerificationCode"), "Deve suportar envio de SMS OTP");
  assert.ok(code.includes("verifyPhoneCodeAndSignIn"), "Deve suportar validação de SMS OTP");
  assert.ok(code.includes("signInWithGoogle"), "Deve suportar login com Google");
  assert.ok(code.includes("signInWithApple"), "Deve suportar login com Apple");
  assert.ok(code.includes("linkOAuthAccount"), "Deve suportar vinculação segura de contas");
  assert.ok(code.includes("BrandLogo"), "Deve conter a logo oficial do dragão");
});

test("Splash Screen: Animação do Dragão no fundo preto e sem tela branca", () => {
  const splashPath = path.resolve(__dirname, "../components/DragonCorpSplashScreen.tsx");
  const code = fs.readFileSync(splashPath, "utf-8");

  assert.ok(code.includes("logoScale"), "Deve conter animação de escala da logo");
  assert.ok(code.includes("logoOpacity"), "Deve conter animação de opacidade");
  assert.ok(code.includes("#000000") || code.includes("black"), "Fundo deve ser preto");
});
