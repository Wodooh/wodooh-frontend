/**
 * Centralized API endpoint definitions for Wodooh Backend
 * Base URL: http://localhost:5000
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Helper to build full API URL
 */
const buildUrl = (path: string): string => {
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const endpointPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${endpointPath}`;
};

/**
 * API Endpoints - Currently Implemented
 */
export const API_ENDPOINTS = {
  // Health Check
  HEALTH: buildUrl('/health'),

  // Authentication
  SIGNUP: buildUrl('/auth/signup'),
  LOGIN: buildUrl('/auth/login'),

  // Admin - User Management
  USERS: buildUrl('/admin/users'),
  USER_ROLE: (userId: string) => buildUrl(`/admin/users/${userId}/role`),

  // --- Planned Backend Features (not yet implemented) ---
  // These are stubs for future backend development

  // Authentication - Future
  REFRESH_TOKEN: buildUrl('/auth/refresh'),
  LOGOUT: buildUrl('/auth/logout'),
  VERIFY_EMAIL: buildUrl('/auth/verify-email'),
  FORGOT_PASSWORD: buildUrl('/auth/forgot-password'),
  RESET_PASSWORD: buildUrl('/auth/reset-password'),
  CHANGE_PASSWORD: buildUrl('/auth/change-password'),

  // User Profile - Future
  PROFILE: buildUrl('/profile'),
  UPDATE_PROFILE: buildUrl('/profile'),
  DELETE_ACCOUNT: buildUrl('/profile'),

  // Dashboard - Future
  DASHBOARD: buildUrl('/dashboard'),
  STATS: buildUrl('/dashboard/stats'),

  // Courses - Future
  COURSES: buildUrl('/courses'),
  COURSE_DETAIL: (courseId: string) => buildUrl(`/courses/${courseId}`),
  CREATE_COURSE: buildUrl('/courses'),
  UPDATE_COURSE: (courseId: string) => buildUrl(`/courses/${courseId}`),
  DELETE_COURSE: (courseId: string) => buildUrl(`/courses/${courseId}`),

  // Lessons - Future
  LESSONS: (courseId: string) => buildUrl(`/courses/${courseId}/lessons`),
  LESSON_DETAIL: (courseId: string, lessonId: string) =>
    buildUrl(`/courses/${courseId}/lessons/${lessonId}`),
  CREATE_LESSON: (courseId: string) => buildUrl(`/courses/${courseId}/lessons`),
  UPDATE_LESSON: (courseId: string, lessonId: string) =>
    buildUrl(`/courses/${courseId}/lessons/${lessonId}`),
  DELETE_LESSON: (courseId: string, lessonId: string) =>
    buildUrl(`/courses/${courseId}/lessons/${lessonId}`),

  // Enrollments - Future
  ENROLLMENTS: buildUrl('/enrollments'),
  COURSE_ENROLLMENTS: (courseId: string) => buildUrl(`/courses/${courseId}/enrollments`),
  ENROLL_COURSE: (courseId: string) => buildUrl(`/courses/${courseId}/enroll`),

  // Progress - Future
  LESSON_PROGRESS: (courseId: string, lessonId: string) =>
    buildUrl(`/courses/${courseId}/lessons/${lessonId}/progress`),
  COURSE_PROGRESS: (courseId: string) => buildUrl(`/courses/${courseId}/progress`),
} as const;

export default API_ENDPOINTS;
