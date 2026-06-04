export enum Role {
  USER = "user",
  MODEL = "model"
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: "user" | "model";
  content: string;
  createdAt: any; // Firestore Timestamp
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

export enum SoundSettings {
  NONE = "none",
  BROWSER_TTS = "browser_tts"
}
