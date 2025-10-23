export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'employee' | 'manager';
  company_id: string | null;
  phone: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export type UserRole = 'admin' | 'employee' | 'manager';