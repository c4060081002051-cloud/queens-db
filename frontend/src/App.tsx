import { useCallback, useEffect, useState } from "react";
import { apiUrl, authHeaders } from "./api/baseUrl";
import { LoginPage } from "./LoginPage";
import { PasswordResetPage } from "./PasswordResetPage";
import { Dashboard } from "./Dashboard";
import "./App.css";

const REMEMBER_KEY = "junior_school_remembered_email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type MeResponse = {
  user: {
    sub: string;
    role: string;
    email: string;
    twoFactorEnabled?: boolean;
  };
};

function maskEmailFor2fa(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local) return email;
  const vis = local.slice(0, Math.min(2, local.length)) + "•••";
  return `${vis}@${domain}`;
}

async function readJsonBody<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export default function App() {
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? "");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token"),
  );
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authView, setAuthView] = useState<"login" | "reset">("login");
  const [loginBanner, setLoginBanner] = useState<string | null>(null);
  const [pending2FA, setPending2FA] = useState<{
    token: string;
    maskedEmail: string;
    rememberEmail: boolean;
  } | null>(null);

  const refreshProfile = useCallback(async () => {
    const t = localStorage.getItem("token");
    if (!t) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await fetch(apiUrl("/api/auth/me"), {
        headers: authHeaders(),
      });
      const data = await readJsonBody<MeResponse & { error?: string }>(res);
      if (data === null) {
        setProfile(null);
        setProfileError("Something went wrong. Please try again.");
        return;
      }
      if (!res.ok) {
        setProfile(null);
        if (res.status === 401) {
          localStorage.removeItem("token");
          setToken(null);
          setProfileError(null);
          return;
        }
        if (res.status === 503 && data.error === "Database unavailable") {
          setProfileError(
            "Could not reach the database. Start MySQL, confirm backend/.env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME), then run: cd backend && npm run db:sync — or from the repo root: npm run db:sync",
          );
          return;
        }
        setProfileError(
          data.error ?? "Something went wrong. Please try again.",
        );
        return;
      }
      setProfile(data);
    } catch {
      setProfile(null);
      setProfileError(
        "We couldn’t connect to the server. Check your internet connection and try again.",
      );
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      void refreshProfile();
    } else {
      setProfile(null);
      setProfileError(null);
    }
  }, [token, refreshProfile]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // #region agent log
      fetch("http://127.0.0.1:7892/ingest/16abbfe8-e461-4655-b535-5e0791d093a7", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6885fa" },
        body: JSON.stringify({
          sessionId: "6885fa",
          runId: "initial",
          hypothesisId: "H1",
          location: "frontend/src/App.tsx:117",
          message: "frontend_runtime_error",
          data: { message: event.message ?? "unknown", file: event.filename ?? null },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    };
    const onUnhandled = (event: PromiseRejectionEvent) => {
      // #region agent log
      fetch("http://127.0.0.1:7892/ingest/16abbfe8-e461-4655-b535-5e0791d093a7", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6885fa" },
        body: JSON.stringify({
          sessionId: "6885fa",
          runId: "initial",
          hypothesisId: "H1",
          location: "frontend/src/App.tsx:134",
          message: "frontend_unhandled_rejection",
          data: { reasonType: typeof event.reason },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandled);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, []);

  const login = useCallback(
    async (opts: { rememberEmail: boolean }) => {
      setError(null);
      const trimmed = email.trim();
      if (!trimmed) {
        setError("Please enter your email address.");
        return;
      }
      if (!EMAIL_RE.test(trimmed)) {
        setError("Please enter a valid email address.");
        return;
      }
      if (!password) {
        setError("Please enter your password.");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(apiUrl("/api/auth/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmed,
            password,
            rememberMe: opts.rememberEmail,
          }),
        });
        const data = await readJsonBody<{
          token?: string;
          requiresTwoFactor?: boolean;
          twoFactorToken?: string;
          error?: string;
        }>(res);
        if (data === null) {
          setError("Something went wrong. Please try again.");
          return;
        }
        if (!res.ok) {
          if (res.status === 503 && data.error === "Database unavailable") {
            setError(
              "The service is temporarily unavailable. Please try again later.",
            );
            return;
          }
          if (res.status === 401) {
            setError("Invalid email or password.");
            return;
          }
          setError(data.error ?? "Sign-in failed. Please try again.");
          return;
        }
        if (data.requiresTwoFactor && data.twoFactorToken) {
          setPending2FA({
            token: data.twoFactorToken,
            maskedEmail: maskEmailFor2fa(trimmed),
            rememberEmail: opts.rememberEmail,
          });
          setLoginBanner(null);
          return;
        }
        if (!data.token) {
          setError("Sign-in failed. Please try again.");
          return;
        }
        localStorage.setItem("token", data.token);
        if (opts.rememberEmail) {
          localStorage.setItem(REMEMBER_KEY, trimmed);
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
        setToken(data.token);
        setPending2FA(null);
        setLoginBanner(null);
      } catch {
        setError(
          "We couldn’t connect to the server. Check your internet connection and try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [email, password],
  );

  const verifyTwoFactor = useCallback(
    async (otp: string) => {
      if (!pending2FA) return;
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(apiUrl("/api/auth/verify-login-2fa"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            twoFactorToken: pending2FA.token,
            otp,
          }),
        });
        const data = await readJsonBody<{ token?: string; error?: string }>(res);
        if (data === null) {
          setError("Something went wrong. Please try again.");
          return;
        }
        if (!res.ok) {
          if (res.status === 503 && data.error === "Database unavailable") {
            setError(
              "The service is temporarily unavailable. Please try again later.",
            );
            return;
          }
          setError(data.error ?? "Verification failed. Try again.");
          return;
        }
        if (!data.token) {
          setError("Verification failed. Please try again.");
          return;
        }
        localStorage.setItem("token", data.token);
        if (pending2FA.rememberEmail) {
          localStorage.setItem(REMEMBER_KEY, email.trim());
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
        setToken(data.token);
        setPending2FA(null);
        setPassword("");
        setLoginBanner(null);
      } catch {
        setError(
          "We couldn’t connect to the server. Check your internet connection and try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [pending2FA, email],
  );

  const cancelTwoFactor = useCallback(() => {
    setPending2FA(null);
    setPassword("");
    setError(null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setProfile(null);
    setProfileError(null);
    setError(null);
    setPassword("");
    setPending2FA(null);
  }, []);

  if (!token) {
    if (authView === "reset") {
      return (
        <PasswordResetPage
          onBack={() => {
            setAuthView("login");
            setError(null);
          }}
          onSuccess={() => {
            setAuthView("login");
            setPassword("");
            setLoginBanner("Password updated. Sign in with your new password.");
          }}
        />
      );
    }
    return (
      <LoginPage
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        onLogin={login}
        loading={loading}
        error={error}
        defaultRememberEmail={Boolean(localStorage.getItem(REMEMBER_KEY))}
        onForgotPassword={() => {
          setAuthView("reset");
          setError(null);
        }}
        successBanner={loginBanner}
        onDismissSuccessBanner={() => setLoginBanner(null)}
        twoFactorChallenge={
          pending2FA ? { maskedEmail: pending2FA.maskedEmail } : null
        }
        onVerifyTwoFactor={verifyTwoFactor}
        onCancelTwoFactor={cancelTwoFactor}
      />
    );
  }

  return (
    <Dashboard
      user={profile?.user ?? null}
      profileLoading={profileLoading}
      profileError={profileError}
      onRetryProfile={refreshProfile}
      onLogout={logout}
      onAccountUpdated={refreshProfile}
    />
  );
}
