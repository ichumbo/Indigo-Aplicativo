import AsyncStorage from "@react-native-async-storage/async-storage";

export type TrainerAgendaEventType = "session" | "assessment" | "expiration" | "manual";
export type TrainerAgendaEventTone = "default" | "attention" | "danger";

export type TrainerAgendaStoredEvent = {
  id: string;
  trainerId: string;
  type: TrainerAgendaEventType;
  title: string;
  detail: string;
  startAt: string;
  endAt?: string;
  studentId?: string;
  studentName?: string;
  studentAvatar?: string;
  statusLabel: string;
  tone: TrainerAgendaEventTone;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "@dragoncorp/trainer-agenda-events/v1";

export async function listTrainerAgendaEvents(trainerId: string): Promise<TrainerAgendaStoredEvent[]> {
  const allEvents = await readAgendaEvents();
  return allEvents
    .filter((event) => event.trainerId === trainerId)
    .sort((first, second) => new Date(first.startAt).getTime() - new Date(second.startAt).getTime());
}

export async function saveTrainerAgendaEvent(event: TrainerAgendaStoredEvent): Promise<TrainerAgendaStoredEvent> {
  const allEvents = await readAgendaEvents();
  const nextEvents = [
    ...allEvents.filter((item) => item.id !== event.id),
    {
      ...event,
      updatedAt: new Date().toISOString(),
    },
  ];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextEvents));
  return event;
}

export async function deleteTrainerAgendaEvent(trainerId: string, eventId: string) {
  const allEvents = await readAgendaEvents();
  const nextEvents = allEvents.filter((event) => event.trainerId !== trainerId || event.id !== eventId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextEvents));
}

async function readAgendaEvents(): Promise<TrainerAgendaStoredEvent[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredEvent);
  } catch {
    return [];
  }
}

function isStoredEvent(value: unknown): value is TrainerAgendaStoredEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<TrainerAgendaStoredEvent>;
  return (
    typeof event.id === "string" &&
    typeof event.trainerId === "string" &&
    typeof event.type === "string" &&
    typeof event.title === "string" &&
    typeof event.detail === "string" &&
    typeof event.startAt === "string" &&
    typeof event.statusLabel === "string" &&
    typeof event.tone === "string" &&
    typeof event.createdAt === "string" &&
    typeof event.updatedAt === "string"
  );
}
