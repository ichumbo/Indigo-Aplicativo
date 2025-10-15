import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const initialExercises = [
  {
    id: 1,
    name: 'Deadlift',
    category: 'Força',
    icon: 'barbell-outline',
    description: 'Levantamento terra com barra',
    explanation: 'Exercício fundamental para desenvolvimento da força posterior. Trabalha glúteos, isquiotibiais, eretores da espinha e trapézio.',
    videoUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q',
  },
  {
    id: 2,
    name: 'Back Squat',
    category: 'Força',
    icon: 'fitness-outline',
    description: 'Agachamento com barra nas costas',
    explanation: 'Movimento fundamental para desenvolvimento de força nas pernas. Trabalha quadríceps, glúteos e core.',
    videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8',
  },
  {
    id: 3,
    name: 'Double Under',
    category: 'Cardio',
    icon: 'heart-outline',
    description: 'Pular corda com duplo giro',
    explanation: 'Exercício cardiovascular de alta intensidade. A corda passa duas vezes por baixo dos pés em cada salto.',
    videoUrl: 'https://www.youtube.com/watch?v=hCuXYrTOMxI',
  },
  {
    id: 4,
    name: 'Hip Flexor Stretch',
    category: 'Mobilidade',
    icon: 'body-outline',
    description: 'Alongamento do flexor do quadril',
    explanation: 'Alongamento essencial para melhorar a mobilidade do quadril e reduzir tensões na região lombar.',
    videoUrl: 'https://www.youtube.com/watch?v=YQmpO9VT2X4',
  },
  {
    id: 5,
    name: 'Pull-ups',
    category: 'Força',
    icon: 'fitness-outline',
    description: 'Barra fixa',
    explanation: 'Exercício de tração que desenvolve força nas costas, bíceps e antebraços. Movimento funcional fundamental.',
    videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
  },
  {
    id: 6,
    name: 'Burpees',
    category: 'Cardio',
    icon: 'flame-outline',
    description: 'Exercício funcional completo',
    explanation: 'Movimento composto que combina agachamento, prancha e salto. Excelente para condicionamento cardiovascular.',
    videoUrl: 'https://www.youtube.com/watch?v=TU8QYVW0gDU',
  },
  {
    id: 7,
    name: 'Box Jump',
    category: 'Pliometria',
    icon: 'arrow-up-outline',
    description: 'Salto no caixote',
    explanation: 'Exercício pliométrico que desenvolve potência e explosão nas pernas. Melhora a capacidade de salto vertical.',
    videoUrl: 'https://www.youtube.com/watch?v=NBY9-kTuHEk',
  },
  {
    id: 8,
    name: 'Kettlebell Swing',
    category: 'Força',
    icon: 'fitness-outline',
    description: 'Balanço com kettlebell',
    explanation: 'Movimento balístico que trabalha cadeia posterior, core e desenvolve potência. Excelente para condicionamento.',
    videoUrl: 'https://www.youtube.com/watch?v=GYHbu2LRqD0',
  },
  {
    id: 9,
    name: 'Rowing Machine',
    category: 'Endurance',
    icon: 'timer-outline',
    description: 'Remo ergômetro',
    explanation: 'Exercício cardiovascular completo que trabalha todo o corpo. Desenvolve resistência e força muscular.',
    videoUrl: 'https://www.youtube.com/watch?v=zQ82RYIFLN8',
  },
  {
    id: 10,
    name: 'Bike Intervals',
    category: 'Endurance',
    icon: 'bicycle-outline',
    description: 'Intervalos na bike',
    explanation: 'Treino intervalado de alta intensidade na bicicleta ergométrica. Melhora capacidade cardiovascular.',
    videoUrl: 'https://www.youtube.com/watch?v=1VYlOKUdylM',
  },
  {
    id: 11,
    name: 'Running',
    category: 'Endurance',
    icon: 'walk-outline',
    description: 'Corrida contínua',
    explanation: 'Exercício aeróbico fundamental. Desenvolve resistência cardiovascular e fortalece membros inferiores.',
    videoUrl: 'https://www.youtube.com/watch?v=kVnyY17VS9Y',
  },
  {
    id: 12,
    name: 'Swimming',
    category: 'Endurance',
    icon: 'water-outline',
    description: 'Natação',
    explanation: 'Exercício completo de baixo impacto. Trabalha todo o corpo e desenvolve excelente capacidade cardiorrespiratória.',
    videoUrl: 'https://www.youtube.com/watch?v=5HLW2AI1Ink',
  },
  {
    id: 13,
    name: 'Elliptical',
    category: 'Endurance',
    icon: 'ellipse-outline',
    description: 'Elíptico',
    explanation: 'Exercício cardiovascular de baixo impacto. Combina movimentos de corrida e esqui cross-country.',
    videoUrl: 'https://www.youtube.com/watch?v=TKE6zKk6e8g',
  },
];

