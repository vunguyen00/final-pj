export type Module = {
  id: string;
  name: string;
  order: number;
  lessons: { id: string; title: string }[];
};

export type Test = {
  id: string;
  name: string;
  maxScore: number;
  passingScore: number;
  maxAttempts: number;
  timeLimit: number | null;
  _count: {
    questions: number;
    attempts: number;
  };
};

export type Course = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string | null;
  duration: string | null;
  thumbnail: string | null;
  status: string;
  createdAt: string;
  _count: {
    enrollments: number;
    modules: number;
    tests: number;
    feedbacks: number;
  };
};

export type User = {
  id: string;
  username: string;
  email: string;
  role: string;
};

export type TestForm = {
  name: string;
  description: string;
  maxScore: string;
  passingScore: string;
  maxAttempts: string;
  timeLimit: string;
  shuffleQuestions: boolean;
};

export const initialTestForm: TestForm = {
  name: "",
  description: "",
  maxScore: "100",
  passingScore: "50",
  maxAttempts: "3",
  timeLimit: "",
  shuffleQuestions: false,
};
