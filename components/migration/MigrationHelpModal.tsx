import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MigrationOrigin } from "@/services/mobile-migration-store";

interface MigrationHelpModalProps {
  visible: boolean;
  onClose: () => void;
  origin: MigrationOrigin;
  activeColor: string;
  theme: {
    background: string;
    card: string;
    cardSecondary: string;
    cardBorder: string;
    text: string;
    textSecondary: string;
    textMuted: string;
  };
}

export const MigrationHelpModal: React.FC<MigrationHelpModalProps> = ({
  visible,
  onClose,
  origin,
  activeColor,
  theme,
}) => {
  const getOriginInfo = () => {
    switch (origin) {
      case "mfit":
        return {
          title: "Como exportar dados do MFIT",
          steps: [
            "1. No seu aplicativo ou painel web do MFIT, acesse a aba 'Alunos' ou 'Treinos'.",
            "2. Localize as opções de exportação de relatórios ou exporte as fichas em PDF/planilha que você já utiliza.",
            "3. Para fotos de avaliação e vídeos de exercícios, compacte-os em um arquivo .ZIP.",
            "4. O DragonCorp converterá alunos e treinos em rascunhos para sua revisão prévia.",
            "5. Lembrete importante: Nunca solicitamos nem armazene sua senha do MFIT.",
          ],
          tips: "Se não encontrar um botão de exportação completa, envie os PDFs das fichas ou fotos legíveis que o leitor inteligente reconhecerá os exercícios.",
        };
      case "avaliacao_pro":
        return {
          title: "Como exportar do Avaliação Física PRO",
          steps: [
            "1. Acesse o menu de relatórios do aplicativo e selecione a exportação em PDF ou planilha.",
            "2. Exporte as medições de dobras cutâneas, perímetros e composição corporal.",
            "3. Envie os relatórios gerados nesta etapa de arquivos.",
            "4. Fórmulas históricas e valores originais serão preservados com fidelidade no DragonCorp.",
          ],
          tips: "Você pode enviar múltiplos relatórios em PDF de uma só vez para compor o histórico dos alunos.",
        };
      default:
        return {
          title: "Como preparar seus arquivos para migração",
          steps: [
            "1. Aceitamos arquivos nos formatos Excel (.xlsx, .csv), PDFs de fichas, imagens (JPG/PNG) e ZIP.",
            "2. Caso tenha vídeos de exercícios, você pode enviar os arquivos MP4 ou colar links públicos do YouTube.",
            "3. O sistema analisa todos os itens e apresenta uma prévia para que você decida quais dados importar.",
            "4. Nenhum treino é publicado e nenhum aluno é duplicado sem sua confirmação explícita.",
          ],
          tips: "Você também pode utilizar nossas planilhas modelo para organizar rapidamente grandes volumes de alunos e treinos.",
        };
    }
  };

  const info = getOriginInfo();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Ionicons name="help-buoy-outline" size={20} color={activeColor} />
              <Text style={[styles.title, { color: theme.text }]}>{info.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Passos */}
            <View style={[styles.stepsBox, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
              {info.steps.map((st, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <Text style={[styles.stepText, { color: theme.text }]}>{st}</Text>
                </View>
              ))}
            </View>

            {/* Dica */}
            <View style={[styles.tipBox, { borderColor: activeColor }]}>
              <Ionicons name="bulb-outline" size={18} color={activeColor} />
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>{info.tips}</Text>
            </View>

            {/* Aviso de Segurança LGPD */}
            <View style={[styles.securityAlert, { backgroundColor: theme.cardSecondary }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
              <Text style={[styles.securityText, { color: theme.textSecondary }]}>
                Segurança garantida: Nunca pedimos senhas de terceiros nem executamos scraping autenticado. Seus dados são processados com isolamento estrito.
              </Text>
            </View>
          </ScrollView>

          {/* Botão Fechar */}
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: activeColor }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmBtnText}>Entendi, vamos continuar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
    borderTopWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    marginBottom: 16,
  },
  stepsBox: {
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepText: {
    fontSize: 13,
    lineHeight: 19,
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: 14,
  },
  tipText: {
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },
  securityAlert: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
  },
  securityText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  confirmBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