const recentExercises = [1, 3, 9, 11]; // IDs dos exercícios usados recentemente

export default function ExercisesScreen() {
  const [exercises, setExercises] = useState(initialExercises);
  const [searchText, setSearchText] = useState('');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: '',
    category: '',
    description: '',
    explanation: '',
    videoUrl: '',
    icon: 'fitness-outline',
    trackType1: 'repetições',
    trackType2: 'peso'
  });
  const [showDropdown1, setShowDropdown1] = useState(false);
  const [showDropdown2, setShowDropdown2] = useState(false);

  const createExercise = () => {
    if (!newExercise.name.trim()) return;
    
    const exercise = {
      id: Math.max(...exercises.map(e => e.id)) + 1,
      name: newExercise.name,
      category: newExercise.category || 'Personalizado',
      icon: newExercise.icon,
      description: newExercise.description,
      explanation: newExercise.explanation,
      videoUrl: newExercise.videoUrl,
    };
    
    setExercises([...exercises, exercise]);
    setNewExercise({
      name: '',
      category: '',
      description: '',
      explanation: '',
      videoUrl: '',
      icon: 'fitness-outline',
      trackType1: 'repetições',
      trackType2: 'peso'
    });
    setShowCreateModal(false);
  };

  const trackOptions = ['repetições', 'tempo', 'segundos', 'milhas', 'peso', 'distância'];

  const recentExercisesList = exercises.filter(ex => recentExercises.includes(ex.id)).slice(0, 4);
  
  const filteredExercises = exercises.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(searchText.toLowerCase()) ||
      exercise.category.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fab12f" />
          </TouchableOpacity>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <TouchableOpacity>
            <Image
              source={{ uri: "https://i.pravatar.cc/150?img=12" }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Exercícios</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar exercícios..."
          placeholderTextColor="#666"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add-circle-outline" size={24} color="#fab12f" />
        <Text style={styles.createButtonText}>Criar Novo Exercício</Text>
      </TouchableOpacity>

      <ScrollView style={styles.exercisesList} showsVerticalScrollIndicator={false}>
        {searchText === '' && (
          <>
            <Text style={styles.sectionTitle}>Usados Recentemente</Text>
            {recentExercisesList.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={styles.exerciseCard}
                onPress={() => router.push({
                  pathname: '/training',
                  params: { 
                    addExercise: JSON.stringify(exercise),
                    section: exercise.category === 'Endurance' ? 'endurance' : 'elite'
                  }
                })}
              >
                <View style={[styles.exerciseIcon, exercise.category === 'Endurance' && styles.exerciseIconOrange]}>
                  <Ionicons name={exercise.icon as any} size={24} color={exercise.category === 'Endurance' ? "#ff6b35" : "#fab12f"} />
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseDescription}>{exercise.description}</Text>
                </View>
                <View style={[styles.exerciseCategory, exercise.category === 'Endurance' && styles.exerciseCategoryOrange]}>
                  <Text style={[styles.categoryText, exercise.category === 'Endurance' && styles.categoryTextOrange]}>{exercise.category}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.infoButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedExercise(exercise);
                    setShowModal(true);
                  }}
                >
                  <Ionicons name="information-circle-outline" size={20} color={exercise.category === 'Endurance' ? "#ff6b35" : "#fab12f"} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            
            <Text style={styles.sectionTitle}>Todos os Exercícios</Text>
          </>
        )}
        
        {(searchText === '' ? exercises : filteredExercises).map((exercise) => (
          <TouchableOpacity
            key={exercise.id}
            style={styles.exerciseCard}
            onPress={() => router.push({
              pathname: '/training',
              params: { 
                addExercise: JSON.stringify(exercise),
                section: exercise.category === 'Endurance' ? 'endurance' : 'elite'
              }
            })}
          >
            <View style={[styles.exerciseIcon, exercise.category === 'Endurance' && styles.exerciseIconOrange]}>
              <Ionicons name={exercise.icon as any} size={24} color={exercise.category === 'Endurance' ? "#ff6b35" : "#fab12f"} />
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseDescription}>{exercise.description}</Text>
            </View>
            <View style={[styles.exerciseCategory, exercise.category === 'Endurance' && styles.exerciseCategoryOrange]}>
              <Text style={[styles.categoryText, exercise.category === 'Endurance' && styles.categoryTextOrange]}>{exercise.category}</Text>
            </View>
            <TouchableOpacity 
              style={styles.infoButton}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedExercise(exercise);
                setShowModal(true);
              }}
            >
              <Ionicons name="information-circle-outline" size={20} color={exercise.category === 'Endurance' ? "#ff6b35" : "#fab12f"} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={showModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalContent}>
            <View style={styles.infoModalHeader}>
              <View style={styles.infoModalTitleContainer}>
                <View style={styles.infoModalIconContainer}>
                  <Ionicons name={selectedExercise?.icon as any} size={24} color="#fab12f" />
                </View>
                <View>
                  <Text style={styles.infoModalTitle}>{selectedExercise?.name}</Text>
                  <View style={styles.infoModalCategoryBadge}>
                    <Text style={styles.infoModalCategoryText}>{selectedExercise?.category}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.infoModalCloseButton}
                onPress={() => setShowModal(false)}
              >
                <Ionicons name="close" size={20} color="#999" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.infoModalBody} showsVerticalScrollIndicator={false}>
              <TouchableOpacity 
                style={styles.videoContainer}
                onPress={() => selectedExercise?.videoUrl && Linking.openURL(selectedExercise.videoUrl)}
              >
                <View style={styles.videoPlaceholder}>
                  <View style={styles.videoOverlay}>
                    <View style={styles.playButtonContainer}>
                      <Ionicons name="play" size={28} color="#fff" />
                    </View>
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoText}>Assistir Técnica</Text>
                      <Text style={styles.videoDuration}>Abrir no YouTube</Text>
                    </View>
                  </View>
                  <View style={styles.youtubeIcon}>
                    <Ionicons name="logo-youtube" size={24} color="#ff0000" />
                  </View>
                </View>
              </TouchableOpacity>
              
              <View style={styles.infoExplanationCard}>
                <View style={styles.infoExplanationHeader}>
                  <Ionicons name="information-circle" size={20} color="#fab12f" />
                  <Text style={styles.infoModalSectionTitle}>Como Executar</Text>
                </View>
                <Text style={styles.infoModalExplanation}>{selectedExercise?.explanation}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCreateModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.createModalOverlay}>
          <View style={styles.createModalContent}>
            <View style={styles.createModalHeader}>
              <View style={styles.createModalTitleContainer}>
                <View style={styles.createModalIconContainer}>
                  <Ionicons name="add-circle" size={24} color="#fab12f" />
                </View>
                <View>
                  <Text style={styles.createModalTitle}>Novo Exercício</Text>
                  <View style={styles.createModalCategoryBadge}>
                    <Text style={styles.createModalCategoryText}>Personalizado</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.createModalCloseButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Ionicons name="close" size={20} color="#999" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.createModalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="text-outline" size={16} color="#fab12f" />
                  <Text style={styles.inputLabel}>Nome do Exercício</Text>
                </View>
                <TextInput
                  style={styles.createInput}
                  placeholder="Ex: Deadlift"
                  placeholderTextColor="#666"
                  value={newExercise.name}
                  onChangeText={(text) => setNewExercise({...newExercise, name: text})}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="pricetag" size={16} color="#fab12f" />
                  <Text style={styles.inputLabel}>Categoria</Text>
                </View>
                <TextInput
                  style={styles.createInput}
                  placeholder="Ex: Força, Cardio, Mobilidade"
                  placeholderTextColor="#666"
                  value={newExercise.category}
                  onChangeText={(text) => setNewExercise({...newExercise, category: text})}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="document-text" size={16} color="#fab12f" />
                  <Text style={styles.inputLabel}>Descrição</Text>
                </View>
                <TextInput
                  style={styles.createInput}
                  placeholder="Breve descrição do exercício"
                  placeholderTextColor="#666"
                  value={newExercise.description}
                  onChangeText={(text) => setNewExercise({...newExercise, description: text})}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="information-circle" size={16} color="#fab12f" />
                  <Text style={styles.inputLabel}>Como Executar</Text>
                </View>
                <TextInput
                  style={[styles.createInput, styles.createTextArea]}
                  placeholder="Explicação detalhada da técnica"
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={4}
                  value={newExercise.explanation}
                  onChangeText={(text) => setNewExercise({...newExercise, explanation: text})}
                />
              </View>
              
              <View style={styles.inputRowContainer}>
                <View style={styles.inputHalf}>
                  <View style={styles.inputLabelContainer}>
                    <Ionicons name="analytics" size={16} color="#fab12f" />
                    <Text style={styles.inputLabel}>Track 1</Text>
                  </View>
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity 
                      style={styles.dropdownButton}
                      onPress={() => setShowDropdown1(!showDropdown1)}
                    >
                      <Text style={styles.dropdownButtonText}>{newExercise.trackType1}</Text>
                      <Ionicons name={showDropdown1 ? "chevron-up" : "chevron-down"} size={16} color="#fab12f" />
                    </TouchableOpacity>
                    {showDropdown1 && (
                      <View style={styles.dropdownList}>
                        {trackOptions.map((option) => (
                          <TouchableOpacity
                            key={option}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setNewExercise({...newExercise, trackType1: option});
                              setShowDropdown1(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>{option}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.inputHalf}>
                  <View style={styles.inputLabelContainer}>
                    <Ionicons name="analytics" size={16} color="#fab12f" />
                    <Text style={styles.inputLabel}>Track 2</Text>
                  </View>
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity 
                      style={styles.dropdownButton}
                      onPress={() => setShowDropdown2(!showDropdown2)}
                    >
                      <Text style={styles.dropdownButtonText}>{newExercise.trackType2}</Text>
                      <Ionicons name={showDropdown2 ? "chevron-up" : "chevron-down"} size={16} color="#fab12f" />
                    </TouchableOpacity>
                    {showDropdown2 && (
                      <View style={styles.dropdownList}>
                        {trackOptions.map((option) => (
                          <TouchableOpacity
                            key={option}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setNewExercise({...newExercise, trackType2: option});
                              setShowDropdown2(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>{option}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="logo-youtube" size={16} color="#ff0000" />
                  <Text style={styles.inputLabel}>Vídeo (opcional)</Text>
                </View>
                <TextInput
                  style={styles.createInput}
                  placeholder="https://www.youtube.com/watch?v=..."
                  placeholderTextColor="#666"
                  value={newExercise.videoUrl}
                  onChangeText={(text) => setNewExercise({...newExercise, videoUrl: text})}
                />
              </View>
              
              <View style={styles.createButtonsContainer}>
                <TouchableOpacity 
                  style={styles.createCancelButton}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.createCancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.createSaveButton}
                  onPress={createExercise}
                >
                  <Text style={styles.createSaveButtonText}>Criar Exercício</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 35,
    height: 15,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fab12f',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingVertical: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  exercisesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  exerciseIcon: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(250, 177, 47, 0.1)',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#999',
  },
  exerciseCategory: {
    backgroundColor: 'rgba(250, 177, 47, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    color: '#fab12f',
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#fab12f',
    borderStyle: 'dashed',
  },
  createButtonText: {
    color: '#fab12f',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 15,
  },
  infoButton: {
    padding: 8,
  },
  // Info Modal Styles
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  infoModalContent: {
    backgroundColor: "#111",
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  infoModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoModalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(250, 177, 47, 0.1)',
    borderWidth: 1,
    borderColor: '#fab12f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoModalCategoryBadge: {
    backgroundColor: 'rgba(250, 177, 47, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  infoModalCategoryText: {
    color: '#fab12f',
    fontSize: 12,
    fontWeight: '600',
  },
  infoModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoModalBody: {
    padding: 24,
  },
  infoExplanationCard: {
    marginTop: 16,
  },
  infoExplanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoModalSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoModalExplanation: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 22,
  },
  // Create Modal Styles
  createModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  createModalContent: {
    backgroundColor: "#111",
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  createModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createModalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(250, 177, 47, 0.1)',
    borderWidth: 1,
    borderColor: '#fab12f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  createModalCategoryBadge: {
    backgroundColor: 'rgba(250, 177, 47, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  createModalCategoryText: {
    color: '#fab12f',
    fontSize: 12,
    fontWeight: '600',
  },
  createModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createModalBody: {
    padding: 24,
  },
  videoContainer: {
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  videoPlaceholder: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    height: 180,
    position: 'relative',
    borderWidth: 2,
    borderColor: '#fab12f',
    overflow: 'hidden',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  playButtonContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fab12f',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  videoInfo: {
    alignItems: 'flex-start',
  },
  videoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  videoDuration: {
    color: '#ccc',
    fontSize: 12,
    opacity: 0.9,
  },
  youtubeIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  createInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  createTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  createButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 55,
  },
  createCancelButton: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createCancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  createSaveButton: {
    flex: 1,
    backgroundColor: '#fab12f',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createSaveButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inputLabel: {
    color: '#fab12f',
    fontSize: 14,
    fontWeight: '600',
  },
  inputRowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  inputHalf: {
    flex: 1,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 4,
    maxHeight: 175,
    zIndex: 1001,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  dropdownItemText: {
    color: '#ccc',
    fontSize: 14,
  },
  exerciseIconOrange: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  exerciseCategoryOrange: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
  },
  categoryTextOrange: {
    color: '#ff6b35',
  },
});