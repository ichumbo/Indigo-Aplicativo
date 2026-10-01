# Guia de Configuração de Provedores Push (APNs, FCM, Expo Push)

Este documento orienta a configuração de credenciais de produção no **Expo Application Services (EAS)**, **Apple Developer Portal** e **Firebase Console**.

---

## 1. Apple Push Notification service (APNs)

1. **Obter Chave APNs (.p8):**
   * Acesse [developer.apple.com](https://developer.apple.com) > Certificates, Identifiers & Profiles > Keys.
   * Crie uma nova chave com a opção **Apple Push Notifications service (APNs)** ativada.
   * Baixe o arquivo `.p8` e anote o **Key ID** e o **Team ID**.
2. **Configurar no EAS:**
   * Execute `eas credentials` ou faça upload no painel web do Expo.
   * O Expo cuidará do envio direto via HTTP/2 para os servidores da Apple em produção.
3. **Entitlements (`app.json`):**
   * O plugin `expo-notifications` já inclui as permissões de background e push no build.

---

## 2. Firebase Cloud Messaging (FCM V1 para Android)

1. **Configurar Projeto Firebase:**
   * Acesse o [Firebase Console](https://console.firebase.google.com).
   * Crie um projeto vinculado ao pacote Android `com.dragoncorp.app`.
   * Em *Configurações do Projeto* > *Contas de Serviço*, gere uma nova chave privada (JSON da Service Account).
2. **Vincular Chave FCM V1 ao EAS:**
   * Execute: `eas credentials` > Selecione Android > FCM V1 Service Account Key.
   * Faça upload do JSON gerado.

---

## 3. Expo Push Service (Serviço Unificado)

* **Formato do Token:** `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`
* **Endpoint de Envio Server-Side:** `https://exp.host/--/api/v2/push/send`
* **Autenticação:** Header `Authorization: Bearer EXPO_ACCESS_TOKEN` configurado no backend.
* **Idempotência no Envio:** Header `idempotency-key` suportado nativamente pelo gateway do Expo.
