
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'student' | 'visitor';
  status: 'active' | 'blocked';
  isOnline: boolean;
  lastAccess?: string;
  weeklyGoal?: number;
}

export interface StudySession {
  id: string;
  user_id: string;
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
  user_id?: string;
  name: string;
  topics: Topic[];
  color: string;
}

export interface PredefinedEdital {
  id: string;
  name: string;
  organization: string;
  examDate?: string;
  subjects: Subject[];
  lastUpdated: string;
}

export interface MockExam {
  id: string;
  user_id: string;
  title: string;
  date: string;
  score: number;
  totalQuestions: number;
  subjectPerformance: Record<string, number>;
}

export interface StudyCycle {
  id: string;
  user_id: string;
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
