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

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Política de Privacidade</Text>
          <Text style={styles.headerSubtitle}>Última atualização: Agosto de 2026</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* BADGE DE CONFORMIDADE */}
        <View style={styles.complianceBadge}>
          <Ionicons name="shield-checkmark" size={18} color="#D90000" />
          <Text style={styles.complianceBadgeText}>
            Conformidade com a LGPD (Lei nº 13.709/2018) e Diretrizes Apple & Google
          </Text>
        </View>

        {/* INTRODUÇÃO */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>1. Compromisso com a Privacidade</Text>
          <Text style={styles.paragraph}>
            A plataforma <Text style={styles.boldText}>DragonCorp</Text> tem o compromisso inegociável
            de proteger a sua privacidade e os seus dados pessoais. Esta política descreve de forma
            transparente como coletamos, tratamos, armazenamos e protegemos as informações de
            Personal Trainers e Alunos.
          </Text>
        </View>

        {/* DADOS COLETADOS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. Dados Coletados</Text>
          <Text style={styles.paragraph}>
            Para garantir a entrega de treinos personalizados, acompanhamento físico e segurança dos
            exercícios, coletamos apenas os dados estritamente necessários:
          </Text>

          <View style={styles.bulletItem}>
            <Ionicons name="person-outline" size={16} color="#D90000" style={styles.bulletIcon} />
            <Text style={styles.bulletText}>
              <Text style={styles.boldText}>Dados Cadastrais:</Text> Nome completo, e-mail, telefone,
              data de nascimento, foto de perfil e credenciais de acesso.
            </Text>
          </View>

          <View style={styles.bulletItem}>
            <Ionicons name="fitness-outline" size={16} color="#D90000" style={styles.bulletIcon} />
            <Text style={styles.bulletText}>
              <Text style={styles.boldText}>Dados de Saúde e Avaliação:</Text> Peso corporal, altura,
              dobras cutâneas, perímetros, fotos de postura corporal (com consentimento explícito),
              histórico de lesões e respostas de anamnese.
            </Text>
          </View>

          <View style={styles.bulletItem}>
            <Ionicons name="barbell-outline" size={16} color="#D90000" style={styles.bulletIcon} />
            <Text style={styles.bulletText}>
              <Text style={styles.boldText}>Dados de Treino:</Text> Cargas utilizadas, séries,
              repetições executadas, relatos de cansaço ou dor (Escala RPE) e frequência semanal.
            </Text>
          </View>

          <View style={styles.bulletItem}>
            <Ionicons name="water-outline" size={16} color="#D90000" style={styles.bulletIcon} />
            <Text style={styles.bulletText}>
              <Text style={styles.boldText}>Dados de Hidratação:</Text> Registros de consumo diário de
              água para metas metabólicas recomendadas.
            </Text>
          </View>
        </View>

        {/* COMPARTILHAMENTO */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>3. Finalidade e Compartilhamento</Text>
          <Text style={styles.paragraph}>
            Os dados do aluno são compartilhados <Text style={styles.boldText}>exclusivamente</Text> com
            o seu Personal Trainer responsável para fins de prescrição de treino e segurança física.
          </Text>
          <Text style={styles.paragraph}>
            O DragonCorp <Text style={styles.highlightText}>nunca vende, aluga ou cede</Text> seus dados
            ou histórico para terceiros, anunciantes ou seguradoras.
          </Text>
        </View>

        {/* SEGURANÇA */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>4. Segurança e Armazenamento</Text>
          <Text style={styles.paragraph}>
            Todos os dados em trânsito são criptografados através de protocolos TLS/SSL de alta
            segurança. Fotos de avaliação física possuem controle de consentimento individual e
            armazenamento criptografado.
          </Text>
        </View>

        {/* DIREITOS LGPD */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>5. Seus Direitos (LGPD)</Text>
          <Text style={styles.paragraph}>
            Você possui pleno controle sobre seus dados e pode a qualquer momento:
          </Text>
          <Text style={styles.bulletListText}>• Acessar seus dados e histórico completo;</Text>
          <Text style={styles.bulletListText}>• Corrigir dados incompletos ou desatualizados;</Text>
          <Text style={styles.bulletListText}>• Solicitar a exclusão definitiva da sua conta e dados;</Text>
          <Text style={styles.bulletListText}>• Revogar consentimento para fotos de avaliação postural.</Text>
        </View>

        {/* EXCLUSÃO DE CONTA */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>6. Exclusão de Conta e Retenção</Text>
          <Text style={styles.paragraph}>
            Em conformidade com as exigências da Apple App Store e Google Play, você pode solicitar a
            exclusão permanente da sua conta a qualquer momento diretamente no menu do aplicativo.
            Após a confirmação, todos os seus dados cadastrais e registros privados serão removidos
            definitivamente.
          </Text>
        </View>

        {/* CONTATO DPO */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>7. Canal do Encarregado de Dados (DPO)</Text>
          <Text style={styles.paragraph}>
            Para dúvidas ou exercício dos seus direitos de privacidade, entre em contato com nosso
            Encarregado de Proteção de Dados:
          </Text>
          <View style={styles.contactBox}>
            <Ionicons name="mail-outline" size={16} color="#D90000" />
            <Text style={styles.contactText}>privacidade@dragoncorp.app</Text>
          </View>
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            DragonCorp • Versão 1.0.0 • Todos os direitos reservados.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
    backgroundColor: "#0D0D0D",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
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
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  complianceBadgeText: {
    flex: 1,
    color: "#CCCCCC",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },
  sectionCard: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  paragraph: {
    color: "#AAAAAA",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  boldText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  highlightText: {
    color: "#D90000",
    fontWeight: "700",
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
    gap: 8,
  },
  bulletIcon: {
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    color: "#AAAAAA",
    fontSize: 13,
    lineHeight: 19,
  },
  bulletListText: {
    color: "#AAAAAA",
    fontSize: 13,
    lineHeight: 22,
    paddingLeft: 4,
  },
  contactBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  contactText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  footerNote: {
    alignItems: "center",
    paddingVertical: 20,
  },
  footerNoteText: {
    color: "#555555",
    fontSize: 12,
  },
});
