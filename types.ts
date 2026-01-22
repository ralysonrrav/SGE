
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'student' | 'visitor';
  status: 'active' | 'blocked'; // Ativo ou Bloqueado
  isOnline: boolean; // Status de conexão em tempo real
  lastAccess?: string;
  weeklyGoal?: number;
}

export interface StudySession {
  id: string;
  topicId: string;
  subjectId: string;
  minutes: number;
  date: string;
  type: 'estudo' | 'revisao';
}

export interface Topic {
  id: string;
  title: string;
  completed: boolean;
  lastStudiedAt?: string;
  importance: number;
  studyTimeMinutes?: number;
  questionsAttempted?: number;
  questionsCorrect?: number;
  revisionsDone?: number[];
}

export interface Subject {
  id: string;
  name: string;
  topics: Topic[];
  color: string;
}

// Novo: Modelo de Edital Pré-cadastrado pelo Admin
export interface PredefinedEdital {
  id: string;
  name: string;
  organization: string; // Ex: Polícia Federal, TJ-SP
  examDate?: string; // Data prevista da prova
  subjects: Subject[];
  lastUpdated: string;
}

export interface MockExam {
  id: string;
  title: string;
  date: string;
  score: number;
  totalQuestions: number;
  subjectPerformance: Record<string, number>;
}

export interface StudyCycle {
  id: string;
  board: string;
  examDate: string;
  hoursPerDay: number;
  schedule: Array<{
    day: string;
    sessions: Array<{
      subjectName: string;
      duration: number;
      focus: string;
    }>;
  }>;
}

export interface ReviewAlert {
  subjectName: string;
  topicTitle: string;
  daysPassed: number;
  dueDate: string;
}
