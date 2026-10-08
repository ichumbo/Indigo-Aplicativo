import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

export interface PickImageOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  allowsMultipleSelection?: boolean;
}

export interface PickVideoOptions {
  allowsEditing?: boolean;
  quality?: number;
}

/**
 * Seleciona imagem(ns) da galeria/seletor de fotos nativo.
 * No Android: Utiliza o Android Photo Picker nativo sem requisições de permissão ampla (READ_MEDIA_IMAGES).
 * No iOS: Verifica/solicita permissão de fotos da biblioteca quando necessário.
 */
export async function pickImageFromGallery(
  options: PickImageOptions = {}
): Promise<ImagePicker.ImagePickerResult | null> {
  try {
    if (Platform.OS === "ios") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão Necessária",
          "Permita acesso às fotos nas configurações do seu dispositivo para selecionar imagens."
        );
        return null;
      }
    }

    return await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: options.allowsEditing ?? false,
      aspect: options.aspect,
      quality: options.quality ?? 0.85,
      allowsMultipleSelection: options.allowsMultipleSelection ?? false,
    });
  } catch (err) {
    console.error("Erro ao abrir seletor de fotos:", err);
    Alert.alert("Erro", "Não foi possível abrir a galeria de fotos.");
    return null;
  }
}

/**
 * Captura foto usando a câmera nativa.
 * Em ambas as plataformas: Solicita permissão da câmera antes de abrir.
 */
export async function captureImageFromCamera(
  options: PickImageOptions = {}
): Promise<ImagePicker.ImagePickerResult | null> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permissão da Câmera",
        "Permita o acesso à câmera para tirar fotos diretamente pelo aplicativo."
      );
      return null;
    }

    return await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: options.allowsEditing ?? false,
      aspect: options.aspect,
      quality: options.quality ?? 0.85,
    });
  } catch (err) {
    console.error("Erro ao abrir câmera para foto:", err);
    Alert.alert("Erro", "Não foi possível abrir a câmera.");
    return null;
  }
}

/**
 * Seleciona vídeo da galeria.
 * No Android: Abre o seletor nativo sem permissão ampla.
 * No iOS: Solicita permissão da biblioteca.
 */
export async function pickVideoFromGallery(
  options: PickVideoOptions = {}
): Promise<ImagePicker.ImagePickerResult | null> {
  try {
    if (Platform.OS === "ios") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão Necessária",
          "Permita acesso à galeria para selecionar vídeos."
        );
        return null;
      }
    }

    return await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: options.allowsEditing ?? false,
      quality: options.quality ?? 0.85,
    });
  } catch (err) {
    console.error("Erro ao abrir seletor de vídeos:", err);
    Alert.alert("Erro", "Não foi possível abrir a galeria de vídeos.");
    return null;
  }
}

/**
 * Grava vídeo usando a câmera nativa.
 */
export async function captureVideoFromCamera(
  options: PickVideoOptions = {}
): Promise<ImagePicker.ImagePickerResult | null> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permissão da Câmera",
        "Permita o acesso à câmera para gravar vídeos diretamente pelo aplicativo."
      );
      return null;
    }

    return await ImagePicker.launchCameraAsync({
      mediaTypes: ["videos"],
      allowsEditing: options.allowsEditing ?? false,
      quality: options.quality ?? 0.85,
    });
  } catch (err) {
    console.error("Erro ao abrir câmera para vídeo:", err);
    Alert.alert("Erro", "Não foi possível abrir a câmera para gravação.");
    return null;
  }
}
