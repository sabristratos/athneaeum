import { apiClient, uploadFile } from '@/api/client';
import type {
  User,
  AuthResponse,
  LoginData,
  RegisterData,
  ForgotPasswordData,
  ResetPasswordData,
  MessageResponse,
} from '@/types';
import type { ThemeName } from '@/types/theme';
import type { UserPreferences } from '@/stores/preferencesStore';

export interface AvatarUploadResponse {
  avatar_url: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
  error_messages: string[];
}

export interface ImportSource {
  name: string;
  extensions: string[];
}

export interface ImportOptions {
  enrichment_enabled: boolean;
  import_tags: boolean;
  import_reviews: boolean;
}

export interface EnrichmentStatus {
  total: number;
  enriched: number;
  pending: number;
  progress: number;
  is_complete: boolean;
}

export interface ExportData {
  user: {
    name: string;
    email: string;
    created_at: string;
  };
  library: Array<{
    book: {
      title: string;
      author: string;
      isbn: string | null;
      isbn13: string | null;
      page_count: number | null;
      published_date: string | null;
      publisher: string | null;
    };
    status: string;
    rating: number | null;
    current_page: number | null;
    is_dnf: boolean;
    dnf_reason: string | null;
    started_at: string | null;
    finished_at: string | null;
    tags: string[];
    sessions: Array<{
      started_at: string;
      ended_at: string | null;
      start_page: number | null;
      end_page: number | null;
      pages_read: number;
      duration_minutes: number | null;
      notes: string | null;
    }>;
  }>;
  exported_at: string;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
}

export interface ChangePasswordData {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface DeleteAccountData {
  password: string;
}

export const authApi = {
  register: (data: RegisterData): Promise<AuthResponse> =>
    apiClient('/auth/register', {
      method: 'POST',
      body: data,
      requiresAuth: false,
    }),

  login: (data: LoginData): Promise<AuthResponse> =>
    apiClient('/auth/login', {
      method: 'POST',
      body: data,
      requiresAuth: false,
    }),

  logout: (): Promise<MessageResponse> =>
    apiClient('/auth/logout', {
      method: 'POST',
    }),

  forgotPassword: (data: ForgotPasswordData): Promise<MessageResponse> =>
    apiClient('/auth/forgot-password', {
      method: 'POST',
      body: data,
      requiresAuth: false,
    }),

  resetPassword: (data: ResetPasswordData): Promise<MessageResponse> =>
    apiClient('/auth/reset-password', {
      method: 'POST',
      body: data,
      requiresAuth: false,
    }),

  getUser: (): Promise<User> => apiClient('/user'),

  updateProfile: (data: UpdateProfileData): Promise<User> =>
    apiClient('/user', {
      method: 'PATCH',
      body: data,
    }),

  changePassword: (data: ChangePasswordData): Promise<MessageResponse> =>
    apiClient('/user/password', {
      method: 'PATCH',
      body: data,
    }),

  updateTheme: (theme: ThemeName): Promise<User> =>
    apiClient('/user/theme', {
      method: 'PATCH',
      body: { theme },
    }),

  uploadAvatar: (uri: string): Promise<AvatarUploadResponse> => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('avatar', {
      uri,
      name: filename,
      type,
    } as unknown as Blob);

    return uploadFile('/user/avatar', formData);
  },

  removeAvatar: (): Promise<MessageResponse> =>
    apiClient('/user/avatar', {
      method: 'DELETE',
    }),

  updatePreferences: (prefs: Partial<UserPreferences>): Promise<User> =>
    apiClient('/user/preferences', {
      method: 'PATCH',
      body: prefs,
    }),

  exportData: (): Promise<ExportData> => apiClient('/user/export'),

  deleteAccount: (data: DeleteAccountData): Promise<MessageResponse> =>
    apiClient('/user', {
      method: 'DELETE',
      body: data,
    }),

  getImportSources: (): Promise<ImportSource[]> => apiClient('/user/import/sources'),

  importLibrary: (fileUri: string, source: string, options?: ImportOptions): Promise<ImportResult> => {
    const formData = new FormData();
    const filename = fileUri.split('/').pop() || 'library_export.csv';

    formData.append('file', {
      uri: fileUri,
      name: filename,
      type: 'text/csv',
    } as unknown as Blob);
    formData.append('source', source);

    if (options) {
      formData.append('enrichment_enabled', options.enrichment_enabled ? '1' : '0');
      formData.append('import_tags', options.import_tags ? '1' : '0');
      formData.append('import_reviews', options.import_reviews ? '1' : '0');
    }

    return uploadFile('/user/import', formData);
  },

  getEnrichmentStatus: (): Promise<EnrichmentStatus> =>
    apiClient('/user/import/enrichment-status'),
};
