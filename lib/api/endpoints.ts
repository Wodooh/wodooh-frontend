/**
 * Centralized API endpoint definitions for Wodooh Backend
 * Base URL is handled by apiClient
 */

/**
 * API Endpoints - Currently Implemented
 * These are paths only - apiClient will add the base URL
 */
export const API_ENDPOINTS = {
  // Health Check
  HEALTH: '/health',

  // Authentication
  SIGNUP: '/auth/signup',
  LOGIN: '/auth/login',

  // Admin - User Management
  USERS: '/admin/users',
  USER_BY_ID: (userId: string) => `/admin/users/${userId}`,
  USER_ROLE: (userId: string) => `/admin/users/${userId}/role`,
  USER_PERMANENT: (userId: string) => `/admin/users/${userId}/permanent`,
  USER_PASSWORD_RESET: (userId: string) => `/admin/users/${userId}/password-reset`,
  USERS_BULK_DELETE: '/admin/users/bulk-delete',
  USERS_BULK_ROLE_CHANGE: '/admin/users/bulk-role-change',
  AUTH_ME: '/auth/me',

  // Admin - Colleges
  COLLEGES: '/admin/colleges',
  COLLEGE: (id: string) => `/admin/colleges/${id}`,

  // Admin - Departments
  DEPARTMENTS: '/admin/departments',
  DEPARTMENT: (id: string) => `/admin/departments/${id}`,

  // Admin - Courses
  ADMIN_COURSES: '/admin/courses',
  ADMIN_COURSE: (id: string) => `/admin/courses/${id}`,
  ADMIN_COURSE_SECTIONS: (courseId: string) => `/admin/courses/${courseId}/sections`,
  ADMIN_COURSE_SECTION: (courseId: string, sectionId: string) => `/admin/courses/${courseId}/sections/${sectionId}`,
  ADMIN_COURSE_SECTION_NEXT_ID: (courseId: string) => `/admin/courses/${courseId}/sections/next-id`,

  // Admin - Audit Log
  AUDIT_LOG: '/admin/audit-log',

  // Public (no auth) — used by onboarding before the user has an account
  PUBLIC_COLLEGES: '/public/colleges',
  PUBLIC_DEPARTMENTS: '/public/departments',
  PUBLIC_COURSES: '/public/courses',
  PUBLIC_COURSE_SECTIONS: (courseId: string) => `/public/courses/${courseId}/sections`,

  // Current user — used by student/instructor dashboards
  MY_COURSES: '/me/courses',

  // Sessions
  SESSIONS: '/sessions',
  SESSION: (id: string) => `/sessions/${id}`,
  SESSION_END: (id: string) => `/sessions/${id}/end`,

  // Questions
  QUESTIONS: '/questions',
  QUESTION_VISIBILITY: (id: string) => `/questions/${id}/visibility`,

  // Ably realtime
  ABLY_TOKEN: '/ably/token',


  // --- Planned Backend Features (not yet implemented) ---
  // These are stubs for future backend development

  // Authentication - Future
  REFRESH_TOKEN: '/auth/refresh',
  LOGOUT: '/auth/logout',
  VERIFY_EMAIL: '/auth/verify-email',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  CHANGE_PASSWORD: '/auth/change-password',

  // User Profile - Future
  PROFILE: '/profile',
  UPDATE_PROFILE: '/profile',
  DELETE_ACCOUNT: '/profile',

  // Dashboard - Future
  DASHBOARD: '/dashboard',
  STATS: '/dashboard/stats',

  // Courses - Future
  COURSES: '/courses',
  COURSE_DETAIL: (courseId: string) => `/courses/${courseId}`,
  CREATE_COURSE: '/courses',
  UPDATE_COURSE: (courseId: string) => `/courses/${courseId}`,
  DELETE_COURSE: (courseId: string) => `/courses/${courseId}`,

  // Lessons - Future
  LESSONS: (courseId: string) => `/courses/${courseId}/lessons`,
  LESSON_DETAIL: (courseId: string, lessonId: string) =>
    `/courses/${courseId}/lessons/${lessonId}`,
  CREATE_LESSON: (courseId: string) => `/courses/${courseId}/lessons`,
  UPDATE_LESSON: (courseId: string, lessonId: string) =>
    `/courses/${courseId}/lessons/${lessonId}`,
  DELETE_LESSON: (courseId: string, lessonId: string) =>
    `/courses/${courseId}/lessons/${lessonId}`,

  // Enrollments - Future
  ENROLLMENTS: '/enrollments',
  COURSE_ENROLLMENTS: (courseId: string) => `/courses/${courseId}/enrollments`,
  ENROLL_COURSE: (courseId: string) => `/courses/${courseId}/enroll`,

  // Progress - Future
  LESSON_PROGRESS: (courseId: string, lessonId: string) =>
    `/courses/${courseId}/lessons/${lessonId}/progress`,
  COURSE_PROGRESS: (courseId: string) => `/courses/${courseId}/progress`,
} as const;

export default API_ENDPOINTS;
