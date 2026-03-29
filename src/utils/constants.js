export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'https://dev.natureland.hipster-virtual.com';

export const DEFAULT_OUTLET_ID = Number(import.meta.env.VITE_OUTLET_ID) || 1;

export const DEFAULT_COMPANY_ID = Number(import.meta.env.VITE_COMPANY_ID) || 1;

export const LOGIN_EMAIL = import.meta.env.VITE_LOGIN_EMAIL || 'react@hipster-inc.com';

export const LOGIN_PASSWORD = import.meta.env.VITE_LOGIN_PASSWORD || 'React@123';

export const LOGIN_KEY_PASS =
  import.meta.env.VITE_LOGIN_KEY_PASS || '07ba959153fe7eec778361bf42079439';

export const OUTLET_TYPE = import.meta.env.VITE_OUTLET_TYPE || '2';

export const BOOKING_STATUS = {
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'Check-in (In Progress)',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
};

export const UI_STATUS = {
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'inProgress',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

export const FEMALE_COLOR = '#EC4899';
export const MALE_COLOR = '#3B82F6';
export const HEADER_BROWN = '#3D2B1F';
