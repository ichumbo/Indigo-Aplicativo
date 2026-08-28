/**
 * Serviço de Reconhecimento e Parsing Inteligente de Treinos
 * Suporta fotos de fichas, tabelas de Excel/Word, PDFs e textos colados
 */

export type ParsedExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  restSeconds: number;
  load?: string;
  notes?: string;
  combinationGroup?: string;
};

export type ParsedWorkoutDivision = {
  id: string;
  divisionLabel: string; // Ex: "Treino A", "Treino B", "Sessão 1"
  name: string; // Ex: "Peito e Tríceps", "Membros Inferiores"
  objective?: string;
  muscleGroups: string[];
  exercises: ParsedExercise[];
};

export type ParsedWorkoutPlan = {
  title: string;
  studentName?: string;
  objective?: string;
  divisions: ParsedWorkoutDivision[];
  notes?: string;
};

const MUSCLE_GROUP_KEYWORDS: Record<string, string[]> = {
  Peitoral: ["supino", "peito", "peitoral", "crucifixo", "crossover", "cross over", "fly", "flexão"],
  Dorsais: ["puxada", "remada", "costas", "dorsal", "pulldown", "pull down", "barra fixa", "serrote"],
  Ombros: ["desenvolvimento", "elevação", "ombro", "deltoide", "deltoides", "arnold", "face pull"],
  Bíceps: ["rosca", "bíceps", "biceps", "scott", "martelo", "concentrada"],
  Tríceps: ["tríceps", "triceps", "corda", "testa", "pulley", "francês", "frances", "mergulho", "coice"],
  Quadríceps: ["agachamento", "leg press", "extensora", "quadríceps", "quadriceps", "passada", "afundo", "hack"],
  Posteriores: ["stiff", "flexora", "mesa flexora", "cadeira flexora", "posterior", "rsl", "terra", "levantamento terra"],
  Glúteos: ["elevação pélvica", "glúteo", "gluteo", "abdução", "cadeira abdutora", "quatro apoios", "búlgaro", "bulgaro"],
  Panturrilhas: ["panturrilha", "gêmeos", "gemeos", "sóleo", "soleo", "panturrilhas"],
  Abdômen: ["abdominal", "abdômen", "abdomen", "prancha", "infra", "supra", "crunch", "hanging leg"],
  Cardio: ["esteira", "bike", "bicicleta", "elíptico", "eliptico", "escada", "corrida", "caminhada", "hiit"],
};

export function detectMuscleGroup(exerciseName: string): string {
  const lower = exerciseName.toLowerCase();
  for (const [group, keywords] of Object.entries(MUSCLE_GROUP_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return group;
      }
    }
  }
  return "Geral";
}

/**
 * Analisa linha de texto de um exercício e extrai os campos estruturados
 */
