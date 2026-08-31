import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Platform,
  Share,
  Modal,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCurrentSession } from "@/hooks/use-current-session";
import { useAppTheme } from "@/hooks/use-app-theme";
import { shareDietAsPdf } from "@/services/student-diet-pdf-service";

interface MealItem {
  id: string;
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  items: string[];
  notes?: string;
}

interface DietPlan {
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  waterLiters: number;
  supplements: string[];
  notes: string;
  meals: MealItem[];
}

const DEFAULT_DIET_PLAN: DietPlan = {
  dailyCalories: 2400,
  proteinGrams: 160,
  carbsGrams: 280,
  fatsGrams: 65,
  waterLiters: 3.2,
  supplements: [
    "Creatina Monohidratada • 5g pós-treino com carboidrato",
    "Whey Protein Isolado / Concentrado • 30g no lanche da tarde",
    "Multivitamínico • 1 cápsula no café da manhã",
    "Ômega 3 • 2 cápsulas no almoço",
  ],
  notes: "Consumir no mínimo 3.2 litros de água por dia. Manter intervalo de 3h a 4h entre cada refeição.",
  meals: [
    {
      id: "m1",
      name: "Café da Manhã",
      time: "07:30",
      calories: 460,
      protein: 32,
      carbs: 55,
      fats: 12,
      items: [
        "3 ovos mexidos (ou 2 inteiros + 2 claras)",
        "50g de aveia em flocos finos",
        "1 banana média fatiada",
        "200ml de café preto ou chá sem açúcar",
      ],
      notes: "Adicionar canela em pó na aveia a gosto.",
    },
    {
      id: "m2",
      name: "Almoço",
      time: "12:30",
      calories: 720,
      protein: 48,
      carbs: 85,
      fats: 18,
      items: [
        "150g de filé de peito de frango grelhado ou patinho moído",
        "180g de arroz integral ou batata doce assada",
        "100g de feijão preto ou carioca",
        "Salada de folhas verdes à vontade + tomate",
        "1 colher de sobremesa de azeite de oliva extra virgem",
      ],
      notes: "Evitar frituras e temperos ultraprocessados.",
    },
    {
      id: "m3",
      name: "Lanche / Pré-Treino",
      time: "16:00",
      calories: 420,
      protein: 35,
      carbs: 50,
      fats: 8,
      items: [
        "30g de Whey Protein batido com água ou leite desnatado",
        "1 maçã média ou 150g de mamão papaia",
        "30g de pasta de amendoim integral",
        "2 fatias de pão 100% integral",
      ],
      notes: "Consumir de 60 a 90 minutos antes do treino de musculação.",
    },
    {
      id: "m4",
      name: "Jantar / Pós-Treino",
      time: "20:00",
      calories: 600,
      protein: 42,
      carbs: 70,
      fats: 15,
      items: [
        "150g de tilápia grelhada, salmão ou frango desfiado",
        "160g de mandioca cozida ou arroz branco",
        "Brócolis, cenoura e abobrinha cozidos no vapor",
        "1 colher de sobremesa de azeite de oliva",
      ],
    },
    {
      id: "m5",
      name: "Ceia",
      time: "22:30",
      calories: 200,
      protein: 15,
      carbs: 12,
      fats: 9,
      items: [
        "1 pote (160g) de iogurte natural desnatado",
        "15g de castanhas de caju ou nozes",
        "Chá de camomila ou erva-doce sem açúcar",
      ],
    },
  ],
};

