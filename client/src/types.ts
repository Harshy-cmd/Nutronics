export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  age?: number;
  conditions?: string[];
  settings?: Record<string, any>;
};
