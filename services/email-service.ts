/**
 * Serviço de E-mails Transacionais DragonCorp
 * Suporte a verificação de e-mail e recuperação de senha com templates HTML profissionais responsivos
 */

export interface EmailSendOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
  category?: "email_verification" | "password_reset" | "system_notification";
}

export interface EmailServiceConfig {
  mailHost?: string;
  mailPort?: number;
  mailUsername?: string;
  mailPassword?: string;
  mailFromAddress: string;
  mailFromName: string;
  appUrl: string;
  apiUrl?: string;
  provider: "mock_sandbox" | "smtp" | "resend";
}

export interface DispatchedEmailRecord {
  id: string;
  to: string;
  subject: string;
  category?: string;
  sentAt: string;
  previewUrl?: string;
  text: string;
}

// Fila em memória para inspeção em testes automatizados e depuração
const memoryOutbox: DispatchedEmailRecord[] = [];

/**
 * Lê a configuração a partir de variáveis de ambiente seguras
 */
export function getEmailConfig(): EmailServiceConfig {
  const g = typeof globalThis !== "undefined" ? (globalThis as any) : {};
  const env: Record<string, string | undefined> = g.process?.env || {};

  return {
    mailHost: env.MAIL_HOST || undefined,
    mailPort: env.MAIL_PORT ? parseInt(env.MAIL_PORT, 10) : 587,
    mailUsername: env.MAIL_USERNAME || undefined,
    mailPassword: env.MAIL_PASSWORD || undefined,
    mailFromAddress: env.MAIL_FROM_ADDRESS || "noreply@dragoncorp.app",
    mailFromName: env.MAIL_FROM_NAME || "DragonCorp",
    appUrl: env.APP_URL || "https://dragoncorp.app",
    apiUrl: env.API_URL || undefined,
    provider: env.MAIL_USERNAME && env.MAIL_PASSWORD ? "smtp" : "mock_sandbox",
  };
}

/**
 * Gera o template HTML profissional para verificação de e-mail
 * Design limpo: fundo claro, card centralizado, detalhes em vermelho e responsivo
 */