export default function StudentDietScreen() {
  const insets = useSafeAreaInsets();
  const topInset = insets.top > 0 ? insets.top + 6 : (Platform.OS === "ios" ? 48 : 16);
  const params = useLocalSearchParams<{ studentId?: string; studentName?: string }>();
  const { session } = useCurrentSession();
  const { theme, isDark } = useAppTheme();
  const isTrainer = session?.user.role === "TRAINER";

  const storageKey = `@dragoncorp_student_diet_${params.studentId || "default"}`;
  const [diet, setDiet] = useState<DietPlan>(DEFAULT_DIET_PLAN);
  const [editingModal, setEditingModal] = useState(false);
  const [newMealModal, setNewMealModal] = useState(false);
  const [newMealName, setNewMealName] = useState("");
  const [newMealTime, setNewMealTime] = useState("");
  const [newMealItems, setNewMealItems] = useState("");
  const [waterDrunk, setWaterDrunk] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          setDiet(JSON.parse(saved));
        }
      } catch {}
    })();
  }, [storageKey]);

  const saveDiet = async (updated: DietPlan) => {
    setDiet(updated);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  };

  const handleShareDiet = async () => {
    Alert.alert(
      "Compartilhar Dieta",
      "Como deseja compartilhar o plano alimentar?",
      [
        {
          text: "Gerar PDF Oficial",
          onPress: () => {
            void shareDietAsPdf({
              trainerId: session?.user.id,
              studentName: params.studentName || "Aluno",
              dailyCalories: diet.dailyCalories,
              proteinGrams: diet.proteinGrams,
              carbsGrams: diet.carbsGrams,
              fatsGrams: diet.fatsGrams,
              waterLiters: diet.waterLiters,
              supplements: diet.supplements,
              notes: diet.notes,
              meals: diet.meals.map((m) => ({
                name: m.name,
                time: m.time,
                calories: m.calories,
                items: m.items,
                notes: m.notes,
              })),
            });
          },
        },
        {
          text: "Enviar no WhatsApp",
          onPress: async () => {
            const studentTitle = params.studentName ? ` para ${params.studentName}` : "";
            let message = `*PLANO ALIMENTAR & DIETA${studentTitle.toUpperCase()}*\n\n`;
            message += `*Metas Diárias:*\n• Calorias: ${diet.dailyCalories} kcal\n• Proteínas: ${diet.proteinGrams}g\n• Carboidratos: ${diet.carbsGrams}g\n• Gorduras: ${diet.fatsGrams}g\n• Água: ${diet.waterLiters}L/dia\n\n`;
            message += `*Refeições:*\n`;

            diet.meals.forEach((m) => {
              message += `\n*${m.name} (${m.time})* - ~${m.calories} kcal\n`;
              m.items.forEach((item) => {
                message += `  • ${item}\n`;
              });
              if (m.notes) message += `  _Obs: ${m.notes}_\n`;
            });

            if (diet.supplements && diet.supplements.length > 0) {
              message += `\n*Suplementação Prescrita:*\n`;
              diet.supplements.forEach((s) => {
                message += `• ${s}\n`;
              });
            }

            try {
              await Share.share({ message });
            } catch {}
          },
        },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  const handleAddMeal = () => {
    if (!newMealName.trim()) {
      Alert.alert("Atenção", "Informe o nome da refeição.");
      return;
    }
    const itemsArray = newMealItems
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const newMeal: MealItem = {
      id: `m_${Date.now()}`,
      name: newMealName.trim(),
      time: newMealTime.trim() || "12:00",
      calories: 400,
      protein: 25,
      carbs: 45,
      fats: 10,
      items: itemsArray.length > 0 ? itemsArray : ["Alimento sugerido a definir"],
    };

    const updated = { ...diet, meals: [...diet.meals, newMeal] };
    saveDiet(updated);
    setNewMealModal(false);
    setNewMealName("");
    setNewMealTime("");
    setNewMealItems("");
    Alert.alert("Sucesso", "Refeição adicionada ao plano alimentar!");
  };

  const handleDeleteMeal = (mealId: string) => {
    Alert.alert("Remover Refeição", "Deseja realmente remover esta refeição?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          const updated = {
            ...diet,
            meals: diet.meals.filter((m) => m.id !== mealId),
          };
          saveDiet(updated);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: topInset, borderBottomColor: theme.divider }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
          onPress={() => router.back()}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Plano Alimentar</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
            {params.studentName || "Aluno"} • Nutrição e Refeições
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
            onPress={handleShareDiet}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Compartilhar"
          >
            <Ionicons name="share-social-outline" size={18} color="#D90000" />
          </TouchableOpacity>

          {isTrainer && (
            <TouchableOpacity
              style={[styles.headerAddBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.cardBorder }]}
              onPress={() => setNewMealModal(true)}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Adicionar Refeição"
            >
              <Ionicons name="add" size={20} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO MACROS CARD */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroPreTitle}>META DIÁRIA CALCULADA</Text>
              <Text style={styles.heroCalories}>{diet.dailyCalories} <Text style={styles.heroCaloriesUnit}>Kcal / dia</Text></Text>
            </View>
            <View style={styles.heroIconBox}>
              <Ionicons name="nutrition" size={24} color="#D90000" />
            </View>
          </View>

          <View style={styles.macroGrid}>
            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>{diet.proteinGrams}g</Text>
              <Text style={styles.macroLabel}>Proteínas</Text>
              <View style={[styles.macroBar, { backgroundColor: "#D90000" }]} />
            </View>

            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>{diet.carbsGrams}g</Text>
              <Text style={styles.macroLabel}>Carboidratos</Text>
              <View style={[styles.macroBar, { backgroundColor: "#3B82F6" }]} />
            </View>

            <View style={styles.macroBox}>
              <Text style={styles.macroValue}>{diet.fatsGrams}g</Text>
              <Text style={styles.macroLabel}>Gorduras</Text>
              <View style={[styles.macroBar, { backgroundColor: "#EAB308" }]} />
            </View>
          </View>
        </View>

        {/* WATER TRACKER CARD */}
        <View style={styles.waterCard}>
          <View style={styles.waterHeader}>
            <View style={styles.waterIconBox}>
              <Ionicons name="water" size={20} color="#38BDF8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.waterTitle}>Meta de Hidratação</Text>
              <Text style={styles.waterSubtitle}>Recomendado: {diet.waterLiters}L por dia</Text>
            </View>
            <TouchableOpacity
              style={styles.waterAddBtn}
              onPress={() => setWaterDrunk((prev) => Math.min(prev + 0.5, diet.waterLiters + 1))}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.waterAddBtnText}>+500ml</Text>
            </TouchableOpacity>
          </View>
          {waterDrunk > 0 && (
            <View style={styles.waterProgressWrap}>
              <Text style={styles.waterProgressText}>
                Registrado hoje: {waterDrunk.toFixed(1)}L / {diet.waterLiters}L
              </Text>
            </View>
          )}
        </View>

        {/* MEALS SECTION HEADER */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Refeições Prescritas</Text>
          <Text style={styles.sectionCount}>{diet.meals.length} refeições</Text>
        </View>

        {/* MEALS LIST */}
        <View style={styles.mealsList}>
          {diet.meals.map((meal, index) => (
            <View key={meal.id} style={styles.mealCard}>
              <View style={styles.mealCardTop}>
                <View style={styles.mealIndexBadge}>
                  <Text style={styles.mealIndexText}>#{index + 1}</Text>
                </View>
                <View style={styles.mealTitleBlock}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <View style={styles.mealTimeRow}>
                    <Ionicons name="time-outline" size={13} color="#888888" />
                    <Text style={styles.mealTimeText}>{meal.time}</Text>
                    <Text style={styles.mealCalText}>• ~{meal.calories} kcal</Text>
                  </View>
                </View>

                {isTrainer && (
                  <TouchableOpacity
                    style={styles.mealDeleteBtn}
                    onPress={() => handleDeleteMeal(meal.id)}
                    activeOpacity={0.8}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={16} color="#888888" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.mealDivider} />

              <View style={styles.mealItemsList}>
                {meal.items.map((item, itemIdx) => (
                  <View key={itemIdx} style={styles.mealItemRow}>
                    <View style={styles.mealItemBullet} />
                    <Text style={styles.mealItemText}>{item}</Text>
                  </View>
                ))}
              </View>

              {!!meal.notes && (
                <View style={styles.mealNotesBox}>
                  <Ionicons name="bulb-outline" size={14} color="#D90000" />
                  <Text style={styles.mealNotesText}>{meal.notes}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* SUPPLEMENTATION CARD */}
        <View style={styles.supplementsCard}>
          <View style={styles.supplementsHeader}>
            <Ionicons name="medkit-outline" size={20} color="#D90000" />
            <Text style={styles.supplementsTitle}>Suplementação Recomendada</Text>
          </View>
          <View style={styles.supplementsList}>
            {diet.supplements.map((supp, sIdx) => (
              <View key={sIdx} style={styles.supplementItemRow}>
                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                <Text style={styles.supplementText}>{supp}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* FOOTER SHARE CTA */}
        <TouchableOpacity style={styles.bottomShareBtn} onPress={handleShareDiet} activeOpacity={0.85}>
          <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
          <Text style={styles.bottomShareBtnText}>Enviar Dieta via WhatsApp</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL: ADD MEAL */}
      <Modal visible={newMealModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar Refeição</Text>
              <TouchableOpacity onPress={() => setNewMealModal(false)}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Nome da Refeição</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Lanche da Manhã"
              placeholderTextColor="#666666"
              value={newMealName}
              onChangeText={setNewMealName}
            />

            <Text style={styles.fieldLabel}>Horário Sugerido</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 10:00"
              placeholderTextColor="#666666"
              value={newMealTime}
              onChangeText={setNewMealTime}
            />

            <Text style={styles.fieldLabel}>Alimentos (1 por linha)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              placeholder="Ex: 1 maçã&#10;30g de castanhas&#10;1 scoop de Whey"
              placeholderTextColor="#666666"
              multiline
              numberOfLines={4}
              value={newMealItems}
              onChangeText={setNewMealItems}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setNewMealModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleAddMeal}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSaveBtnText}>Salvar Refeição</Text>
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
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#202020",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#303030",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#303030",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#303030",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 16,
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: "#181818",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 16,
    gap: 16,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroPreTitle: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  heroCalories: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 2,
  },
  heroCaloriesUnit: {
    fontSize: 14,
    color: "#888888",
    fontWeight: "600",
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#241414",
    borderWidth: 1,
    borderColor: "#3D1C1C",
    alignItems: "center",
    justifyContent: "center",
  },
  macroGrid: {
    flexDirection: "row",
    gap: 10,
  },
  macroBox: {
    flex: 1,
    backgroundColor: "#121212",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 10,
    alignItems: "center",
    gap: 3,
  },
  macroValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  macroLabel: {
    color: "#888888",
    fontSize: 10.5,
    fontWeight: "700",
  },
  macroBar: {
    width: 24,
    height: 3,
    borderRadius: 2,
    marginTop: 4,
  },

  /* Water Card */
  waterCard: {
    backgroundColor: "#141C24",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1C3044",
    padding: 14,
    gap: 10,
  },
  waterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  waterIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#122536",
    alignItems: "center",
    justifyContent: "center",
  },
  waterTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
  waterSubtitle: {
    color: "#7DD3FC",
    fontSize: 11.5,
    marginTop: 1,
  },
  waterAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0284C7",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  waterAddBtnText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "800",
  },
  waterProgressWrap: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#1E3A54",
  },
  waterProgressText: {
    color: "#BAE6FD",
    fontSize: 11.5,
    fontWeight: "700",
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  sectionCount: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
  },

  /* Meals */
  mealsList: {
    gap: 12,
  },
  mealCard: {
    backgroundColor: "#181818",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 14,
    gap: 10,
  },
  mealCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mealIndexBadge: {
    backgroundColor: "#241414",
    borderWidth: 1,
    borderColor: "#3D1C1C",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mealIndexText: {
    color: "#D90000",
    fontSize: 11,
    fontWeight: "900",
  },
  mealTitleBlock: {
    flex: 1,
  },
  mealName: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "900",
  },
  mealTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  mealTimeText: {
    color: "#888888",
    fontSize: 11.5,
    fontWeight: "600",
  },
  mealCalText: {
    color: "#AAAAAA",
    fontSize: 11.5,
    fontWeight: "600",
  },
  mealDeleteBtn: {
    padding: 6,
  },
  mealDivider: {
    height: 1,
    backgroundColor: "#222222",
  },
  mealItemsList: {
    gap: 7,
  },
  mealItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  mealItemBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#D90000",
    marginTop: 6,
  },
  mealItemText: {
    color: "#CCCCCC",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  mealNotesBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#141414",
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  mealNotesText: {
    color: "#999999",
    fontSize: 11.5,
    fontStyle: "italic",
    flex: 1,
  },

  /* Supplements Card */
  supplementsCard: {
    backgroundColor: "#181818",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 14,
    gap: 12,
  },
  supplementsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  supplementsTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  supplementsList: {
    gap: 8,
  },
  supplementItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  supplementText: {
    color: "#CCCCCC",
    fontSize: 12.5,
    flex: 1,
  },

  /* Bottom Share Button */
  bottomShareBtn: {
    backgroundColor: "#25D366",
    borderRadius: 14,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  bottomShareBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#181818",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "#282828",
    padding: 20,
    gap: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  fieldLabel: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "700",
  },
  modalInput: {
    backgroundColor: "#121212",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#282828",
    color: "#FFFFFF",
    fontSize: 13.5,
    paddingHorizontal: 12,
    height: 42,
  },
  modalTextarea: {
    height: 85,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#242424",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    color: "#CCCCCC",
    fontSize: 13,
    fontWeight: "800",
  },
  modalSaveBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#D90000",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
});
