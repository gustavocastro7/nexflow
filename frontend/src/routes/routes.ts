export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  WORKSPACES: '/workspaces',
  DASHBOARD: '/dashboard',
  COST_CENTERS: '/cost-centers', // Renamed from CENTROS_CUSTO
  INVOICES: '/invoices',         // Renamed from FATURAS
  REPORTS: '/reports',           // Renamed from RELATORIOS
  PROFILE: '/profile',
  ADMIN_ROLES: '/admin/roles',
  USERS: '/users',
  ROOT: '/',
} as const;

export type AppRoute = typeof ROUTES[keyof typeof ROUTES];
