import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function TermsOfUseScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Termos de Uso (EULA)</Text>
          <Text style={styles.headerSubtitle}>DragonCorp • Contrato de Licença de Usuário Final</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* BADGE DE CONFORMIDADE */}
        <View style={styles.complianceBadge}>
          <Ionicons name="document-text" size={18} color="#D90000" />
          <Text style={styles.complianceBadgeText}>
            Conformidade com Diretrizes Apple App Store (Guideline 3.1.2) & Google Play
          </Text>
        </View>

        {/* 1. VISÃO GERAL */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>1. Aceitação dos Termos</Text>
          <Text style={styles.paragraph}>
            Ao baixar, instalar ou utilizar o aplicativo <Text style={styles.boldText}>DragonCorp</Text>,
            você concorda expressamente com todos os termos e condições deste Contrato de Licença de Usuário Final (EULA).
            Se você não concordar com estes termos, não utilize o aplicativo.
          </Text>
        </View>

        {/* 2. LICENÇA DE USO */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. Concessão de Licença</Text>
          <Text style={styles.paragraph}>
            A DragonCorp concede a você uma licença pessoal, revogável, não exclusiva e intransferível para usar o software
            em dispositivos compatíveis (iOS e Android), exclusivamente para fins profissionais de consultoria fitness
            (para Personal Trainers) e acompanhamento de treinos (para Alunos).
          </Text>
        </View>

        {/* 3. ASSINATURAS E RENOVAÇÃO AUTOMÁTICA */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>3. Assinaturas e Renovação Automática (In-App Purchases)</Text>
          <Text style={styles.paragraph}>
            O aplicativo DragonCorp oferece planos de assinatura auto-renováveis para Personal Trainers:
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={14} color="#D90000" style={styles.bulletIcon} />
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Plano Gratuito (Free):</Text> Acesso aos recursos essenciais para gerenciar até 1 aluno.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={14} color="#D90000" style={styles.bulletIcon} />
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Plano Mensal (PRO):</Text> R$ 19,90 por mês com alunos ilimitados, IA e avaliações completas.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={14} color="#D90000" style={styles.bulletIcon} />
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Plano Anual (PRO):</Text> R$ 199,90 cobrados anualmente (equivalente a R$ 16,65/mês, com 2 meses grátis).
              </Text>
            </View>
          </View>
          <Text style={[styles.paragraph, { marginTop: 10 }]}>
            <Text style={styles.boldText}>Cobrança e Renovação:</Text> O pagamento é cobrado na sua conta Apple ID ou Google Play
            na confirmação da compra. A assinatura é renovada automaticamente pelo mesmo período e valor contratado, a menos que
            seja desativada pelo menos 24 horas antes do término do período atual.
          </Text>
          <Text style={[styles.paragraph, { marginTop: 8 }]}>
            <Text style={styles.boldText}>Cancelamento e Restauração:</Text> Você pode gerenciar ou cancelar sua assinatura a qualquer
            momento nos Ajustes da Conta da App Store ou no Google Play. O botão &quot;Restaurar Compras&quot; permite sincronizar sua assinatura
            em novos dispositivos a qualquer momento.
          </Text>
        </View>

        {/* 4. RESPONSABILIDADE MÉDICA E FÍSICA */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>4. Isenção de Responsabilidade Médica</Text>
          <Text style={styles.paragraph}>
            O DragonCorp é uma ferramenta tecnológica de suporte à prescrição de exercícios e gestão. O aplicativo não substitui
            o aconselhamento médico profissional, diagnóstico ou tratamento. Recomenda-se que todos os praticantes realizem avaliação médica prévia
            antes de iniciar qualquer programa de exercícios físicos.
          </Text>
        </View>

        {/* 5. PRIVACIDADE E DADOS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>5. Privacidade e Proteção de Dados</Text>
          <Text style={styles.paragraph}>
            O tratamento de dados pessoais no DragonCorp é regido pela nossa Política de Privacidade, em conformidade com a LGPD
            e as diretrizes de proteção de dados da Apple e do Google. O usuário pode solicitar a exclusão total da conta e de seus dados
            a qualquer momento diretamente pelo aplicativo.
          </Text>
        </View>

        {/* 6. CONTATO */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>6. Suporte e Contato</Text>
          <Text style={styles.paragraph}>
            Em caso de dúvidas sobre estes Termos de Uso ou suporte ao aplicativo, entre em contato:
          </Text>
          <Text style={styles.contactEmail}>contato@dragoncorp.app</Text>
        </View>

        <Text style={styles.footerNote}>
          DragonCorp • Versão 1.0.0 • Todos os direitos reservados.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
    backgroundColor: "#0A0A0A",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#777777",
    fontSize: 11,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  complianceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(217, 0, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(217, 0, 0, 0.3)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  complianceBadgeText: {
    color: "#E0E0E0",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  sectionCard: {
    backgroundColor: "#141414",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#202020",
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  paragraph: {
    color: "#AAAAAA",
    fontSize: 13,
    lineHeight: 19,
  },
  boldText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  bulletList: {
    marginTop: 8,
    gap: 6,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bulletIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    color: "#AAAAAA",
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },
  contactEmail: {
    color: "#D90000",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 6,
  },
  footerNote: {
    color: "#555555",
    fontSize: 11,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 10,
  },
});
