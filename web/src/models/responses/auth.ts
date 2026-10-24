export type UserRole = "OWNER" | "ASSISTANT" | "ADMIN";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface Session {
  accessToken: string;
  tokenType: "Bearer";
  expiresAt: string;
  user: User;
}

export interface ProblemFieldError {
  field: string;
  message: string;
}

export interface ProblemDetails {
  status?: number;
  detail?: string;
  code?: string;
  requestId?: string;
  errors?: ProblemFieldError[];
}
