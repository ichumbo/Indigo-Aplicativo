import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExerciseSource = 'system' | 'custom';

export type ExerciseItem = {
  id: string;
  name: string;
  category: string; // Grupo primário (ex: "Abs & Core", "Membros Inferiores", "Peito", "Costas", "Mobilidade", etc.)
  muscleGroups: string[]; // Grupos envolvidos (ex: ["Abs & Core", "Membros Inferiores"])
  tags: string[]; // Tags visuais (ex: ["Abs&Core", "Elástico", "Fazer em Casa", "Pessoas", "3D", "Peso Corporal"])
  thumbnailUrl?: string; // URL da imagem ou miniatura de vídeo
  videoUrl?: string; // Link web / YouTube / Vimeo / MP4
  localVideoUri?: string; // URI local de vídeo selecionado da galeria
  videoFileSizeMB?: number; // Tamanho do vídeo em MB
  description?: string; // Descrição curta
  instructions?: string; // Passo a passo de execução
  commonErrors?: string[]; // Erros comuns a evitar
  isSystem: boolean; // true para sistema, false para personalizado
  trainerId?: string; // dono do exercicio personalizado (isolamento entre treinadores); ausente = visivel para todos (dados legados/demo)
  createdAt?: string;
  updatedAt?: string;
};

export const MUSCLE_GROUPS = [
  'Todos',
  'Abs & Core',
  'Membros Inferiores',
  'Glúteos',
  'Peito',
  'Costas',
  'Ombros',
  'Braços',
  'Mobilidade',
  'Cardio & Funcional',
] as const;

export const AVAILABLE_TAGS = [
  'Abs&Core',
  '3D',
  'Pessoas',
  'Fazer em Casa',
  'Peso Corporal',
  'Elástico',
  'Halter',
  'Barra',
  'Polia',
  'Máquina',
  'Kettlebell',
  'Cardio',
  'Mobilidade',
  'Funcional',
  'Membros Inferiores',
  'Membros Superiores',
  'Peito',
  'Costas',
  'Ombros',
  'Braços',
  'Glúteos',
  'Alongamento',
  'Força',
  'Hipertrofia',
  'Pliometria',
];

const CUSTOM_EXERCISES_STORAGE_KEY = '@dragoncorp:custom_exercises_v2';