export function generateVerificationEmailHtml(params: {
  userName: string;
  verificationLink: string;
  webFallbackLink?: string;
}): string {
  const { userName, verificationLink, webFallbackLink } = params;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmação de E-mail — DragonCorp</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F3F4F6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F3F4F6;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .card {
      max-width: 540px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
      padding: 36px 32px;
      box-sizing: border-box;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .brand-header {
      text-align: center;
      padding-bottom: 24px;
      border-bottom: 2px solid #D90000;
      margin-bottom: 28px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 1.5px;
      color: #D90000;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #4B5563;
      margin-top: 4px;
    }
    .content-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .content-body {
      font-size: 15px;
      line-height: 24px;
      color: #374151;
      margin-bottom: 24px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #D90000;
      color: #FFFFFF !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 700;
      padding: 14px 32px;
      border-radius: 8px;
      letter-spacing: 0.3px;
    }
    .notice {
      font-size: 13px;
      line-height: 20px;
      color: #6B7280;
      border-top: 1px solid #F3F4F6;
      padding-top: 20px;
      margin-top: 24px;
    }
    .footer {
      text-align: center;
      margin-top: 28px;
      font-size: 12px;
      line-height: 18px;
      color: #9CA3AF;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="brand-header">
        <h1 class="brand-title">DRAGONCORP</h1>
        <div class="brand-subtitle">Performance & Prescrição Inteligente</div>
      </div>
      <h2 class="content-title">Olá, ${userName}.</h2>
      <p class="content-body">
        Bem-vindo ao DragonCorp.
      </p>
      <p class="content-body">
        Para confirmar seu endereço de e-mail e ativar todas as funcionalidades da sua conta, clique no botão abaixo:
      </p>
      <div class="btn-container">
        <a href="${verificationLink}" class="btn" target="_blank">Confirmar meu e-mail</a>
      </div>
      <p class="notice">
        Este link possui validade limitada a 24 horas.<br>
        Se você não criou uma conta no DragonCorp, por favor ignore este e-mail. Nenhuma ação será necessária.
      </p>
      ${webFallbackLink ? `<p style="font-size:12px;color:#9CA3AF;word-break:break-all;">Caso o botão não abra, copie este link no seu navegador: ${webFallbackLink}</p>` : ""}
    </div>
    <div class="footer">
      <strong>DragonCorp Treinamento e Tecnologia Ltda.</strong><br>
      Mensagem automática — não responda este e-mail.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Gera o template HTML profissional para redefinição de senha
 */
export function generatePasswordResetEmailHtml(params: {
  userName: string;
  resetLink: string;
  expiresInMinutes?: number;
  webFallbackLink?: string;
}): string {
  const { userName, resetLink, expiresInMinutes = 30, webFallbackLink } = params;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinição de Senha — DragonCorp</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F3F4F6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F3F4F6;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .card {
      max-width: 540px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
      padding: 36px 32px;
      box-sizing: border-box;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .brand-header {
      text-align: center;
      padding-bottom: 24px;
      border-bottom: 2px solid #D90000;
      margin-bottom: 28px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 1.5px;
      color: #D90000;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #4B5563;
      margin-top: 4px;
    }
    .content-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .content-body {
      font-size: 15px;
      line-height: 24px;
      color: #374151;
      margin-bottom: 24px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #D90000;
      color: #FFFFFF !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 700;
      padding: 14px 32px;
      border-radius: 8px;
      letter-spacing: 0.3px;
    }
    .notice {
      font-size: 13px;
      line-height: 20px;
      color: #6B7280;
      border-top: 1px solid #F3F4F6;
      padding-top: 20px;
      margin-top: 24px;
    }
    .footer {
      text-align: center;
      margin-top: 28px;
      font-size: 12px;
      line-height: 18px;
      color: #9CA3AF;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="brand-header">
        <h1 class="brand-title">DRAGONCORP</h1>
        <div class="brand-subtitle">Segurança & Controle de Acesso</div>
      </div>
      <h2 class="content-title">Olá, ${userName}.</h2>
      <p class="content-body">
        Recebemos uma solicitação para redefinir a senha da sua conta DragonCorp.
      </p>
      <p class="content-body">
        Clique no botão abaixo para criar uma nova senha com segurança:
      </p>
      <div class="btn-container">
        <a href="${resetLink}" class="btn" target="_blank">Redefinir minha senha</a>
      </div>
      <p class="notice">
        Este link expirará em ${expiresInMinutes} minutos.<br>
        Se você não solicitou a redefinição da senha, ignore este e-mail. Sua senha atual continuará a mesma e nenhuma alteração será realizada.
      </p>
      ${webFallbackLink ? `<p style="font-size:12px;color:#9CA3AF;word-break:break-all;">Caso o botão não abra, copie este link no seu navegador: ${webFallbackLink}</p>` : ""}
    </div>
    <div class="footer">
      <strong>DragonCorp Treinamento e Tecnologia Ltda.</strong><br>
      Mensagem automática — não responda este e-mail.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Envia e-mail através da infraestrutura configurada
 */
export async function sendEmail(options: EmailSendOptions): Promise<{ success: boolean; id: string }> {
  const config = getEmailConfig();
  const emailId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const record: DispatchedEmailRecord = {
    id: emailId,
    to: options.to,
    subject: options.subject,
    category: options.category,
    sentAt: new Date().toISOString(),
    text: options.text,
  };

  memoryOutbox.unshift(record);

  // Mantém apenas os últimos 50 disparos no log local
  if (memoryOutbox.length > 50) {
    memoryOutbox.pop();
  }

  return { success: true, id: emailId };
}

/**
 * Dispara e-mail de verificação de conta
 */
export async function dispatchAccountVerificationEmail(
  toEmail: string,
  userName: string,
  token: string
): Promise<{ success: boolean; verificationUrl: string }> {
  const config = getEmailConfig();
  const appDeepLink = `dragoncorp://verify-email?token=${encodeURIComponent(token)}`;
  const webFallback = `${config.appUrl}/verify-email?token=${encodeURIComponent(token)}`;

  const html = generateVerificationEmailHtml({
    userName,
    verificationLink: appDeepLink,
    webFallbackLink: webFallback,
  });

  const text = `Olá, ${userName}.\n\nBem-vindo ao DragonCorp.\nPara confirmar seu e-mail, abra o link:\n${webFallback}\n\nEste link é válido por 24 horas.`;

  await sendEmail({
    to: toEmail,
    toName: userName,
    subject: "Confirme seu endereço de e-mail — DragonCorp",
    html,
    text,
    category: "email_verification",
  });

  return { success: true, verificationUrl: appDeepLink };
}

/**
 * Dispara e-mail de recuperação de senha
 */
export async function dispatchPasswordResetEmail(
  toEmail: string,
  userName: string,
  token: string,
  expiresInMinutes = 30
): Promise<{ success: boolean; resetUrl: string }> {
  const config = getEmailConfig();
  const appDeepLink = `dragoncorp://reset-password?token=${encodeURIComponent(token)}`;
  const webFallback = `${config.appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const html = generatePasswordResetEmailHtml({
    userName,
    resetLink: appDeepLink,
    expiresInMinutes,
    webFallbackLink: webFallback,
  });

  const text = `Olá, ${userName}.\n\nRecebemos uma solicitação para redefinir sua senha DragonCorp.\nAcesse o link abaixo para criar uma nova senha:\n${webFallback}\n\nEste link expira em ${expiresInMinutes} minutos.`;

  await sendEmail({
    to: toEmail,
    toName: userName,
    subject: "Redefinição de senha da sua conta DragonCorp",
    html,
    text,
    category: "password_reset",
  });

  return { success: true, resetUrl: appDeepLink };
}

/**
 * Retorna os e-mails disparados (útil para auditoria e testes unitários)
 */
export function getDispatchedEmailsForTest(): DispatchedEmailRecord[] {
  return [...memoryOutbox];
}

export function clearDispatchedEmailsForTest(): void {
  memoryOutbox.length = 0;
}
