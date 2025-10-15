import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const weightData = [
  { date: '01/12', weight: 75.2 },
  { date: '08/12', weight: 74.8 },
  { date: '15/12', weight: 74.5 },
  { date: '22/12', weight: 74.1 },
  { date: '29/12', weight: 73.8 },
];

export default function WeightProgressScreen() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState('Mensal');
  
  const currentWeight = 73.8;
  const goalWeight = 72.0;
  const startWeight = 75.2;
  const weightLost = startWeight - currentWeight;
  const remainingWeight = currentWeight - goalWeight;
  const progressPercentage = ((startWeight - currentWeight) / (startWeight - goalWeight)) * 100;

  const periods = ['Semanal', 'Mensal', 'Anual'];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#7448ff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Progresso de Peso</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{currentWeight}kg</Text>
            <Text style={styles.statLabel}>Peso Atual</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{goalWeight}kg</Text>
            <Text style={styles.statLabel}>Meta</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.lostWeight]}>-{weightLost.toFixed(1)}kg</Text>
            <Text style={styles.statLabel}>Perdidos</Text>
          </View>
        </View>

        {/* Progress Card */}
        <LinearGradient
          colors={["#7448ff", "#7448ff"]}
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

        {/* Chart Placeholder */}
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
          
          {/* Simple Chart */}
          <View style={styles.chart}>
            <View style={styles.yAxis}>
              <Text style={styles.axisLabel}>76kg</Text>
              <Text style={styles.axisLabel}>75kg</Text>
              <Text style={styles.axisLabel}>74kg</Text>
              <Text style={styles.axisLabel}>73kg</Text>
            </View>
            <View style={styles.chartArea}>
              {weightData.map((data, index) => (
                <View key={index} style={styles.dataPoint}>
                  <View style={[
                    styles.point,
                    { bottom: ((data.weight - 72) / 4) * 120 }
                  ]} />
                  <Text style={styles.dateLabel}>{data.date}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Weight History */}
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>Registros Recentes</Text>
          {weightData.reverse().map((data, index) => (
            <View key={index} style={styles.historyItem}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyDate}>{data.date}</Text>
                <Text style={styles.historyWeight}>{data.weight}kg</Text>
              </View>
              <View style={styles.historyRight}>
                {index < weightData.length - 1 && (
                  <Text style={[
                    styles.historyChange,
                    data.weight < weightData[index + 1].weight ? styles.weightLoss : styles.weightGain
                  ]}>
                    {data.weight < weightData[index + 1].weight ? '-' : '+'}
                    {Math.abs(data.weight - weightData[index + 1].weight).toFixed(1)}kg
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Add Weight Button */}
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#000" />
          <Text style={styles.addButtonText}>Registrar Peso</Text>
        </TouchableOpacity>
      </ScrollView>
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
    backgroundColor: '#1c1629ff',
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
    backgroundColor: '#1c1629ff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  lostWeight: {
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  progressCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#000',
    borderRadius: 4,
  },
  remainingText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  periodContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ECEDEE',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#1c1629ff',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#7448ff',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  periodTextActive: {
    color: '#000',
  },
  chartContainer: {
    marginHorizontal: 20,
    backgroundColor: '#1c1629ff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#333',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7448ff',
  },
  legendText: {
    fontSize: 12,
    color: '#888',
  },
  chart: {
    flexDirection: 'row',
    height: 140,
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: 12,
    paddingVertical: 10,
  },
  axisLabel: {
    fontSize: 10,
    color: '#666',
  },
  chartArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    position: 'relative',
  },
  dataPoint: {
    alignItems: 'center',
    position: 'relative',
    height: 140,
  },
  point: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7448ff',
    position: 'absolute',
  },
  dateLabel: {
    fontSize: 10,
    color: '#666',
    position: 'absolute',
    bottom: -20,
  },
  historyContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1c1629ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  historyWeight: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  weightLoss: {
    color: '#4CAF50',
  },
  weightGain: {
    color: '#FF5722',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7448ff',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});