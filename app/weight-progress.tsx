import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

const weightData = {
  labels: ['01/12', '08/12', '15/12', '22/12', '29/12'],
  datasets: [{
    data: [75.2, 74.8, 74.5, 74.1, 73.8],
    color: (opacity = 1) => `rgba(217, 0, 0, ${opacity})`,
    strokeWidth: 3
  }]
};

export default function WeightProgressScreen() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState('Mensal');
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    startWeight: '',
    goalWeight: '',
    currentWeight: '',
    startDate: ''
  });
  
  const [weightDetails, setWeightDetails] = useState({
    startWeight: 78.0,
    goalWeight: 72.0,
    currentWeight: 74.5,
    startDate: '15 Jan 2024'
  });
  
  const weightLost = weightDetails.startWeight - weightDetails.currentWeight;
  const remainingWeight = weightDetails.currentWeight - weightDetails.goalWeight;
  const progressPercentage = ((weightDetails.startWeight - weightDetails.currentWeight) / (weightDetails.startWeight - weightDetails.goalWeight)) * 100;

  const periods = ['Semanal', 'Mensal', 'Anual'];

  const handleSaveForm = () => {
    const newDetails = {
      startWeight: parseFloat(formData.startWeight) || weightDetails.startWeight,
      goalWeight: parseFloat(formData.goalWeight) || weightDetails.goalWeight,
      currentWeight: parseFloat(formData.currentWeight) || weightDetails.currentWeight,
      startDate: formData.startDate || weightDetails.startDate
    };
    
    setWeightDetails(newDetails);
    setFormData({ startWeight: '', goalWeight: '', currentWeight: '', startDate: '' });
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#D90000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Progresso de Peso</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weightDetails.currentWeight}kg</Text>
            <Text style={styles.statLabel}>Peso Atual</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weightDetails.goalWeight}kg</Text>
            <Text style={styles.statLabel}>Meta</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.lostWeight]}>-{weightLost.toFixed(1)}kg</Text>
            <Text style={styles.statLabel}>Perdidos</Text>
          </View>
        </View>

        {/* Progress Card */}
        <LinearGradient
          colors={["#D90000", "#D90000"]}
          style={styles.progressCard}
        >
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progresso da Meta</Text>
            <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${Math.min(progressPercentage, 100)}%` }]} />
          </View>
          <Text style={styles.remainingText}>
            Faltam {remainingWeight.toFixed(1)}kg para atingir sua meta
          </Text>
        </LinearGradient>

        {/* Period Selector */}
        <View style={styles.periodContainer}>
          <Text style={styles.sectionTitle}>Histórico</Text>
          <View style={styles.periodSelector}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive
                ]}
                onPress={() => setSelectedPeriod(period)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.periodText,
                  selectedPeriod === period && styles.periodTextActive
                ]}>
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Evolução do Peso</Text>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={styles.legendDot} />
                <Text style={styles.legendText}>Peso</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.chart}>
            <LineChart
              data={weightData}
              width={width - 60}
              height={200}
              chartConfig={{
                backgroundColor: '#1c1c1c',
                backgroundGradientFrom: '#1c1c1c',
                backgroundGradientTo: '#1c1c1c',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(217, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(138, 138, 138, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#D90000'
                }
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16
              }}
            />
          </View>
        </View>

        {/* Weight Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Detalhes da Meta</Text>
          
          {[
            { label: 'Peso Inicial', value: `${weightDetails.startWeight}kg` },
            { label: 'Peso Objetivo', value: `${weightDetails.goalWeight}kg` },
            { label: 'Data de Início', value: weightDetails.startDate },
            { label: 'Peso Mais Recente', value: `${weightDetails.currentWeight}kg` },
            { label: 'Durante a Mudança', value: `-${weightLost.toFixed(1)}kg`, isWeightLoss: true },
            { label: 'Objetivo', value: 'Perder Peso' }
          ].map((detail, index) => (
            <View key={index} style={styles.detailItem}>
              <Text style={styles.detailLabel}>{detail.label}</Text>
              <Text style={[styles.detailValue, detail.isWeightLoss && styles.weightLoss]}>
                {detail.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Add Weight Button */}
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Registrar Peso</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Weight Registration Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configurar Meta</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.formContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
            >
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Peso Inicial (kg)</Text>
                <TextInput
                  style={styles.weightInput}
                  value={formData.startWeight}
                  onChangeText={(text) => setFormData(prev => ({...prev, startWeight: text}))}
                  placeholder={`${weightDetails.startWeight}`}
                  placeholderTextColor="#8a8a8a"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Peso Objetivo (kg)</Text>
                <TextInput
                  style={styles.weightInput}
                  value={formData.goalWeight}
                  onChangeText={(text) => setFormData(prev => ({...prev, goalWeight: text}))}
                  placeholder={`${weightDetails.goalWeight}`}
                  placeholderTextColor="#8a8a8a"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Peso Atual (kg)</Text>
                <TextInput
                  style={styles.weightInput}
                  value={formData.currentWeight}
                  onChangeText={(text) => setFormData(prev => ({...prev, currentWeight: text}))}
                  placeholder={`${weightDetails.currentWeight}`}
                  placeholderTextColor="#8a8a8a"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Data de Início</Text>
                <TextInput
                  style={styles.weightInput}
                  value={formData.startDate}
                  onChangeText={(text) => setFormData(prev => ({...prev, startDate: text}))}
                  placeholder={weightDetails.startDate}
                  placeholderTextColor="#8a8a8a"
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleSaveForm}
              >
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1c1c1c',
    justifyContent: 'center',
    alignItems: 'center',
  
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ECEDEE',
  },
  placeholder: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1c1c1c',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',

  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  lostWeight: {
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 11,
    color: '#8a8a8a',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressCard: {
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 20,
    marginBottom: 30,
    shadowColor: '#000',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  remainingText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    opacity: 1,
  },
  periodContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ECEDEE',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  periodButtonActive: {
    backgroundColor: '#D90000',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8a8a8a',
    textAlign: 'center',
  },
  periodTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  chartContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ECEDEE',
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D90000',
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#8a8a8a',
    fontWeight: '500',
  },
  chart: {
    backgroundColor: '#1c1c1c',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#8a8a8a',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#ECEDEE',
    fontWeight: '700',
  },
  weightLoss: {
    color: '#4CAF50',
  },
  addButton: {
    backgroundColor: '#D90000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0f0f0f',
    borderRadius: 24,
    padding: 0,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    marginBottom: 0,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 10,
  },
  weightInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: '#fff',
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#D90000',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
