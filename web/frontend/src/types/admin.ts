export type AdminRole = 
  | 'SUPER_ADMIN'
  | 'SUPPORT_ADMIN'
  | 'FINANCIAL_ADMIN'
  | 'READONLY_ADMIN';

export type UserRole = 'TRAINER' | 'STUDENT' | AdminRole;

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: string;
  avatar?: string;
  permissions: string[];
  created_at?: string;
  last_access_at?: string;
}

export interface AdminDashboardMetrics {
  period: string;
  last_updated_at: string;
  users: {
    total: number;
    trainers: number;
    students: number;
    linked_students: number;
    unlinked_students: number;
    active: number;
    suspended: number;
    pending: number;
    new_in_period: number;
    new_trainers_in_period: number;
    new_students_in_period: number;
    previous_new_users: number | null;
  };
  subscriptions: {
    total: number;
    active: number;
    trial: number;
    grace_period: number;
    cancelled: number;
    expired: number;
    pending: number;
    plan_distribution: Record<string, number>;
    provider_distribution: Record<string, number>;
  };
  alerts: AdminAuditItem[];
  recent_activity: AdminAuditItem[];
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  status: string;
  plan_id: string;
  plan_status: string;
  provider: string;
  created_at: string | null;
  last_access_at: string | null;
}

export interface AdminUserDetail {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
    avatar?: string;
    role: string;
    status: string;
    is_email_verified: boolean;
    email_verified_at?: string;
    cref_verification_status?: string;
    professional_id?: string;
    trainer_code?: string;
    created_at?: string;
    last_access_at?: string;
    sessions_count: number;
  };
  trainer_profile?: {
    cref_number?: string;
    cref_state?: string;
    cref_verification_status: string;
    bio?: string;
    specialties?: string[];
    service_type?: string;
    city?: string;
    state?: string;
  } | null;
  student_profile?: {
    full_name?: string;
    main_goal?: string;
    birth_date?: string;
    gender?: string;
    status?: string;
  } | null;
  trainer_students?: Array<{
    id: string;
    student_id: string;
    status: string;
    student?: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
      status: string;
    };
  }>;
  student_trainers?: Array<{
    id: string;
    trainer_id: string;
    status: string;
    trainer?: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
      professional_id?: string;
    };
  }>;
  subscription?: {
    id: string;
    plan_id: string;
    status: string;
    provider: string;
    product_id?: string;
    environment: string;
    current_period_start?: string;
    current_period_end?: string;
    auto_renew?: boolean;
    student_limit: number;
    last_verified_at?: string;
  } | null;
  activity_timeline: AdminAuditItem[];
}

export interface AdminLinkItem {
  id: string;
  trainer_id: string;
  trainer_name: string;
  trainer_email: string;
  student_id: string;
  student_name: string;
  student_email: string;
  status: string;
  created_at: string | null;
}

export interface AdminSubscriptionItem {
  id: string;
  user_id: string;
  plan_id: string;
  provider: string;
  product_id?: string;
  environment: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  auto_renew: boolean;
  student_limit: number;
  last_verified_at?: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
}

export interface AdminAuditItem {
  id: string;
  action: string;
  actor_id?: string;
  actor_role?: string;
  target_id?: string;
  ip_address?: string;
  user_agent?: string;
  correlation_id?: string;
  reason?: string;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  result: string;
  level: 'info' | 'warning' | 'alert' | 'success';
  details?: string;
  created_at: string;
}

export interface AdminNotificationItem {
  id: string;
  user_id: string;
  audience: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface AdminSessionItem {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  ip_address?: string;
  user_agent?: string;
  last_activity_at: string;
}

export interface AdminGlobalSettings {
  maintenance_mode: boolean;
  maintenance_message?: string;
  enable_hydration_module: boolean;
  enable_photo_assessments: boolean;
  enable_chat_messaging: boolean;
  enable_auto_notifications: boolean;
  allow_public_registration: boolean;
  max_active_students_per_trainer: number;
  min_required_app_version: string;
  recommended_app_version: string;
}