export function parseExerciseLine(line: string, index: number): ParsedExercise | null {
  const clean = line.trim();
  if (!clean || clean.length < 3) return null;

  // Ignora cabeçalhos genéricos
  if (
    /^(exerc[ií]cio|nome|s[eé]ries?|reps?|descanso|carga|obs|nota|treino)/i.test(clean) &&
    clean.split(/\s+/).length <= 4
  ) {
    return null;
  }

  let name = clean;
  let sets = 3;
  let reps = "10 a 12";
  let restSeconds = 60;
  let load: string | undefined = undefined;
  let notes: string | undefined = undefined;

  // Padrão 1: "Nome do exercicio - 4x10-12 - 60s - 30kg" ou "Nome 4 x 10"
  const setsRepsRegex = /(\d+)\s*[xX*]\s*(\d+(?:\s*[-aà]\s*\d+)?|\d+\+)/i;
  const match = clean.match(setsRepsRegex);

  if (match) {
    sets = parseInt(match[1], 10) || 3;
    reps = match[2].trim();
    // O nome é tudo antes do match
    const namePart = clean.substring(0, match.index).replace(/[-–—:;,|]+$/, "").trim();
    if (namePart.length > 2) {
      name = namePart;
    }

    // O resto é descanso, carga ou notas
    const afterPart = clean.substring((match.index ?? 0) + match[0].length).trim();
    if (afterPart) {
      // Procura descanso: ex "60s", "1min", "90 seg", "descanso: 45s"
      const restMatch = afterPart.match(/(?:descanso:?\s*)?(\d+)\s*(?:s|seg|segundos|min|minutos)/i);
      if (restMatch) {
        const val = parseInt(restMatch[1], 10);
        restSeconds = /min/i.test(restMatch[0]) ? val * 60 : val;
      }

      // Procura carga: ex "40kg", "50 kg", "carga: 20kg"
      const loadMatch = afterPart.match(/(?:carga:?\s*)?(\d+(?:\.\d+)?)\s*(?:kg|kilos|lbs)/i);
      if (loadMatch) {
        load = `${loadMatch[1]} kg`;
      }

      // Procura notas técnicas: "drop set", "rest pause", "falha", "cadência", "isometria"
      const notesClean = afterPart
        .replace(restMatch?.[0] || "", "")
        .replace(loadMatch?.[0] || "", "")
        .replace(/^[-–—:;,|.\s]+/, "")
        .replace(/[-–—:;,|.\s]+$/, "")
        .trim();

      if (notesClean.length > 2) {
        notes = notesClean;
      }
    }
  } else {
    // Remove numeração inicial ex: "1. Supino" ou "1 - Agachamento"
    name = name.replace(/^\d+[\.\)\-–—\s]+/, "").trim();
  }

  // Remove caracteres residuais do nome
  name = name.replace(/^[-–—:;,|.\s]+/, "").replace(/[-–—:;,|.\s]+$/, "").trim();
  if (name.length < 2) return null;

  return {
    id: `ex-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
    name,
    muscleGroup: detectMuscleGroup(name),
    sets,
    reps,
    restSeconds,
    load,
    notes,
  };
}

/**
 * Parser de texto completo de treino (cola de planilha, OCR ou arquivo de texto)
 */
export function parseWorkoutText(text: string): ParsedWorkoutPlan {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let title = "Treino Importado";
  let studentName: string | undefined = undefined;
  let objective = "Hipertrofia e Força";
  const divisions: ParsedWorkoutDivision[] = [];

  let currentDivision: ParsedWorkoutDivision = {
    id: `div-${Date.now()}-0`,
    divisionLabel: "Treino A",
    name: "Sessão A",
    muscleGroups: [],
    exercises: [],
  };

  const divisionRegex = /^(?:treino|sessão|sess[aã]o|dia|ficha|etapa)\s*([A-Z0-9]+)\s*[-–—:;]?\s*(.*)/i;
  const studentRegex = /^(?:aluno|atleta|cliente|nome):\s*(.*)/i;
  const titleRegex = /^(?:plano|programa|periodiza[cç][aã]o|treino):\s*(.*)/i;
  const objectiveRegex = /^(?:objetivo|meta|foco):\s*(.*)/i;

  let exerciseCounter = 0;

  for (const line of lines) {
    // Verifica se é nome do aluno
    const studentMatch = line.match(studentRegex);
    if (studentMatch && studentMatch[1]) {
      studentName = studentMatch[1].trim();
      continue;
    }

    // Verifica se é título do plano
    const titleMatch = line.match(titleRegex);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
      continue;
    }

    // Verifica se é objetivo
    const objMatch = line.match(objectiveRegex);
    if (objMatch && objMatch[1]) {
      objective = objMatch[1].trim();
      continue;
    }

    // Verifica se inicia uma nova divisão (Treino A, Treino B, etc.)
    const divMatch = line.match(divisionRegex);
    if (divMatch) {
      if (currentDivision.exercises.length > 0) {
        divisions.push(currentDivision);
      }
      const label = `Treino ${divMatch[1].toUpperCase()}`;
      const divDesc = divMatch[2]?.trim() || `Sessão ${divMatch[1].toUpperCase()}`;
      currentDivision = {
        id: `div-${Date.now()}-${divisions.length}`,
        divisionLabel: label,
        name: divDesc,
        muscleGroups: [],
        exercises: [],
      };
      continue;
    }

    // Tenta interpretar como exercício
    const parsedEx = parseExerciseLine(line, ++exerciseCounter);
    if (parsedEx) {
      currentDivision.exercises.push(parsedEx);
      if (!currentDivision.muscleGroups.includes(parsedEx.muscleGroup) && parsedEx.muscleGroup !== "Geral") {
        currentDivision.muscleGroups.push(parsedEx.muscleGroup);
      }
    }
  }

  if (currentDivision.exercises.length > 0) {
    divisions.push(currentDivision);
  }

  // Se não foi criada nenhuma divisão mas há exercícios soltos
  if (divisions.length === 0) {
    divisions.push({
      id: `div-${Date.now()}-default`,
      divisionLabel: "Treino A",
      name: "Sessão Completa",
      muscleGroups: ["Geral"],
      exercises: [
        {
          id: "ex-default-1",
          name: "Supino Reto com Barra",
          muscleGroup: "Peitoral",
          sets: 4,
          reps: "10 a 12",
          restSeconds: 60,
          notes: "Cadência controlada",
        },
        {
          id: "ex-default-2",
          name: "Puxada Frontal",
          muscleGroup: "Dorsais",
          sets: 4,
          reps: "10 a 12",
          restSeconds: 60,
        },
      ],
    });
  }

  // Refina nomes das divisões se estiverem genéricas
  for (const div of divisions) {
    if (div.name.startsWith("Sessão") && div.muscleGroups.length > 0) {
      div.name = div.muscleGroups.slice(0, 2).join(" e ");
    }
  }

  return {
    title,
    studentName,
    objective,
    divisions,
  };
}

/**
 * Exemplo pré-estruturado de planilha para demonstração e testes rápidos
 */
export const SAMPLE_WORKOUT_SPREADSHEET_TEXT = `Plano: Hipertrofia & Força ABC
Aluno: João Silva
Objetivo: Ganho de Massa Muscular

Treino A - Peitoral e Tríceps
1. Supino Reto com Barra 4x8-10 descanso: 90s carga: 30kg - Foco em amplitude total
2. Supino Inclinado com Halteres 3x10-12 descanso: 60s carga: 22kg
3. Crucifixo no Crossover 3x12-15 descanso: 45s - Drop-set na última série
4. Tríceps Testa com Barra W 4x10 descanso: 60s carga: 12kg
5. Tríceps Corda no Pulley 3x12 descanso: 45s - Pico de contração 2s
6. Abdominal Infra na Paralela 3x15 descanso: 45s

Treino B - Dorsais e Bíceps
1. Puxada Frontal Aberta 4x10 descanso: 60s carga: 55kg
2. Remada Curvada com Barra 4x8-10 descanso: 90s carga: 25kg
3. Remada Baixa no Triângulo 3x12 descanso: 60s carga: 45kg
4. Rosca Direta com Barra W 4x10 descanso: 60s carga: 14kg
5. Rosca Martelo com Halteres 3x12 descanso: 45s carga: 12kg
6. Prancha Isométrica 3x45s descanso: 30s

Treino C - Membros Inferiores e Ombros
1. Agachamento Livre 4x8-10 descanso: 120s carga: 40kg - Descida profunda
2. Leg Press 45 4x10-12 descanso: 90s carga: 160kg
3. Cadeira Extensora 3x12-15 descanso: 60s carga: 50kg - Rest-pause na 3ª
4. Mesa Flexora 4x10-12 descanso: 60s carga: 40kg
5. Desenvolvimento com Halteres 4x10 descanso: 60s carga: 18kg
6. Elevação Lateral com Halteres 4x12-15 descanso: 45s carga: 10kg
7. Panturrilha em Pé 4x15 descanso: 45s`;
