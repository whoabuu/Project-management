import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, tokenStorage } from '../lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'project_manager' | 'developer' | 'viewer';

export interface AuthUser {
  _id:   string;
  name:  string;
  email: string;
  role:  UserRole;
}

/** Shape of the `data` field returned by /auth/login and /auth/register. */
interface AuthTokensResponse {
  user:         AuthUser;
  accessToken:  string;
  refreshToken: string;
}

/** Shape of the `data` field returned by /auth/me. */
interface MeResponse {
  user: AuthUser;
}

interface AuthContextValue {
  user:            AuthUser | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  login:    (email: string, password: string) => Promise<void>;
  register: (
    name:     string,
    email:    string,
    password: string,
    role:     UserRole
  ) => Promise<void>;
  logout: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser]           = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // ── Bootstrap session on mount ────────────────────────────────────────────
  // If a token exists in localStorage, validate it against the server by
  // fetching the current profile. This handles page refreshes gracefully —
  // the user stays logged in without re-entering credentials.
  useEffect(() => {
    const bootstrapSession = async (): Promise<void> => {
      const token = tokenStorage.getAccessToken();

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const result = await apiGet<MeResponse>('/auth/me');
        setUser(result.data.user);
      } catch {
        // Token is invalid or expired and refresh failed — clear everything
        tokenStorage.clear();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrapSession();
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const result = await apiPost<AuthTokensResponse>('/auth/login', {
        email,
        password,
      });

      const { accessToken, refreshToken, user: loggedInUser } = result.data;

      tokenStorage.setTokens(accessToken, refreshToken);
      setUser(loggedInUser);
      navigate('/dashboard');
    },
    [navigate]
  );

  // ── Register ───────────────────────────────────────────────────────────────
  const register = useCallback(
    async (
      name:     string,
      email:    string,
      password: string,
      role:     UserRole
    ): Promise<void> => {
      const result = await apiPost<AuthTokensResponse>('/auth/register', {
        name,
        email,
        password,
        role,
      });

      const { accessToken, refreshToken, user: newUser } = result.data;

      tokenStorage.setTokens(accessToken, refreshToken);
      setUser(newUser);
      navigate('/dashboard');
    },
    [navigate]
  );

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async (): Promise<void> => {
    try {
      // Optional server-side logout (e.g. to invalidate refresh token).
      // Failure here must never prevent the client from logging out.
      await apiPost('/auth/logout');
    } catch {
      // Swallow silently — logout proceeds regardless of server response
    } finally {
      tokenStorage.clear();
      setUser(null);
      navigate('/login');
    }
  }, [navigate]);

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an <AuthProvider>.');
  }

  return context;
};