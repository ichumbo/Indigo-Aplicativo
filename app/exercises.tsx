import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as WebBrowser from 'expo-web-browser';
import {
  AVAILABLE_TAGS,
  ExerciseItem,
  ExerciseSource,
  MUSCLE_GROUPS,
  SYSTEM_EXERCISES,
  deleteCustomExercise,
  getCustomExercises,
  getYoutubeThumbnailUrl,
  getYoutubeVideoId,
  normalizeText,
  saveCustomExercise,
} from '@/services/exercise-store';
import { useAppTheme } from '@/hooks/use-app-theme';

// Design Tokens - DragonCorp Crimson Red Visual Identity
const BG_DARK = '#0f0f0f';
const CARD_BG = '#181818';
const CARD_SOFT = '#222222';
const BORDER_COLOR = '#2e2e2e';
const BORDER_HIGHLIGHT = '#3e3e3e';
const ACCENT_RED = '#D90000';
const ACCENT_RED_HOVER = '#b30000';
const TEXT_WHITE = '#ffffff';
const TEXT_MUTED = '#9a9a9a';
const TEXT_SUBTLE = '#666666';
const TAG_BG = '#242424';
const TAG_TEXT = '#d0d0d0';

export default function ExercisesScreen() {
  const { theme, isDark } = useAppTheme();
  const params = useLocalSearchParams<{
    initialTab?: ExerciseSource;
    selectable?: string;
    program?: string;
    selectedDate?: string;
  }>();

  const isSelectionMode = params.selectable === 'true' || Boolean(params.program);
  const targetProgram = params.program || 'elite';
  const targetDate = params.selectedDate;

  // Estados principais
  const [activeTab, setActiveTab] = useState<ExerciseSource>(
    params.initialTab === 'custom' ? 'custom' : 'system'
  );
  const [systemExercises, setSystemExercises] = useState<ExerciseItem[]>(SYSTEM_EXERCISES);
  const [customExercises, setCustomExercises] = useState<ExerciseItem[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(true);

  // Filtro e Busca
  const [searchText, setSearchText] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('Todos');
  const [showGroupFilterModal, setShowGroupFilterModal] = useState(false);

  // Seleção múltipla para adição a treinos
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Record<string, boolean>>({});

  // Modal de Demonstração / Vídeo
  const [selectedExerciseForDetail, setSelectedExerciseForDetail] = useState<ExerciseItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Modal de Adicionar / Editar Exercício
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [exerciseDraft, setExerciseDraft] = useState<Partial<ExerciseItem>>({
    name: '',
    category: 'Abs & Core',
    muscleGroups: ['Abs & Core'],
    tags: ['Abs&Core'],
    videoUrl: '',
    localVideoUri: undefined,
    videoFileSizeMB: undefined,
    description: '',
    instructions: '',
  });

  // Modal de Seletor de Grupos & Tags dentro do formulário
  const [showTagSelectorModal, setShowTagSelectorModal] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');

  // Carrega exercícios personalizados do AsyncStorage
  const loadCustomExercisesData = useCallback(async () => {
    setLoadingCustom(true);
    try {
      const items = await getCustomExercises();
      setCustomExercises(items);
    } catch (error) {
      console.error('Erro ao carregar custom exercises:', error);
    } finally {
      setLoadingCustom(false);
    }
  }, []);

  useEffect(() => {
    loadCustomExercisesData();
  }, [loadCustomExercisesData]);

  // Lista ativa com base na aba
  const activeList = useMemo(() => {
    return activeTab === 'system' ? systemExercises : customExercises;
  }, [activeTab, systemExercises, customExercises]);

  // Filtragem por busca e por grupo muscular
  const filteredList = useMemo(() => {
    const normQuery = normalizeText(searchText);

    return activeList.filter((item) => {
      // Filtro por grupo
      if (selectedMuscleGroup !== 'Todos') {
        const matchesCategory = normalizeText(item.category).includes(normalizeText(selectedMuscleGroup));
        const matchesGroup = item.muscleGroups?.some((g) =>
          normalizeText(g).includes(normalizeText(selectedMuscleGroup))
        );
        const matchesTag = item.tags?.some((t) =>
          normalizeText(t).includes(normalizeText(selectedMuscleGroup))
        );
        if (!matchesCategory && !matchesGroup && !matchesTag) {
          return false;
        }
      }

      // Filtro por texto
      if (normQuery) {
        const inName = normalizeText(item.name).includes(normQuery);
        const inCategory = normalizeText(item.category).includes(normQuery);
        const inTags = item.tags?.some((t) => normalizeText(t).includes(normQuery));
        const inDesc = normalizeText(item.description || '').includes(normQuery);
        if (!inName && !inCategory && !inTags && !inDesc) {
          return false;
        }
      }

      return true;
    });
  }, [activeList, selectedMuscleGroup, searchText]);

  // Contagem de exercícios por grupo para o modal de filtro
  const getGroupCount = useCallback(
    (group: string) => {
      if (group === 'Todos') return activeList.length;
      const norm = normalizeText(group);
      return activeList.filter((item) => {
        const inCategory = normalizeText(item.category).includes(norm);
        const inGroups = item.muscleGroups?.some((g) => normalizeText(g).includes(norm));
        const inTags = item.tags?.some((t) => normalizeText(t).includes(norm));
        return inCategory || inGroups || inTags;
      }).length;
    },
    [activeList]
  );

  // Abertura do formulário para CRIAR
  const handleOpenCreateForm = () => {
    setIsEditing(false);
    setExerciseDraft({
      name: '',
      category: 'Abs & Core',
      muscleGroups: ['Abs & Core'],
      tags: ['Abs&Core', 'Peso Corporal'],
      videoUrl: '',
      localVideoUri: undefined,
      videoFileSizeMB: undefined,
      description: '',
      instructions: '',
    });
    setShowFormModal(true);
  };

  // Abertura do formulário para EDITAR
  const handleOpenEditForm = (exercise: ExerciseItem) => {
    setIsEditing(true);
    setExerciseDraft({
      ...exercise,
      muscleGroups: exercise.muscleGroups || [exercise.category],
      tags: exercise.tags || [],
    });
    setShowFormModal(true);
  };

  // Salvar formulário de exercício
  const handleSaveExercise = async () => {
    if (!exerciseDraft.name?.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, informe o nome do exercício.');
      return;
    }

    try {
      const category = exerciseDraft.category || exerciseDraft.muscleGroups?.[0] || 'Abs & Core';
      const muscleGroups = exerciseDraft.muscleGroups?.length ? exerciseDraft.muscleGroups : [category];
      const tags = exerciseDraft.tags?.length ? exerciseDraft.tags : [category];

      const itemToSave: ExerciseItem = {
        id: exerciseDraft.id || `custom-${Date.now()}`,
        name: exerciseDraft.name.trim(),
        category,
        muscleGroups,
        tags,
        videoUrl: exerciseDraft.videoUrl?.trim() || undefined,
        localVideoUri: exerciseDraft.localVideoUri || undefined,
        videoFileSizeMB: exerciseDraft.videoFileSizeMB,
        description: exerciseDraft.description?.trim() || '',
        instructions: exerciseDraft.instructions?.trim() || '',
        isSystem: false,
        thumbnailUrl:
          exerciseDraft.thumbnailUrl ||
          getYoutubeThumbnailUrl(exerciseDraft.videoUrl) ||
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
      };

      const updated = await saveCustomExercise(itemToSave);
      setCustomExercises(updated);
      setShowFormModal(false);
      Alert.alert(
        'Sucesso',
        isEditing ? 'Exercício atualizado com sucesso!' : 'Novo exercício criado com sucesso!'
      );
    } catch (error) {
      console.error('Erro ao salvar exercício:', error);
      Alert.alert('Erro', 'Não foi possível salvar o exercício.');
    }
  };

  // Excluir exercício personalizado
  const handleDeleteExercise = () => {
    if (!exerciseDraft.id) return;
    Alert.alert(
      'Excluir Exercício',
      `Deseja realmente excluir "${exerciseDraft.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = await deleteCustomExercise(exerciseDraft.id!);
              setCustomExercises(updated);
              setShowFormModal(false);
              Alert.alert('Excluído', 'Exercício removido com sucesso.');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir o exercício.');
            }
          },
        },
      ]
    );
  };

  // Selecionar vídeo da galeria usando ImagePicker com validação de 50MB
  const handlePickVideoFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão Necessária',
          'Precisamos de acesso à sua biblioteca para você selecionar vídeos dos exercícios.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileSizeMB = asset.fileSize ? asset.fileSize / (1024 * 1024) : 0;

        if (fileSizeMB > 50) {
          Alert.alert(
            'Vídeo Muito Grande',
            `O vídeo selecionado possui aproximadamente ${fileSizeMB.toFixed(
              1
            )}MB, ultrapassando o limite máximo permitido de 50MB. Escolha um vídeo menor ou reduza a duração.`
          );
          return;
        }

        setExerciseDraft((prev) => ({
          ...prev,
          localVideoUri: asset.uri,
          videoFileSizeMB: fileSizeMB > 0 ? Number(fileSizeMB.toFixed(1)) : undefined,
        }));
      }
    } catch (error) {
      console.error('Erro ao selecionar vídeo:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao abrir a galeria de vídeos.');
    }
  };

  // Alternar seleção de tags no modal de tags
  const toggleDraftTag = (tag: string) => {
    setExerciseDraft((prev) => {
      const currentTags = prev.tags || [];
      const hasTag = currentTags.includes(tag);
      const nextTags = hasTag ? currentTags.filter((t) => t !== tag) : [...currentTags, tag];

      let nextGroups = prev.muscleGroups || [];
      if (MUSCLE_GROUPS.includes(tag as any) && tag !== 'Todos') {
        nextGroups = hasTag ? nextGroups.filter((g) => g !== tag) : [...nextGroups, tag];
      }

      return {
        ...prev,
        tags: nextTags,
        muscleGroups: nextGroups.length ? nextGroups : prev.muscleGroups,
        category: nextGroups[0] || prev.category || 'Abs & Core',
      };
    });
  };

  // Adicionar tag personalizada
  const handleAddCustomTag = () => {
    if (!customTagInput.trim()) return;
    const tag = customTagInput.trim();
    setExerciseDraft((prev) => ({
      ...prev,
      tags: prev.tags?.includes(tag) ? prev.tags : [...(prev.tags || []), tag],
    }));
    setCustomTagInput('');
  };

  // Alternar seleção de exercício para treino (Modo seleção)
  const toggleSelectExercise = (exercise: ExerciseItem) => {
    setSelectedExerciseIds((prev) => ({
      ...prev,
      [exercise.id]: !prev[exercise.id],
    }));
  };

  // Confirmar exercícios selecionados e retornar para tela de treino/admin
  const handleConfirmSelection = () => {
    const selectedList = [...systemExercises, ...customExercises].filter(
      (ex) => selectedExerciseIds[ex.id]
    );

    if (selectedList.length === 0) {
      router.back();
      return;
    }

    const payload = selectedList.map((ex) => ({
      name: ex.name,
      sets: '3',
      reps: '10',
      notes: ex.description || ex.category,
      videoUrl: ex.videoUrl,
    }));

    router.push({
      pathname: '/(tabs)/admin',
      params: {
        addExercises: JSON.stringify(payload),
        program: targetProgram,
        selectedDate: targetDate,
      },
    });
  };

  // Abertura do vídeo / detalhes
  const handleCardPress = (exercise: ExerciseItem) => {
    if (isSelectionMode) {
      toggleSelectExercise(exercise);
    } else {
      setSelectedExerciseForDetail(exercise);
      setShowDetailModal(true);
    }
  };

  const handlePlayVideoPress = (exercise: ExerciseItem) => {
    setSelectedExerciseForDetail(exercise);
    setShowDetailModal(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      {/* TOP BAR / CABEÇALHO */}
      <View style={[styles.topBar, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
          onPress={() => router.back()}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <Text style={[styles.screenTitle, { color: theme.text }]}>Meus Exercícios</Text>

        <TouchableOpacity
          style={[
            styles.actionButton,
            isSelectionMode && { backgroundColor: "#D90000", borderColor: "#D90000" },
          ]}
          onPress={isSelectionMode ? handleConfirmSelection : () => router.back()}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="checkmark"
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {/* ABAS SEGMENTADAS: EXERCÍCIOS DO SISTEMA | MEUS EXERCÍCIOS */}
      <View style={[styles.tabContainer, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'system' && styles.tabButtonActive]}
          onPress={() => setActiveTab('system')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === 'system' && styles.tabTextActive]}>
            Exercícios do Sistema
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'custom' && styles.tabButtonActive]}
          onPress={() => setActiveTab('custom')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === 'custom' && styles.tabTextActive]}>
            Meus Exercícios
          </Text>
        </TouchableOpacity>
      </View>

      {/* BOTÃO FILTRO POR GRUPOS */}
      <TouchableOpacity
        style={[styles.filterButton, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        onPress={() => setShowGroupFilterModal(true)}
        activeOpacity={0.8}
      >
        <View style={styles.filterIconCircle}>
          <Ionicons name="filter" size={15} color={ACCENT_RED} />
        </View>
        <Text style={[styles.filterButtonText, { color: theme.text }]}>
          Filtro por Grupos ({selectedMuscleGroup})
        </Text>
        <Ionicons name="chevron-down" size={16} color={ACCENT_RED} />
      </TouchableOpacity>

      {/* CAMPO DE BUSCA */}
      <View style={[styles.searchContainer, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}>
        <Ionicons name="search-outline" size={18} color={theme.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Filtrar por nome"
          placeholderTextColor={theme.placeholder}
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearSearchButton}>
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* BOTÃO MINIMALISTA DE NOVO EXERCÍCIO (INLINE NO TOPO DA ABA MEUS EXERCÍCIOS) */}
      {activeTab === 'custom' && (
        <TouchableOpacity
          style={[styles.inlineCreateButton, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
          onPress={handleOpenCreateForm}
          activeOpacity={0.85}
        >
          <View style={styles.inlineCreateIcon}>
            <Ionicons name="add" size={18} color="#ffffff" />
          </View>
          <Text style={[styles.inlineCreateText, { color: theme.text }]}>Adicionar Novo Exercício</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </TouchableOpacity>
      )}

      {/* LISTAGEM DE EXERCÍCIOS */}
      {activeTab === 'custom' && loadingCustom ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT_RED} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Carregando seus exercícios...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listScrollView}
          contentContainerStyle={[
            styles.listContentContainer,
            activeTab === 'custom' && { paddingBottom: 100 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {filteredList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="barbell-outline" size={32} color={ACCENT_RED} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {activeTab === 'system'
                  ? 'Nenhum exercício encontrado'
                  : 'Nenhum exercício personalizado'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                {activeTab === 'system'
                  ? 'Tente alterar o filtro de busca ou o grupo muscular.'
                  : 'Crie exercícios personalizados com vídeos e métricas próprias para seus treinos.'}
              </Text>
              {activeTab === 'custom' && (
                <TouchableOpacity style={styles.addFirstButton} onPress={handleOpenCreateForm}>
                  <Ionicons name="add" size={18} color="#ffffff" />
                  <Text style={styles.addFirstButtonText}>Criar Exercício</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredList.map((exercise) => {
              const isSelected = Boolean(selectedExerciseIds[exercise.id]);
              const thumbUrl =
                exercise.thumbnailUrl ||
                getYoutubeThumbnailUrl(exercise.videoUrl) ||
                'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400';

              return (
                <TouchableOpacity
                  key={exercise.id}
                  style={[
                    styles.exerciseCard,
                    { backgroundColor: theme.card, borderColor: theme.cardBorder },
                    isSelected && styles.exerciseCardSelected,
                  ]}
                  onPress={() => handleCardPress(exercise)}
                  activeOpacity={0.75}
                >
                  {/* THUMBNAIL COM BOTÃO PLAY */}
                  <TouchableOpacity
                    style={styles.thumbnailContainer}
                    onPress={() => handlePlayVideoPress(exercise)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: thumbUrl }} style={styles.thumbnailImage} resizeMode="cover" />
                    <View style={styles.playOverlay}>
                      <Ionicons name="play" size={15} color={ACCENT_RED} style={{ marginLeft: 2 }} />
                    </View>
                  </TouchableOpacity>

                  {/* INFO DO EXERCÍCIO */}
                  <View style={styles.exerciseContent}>
                    <Text style={[styles.exerciseTitle, { color: theme.text }]} numberOfLines={2}>
                      {exercise.name}
                    </Text>

                    {/* BADGES / TAGS */}
                    <View style={styles.tagsRow}>
                      {exercise.tags?.slice(0, 4).map((tag, idx) => (
                        <View key={`${tag}-${idx}`} style={[styles.tagBadge, { backgroundColor: theme.cardSecondary }]}>
                          <Text style={[styles.tagBadgeText, { color: theme.textSecondary }]}>{tag}</Text>
                        </View>
                      ))}
                      {exercise.tags && exercise.tags.length > 4 && (
                        <View style={[styles.tagBadgeMore, { backgroundColor: theme.cardSecondary }]}>
                          <Text style={[styles.tagBadgeMoreText, { color: theme.textSecondary }]}>+{exercise.tags.length - 4}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* AÇÕES NO CARD */}
                  {activeTab === 'custom' && (
                    <TouchableOpacity
                      style={styles.editCardButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleOpenEditForm(exercise);
                      }}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Ionicons name="create-outline" size={20} color={ACCENT_RED} />
                    </TouchableOpacity>
                  )}

                  {isSelectionMode && (
                    <View
                      style={[
                        styles.selectionCircle,
                        isSelected && styles.selectionCircleActive,
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* BOTÃO FLUTUANTE MINIMALISTA (PILL ELEGANTE) NA ABA MEUS EXERCÍCIOS */}
      {activeTab === 'custom' && (
        <View style={styles.fabWrapper} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.minimalFab}
            onPress={handleOpenCreateForm}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text style={styles.minimalFabText}>Novo Exercício</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FILTRO POR GRUPOS MUSCULARES */}
      {/* ========================================================================= */}
      <Modal
        visible={showGroupFilterModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowGroupFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowGroupFilterModal(false)}
        >
          <View style={styles.modalFilterSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalFilterHeader}>
              <View style={styles.modalFilterTitleRow}>
                <Ionicons name="filter" size={18} color={ACCENT_RED} />
                <Text style={styles.modalFilterTitle}>Filtro por Grupos</Text>
              </View>
              <TouchableOpacity onPress={() => setShowGroupFilterModal(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={20} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFilterList} showsVerticalScrollIndicator={false}>
              {MUSCLE_GROUPS.map((group) => {
                const count = getGroupCount(group);
                const isSelected = selectedMuscleGroup === group;

                return (
                  <TouchableOpacity
                    key={group}
                    style={[styles.filterOptionItem, isSelected && styles.filterOptionItemSelected]}
                    onPress={() => {
                      setSelectedMuscleGroup(group);
                      setShowGroupFilterModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        isSelected && styles.filterOptionTextSelected,
                      ]}
                    >
                      {group}
                    </Text>
                    <View
                      style={[
                        styles.filterOptionCountBadge,
                        isSelected && styles.filterOptionCountBadgeSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterOptionCountText,
                          isSelected && styles.filterOptionCountTextSelected,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: ADICIONAR / EDITAR EXERCÍCIO (SCREENSHOT 3) */}
      {/* ========================================================================= */}
      <Modal
        visible={showFormModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowFormModal(false)}
      >
        <SafeAreaView style={styles.formContainer} edges={["top", "left", "right"]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {/* CABEÇALHO DO FORMULÁRIO */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowFormModal(false)}
                activeOpacity={0.75}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Voltar"
              >
                <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <Text style={styles.screenTitle}>
                {isEditing ? 'Editar Exercício' : 'Adicionar Exercício'}
              </Text>

              <View style={styles.topBarActionsRight}>
                {isEditing && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleDeleteExercise}
                    activeOpacity={0.75}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF4D4D" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: "#D90000", borderColor: "#D90000" }]}
                  onPress={handleSaveExercise}
                  activeOpacity={0.75}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.formScrollView}
              contentContainerStyle={styles.formContentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* CAMPO: NOME DO EXERCÍCIO */}
              <View style={styles.formFieldGroup}>
                <Text style={styles.formFieldLabel}>Nome do Exercício</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Informe o nome do exercício"
                  placeholderTextColor={TEXT_SUBTLE}
                  value={exerciseDraft.name}
                  onChangeText={(text) => setExerciseDraft((prev) => ({ ...prev, name: text }))}
                />
              </View>

              {/* CAMPO: GRUPOS */}
              <View style={styles.formFieldGroup}>
                <Text style={styles.formFieldLabel}>Grupos</Text>
                <TouchableOpacity
                  style={styles.formGroupSelector}
                  onPress={() => setShowTagSelectorModal(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.formGroupChipsWrapper}>
                    {exerciseDraft.tags && exerciseDraft.tags.length > 0 ? (
                      exerciseDraft.tags.map((tag) => (
                        <View key={tag} style={styles.formMiniChip}>
                          <Text style={styles.formMiniChipText}>{tag}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.formGroupPlaceholder}>Clique aqui para selecionar</Text>
                    )}
                  </View>

                  <View style={styles.formGroupPlusIcon}>
                    <Ionicons name="add-circle-outline" size={22} color={ACCENT_RED} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* CAMPO: LINK */}
              <View style={styles.formFieldGroup}>
                <Text style={styles.formFieldLabel}>Link</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Informe um link de demonstração do exercício"
                  placeholderTextColor={TEXT_SUBTLE}
                  value={exerciseDraft.videoUrl}
                  onChangeText={(text) =>
                    setExerciseDraft((prev) => ({ ...prev, videoUrl: text }))
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* BLOCO DE TEXTO INFORMATIVO DA REFERÊNCIA */}
              <View style={styles.formInfoBox}>
                <Text style={styles.formInfoText}>
                  Você pode selecionar um vídeo da sua galeria para upload (não pode exceder 50MB) ou
                  você pode informar um link da web que demonstra a execução do exercício.
                </Text>
                <Text style={styles.formInfoTipText}>
                  <Text style={{ fontWeight: 'bold', color: TEXT_WHITE }}>Dica:</Text> Sempre que for
                  adicionar vídeos da biblioteca, procure vídeos gravados com o celular na horizontal,
                  para melhor exibição dentro do app.
                </Text>
              </View>

              {/* BOTÃO: SELECIONAR VÍDEO DA GALERIA */}
              <TouchableOpacity
                style={styles.selectVideoButton}
                onPress={handlePickVideoFromGallery}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload-outline" size={20} color={ACCENT_RED} />
                <Text style={styles.selectVideoButtonText}>
                  {exerciseDraft.localVideoUri ? 'Trocar Vídeo Selecionado' : 'Selecionar Vídeo'}
                </Text>
              </TouchableOpacity>

              {/* PREVIEW DO VÍDEO SELECIONADO LOCALMENTE */}
              {exerciseDraft.localVideoUri && (
                <View style={styles.selectedVideoCard}>
                  <Ionicons name="videocam" size={20} color={ACCENT_RED} />
                  <View style={styles.selectedVideoInfo}>
                    <Text style={styles.selectedVideoTitle} numberOfLines={1}>
                      Vídeo da galeria carregado
                    </Text>
                    {exerciseDraft.videoFileSizeMB !== undefined && (
                      <Text style={styles.selectedVideoSize}>
                        Tamanho: {exerciseDraft.videoFileSizeMB} MB / Máx: 50 MB
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      setExerciseDraft((prev) => ({
                        ...prev,
                        localVideoUri: undefined,
                        videoFileSizeMB: undefined,
                      }))
                    }
                  >
                    <Ionicons name="trash-outline" size={18} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              )}

              {/* CAMPO OPCIONAL: INSTRUÇÕES / COMO EXECUTAR */}
              <View style={[styles.formFieldGroup, { marginTop: 16 }]}>
                <Text style={styles.formFieldLabel}>Instruções / Como Executar (Opcional)</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Explique os pontos de atenção e postura correta..."
                  placeholderTextColor={TEXT_SUBTLE}
                  multiline
                  numberOfLines={4}
                  value={exerciseDraft.instructions}
                  onChangeText={(text) =>
                    setExerciseDraft((prev) => ({ ...prev, instructions: text }))
                  }
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: SELEÇÃO MÚLTIPLA DE GRUPOS E TAGS */}
      {/* ========================================================================= */}
      <Modal
        visible={showTagSelectorModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowTagSelectorModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalTagSheet}>
            <View style={styles.modalFilterHeader}>
              <View style={styles.modalFilterTitleRow}>
                <Ionicons name="pricetags" size={18} color={ACCENT_RED} />
                <Text style={styles.modalFilterTitle}>Selecionar Grupos e Tags</Text>
              </View>
              <TouchableOpacity onPress={() => setShowTagSelectorModal(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={20} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalTagScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.tagSectionTitle}>Grupamentos Principais</Text>
              <View style={styles.tagChipsWrap}>
                {MUSCLE_GROUPS.filter((g) => g !== 'Todos').map((group) => {
                  const isChecked = exerciseDraft.tags?.includes(group);
                  return (
                    <TouchableOpacity
                      key={group}
                      style={[styles.tagSelectableChip, isChecked && styles.tagSelectableChipActive]}
                      onPress={() => toggleDraftTag(group)}
                    >
                      <Text
                        style={[
                          styles.tagSelectableChipText,
                          isChecked && styles.tagSelectableChipTextActive,
                        ]}
                      >
                        {group}
                      </Text>
                      {isChecked && <Ionicons name="checkmark" size={13} color="#ffffff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.tagSectionTitle, { marginTop: 16 }]}>Tags e Equipamentos</Text>
              <View style={styles.tagChipsWrap}>
                {AVAILABLE_TAGS.map((tag) => {
                  const isChecked = exerciseDraft.tags?.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagSelectableChip, isChecked && styles.tagSelectableChipActive]}
                      onPress={() => toggleDraftTag(tag)}
                    >
                      <Text
                        style={[
                          styles.tagSelectableChipText,
                          isChecked && styles.tagSelectableChipTextActive,
                        ]}
                      >
                        {tag}
                      </Text>
                      {isChecked && <Ionicons name="checkmark" size={13} color="#ffffff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.tagSectionTitle, { marginTop: 16 }]}>Criar Tag Personalizada</Text>
              <View style={styles.customTagRow}>
                <TextInput
                  style={styles.customTagInput}
                  placeholder="Ex: Treino Rápido, Pilates"
                  placeholderTextColor={TEXT_SUBTLE}
                  value={customTagInput}
                  onChangeText={setCustomTagInput}
                />
                <TouchableOpacity style={styles.customTagAddButton} onPress={handleAddCustomTag}>
                  <Text style={styles.customTagAddButtonText}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.tagConfirmButton}
              onPress={() => setShowTagSelectorModal(false)}
            >
              <Text style={styles.tagConfirmButtonText}>Confirmar Seleção</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: DETALHES DO EXERCÍCIO / REPRODUÇÃO DE VÍDEO */}
      {/* ========================================================================= */}
      <Modal
        visible={showDetailModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailModalContent}>
            {selectedExerciseForDetail && (
              <>
                <View style={styles.detailModalHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.detailModalTitle}>{selectedExerciseForDetail.name}</Text>
                    <Text style={styles.detailModalCategory}>
                      {selectedExerciseForDetail.category}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.closeModalBtn}>
                    <Ionicons name="close" size={22} color={TEXT_MUTED} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.detailModalScroll} showsVerticalScrollIndicator={false}>
                  {/* VÍDEO CONTAINER */}
                  <TouchableOpacity
                    style={styles.detailVideoPreview}
                    onPress={async () => {
                      if (selectedExerciseForDetail.videoUrl) {
                        const videoUrl = selectedExerciseForDetail.videoUrl;
                        const videoId = getYoutubeVideoId(videoUrl);
                        if (videoId) {
                          const appUrl = `vnd.youtube:${videoId}`;
                          const webUrl = `https://www.youtube.com/watch?v=${videoId}`;
                          try {
                            const can = await Linking.canOpenURL(appUrl);
                            if (can) {
                              await Linking.openURL(appUrl);
                              return;
                            }
                          } catch {
                            // Fallback to browser
                          }
                          try {
                            await WebBrowser.openBrowserAsync(webUrl);
                          } catch {
                            try {
                              await Linking.openURL(webUrl);
                            } catch {
                              Alert.alert('Vídeo Indisponível', 'Não foi possível reproduzir o vídeo no momento.');
                            }
                          }
                        } else {
                          try {
                            await Linking.openURL(videoUrl);
                          } catch {
                            Alert.alert('Vídeo Indisponível', 'O endereço do vídeo não pôde ser aberto.');
                          }
                        }
                      } else if (selectedExerciseForDetail.localVideoUri) {
                        Alert.alert(
                          'Vídeo Local',
                          'Este vídeo foi enviado da biblioteca local deste dispositivo.'
                        );
                      } else {
                        Alert.alert('Sem Vídeo', 'Este exercício ainda não possui link de vídeo cadastrado.');
                      }
                    }}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{
                        uri:
                          selectedExerciseForDetail.thumbnailUrl ||
                          getYoutubeThumbnailUrl(selectedExerciseForDetail.videoUrl) ||
                          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
                      }}
                      style={styles.detailVideoImage}
                      resizeMode="cover"
                    />
                    <View style={styles.detailVideoPlayOverlay}>
                      <View style={styles.detailBigPlayCircle}>
                        <Ionicons name="play" size={28} color="#ffffff" style={{ marginLeft: 3 }} />
                      </View>
                      <Text style={styles.detailPlayText}>Assistir Demonstração</Text>
                      {selectedExerciseForDetail.videoUrl ? (
                        <Text style={styles.detailPlaySubtext}>Abrir no YouTube / Web</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>

                  {/* TAGS */}
                  <View style={styles.detailTagsWrapper}>
                    {selectedExerciseForDetail.tags?.map((tag) => (
                      <View key={tag} style={styles.tagBadge}>
                        <Text style={styles.tagBadgeText}>{tag}</Text>
                      </View>
                    ))}
                  </View>

                  {/* DESCRIÇÃO */}
                  {selectedExerciseForDetail.description ? (
                    <View style={styles.detailSectionCard}>
                      <Text style={styles.detailSectionHeader}>Descrição</Text>
                      <Text style={styles.detailSectionBody}>
                        {selectedExerciseForDetail.description}
                      </Text>
                    </View>
                  ) : null}

                  {/* INSTRUÇÕES / TÉCNICA */}
                  {selectedExerciseForDetail.instructions ? (
                    <View style={styles.detailSectionCard}>
                      <View style={styles.detailSectionHeaderRow}>
                        <Ionicons name="information-circle" size={17} color={ACCENT_RED} />
                        <Text style={styles.detailSectionHeader}>Como Executar</Text>
                      </View>
                      <Text style={styles.detailSectionBody}>
                        {selectedExerciseForDetail.instructions}
                      </Text>
                    </View>
                  ) : null}
                </ScrollView>

                {/* BOTÃO FECHAR */}
                <TouchableOpacity
                  style={styles.detailCloseButton}
                  onPress={() => setShowDetailModal(false)}
                >
                  <Text style={styles.detailCloseButtonText}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_DARK,
  },

  // TOP BAR
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_WHITE,
    letterSpacing: -0.2,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // ABAS SEGMENTADAS
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: ACCENT_RED,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_MUTED,
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },

  // BOTÃO FILTRO POR GRUPOS
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginHorizontal: 16,
    gap: 8,
  },
  filterIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ACCENT_RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT_RED,
  },

  // CAMPO DE BUSCA
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: TEXT_WHITE,
    fontSize: 14,
    paddingVertical: 0,
    fontWeight: '500',
  },
  clearSearchButton: {
    padding: 4,
  },

  // BOTÃO INLINE "ADICIONAR NOVO EXERCÍCIO" (MINIMALISTA)
  inlineCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: 10,
  },
  inlineCreateIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT_RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineCreateText: {
    flex: 1,
    color: TEXT_WHITE,
    fontSize: 13,
    fontWeight: '700',
  },

  // LISTAGEM
  listScrollView: {
    flex: 1,
  },
  listContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: TEXT_MUTED,
    fontSize: 14,
    marginTop: 12,
  },

  // CARDS DE EXERCÍCIO
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  exerciseCardSelected: {
    borderColor: ACCENT_RED,
    backgroundColor: '#1e1111',
  },
  thumbnailContainer: {
    width: 72,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: CARD_SOFT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.65)',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ACCENT_RED,
  },
  exerciseContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  exerciseTitle: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 5,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  tagBadge: {
    backgroundColor: TAG_BG,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: BORDER_HIGHLIGHT,
  },
  tagBadgeText: {
    color: TAG_TEXT,
    fontSize: 11,
    fontWeight: '600',
  },
  tagBadgeMore: {
    backgroundColor: '#303030',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagBadgeMoreText: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '700',
  },
  editCardButton: {
    padding: 8,
    marginLeft: 4,
  },
  selectionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: TEXT_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  selectionCircleActive: {
    backgroundColor: ACCENT_RED,
    borderColor: ACCENT_RED,
  },

  // BOTÃO FLUTUANTE (PILL MINIMALISTA E BONITO)
  fabWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimalFab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT_RED,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 24,
    gap: 6,
    shadowColor: ACCENT_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  minimalFabText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // ESTADOS VAZIOS
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: TEXT_MUTED,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT_RED,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 18,
    gap: 6,
  },
  addFirstButtonText: {
    color: TEXT_WHITE,
    fontSize: 13,
    fontWeight: '800',
  },

  // MODAL FILTRO DE GRUPOS
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalFilterSheet: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  modalFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  modalFilterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalFilterTitle: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: '800',
  },
  closeModalBtn: {
    padding: 4,
  },
  modalFilterList: {
    marginTop: 8,
  },
  filterOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#242424',
  },
  filterOptionItemSelected: {
    borderBottomColor: ACCENT_RED,
  },
  filterOptionText: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '600',
  },
  filterOptionTextSelected: {
    color: ACCENT_RED,
    fontWeight: '800',
  },
  filterOptionCountBadge: {
    backgroundColor: CARD_SOFT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  filterOptionCountBadgeSelected: {
    backgroundColor: ACCENT_RED,
  },
  filterOptionCountText: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  filterOptionCountTextSelected: {
    color: '#ffffff',
  },

  // FORMULÁRIO (ADICIONAR / EDITAR EXERCÍCIO)
  formContainer: {
    flex: 1,
    backgroundColor: BG_DARK,
  },
  formScrollView: {
    flex: 1,
  },
  formContentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  formFieldGroup: {
    marginBottom: 16,
  },
  formFieldLabel: {
    color: TEXT_WHITE,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    color: TEXT_WHITE,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formGroupSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
  },
  formGroupChipsWrapper: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  formGroupPlaceholder: {
    color: TEXT_SUBTLE,
    fontSize: 14,
  },
  formMiniChip: {
    backgroundColor: TAG_BG,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: BORDER_HIGHLIGHT,
  },
  formMiniChipText: {
    color: TEXT_WHITE,
    fontSize: 11,
    fontWeight: '600',
  },
  formGroupPlusIcon: {
    marginLeft: 8,
  },
  formInfoBox: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  formInfoText: {
    color: TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  formInfoTipText: {
    color: TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  selectVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: ACCENT_RED,
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  selectVideoButtonText: {
    color: ACCENT_RED,
    fontSize: 14,
    fontWeight: '800',
  },
  selectedVideoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: '#383838',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    gap: 10,
  },
  selectedVideoInfo: {
    flex: 1,
  },
  selectedVideoTitle: {
    color: TEXT_WHITE,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedVideoSize: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
  },

  // MODAL DE TAGS
  modalTagSheet: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 40,
    padding: 18,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  modalTagScroll: {
    marginTop: 10,
    maxHeight: 380,
  },
  tagSectionTitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  tagSelectableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_SOFT,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: 4,
  },
  tagSelectableChipActive: {
    backgroundColor: ACCENT_RED,
    borderColor: ACCENT_RED,
  },
  tagSelectableChipText: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '600',
  },
  tagSelectableChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  customTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  customTagInput: {
    flex: 1,
    backgroundColor: CARD_SOFT,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    color: TEXT_WHITE,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  customTagAddButton: {
    backgroundColor: ACCENT_RED,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  customTagAddButtonText: {
    color: TEXT_WHITE,
    fontSize: 12,
    fontWeight: '800',
  },
  tagConfirmButton: {
    backgroundColor: ACCENT_RED,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  tagConfirmButtonText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: '800',
  },

  // MODAL DETALHES / VÍDEO
  detailModalContent: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 40,
    padding: 18,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  detailModalTitle: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: '800',
  },
  detailModalCategory: {
    color: ACCENT_RED,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  detailModalScroll: {
    marginTop: 12,
    maxHeight: 420,
  },
  detailVideoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailVideoImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  detailVideoPlayOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBigPlayCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ACCENT_RED,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  detailPlayText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: '800',
  },
  detailPlaySubtext: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
  },
  detailTagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  detailSectionCard: {
    backgroundColor: CARD_SOFT,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  detailSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  detailSectionHeader: {
    color: TEXT_WHITE,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  detailSectionBody: {
    color: TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  detailCloseButton: {
    backgroundColor: CARD_SOFT,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  detailCloseButtonText: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
});