export const SYSTEM_EXERCISES: ExerciseItem[] = [
  // --- ABS & CORE ---
  {
    id: 'sys-abs-1',
    name: 'Abdominal abre e fecha com elástico',
    category: 'Abs & Core',
    muscleGroups: ['Abs & Core', 'Membros Inferiores'],
    tags: ['Abs&Core', 'Elástico', 'Fazer em Casa', 'Pessoas'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    videoUrl: 'https://www.youtube.com/watch?v=TU8QYVW0gDU',
    description: 'Trabalho de fortalecimento do reto abdominal e flexores do quadril com resistência de elástico.',
    instructions: 'Deite-se em decúbito dorsal, posicione a mini band nos pés. Eleve as pernas e realize a abdução e adução mantendo o abdômen tensionado e a lombar apoiada.',
    isSystem: true,
  },
  {
    id: 'sys-abs-2',
    name: 'Abdominal Avançado na Rodinha',
    category: 'Abs & Core',
    muscleGroups: ['Abs & Core', 'Costas'],
    tags: ['3D', 'Abs&Core', 'Fazer em Casa', 'Peso Corporal'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Ab_Roller/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=rqiTPD7jxkg',
    description: 'Exercício de extensão e anti-extensão do tronco de alta intensidade com rodinha abdominal.',
    instructions: 'Ajoelhe-se sobre um colchonete, segure a roda com ambas as mãos. Role para a frente controlando o movimento pela força do core sem arquear a lombar, e retorne puxando com o abdômen.',
    isSystem: true,
  },
  {
    id: 'sys-abs-3',
    name: 'Abdominal Bicicleta',
    category: 'Abs & Core',
    muscleGroups: ['Abs & Core'],
    tags: ['Abs&Core', 'Fazer em Casa', 'Peso Corporal', 'Pessoas'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400',
    videoUrl: 'https://www.youtube.com/watch?v=9FGilxCbdz8',
    description: 'Ativação intensa dos oblíquos e reto abdominal com movimento coordenado alternado.',
    instructions: 'Deitado de costas, mãos atrás da cabeça. Aproxime o cotovelo direito do joelho esquerdo enquanto estende a perna direita. Alterne de forma contínua e controlada.',
    isSystem: true,
  },
  {
    id: 'sys-abs-4',
    name: 'Abdominal Bicicleta Alternando Braços e Pernas',
    category: 'Abs & Core',
    muscleGroups: ['Abs & Core', 'Membros Inferiores'],
    tags: ['3D', 'Abs&Core', 'Fazer em Casa', 'Peso Corporal'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Air_Bike/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=9FGilxCbdz8',
    description: 'Variação tridimensional com ênfase na rotação de tronco e estabilização pélvica.',
    instructions: 'Mantenha o ritmo dinâmico mantendo o queixo longe do peito e o abdômen contraído em todo o percurso.',
    isSystem: true,
  },
  {
    id: 'sys-abs-5',
    name: 'Abdominal Canivete',
    category: 'Abs & Core',
    muscleGroups: ['Abs & Core'],
    tags: ['Abs&Core', 'Fazer em Casa', 'Peso Corporal', 'Pessoas'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
    videoUrl: 'https://www.youtube.com/watch?v=7h3o3Oskn54',
    description: 'Flexão simultânea de tronco e quadril (V-Up), atingindo porção superior e inferior do abdômen.',
    instructions: 'Inicie deitado com braços e pernas estendidos. Eleve o tronco e as pernas ao mesmo tempo até que as mãos toquem as canelas/pés, formando um "V".',
    isSystem: true,
  },
  {
    id: 'sys-abs-6',
    name: 'Prancha Frontal Isométrica',
    category: 'Abs & Core',
    muscleGroups: ['Abs & Core', 'Ombros'],
    tags: ['Abs&Core', 'Peso Corporal', 'Fazer em Casa', 'Funcional'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Plank/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=ASdvN_XEl_c',
    description: 'Exercício isométrico base para estabilidade lombo-pélvica e fortalecimento do transverso abdominal.',
    instructions: 'Apoie antebraços e pontas dos pés no chão. Alinhe cabeça, coluna e quadril. Mantenha glúteos e abdômen firmemente contraídos sem deixar o quadril cair.',
    isSystem: true,
  },

  // --- MEMBROS INFERIORES & GLÚTEOS ---
  {
    id: 'sys-leg-1',
    name: 'Agachamento Livre com Barra (Back Squat)',
    category: 'Membros Inferiores',
    muscleGroups: ['Membros Inferiores', 'Glúteos'],
    tags: ['Membros Inferiores', 'Barra', 'Força', 'Glúteos'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8',
    description: 'Exercício composto rei do treino de pernas. Fortalece quadríceps, glúteos e eretores da espinha.',
    instructions: 'Apoie a barra nos trapézios, pés na largura dos ombros com pontas ligeiramente para fora. Desça flexionando quadris e joelhos até passar de 90 graus mantendo peito aberto.',
    isSystem: true,
  },
  {
    id: 'sys-leg-2',
    name: 'Leg Press 45º',
    category: 'Membros Inferiores',
    muscleGroups: ['Membros Inferiores', 'Glúteos'],
    tags: ['Membros Inferiores', 'Máquina', 'Força'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ',
    description: 'Sobrecarga guiada e segura para desenvolvimento de força e hipertrofia de membros inferiores.',
    instructions: 'Posicione os pés na plataforma na largura do quadril. Destrave a máquina e desça até 90 graus sem descolar a lombar do encosto. Empurre com os calcanhares.',
    isSystem: true,
  },
  {
    id: 'sys-leg-3',
    name: 'Elevação Pélvica com Barra (Hip Thrust)',
    category: 'Glúteos',
    muscleGroups: ['Glúteos', 'Membros Inferiores'],
    tags: ['Glúteos', 'Barra', 'Força', 'Membros Inferiores'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Glute_Bridge/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=SEdqd1n01g4',
    description: 'Movimento com máxima ativação do glúteo máximo através da extensão do quadril.',
    instructions: 'Apoie as escápulas em um banco fixo com a barra acolchoada sobre o quadril. Eleve a pelve até alinhar coxas e tronco, contraindo fortemente os glúteos no topo.',
    isSystem: true,
  },
  {
    id: 'sys-leg-4',
    name: 'Levantamento Terra (Deadlift)',
    category: 'Membros Inferiores',
    muscleGroups: ['Membros Inferiores', 'Costas', 'Glúteos'],
    tags: ['Força', 'Barra', 'Costas', 'Membros Inferiores', 'Glúteos'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q',
    description: 'Levantamento de carga máxima trabalhando cadeia posterior: isquiotibiais, glúteos, lombar e trapézio.',
    instructions: 'Pés alinhados com o quadril, barra próxima às canelas. Pegue a barra com as mãos firmes, peito aberto e coluna neutra. Suba estendendo joelhos e quadris sincronizadamente.',
    isSystem: true,
  },
  {
    id: 'sys-leg-5',
    name: 'Afundo / Passada com Halteres',
    category: 'Membros Inferiores',
    muscleGroups: ['Membros Inferiores', 'Glúteos'],
    tags: ['Membros Inferiores', 'Halter', 'Funcional', 'Glúteos'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lunge/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=D7KaRcUTQeE',
    description: 'Exercício unilateral essencial para equilíbrio muscular, coordenação e hipertrofia de coxas e glúteos.',
    instructions: 'Dê um passo largo à frente e desça até que ambos os joelhos formem aproximadamente 90 graus. Empurre pelo calcanhar da perna da frente para retornar.',
    isSystem: true,
  },
  {
    id: 'sys-leg-6',
    name: 'Cadeira Extensora',
    category: 'Membros Inferiores',
    muscleGroups: ['Membros Inferiores'],
    tags: ['Membros Inferiores', 'Máquina', 'Hipertrofia'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Extensions/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=YyvSfVjQeL0',
    description: 'Isolamento completo do quadríceps com tensão contínua em toda a extensão do joelho.',
    instructions: 'Ajuste o encosto e o rolo acima dos tornozelos. Estenda os joelhos até o topo com controle e desça sem deixar o peso bater.',
    isSystem: true,
  },

  // --- PEITO & MEMBROS SUPERIORES ---
  {
    id: 'sys-chest-1',
    name: 'Supino Reto com Barra',
    category: 'Peito',
    muscleGroups: ['Peito', 'Ombros', 'Braços'],
    tags: ['Peito', 'Membros Superiores', 'Barra', 'Força'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
    description: 'Principal movimento composto de empurrar horizontal para desenvolvimento peitoral e tríceps.',
    instructions: 'Deite-se no banco, pegada um pouco mais larga que os ombros, pés firmes no chão. Desça a barra controladamente até o peito e empurre estendendo os cotovelos.',
    isSystem: true,
  },
  {
    id: 'sys-chest-2',
    name: 'Supino Inclinado com Halteres',
    category: 'Peito',
    muscleGroups: ['Peito', 'Ombros'],
    tags: ['Peito', 'Membros Superiores', 'Halter'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Press/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=8iPEnn-ltC8',
    description: 'Foco na porção clavicular (superior) do peitoral maior com maior amplitude articular.',
    instructions: 'Banco regulado entre 30 e 45 graus. Eleve os halteres convergindo no topo sem bater os pesos, descendo até sentir alongamento do peitoral.',
    isSystem: true,
  },
  {
    id: 'sys-chest-3',
    name: 'Flexão de Braço (Push-up)',
    category: 'Peito',
    muscleGroups: ['Peito', 'Abs & Core', 'Braços'],
    tags: ['Peito', 'Peso Corporal', 'Fazer em Casa', 'Funcional'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pushups/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    description: 'Exercício calistênico fundamental para força de empurrar e sustentação de core.',
    instructions: 'Mãos no chão afastadas na largura dos ombros, corpo em linha reta. Desça o peito próximo ao solo e empurre mantendo a prancha estável.',
    isSystem: true,
  },

  // --- COSTAS & DORSAIS ---
  {
    id: 'sys-back-1',
    name: 'Barra Fixa (Pull-up)',
    category: 'Costas',
    muscleGroups: ['Costas', 'Braços'],
    tags: ['Costas', 'Membros Superiores', 'Peso Corporal', 'Força'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
    description: 'Tração vertical que constrói grande largura dorsal e força na pegada e nos bíceps.',
    instructions: 'Pegada pronada aberta na barra fixa. Inicie o movimento retraindo as escápulas e puxe o corpo até o queixo ultrapassar a barra.',
    isSystem: true,
  },
  {
    id: 'sys-back-2',
    name: 'Puxada Alta no Pulley (Lat Pulldown)',
    category: 'Costas',
    muscleGroups: ['Costas', 'Braços'],
    tags: ['Costas', 'Membros Superiores', 'Máquina', 'Polia'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Front_Lat_Pulldown/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc',
    description: 'Excelente construtor dorsal com ajuste preciso de carga para todos os níveis.',
    instructions: 'Sentado com as coxas fixas sob os apoios, puxe a barra em direção à parte superior do peitoral inclinando levemente o tronco para trás.',
    isSystem: true,
  },
  {
    id: 'sys-back-3',
    name: 'Remada Curvada com Barra',
    category: 'Costas',
    muscleGroups: ['Costas', 'Braços'],
    tags: ['Costas', 'Membros Superiores', 'Barra', 'Força'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=9efgc2WgMo4',
    description: 'Remada composta para espessura das costas, trabalhando romboides, latíssimo e trapézio.',
    instructions: 'Tronco inclinado a 45 graus, coluna neutra. Puxe a barra em direção ao umbigo contraindo fortemente as costas.',
    isSystem: true,
  },

  // --- OMBROS & BRAÇOS ---
  {
    id: 'sys-shoulder-1',
    name: 'Desenvolvimento com Halteres',
    category: 'Ombros',
    muscleGroups: ['Ombros', 'Braços'],
    tags: ['Ombros', 'Membros Superiores', 'Halter', 'Força'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shoulder_Press/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=qEwKCR5JCog',
    description: 'Empurrar vertical essencial para força e volume do deltoide anterior e lateral.',
    instructions: 'Sentado com as costas apoiadas, empurre os halteres para cima até quase estender os braços, descendo até a altura das orelhas.',
    isSystem: true,
  },
  {
    id: 'sys-shoulder-2',
    name: 'Elevação Lateral com Halteres',
    category: 'Ombros',
    muscleGroups: ['Ombros'],
    tags: ['Ombros', 'Membros Superiores', 'Halter'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo',
    description: 'Isolamento do deltoide lateral para construção do aspecto em "V" do tronco.',
    instructions: 'Em pé, cotovelos levemente flexionados. Eleve os halteres lateralmente até a altura dos ombros e desça de forma controlada.',
    isSystem: true,
  },
  {
    id: 'sys-arm-1',
    name: 'Rosca Direta com Barra W',
    category: 'Braços',
    muscleGroups: ['Braços'],
    tags: ['Braços', 'Membros Superiores', 'Barra'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/EZ-Bar_Curl/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=kwG2ipFRgfo',
    description: 'Exercício clássico para pico e densidade do bíceps braquial.',
    instructions: 'Mantenha os cotovelos colados ao lado do corpo, flexione os braços levantando a barra sem balancear o tronco.',
    isSystem: true,
  },
  {
    id: 'sys-arm-2',
    name: 'Tríceps Corda na Polia',
    category: 'Braços',
    muscleGroups: ['Braços'],
    tags: ['Braços', 'Membros Superiores', 'Polia'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown_-_Rope_Attachment/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=vB5OHsJ3EME',
    description: 'Foco na cabeça lateral do tríceps com abertura final da corda para máxima contração.',
    instructions: 'Empurre a corda para baixo estendendo os cotovelos e afaste as pontas da corda no final da descida.',
    isSystem: true,
  },

  // --- MOBILIDADE & ALONGAMENTO ---
  {
    id: 'sys-mob-1',
    name: 'Alongamento Peitoral no Solo',
    category: 'Mobilidade',
    muscleGroups: ['Mobilidade', 'Peito', 'Ombros'],
    tags: ['Mobilidade', 'Fazer em Casa', 'Alongamento'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400',
    videoUrl: 'https://www.youtube.com/watch?v=YQmpO9VT2X4',
    description: 'Abertura da cintura escapular e descompressão do peitoral menor e deltoide anterior.',
    instructions: 'Deitado de barriga para baixo, braço estendido a 90 graus. Gire o tronco lentamente para o lado oposto sentindo o peitoral alongar.',
    isSystem: true,
  },
  {
    id: 'sys-mob-2',
    name: 'Alongamento de Adutores',
    category: 'Mobilidade',
    muscleGroups: ['Mobilidade', 'Membros Inferiores'],
    tags: ['Mobilidade', 'Fazer em Casa', 'Alongamento'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
    videoUrl: 'https://www.youtube.com/watch?v=YQmpO9VT2X4',
    description: 'Alongamento da musculatura interna da coxa, prevenindo lesões e melhorando a amplitude do agachamento.',
    instructions: 'Sentado com pernas afastadas ou postura borboleta, incline o tronco para a frente com a coluna ereta até sentir tração nos adutores.',
    isSystem: true,
  },
  {
    id: 'sys-mob-3',
    name: 'Alongamento Glúteo Sentado (Figura 4)',
    category: 'Mobilidade',
    muscleGroups: ['Mobilidade', 'Glúteos'],
    tags: ['Mobilidade', 'Fazer em Casa', 'Glúteos'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    videoUrl: 'https://www.youtube.com/watch?v=YQmpO9VT2X4',
    description: 'Alívio da tensão no piriforme e glúteo médio, prevenindo dores no ciático.',
    instructions: 'Cruze um tornozelo sobre o joelho oposto e incline suavemente o tronco para frente mantendo o peito erguido.',
    isSystem: true,
  },

  // --- CARDIO & FUNCIONAL ---
  {
    id: 'sys-cardio-1',
    name: 'Burpees',
    category: 'Cardio & Funcional',
    muscleGroups: ['Cardio & Funcional', 'Peito', 'Membros Inferiores', 'Abs & Core'],
    tags: ['Cardio', 'Funcional', 'Peso Corporal', 'Fazer em Casa'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=400',
    videoUrl: 'https://www.youtube.com/watch?v=TU8QYVW0gDU',
    description: 'Movimento pliométrico e cardiovascular completo de corpo inteiro.',
    instructions: 'Agache, jogue os pés para trás em prancha, toque o peito no solo, retorne os pés e salte com os braços para cima.',
    isSystem: true,
  },
  {
    id: 'sys-cardio-2',
    name: 'Double Under (Pular Corda)',
    category: 'Cardio & Funcional',
    muscleGroups: ['Cardio & Funcional', 'Membros Inferiores'],
    tags: ['Cardio', 'Funcional', 'Pliometria'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Fast_Skipping/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=hCuXYrTOMxI',
    description: 'Exercício aeróbico de alta coordenação e agilidade com giro duplo da corda por salto.',
    instructions: 'Salte com os pés juntos de forma elástica enquanto gira os punhos rapidamente duas vezes antes de aterrissar.',
    isSystem: true,
  },
  {
    id: 'sys-cardio-3',
    name: 'Kettlebell Swing',
    category: 'Cardio & Funcional',
    muscleGroups: ['Cardio & Funcional', 'Glúteos', 'Costas', 'Abs & Core'],
    tags: ['Funcional', 'Kettlebell', 'Força', 'Glúteos'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Kettlebell_Swing/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=GYHbu2LRqD0',
    description: 'Potência balística de extensão de quadril com grande recrutamento de cadeia posterior.',
    instructions: 'Flexione os quadris empurrando o kettlebell para trás entre as pernas e estenda o quadril explosivamente projetando o peso à frente na altura do peito.',
    isSystem: true,
  },
];

export const INITIAL_CUSTOM_EXERCISES: ExerciseItem[] = [
  {
    id: 'custom-1',
    name: 'Abdominal Crunch',
    category: 'Abs & Core',
    muscleGroups: ['Abs & Core'],
    tags: ['Core', 'Fazer em Casa', 'Peso Corporal'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    videoUrl: 'https://www.youtube.com/watch?v=Xyd_fa5zoEU',
    description: 'Flexão tradicional de tronco com isolamento do abdômen superior.',
    instructions: 'Deite-se com joelhos flexionados, eleve as escápulas contraindo o abdômen sem puxar a cabeça pelo pescoço.',
    isSystem: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'custom-2',
    name: 'Abdução De Quadril Em Cócoras',
    category: 'Mobilidade',
    muscleGroups: ['Mobilidade', 'Glúteos'],
    tags: ['Mobilidade', 'Glúteos', 'Peso Corporal'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400',
    videoUrl: 'https://www.youtube.com/watch?v=YQmpO9VT2X4',
    description: 'Mobilidade de tornozelos, abertura de quadril e ativação de glúteo médio.',
    instructions: 'Em posição de cócoras profunda, utilize os cotovelos para afastar os joelhos suavemente mantendo a coluna ereta.',
    isSystem: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'custom-3',
    name: 'Abdução E Extensão De Quadril Na Polia',
    category: 'Membros Inferiores',
    muscleGroups: ['Membros Inferiores', 'Glúteos'],
    tags: ['Inferiores', 'Glúteos', 'Polia'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Hip_Abduction/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=SEdqd1n01g4',
    description: 'Isolamento do glúteo médio e máximo com resistência constante da polia.',
    instructions: 'Prenda a tornozeleira na polia baixa. Execute o movimento de abdução diagonal para trás mantendo o tronco firme.',
    isSystem: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'custom-4',
    name: 'Agachamento No Banco',
    category: 'Membros Inferiores',
    muscleGroups: ['Membros Inferiores', 'Glúteos'],
    tags: ['Inferiores', 'Peso Corporal', 'Fazer em Casa'],
    thumbnailUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Squat/0.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8',
    description: 'Agachamento com controle de profundidade e segurança para aprendizado motor.',
    instructions: 'Sente e levante do banco com peito aberto, tocando os glúteos de leve no assento antes de subir.',
    isSystem: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'custom-5',
    name: 'Airplane Com Apoio',
    category: 'Abs & Core',
    muscleGroups: ['Abs & Core', 'Glúteos', 'Mobilidade'],
    tags: ['Core', 'Mobilidade', 'Equilíbrio'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
    videoUrl: 'https://www.youtube.com/watch?v=YQmpO9VT2X4',
    description: 'Exercício de controle lombo-pélvico e rotação de quadril em apoio unilateral.',
    instructions: 'Apoie as mãos em uma barra na altura do quadril, fique em um pé e incline o tronco girando a pelve para abrir e fechar o quadril com controle.',
    isSystem: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'custom-6',
    name: 'Along. Peitoral No Solo',
    category: 'Mobilidade',
    muscleGroups: ['Mobilidade', 'Peito'],
    tags: ['Mobilidade', 'Peito', 'Fazer em Casa'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400',
    videoUrl: 'https://www.youtube.com/watch?v=YQmpO9VT2X4',
    description: 'Alongamento para relaxamento da cintura escapular.',
    instructions: 'Deitado de bruços, abra o braço lateralmente e gire o corpo sobre o ombro suavemente.',
    isSystem: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'custom-7',
    name: 'Alongamento De Adutores',
    category: 'Mobilidade',
    muscleGroups: ['Mobilidade', 'Membros Inferiores'],
    tags: ['Mobilidade', 'Fazer em Casa'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400',
    videoUrl: 'https://www.youtube.com/watch?v=YQmpO9VT2X4',
    description: 'Alongamento do grupo adutor da coxa.',
    instructions: 'Afastamento lateral de pernas com inclinação frontal gradual.',
    isSystem: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'custom-8',
    name: 'Alongamento Glúteo Sentado',
    category: 'Mobilidade',
    muscleGroups: ['Mobilidade', 'Glúteos'],
    tags: ['Mobilidade', 'Glúteos'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    videoUrl: 'https://www.youtube.com/watch?v=YQmpO9VT2X4',
    description: 'Alongamento eficiente de rotadores externos do quadril.',
    instructions: 'Cruze uma perna sobre o joelho oposto e projete o peito à frente.',
    isSystem: false,
    createdAt: new Date().toISOString(),
  },
];

export async function getCustomExercises(): Promise<ExerciseItem[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_EXERCISES_STORAGE_KEY);
    if (!raw) {
      // Inicializa com dados de demonstração elegantes
      await AsyncStorage.setItem(CUSTOM_EXERCISES_STORAGE_KEY, JSON.stringify(INITIAL_CUSTOM_EXERCISES));
      return INITIAL_CUSTOM_EXERCISES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_CUSTOM_EXERCISES;
  } catch (error) {
    console.error('Falha ao carregar exercicios personalizados:', error);
    return INITIAL_CUSTOM_EXERCISES;
  }
}

export async function saveCustomExercise(exercise: ExerciseItem): Promise<ExerciseItem[]> {
  try {
    const current = await getCustomExercises();
    const existingIndex = current.findIndex((item) => item.id === exercise.id);
    let next: ExerciseItem[];

    if (existingIndex >= 0) {
      next = current.map((item) => (item.id === exercise.id ? { ...exercise, updatedAt: new Date().toISOString() } : item));
    } else {
      const newExercise: ExerciseItem = {
        ...exercise,
        id: exercise.id || `custom-${Date.now()}`,
        isSystem: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      next = [newExercise, ...current];
    }

    await AsyncStorage.setItem(CUSTOM_EXERCISES_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch (error) {
    console.error('Falha ao salvar exercicio personalizado:', error);
    throw error;
  }
}

export async function deleteCustomExercise(id: string): Promise<ExerciseItem[]> {
  try {
    const current = await getCustomExercises();
    const next = current.filter((item) => item.id !== id);
    await AsyncStorage.setItem(CUSTOM_EXERCISES_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch (error) {
    console.error('Falha ao excluir exercicio personalizado:', error);
    throw error;
  }
}

export function getYoutubeThumbnailUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const videoId = getYoutubeVideoId(url);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  return undefined;
}

export function getYoutubeVideoId(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const cleanUrl = url.trim();
  const match = cleanUrl.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  return match && match[1] ? match[1] : null;
}

export type ExerciseMediaStatus =
  | 'valid_youtube'
  | 'valid_local_video'
  | 'valid_web_video'
  | 'invalid_url'
  | 'no_media';

export function validateExerciseMedia(exercise: ExerciseItem): {
  status: ExerciseMediaStatus;
  videoId: string | null;
  thumbnailUrl?: string;
} {
  if (exercise.localVideoUri) {
    return { status: 'valid_local_video', videoId: null, thumbnailUrl: exercise.thumbnailUrl };
  }
  if (!exercise.videoUrl || !exercise.videoUrl.trim()) {
    return { status: 'no_media', videoId: null, thumbnailUrl: exercise.thumbnailUrl };
  }
  const videoId = getYoutubeVideoId(exercise.videoUrl);
  if (videoId) {
    return {
      status: 'valid_youtube',
      videoId,
      thumbnailUrl: exercise.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
  if (exercise.videoUrl.startsWith('http://') || exercise.videoUrl.startsWith('https://')) {
    return { status: 'valid_web_video', videoId: null, thumbnailUrl: exercise.thumbnailUrl };
  }
  return { status: 'invalid_url', videoId: null, thumbnailUrl: exercise.thumbnailUrl };
}

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export type ExerciseCatalogPage = {
  items: ExerciseItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ExerciseCatalogQuery = {
  page?: number;
  limit?: number;
  search?: string;
  muscleGroup?: string;
  source: ExerciseSource;
  trainerId?: string;
};

// Pagina o catalogo de exercicios dentro do proprio service (nunca no componente):
// filtra o array completo aqui e devolve so a fatia pedida, no mesmo formato que uma API paginada devolveria.
export async function getExerciseCatalogPage(query: ExerciseCatalogQuery): Promise<ExerciseCatalogPage> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.max(1, query.limit ?? 20);

  const pool = query.source === 'system' ? SYSTEM_EXERCISES : await getCustomExercises();

  const scoped =
    query.source === 'custom'
      ? pool.filter((item) => !item.trainerId || item.trainerId === query.trainerId)
      : pool;

  const normQuery = query.search ? normalizeText(query.search) : '';
  const normGroup =
    query.muscleGroup && query.muscleGroup !== 'Todos' ? normalizeText(query.muscleGroup) : '';

  const filtered = scoped.filter((item) => {
    if (normGroup) {
      const matchesCategory = normalizeText(item.category).includes(normGroup);
      const matchesGroup = item.muscleGroups?.some((g) => normalizeText(g).includes(normGroup));
      if (!matchesCategory && !matchesGroup) return false;
    }
    if (normQuery) {
      const inName = normalizeText(item.name).includes(normQuery);
      const inCategory = normalizeText(item.category).includes(normQuery);
      const inTags = item.tags?.some((t) => normalizeText(t).includes(normQuery));
      if (!inName && !inCategory && !inTags) return false;
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return { items, page, limit, total, totalPages };
}

