# Authentication Feature Documentation

## Overview

The Digital Athenaeum implements a robust, token-based authentication system using Laravel Sanctum on the backend and secure token storage with Zustand state management on the mobile frontend. The system supports user registration, login, logout, password reset, and session management.

---

## 1. Authentication Flow

### 1.1 Login Flow

**Mobile Side:**
1. User enters email and password on LoginScreen
2. `useLoginController` validates inputs and calls `useAuth().login()`
3. `authApi.login()` sends POST request to `/auth/login` endpoint
4. Backend validates credentials and returns `AuthResponse` with user data and token
5. `setAuth()` stores token via `expo-secure-store` and updates Zustand auth store
6. User's theme preference is applied from the response
7. Navigation automatically switches to MainNavigator
8. Success toast is displayed

**Backend Side:**
```
POST /auth/login
├─ LoginRequest validation
│  ├─ Email format validation
│  ├─ Required password check
│  ├─ Rate limiting (5 attempts per IP per 60 seconds)
│  └─ Throw ValidationException if rate limited
├─ User lookup by email
├─ Password verification using Hash::check()
├─ Token creation using Sanctum (createToken('mobile'))
└─ Return AuthResource with user + token
```

**Error Handling:**
- Invalid credentials: Return 401 with "Invalid credentials" message
- Rate limited: Return 429 with rate limit message indicating retry time
- Validation errors: Return 422 with field-specific error messages

### 1.2 Registration Flow

**Mobile Side:**
1. User enters name, email, password, and password confirmation on RegisterScreen
2. `useRegisterController` validates inputs and calls `useAuth().register()`
3. `authApi.register()` sends POST request to `/auth/register`
4. Backend creates new user and returns AuthResponse
5. Token is automatically stored and auth state updated
6. Success toast displayed and navigation switches to MainNavigator

**Backend Side:**
```
POST /auth/register
├─ RegisterRequest validation
│  ├─ Name: required, string, max 255 chars
│  ├─ Email: required, string, valid email format, max 255 chars, unique
│  ├─ Password: required, string, min 8 chars, confirmed (password_confirmation field)
│  ├─ Rate limiting (5 attempts per IP per 60 seconds)
│  └─ Throw ValidationException if rate limited
├─ User creation with hashed password
├─ Token creation using Sanctum
└─ Return AuthResource with user + token
```

### 1.3 Logout Flow

**Mobile Side:**
1. User presses logout button (typically in settings)
2. `useAuth().logout()` calls `authApi.logout()`
3. Sends POST request to `/auth/logout` with token
4. After API call (success or failure), `clearAuth()` is called
5. Token is removed from secure store
6. Auth state is cleared
7. Navigation automatically switches to AuthNavigator

**Backend Side:**
```
POST /auth/logout
├─ Middleware: auth:sanctum (requires valid token)
├─ Delete current access token
└─ Return success message
```

---

## 2. Token Storage and Management

### 2.1 Token Storage (Mobile)

**Storage Location:** `expo-secure-store`
- **Key:** `auth_token`
- **Type:** Secure, encrypted storage specific to each app installation
- **Platform Specifics:**
  - iOS: Stores in Keychain
  - Android: Stores in Keystore

**Token Lifecycle:**
1. **Created:** During login/register, received from backend as `plainTextToken`
2. **Stored:** Via `setToken()` in `api/client.ts`
3. **Retrieved:** Automatically injected in Authorization header for authenticated requests
4. **Removed:** On logout via `removeToken()` which deletes the key

### 2.2 Token in API Requests

**Header Injection:**
```typescript
// api/client.ts
const token = await getToken();
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}
```

**Request Config:**
- `requiresAuth: true` (default) - Token automatically included
- `requiresAuth: false` - No token needed (login, register, forgot password, reset password)

### 2.3 Token Management Backend

**Token Generation:**
```php
$token = $user->createToken('mobile')->plainTextToken;
```
- Uses Laravel Sanctum
- Tokens are stored in `personal_access_tokens` table
- Each login creates a new token (previous tokens can remain active)

---

## 3. Password Reset Flow

### 3.1 Forgot Password Flow

**Mobile Side (ForgotPasswordScreen):**
1. User enters email address
2. Calls `useAuth().forgotPassword({ email })`
3. Sends POST to `/auth/forgot-password`
4. Backend validates and sends reset email
5. Success screen displayed with instructions
6. User checks email for reset link

**Backend Side:**
```
POST /auth/forgot-password
├─ ForgotPasswordRequest validation
│  ├─ Email: required, valid email, exists in users table
│  ├─ Rate limiting (3 attempts per IP per 60 seconds)
│  └─ Custom error: "We could not find a user with that email address"
├─ Generate reset token using Password::sendResetLink()
├─ Send reset email via notification
└─ Return success message
```

### 3.2 Reset Password Flow

**Mobile Side (ResetPasswordScreen):**
1. User receives reset link in email (deep link)
2. App automatically navigates to ResetPasswordScreen with `token` and `email` params
3. User enters new password and confirmation
4. Calls `useAuth().resetPassword(data)`
5. Sends POST to `/auth/reset-password` with token, email, password
6. Success screen shown, user redirected to login

**Backend Side:**
```
POST /auth/reset-password
├─ ResetPasswordRequest validation
│  ├─ Token: required, string
│  ├─ Email: required, valid email format
│  ├─ Password: required, string, min 8 chars, confirmed
│  └─ No rate limiting (token-based security)
├─ Validate token using Password::reset()
├─ Update user password with Hash::make()
├─ Fire PasswordReset event
└─ Return success message
```

---

## 4. Session Validation

### 4.1 Session Restoration

