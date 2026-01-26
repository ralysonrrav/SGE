
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'administrator' | 'student' | 'visitor';
  status: 'active' | 'blocked';
  isOnline: boolean;
  lastAccess?: string;
  weeklyGoal?: number;
  examDate?: string;
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
  concludedAt?: string;
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

export enum NivelConhecimento {
  INICIANTE = 'Iniciante',
  INTERMEDIARIO = 'Intermediário',
  AVANCADO = 'Avançado'
}

export enum PesoDisciplina {
  BAIXO = 'Baixo',
  NORMAL = 'Normal',
  ALTO = 'Alto'
}

export interface CycleSubject extends Subject {
  nivelConhecimento: NivelConhecimento;
  peso: PesoDisciplina;
  tempoEstudo: number;
}

export interface Ciclo {
  id: number;
  materias: Array<Partial<CycleSubject> & { instanceId: string }>;
  tempoTotal: number;
}

export interface PredefinedEdital {
  id: string;
  name: string;
  organization: string;
  examDate?: string;
  subjects: Subject[];
  lastUpdated: string;
  created_by?: string;
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
  user_id?: string;
  board: string;
  examDate: string;
  hoursPerDay: number;
  num_ciclos?: number;
  schedule: any[];
  config_disciplinas: CycleSubject[];
  disciplinas_por_ciclo: number;
  meta_atual: number;
  ciclo_atual: number;
  metas_concluidas: number;
  materias_concluidas_ids: string[];
}
