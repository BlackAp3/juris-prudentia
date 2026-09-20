export type UserRole =
  | "STUDENT"
  | "CONTENT_EDITOR"
  | "MODERATOR"
  | "ADMIN"
  | "SUPER_ADMIN";

export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface CourseSummary {
  id: string;
  code: string;
  title: string;
  academicYear: number;
  semester: number;
  topicCount: number;
  completedTopicCount: number;
}

export interface TopicSummary {
  id: string;
  title: string;
  position: number;
  progressPercent: number;
}

export interface CaseSummary {
  id: string;
  citation: string;
  title: string;
  principle: string;
  isLeadingCase: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, string | number | boolean>;
}