**On App Launch:**
1. RootNavigator checks `authHydrated` from Zustand
2. AuthStore has `persist` middleware with MMKV storage
3. Zustand rehydrates stored `user` and `isAuthenticated` state
4. `onRehydrateStorage` callback sets `isHydrated: true`
5. RootNavigator waits for hydration before rendering
6. If `isAuthenticated: true`, MainNavigator is shown; otherwise AuthNavigator
7. Token is already in secure store, no need to re-authenticate

### 4.2 Token Validation

**Automatic 401 Handling:**
1. Any API request with invalid/expired token returns 401
2. `apiClient` throws `AuthenticationError`
3. User can manually logout or app will behave as authenticated

---

## 5. API Endpoints and Validation Rules

### 5.1 Authentication Endpoints

| Endpoint | Method | Auth Required | Purpose |
|----------|--------|---------------|---------|
| `/auth/register` | POST | No | Create new user account |
| `/auth/login` | POST | No | Sign in user |
| `/auth/logout` | POST | Yes | Sign out user |
| `/auth/forgot-password` | POST | No | Request password reset |
| `/auth/reset-password` | POST | No | Complete password reset |

### 5.2 User Management Endpoints

| Endpoint | Method | Auth Required | Purpose |
|----------|--------|---------------|---------|
| `/user` | GET | Yes | Get current user profile |
| `/user/onboarding-complete` | POST | Yes | Mark onboarding complete |
| `/user` | PATCH | Yes | Update user profile (name, email) |
| `/user` | DELETE | Yes | Delete user account |
| `/user/password` | PATCH | Yes | Change password |
| `/user/theme` | PATCH | Yes | Update theme preference |
| `/user/avatar` | POST | Yes | Upload avatar image |
| `/user/avatar` | DELETE | Yes | Remove avatar |
| `/user/preferences` | PATCH | Yes | Update user preferences |
| `/user/export` | GET | Yes | Export user data |
| `/user/import` | POST | Yes | Import from Goodreads |
| `/user/opds` | GET | Yes | Get OPDS settings |
| `/user/opds` | PATCH | Yes | Update OPDS settings |
| `/user/opds/test` | POST | Yes | Test OPDS connection |
| `/user/opds` | DELETE | Yes | Clear OPDS settings |

### 5.3 Request Validation Rules

#### Register Request
```php
[
  'name' => ['required', 'string', 'max:255'],
  'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
  'password' => ['required', 'string', 'min:8', 'confirmed'],
]
```

#### Login Request
```php
[
  'email' => ['required', 'string', 'email'],
  'password' => ['required', 'string']
]
```

#### Change Password Request
```php
[
  'current_password' => ['required', 'string'],
  'password' => ['required', 'string', 'confirmed']
]
```

### 5.4 Response Formats

**Success Response (Login/Register):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "theme": "scholar",
    "preferences": null,
    "avatar_url": null,
    "created_at": "2026-01-12T10:00:00Z",
    "updated_at": "2026-01-12T10:00:00Z"
  },
  "token": "plain_text_token_here"
}
```

**Error Response (Validation):**
```json
{
  "message": "The email field is required.",
  "errors": {
    "email": ["The email field is required."],
    "password": ["The password must be at least 8 characters."]
  }
}
```

---

## 6. Security Considerations

### 6.1 Password Security

- Passwords hashed using Laravel's `Hash::make()` (bcrypt algorithm)
- Password never stored in plain text
- `password` field hidden from API responses via `$hidden` attribute
- Password validation rules enforce minimum 8 characters

### 6.2 Token Security

**Backend:**
- Tokens stored in `personal_access_tokens` table
- Each token is cryptographically unique (Sanctum generates via Str::random(40))
- Tokens can be explicitly revoked (logout)

**Mobile:**
- Token stored in platform-specific secure storage (iOS Keychain, Android Keystore)
- Token never logged or exposed in console
- Token cleared on logout

### 6.3 Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Login | 5 attempts per IP per 60 seconds |
| Registration | 5 attempts per IP per 60 seconds |
| Forgot Password | 3 attempts per IP per 60 seconds |

---

## 7. State Management

### 7.1 Authentication Store (Zustand)

**Location:** `mobile/src/stores/authStore.ts`

**State:**
```typescript
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}
```

**Actions:**
```typescript
setAuth(user: User, token: string)  // Login/register
clearAuth()                          // Logout
setUser(user: User)                  // Update profile
setHydrated(hydrated: boolean)       // Internal
```

**Persistence:**
- Middleware: `persist()`
- Storage: `mmkvStorage` (MMKV format)
- Key: `athenaeum-auth`

---

## 8. Deep Linking (Password Reset)

### 8.1 Configuration

**Linking Config (RootNavigator):**
```typescript
const linking = {
  prefixes: [prefix, 'athenaeum://'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
    },
  },
};
```

**Reset Link in Email:**
```
athenaeum://reset-password?token=ABC123&email=user@example.com
```

---

## 9. Type Definitions

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  theme: ThemeName;
  preferences: UserPreferences | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}
```

---

## 10. Key Files

### Backend
- `backend/app/Http/Controllers/Api/AuthController.php` - Login, logout
- `backend/app/Http/Controllers/Api/UserController.php` - User profile
- `backend/app/Http/Requests/Auth/` - Validation requests
- `backend/app/Models/User.php` - User model

### Mobile
- `mobile/src/api/auth.ts` - API client methods
- `mobile/src/api/client.ts` - HTTP client with token injection
- `mobile/src/stores/authStore.ts` - Zustand auth state
- `mobile/src/features/auth/` - Auth screens and controllers
- `mobile/src/navigation/AuthNavigator.tsx` - Auth navigation stack
- `mobile/src/navigation/RootNavigator.tsx` - Root navigation with auth conditional
