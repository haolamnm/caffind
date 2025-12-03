import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  auth,
  onAuthStateChanged,
  loginWithEmail,
  signUpWithEmail,
  loginWithGoogle,
  loginWithGithub,
  logout as firebaseLogout,
  deleteAccount as firebaseDeleteAccount,
  type User,
} from "./firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLoginWithEmail = async (email: string, password: string) => {
    try {
      setError(null);
      await loginWithEmail(email, password);
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  const handleSignUpWithEmail = async (email: string, password: string) => {
    try {
      setError(null);
      await signUpWithEmail(email, password);
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  const handleLoginWithGoogle = async () => {
    try {
      setError(null);
      await loginWithGoogle();
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  const handleLoginWithGithub = async () => {
    try {
      setError(null);
      await loginWithGithub();
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  const handleLogout = async () => {
    try {
      setError(null);
      await firebaseLogout();
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setError(null);
      await firebaseDeleteAccount();
      setUser(null);
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    loading,
    error,
    loginWithEmail: handleLoginWithEmail,
    signUpWithEmail: handleSignUpWithEmail,
    loginWithGoogle: handleLoginWithGoogle,
    loginWithGithub: handleLoginWithGithub,
    logout: handleLogout,
    deleteAccount: handleDeleteAccount,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Firebase error codes
    const message = error.message;
    if (message.includes("auth/email-already-in-use")) {
      return "This email is already registered";
    }
    if (message.includes("auth/invalid-email")) {
      return "Invalid email address";
    }
    if (message.includes("auth/weak-password")) {
      return "Password should be at least 6 characters";
    }
    if (message.includes("auth/user-not-found")) {
      return "No account found with this email";
    }
    if (message.includes("auth/wrong-password")) {
      return "Incorrect password";
    }
    if (message.includes("auth/invalid-credential")) {
      return "Invalid credentials";
    }
    if (message.includes("auth/popup-closed-by-user")) {
      return "Sign in was cancelled";
    }
    if (message.includes("auth/account-exists-with-different-credential")) {
      return "Account exists with different sign-in method";
    }
    if (message.includes("auth/requires-recent-login")) {
      return "Please log in again before deleting your account";
    }
    return message;
  }
  return "An unexpected error occurred";
}
