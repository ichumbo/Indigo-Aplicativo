# Mapa de Privacidade e Proteção de Dados (LGPD / Apple / Google) — DragonCorp

Este documento mapeia os dados pessoais e sensíveis coletados, finalidades de uso, base legal, fluxo de armazenamento, retenção e conformidade com a LGPD (Lei 13.709/2018), Apple Privacy Manifest e Google Play Data Safety.

---

## 1. Mapeamento de Dados Coletados

| Categoria | Tipos de Dados | Finalidade | Base Legal (LGPD) | Sensibilidade |
| :--- | :--- | :--- | :--- | :---: |
| **Identificação & Contato** | Nome, e-mail, telefone, data de nascimento, CPF (opcional), CREF (Personal) | Autenticação, comunicação de treinos, recuperação de conta e segurança | Execução de Contrato (Art. 7º, V) | Geral |
| **Saúde & Condicionamento** | Peso, altura, dobras cutâneas, perímetros corporais, VO₂Max, histórico de lesões, respostas de anamnese | Prescrição técnica de treinos, cálculo de composição corporal e evolução funcional | Consentimento Explícito (Art. 11, I) e Tutela da Saúde (Art. 11, II, f) | **Sensível** |
| **Fotos & Mídia** | Fotos posturais de frente, costas e perfil (capturadas/selecionadas na galeria) | Comparação visual de evolução física entre avaliações | Consentimento Explícito (Art. 11, I) | **Sensível** |
| **Desempenho & Treino** | Cargas (kg/lbs), repetições, séries, esforço percebido (PSE), relato de dor | Acompanhamento do plano de treinamento e ajuste de cargas | Execução de Contrato (Art. 7º, V) | Geral |
| **Faturamento & Assinatura** | ID de transação da loja, tipo de plano, status e vigência | Liberação e controle de acesso aos recursos PRO (SaaS) | Execução de Contrato (Art. 7º, V) | Geral |
| **Dispositivo & Diagnóstico** | Push Token, versão do app, modelo do aparelho | Envio de lembretes de treino, push notifications e correção de falhas | Legítimo Interesse (Art. 7º, IX) | Geral |

---

## 2. Declaração Apple Privacy Manifest (`app.json`)

O arquivo [`app.json`](file:///Users/pumapunku/Documents/GitHub/Indigo-Aplicativo/app.json) implementa a configuração oficial exigida pela Apple:

```json
{
  "NSPrivacyTracking": false,
  "NSPrivacyTrackingDomains": [],
  "NSPrivacyAccessedAPITypes": [
    {
      "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPITypeUserDefaults",
      "NSPrivacyAccessedAPITypeReasons": ["CA92.1"]
    },
    {
      "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPITypeFileTimestamp",
      "NSPrivacyAccessedAPITypeReasons": ["C617.1"]
    },
    {
      "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPITypeSystemBootTime",
      "NSPrivacyAccessedAPITypeReasons": ["35F9.1"]
    },
    {
      "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPITypeDiskSpace",
      "NSPrivacyAccessedAPITypeReasons": ["E174.1"]
    }
  ],
  "NSPrivacyCollectedDataTypes": [
    { "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeName", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false, "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"] },
    { "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeEmailAddress", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false, "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"] },
    { "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypePhoneNumber", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false, "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"] },
    { "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeFitness", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false, "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"] },
    { "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeHealth", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false, "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"] },
    { "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypePhotosOrVideos", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false, "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"] },
    { "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeUserID", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false, "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"] }
  ]
}
```

---

## 3. Direitos dos Titulares e Fluxo de Exclusão de Conta

Em conformidade com a LGPD e a **Apple Guideline 5.1.1(v)**:

* **Exclusão de Conta In-App:** Acessível via menu de Perfil ou rota direta [`app/delete-account.tsx`](file:///Users/pumapunku/Documents/GitHub/Indigo-Aplicativo/app/delete-account.tsx).
* **Reautenticação de Segurança:** Exige confirmação de senha do usuário autenticado e digitação explícita da palavra de segurança `EXCLUIR`.
* **Tratamento dos Dados:**
  * Purga imediata de dados cadastrais, tokens de sessão e credenciais no `auth-store` e banco de dados.
  * Preservação exclusiva de registros fiscais e de auditoria que possuem obrigação legal de retenção (ex: Marco Civil da Internet e normas fiscais).
  * Instrução clara para cancelamento de assinaturas ativas na App Store ou Google Play para evitar cobranças futuras das lojas.
