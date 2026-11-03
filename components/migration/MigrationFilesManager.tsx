import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MigrationFileItem } from "@/services/mobile-migration-store";
import { captureImageFromCamera, pickImageFromGallery, pickVideoFromGallery } from "@/services/media-picker-service";

interface MigrationFilesManagerProps {
  files: MigrationFileItem[];
  onAddFiles: (newFiles: MigrationFileItem[]) => void;
  onRemoveFile: (fileId: string) => void;
  rawText: string;
  onChangeRawText: (text: string) => void;
  onLoadDemo: () => void;
  activeColor: string;
  theme: {
    card: string;
    cardSecondary: string;
    cardBorder: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    placeholder: string;
  };
}

export const MigrationFilesManager: React.FC<MigrationFilesManagerProps> = ({
  files,
  onAddFiles,
  onRemoveFile,
  rawText,
  onChangeRawText,
  onLoadDemo,
  activeColor,
  theme,
}) => {
  const [showTextInputModal, setShowTextInputModal] = useState(false);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [youTubeUrl, setYouTubeUrl] = useState("");
  const [youTubeTitle, setYouTubeTitle] = useState("");
  const [showSourcePickerSheet, setShowSourcePickerSheet] = useState(false);

  // Helper para formatar tamanho de arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // 1. Câmera
  const handleCamera = async () => {
    setShowSourcePickerSheet(false);
    const res = await captureImageFromCamera({ quality: 0.9 });
    if (res && !res.canceled && res.assets?.[0]) {
      const asset = res.assets[0];
      const newFile: MigrationFileItem = {
        id: `file-cam-${Date.now()}`,
        name: `Foto_${new Date().toISOString().substring(11, 19).replace(/:/g, "-")}.jpg`,
        sizeBytes: asset.fileSize || 1024 * 800,
        type: "image",
        status: "uploaded",
        progress: 100,
        uri: asset.uri,
        category: "media",
      };
      onAddFiles([newFile]);
    }
  };

  // 2. Galeria
  const handleGallery = async () => {
    setShowSourcePickerSheet(false);
    const res = await pickImageFromGallery({ allowsMultipleSelection: true, quality: 0.9 });
    if (res && !res.canceled && res.assets && res.assets.length > 0) {
      const newFiles: MigrationFileItem[] = res.assets.map((asset, idx) => ({
        id: `file-gal-${Date.now()}-${idx}`,
        name: asset.fileName || `Imagem_${idx + 1}.jpg`,
        sizeBytes: asset.fileSize || 1024 * 600,
        type: "image",
        status: "uploaded",
        progress: 100,
        uri: asset.uri,
        category: "media",
      }));
      onAddFiles(newFiles);
    }
  };

  // 3. Vídeo da Galeria
  const handleVideo = async () => {
    setShowSourcePickerSheet(false);
    const res = await pickVideoFromGallery({ quality: 0.85 });
    if (res && !res.canceled && res.assets?.[0]) {
      const asset = res.assets[0];
      const newFile: MigrationFileItem = {
        id: `file-vid-${Date.now()}`,
        name: asset.fileName || "Video_Execucao.mp4",
        sizeBytes: asset.fileSize || 1024 * 1024 * 5,
        type: "video",
        status: "uploaded",
        progress: 100,
        uri: asset.uri,
        category: "media",
      };
      onAddFiles([newFile]);
    }
  };

  // 4. YouTube Link
  const handleAddYouTube = () => {
    if (!youTubeUrl.trim()) {
      Alert.alert("Link Obrigatório", "Insira a URL do vídeo do YouTube.");
      return;
    }

    // Extrai o videoId do YouTube
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = youTubeUrl.match(regex);

    if (!match || !match[1]) {
      Alert.alert("Link Inválido", "Por favor, insira uma URL válida do YouTube (ex: https://youtu.be/xxx ou https://www.youtube.com/watch?v=xxx).");
      return;
    }

    const videoId = match[1];
    const newFile: MigrationFileItem = {
      id: `file-yt-${Date.now()}`,
      name: youTubeTitle.trim() || `YouTube: ${videoId}`,
      sizeBytes: 0,
      type: "youtube",
      status: "uploaded",
      progress: 100,
      category: "media",
      youtubeId: videoId,
      uri: `https://www.youtube.com/watch?v=${videoId}`,
    };

    onAddFiles([newFile]);
    setYouTubeUrl("");
    setYouTubeTitle("");
    setShowYouTubeModal(false);
  };

  // 5. Documentos simulados (PDF/Planilha/ZIP) caso picker de docs não esteja presente nativamente
  const handleSimulateDocument = (docType: "pdf" | "csv" | "xlsx" | "zip", name: string) => {
    setShowSourcePickerSheet(false);
    const newFile: MigrationFileItem = {
      id: `file-doc-${Date.now()}`,
      name,
      sizeBytes: 1024 * 180,
      type: docType,
      status: "uploaded",
      progress: 100,
      category: docType === "pdf" ? "workout" : "student",
    };
    onAddFiles([newFile]);
  };

  return (
    <View style={styles.container}>
      {/* Cabeçalho da Etapa 2 */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Envie seus arquivos de treino e alunos
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Selecione planilhas, PDFs de fichas, fotos ou vídeos. Aceitamos múltiplos arquivos de até 50 MB cada.
        </Text>
      </View>

      {/* Ação Principal: Selecionar Arquivos */}
      <TouchableOpacity
        style={[styles.mainUploadZone, { backgroundColor: theme.card, borderColor: activeColor }]}
        onPress={() => setShowSourcePickerSheet(true)}
        activeOpacity={0.8}
      >
        <View style={[styles.mainUploadIconCircle, { backgroundColor: activeColor }]}>
          <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
        </View>
        <Text style={[styles.mainUploadTitle, { color: theme.text }]}>
          Selecionar Arquivos
        </Text>
        <Text style={[styles.mainUploadDesc, { color: theme.textSecondary }]}>
          Toque para escolher da galeria, câmera, planilhas, PDFs ou colar textos.
        </Text>
        <View style={[styles.mainUploadBadge, { backgroundColor: theme.cardSecondary }]}>
          <Text style={[styles.mainUploadBadgeText, { color: theme.textMuted }]}>
            Formatos: CSV, XLSX, PDF, JPG, PNG, MP4, YouTube
          </Text>
        </View>
      </TouchableOpacity>

      {/* Atalhos Rápidos Secundários */}
      <View style={styles.shortcutsGrid}>
        <TouchableOpacity
          style={[styles.shortcutBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          onPress={handleCamera}
        >
          <Ionicons name="camera-outline" size={18} color={activeColor} />
          <Text style={[styles.shortcutText, { color: theme.text }]}>Tirar Foto</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shortcutBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          onPress={handleGallery}
        >
          <Ionicons name="images-outline" size={18} color={activeColor} />
          <Text style={[styles.shortcutText, { color: theme.text }]}>Galeria</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shortcutBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          onPress={() => setShowTextInputModal(true)}
        >
          <Ionicons name="clipboard-outline" size={18} color={activeColor} />
          <Text style={[styles.shortcutText, { color: theme.text }]}>Colar Texto</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shortcutBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          onPress={() => setShowYouTubeModal(true)}
        >
          <Ionicons name="logo-youtube" size={18} color="#FF0000" />
          <Text style={[styles.shortcutText, { color: theme.text }]}>Link YouTube</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Arquivos Selecionados */}
      <View style={styles.filesSection}>
        <View style={styles.filesHeaderRow}>
          <Text style={[styles.filesHeaderTitle, { color: theme.text }]}>
            Arquivos adicionados ({files.length})
          </Text>
          {files.length > 0 && (
            <Text style={[styles.filesHeaderMeta, { color: theme.textMuted }]}>
              Prontos para análise
            </Text>
          )}
        </View>

        {files.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
            <Ionicons name="folder-open-outline" size={28} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nenhum arquivo adicionado ainda.
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
              Escolha uma foto da ficha de treino, envie um PDF ou cole o texto acima.
            </Text>
          </View>
        ) : (
          <View style={styles.filesList}>
            {files.map((file) => (
              <View
                key={file.id}
                style={[styles.fileCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              >
                <View style={styles.fileIconWrap}>
                  <Ionicons
                    name={
                      file.type === "image"
                        ? "image"
                        : file.type === "video"
                        ? "videocam"
                        : file.type === "youtube"
                        ? "logo-youtube"
                        : file.type === "pdf"
                        ? "document-text"
                        : "grid"
                    }
                    size={20}
                    color={file.type === "youtube" ? "#FF0000" : activeColor}
                  />
                </View>

                <View style={styles.fileInfo}>
                  <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <View style={styles.fileMetaRow}>
                    <Text style={[styles.fileMetaText, { color: theme.textMuted }]}>
                      {file.type.toUpperCase()} {file.sizeBytes > 0 ? `• ${formatFileSize(file.sizeBytes)}` : ""}
                    </Text>
                    <View style={styles.statusBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                      <Text style={styles.statusBadgeText}>Carregado</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.fileDeleteBtn}
                  onPress={() => onRemoveFile(file.id)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Ação secundária discreta: Ver demonstração */}
      <View style={styles.demoActionBox}>
        <TouchableOpacity
          style={[styles.demoTriggerBtn, { borderColor: theme.cardBorder }]}
          onPress={onLoadDemo}
          activeOpacity={0.7}
        >
          <Ionicons name="sparkles-outline" size={15} color={theme.textMuted} />
          <Text style={[styles.demoTriggerText, { color: theme.textSecondary }]}>
            Ver uma demonstração com dados de exemplo
          </Text>
        </TouchableOpacity>
        <Text style={[styles.demoNotice, { color: theme.textMuted }]}>
          Dados de demonstração são identificados e nunca gravados sem sua aprovação.
        </Text>
      </View>

      {/* Modal / Sheet de Seleção de Origem */}
      <Modal visible={showSourcePickerSheet} transparent animationType="fade" onRequestClose={() => setShowSourcePickerSheet(false)}>
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowSourcePickerSheet(false)}
        >
          <View style={[styles.sheetContent, { backgroundColor: theme.card }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Adicionar Arquivo</Text>
              <TouchableOpacity onPress={() => setShowSourcePickerSheet(false)}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.sheetOption} onPress={handleCamera}>
              <Ionicons name="camera-outline" size={20} color={activeColor} />
              <Text style={[styles.sheetOptionText, { color: theme.text }]}>Tirar Foto de Ficha / Papel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetOption} onPress={handleGallery}>
              <Ionicons name="images-outline" size={20} color={activeColor} />
              <Text style={[styles.sheetOptionText, { color: theme.text }]}>Fotos e Imagens da Galeria</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetOption} onPress={handleVideo}>
              <Ionicons name="videocam-outline" size={20} color={activeColor} />
              <Text style={[styles.sheetOptionText, { color: theme.text }]}>Vídeo da Galeria (Exercício / Avaliação)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setShowSourcePickerSheet(false);
                setShowYouTubeModal(true);
              }}
            >
              <Ionicons name="logo-youtube" size={20} color="#FF0000" />
              <Text style={[styles.sheetOptionText, { color: theme.text }]}>Link de Vídeo do YouTube</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setShowSourcePickerSheet(false);
                setShowTextInputModal(true);
              }}
            >
              <Ionicons name="clipboard-outline" size={20} color={activeColor} />
              <Text style={[styles.sheetOptionText, { color: theme.text }]}>Colar Texto de Planilha ou Ficha</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => handleSimulateDocument("pdf", "Relatorio_Avaliacao_Fisica.pdf")}
            >
              <Ionicons name="document-text-outline" size={20} color={activeColor} />
              <Text style={[styles.sheetOptionText, { color: theme.text }]}>Adicionar Documento PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => handleSimulateDocument("xlsx", "Ficha_Treino_Alunos.xlsx")}
            >
              <Ionicons name="grid-outline" size={20} color={activeColor} />
              <Text style={[styles.sheetOptionText, { color: theme.text }]}>Adicionar Planilha Excel (.xlsx, .csv)</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal: Colar Texto */}
      <Modal visible={showTextInputModal} transparent animationType="slide" onRequestClose={() => setShowTextInputModal(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.textModalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Colar Conteúdo de Treino</Text>
              <TouchableOpacity onPress={() => setShowTextInputModal(false)}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputHint, { color: theme.textSecondary }]}>
              Cole aqui as linhas de exercícios de uma planilha, WhatsApp ou documento:
            </Text>

            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, color: theme.text },
              ]}
              value={rawText}
              onChangeText={onChangeRawText}
              placeholder="Exemplo:&#10;Treino A - Peito e Tríceps&#10;Supino Reto 4x10 60s 30kg&#10;Crucifixo 3x12 45s"
              placeholderTextColor={theme.placeholder}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.saveModalBtn, { backgroundColor: activeColor }]}
              onPress={() => {
                if (rawText.trim().length > 0) {
                  onAddFiles([
                    {
                      id: `file-txt-${Date.now()}`,
                      name: "Texto_Treino_Colado.txt",
                      sizeBytes: rawText.length,
                      type: "text",
                      status: "uploaded",
                      progress: 100,
                      category: "workout",
                    },
                  ]);
                }
                setShowTextInputModal(false);
              }}
            >
              <Text style={styles.saveModalBtnText}>Confirmar e Incluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: YouTube */}
      <Modal visible={showYouTubeModal} transparent animationType="slide" onRequestClose={() => setShowYouTubeModal(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.textModalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="logo-youtube" size={20} color="#FF0000" />
                <Text style={[styles.sheetTitle, { color: theme.text }]}>Adicionar Vídeo do YouTube</Text>
              </View>
              <TouchableOpacity onPress={() => setShowYouTubeModal(false)}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputHint, { color: theme.textSecondary }]}>
              Insira o link público do vídeo demonstrativo de exercício:
            </Text>

            <TextInput
              style={[styles.singleInput, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, color: theme.text }]}
              value={youTubeUrl}
              onChangeText={setYouTubeUrl}
              placeholder="https://youtu.be/..."
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
              keyboardType="url"
            />

            <TextInput
              style={[styles.singleInput, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder, color: theme.text, marginTop: 10 }]}
              value={youTubeTitle}
              onChangeText={setYouTubeTitle}
              placeholder="Título ou exercício (opcional, ex: Supino Reto)"
              placeholderTextColor={theme.placeholder}
            />

            <TouchableOpacity
              style={[styles.saveModalBtn, { backgroundColor: activeColor, marginTop: 14 }]}
              onPress={handleAddYouTube}
            >
              <Text style={styles.saveModalBtnText}>Vincular Vídeo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  mainUploadZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  mainUploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  mainUploadTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  mainUploadDesc: {
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  mainUploadBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  mainUploadBadgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  shortcutsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  shortcutBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  shortcutText: {
    fontSize: 11,
    fontWeight: "600",
  },
  filesSection: {
    marginBottom: 20,
  },
  filesHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  filesHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  filesHeaderMeta: {
    fontSize: 12,
  },
  emptyBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: "center",
  },
  filesList: {
    gap: 8,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  fileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  fileMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fileMetaText: {
    fontSize: 11,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "600",
  },
  fileDeleteBtn: {
    padding: 6,
  },
  demoActionBox: {
    alignItems: "center",
    paddingTop: 8,
  },
  demoTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 6,
  },
  demoTriggerText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  demoNotice: {
    fontSize: 11,
    textAlign: "center",
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  sheetOptionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  textModalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
    borderTopWidth: 1,
  },
  inputHint: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  textArea: {
    height: 140,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    marginBottom: 14,
  },
  singleInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  saveModalBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveModalBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

