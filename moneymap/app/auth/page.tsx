"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type AuthMode = "login" | "signup";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccounts = {
  id: {
    initialize: (options: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
    }) => void;
    renderButton: (
      element: HTMLElement,
      options: {
        theme: "outline" | "filled_black" | "filled_blue";
        size: "large" | "medium" | "small";
        shape: "rectangular" | "pill" | "circle" | "square";
        width?: number;
        text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      }
    ) => void;
  };
};

declare global {
  interface Window {
    google?: {
      accounts?: GoogleAccounts;
    };
  }
}

const DEFAULT_CURRENCY = "USD";

async function ensureProfile(userId: string) {
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, currency: DEFAULT_CURRENCY },
      { onConflict: "id", ignoreDuplicates: true }
    );

  if (error) throw error;
}

function getRedirectUrl() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/auth/callback`;
}

function loadGoogleIdentityScript() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Google sign-in is only available in the browser."));
      return;
    }

    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google sign-in.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google sign-in."));
    document.head.appendChild(script);
  });
}

export default function AuthPage() {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const redirectIfSignedIn = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted && session) {
        router.replace("/dashboard");
      }
    };

    void redirectIfSignedIn();
    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    const renderGoogleButton = async () => {
      if (!clientId || !googleButtonRef.current) return;

      try {
        await loadGoogleIdentityScript();
        if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) return;

        googleButtonRef.current.innerHTML = "";
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            setError(null);
            setMessage(null);
            setGoogleLoading(true);

            try {
              if (!response.credential) {
                throw new Error("Google did not return a sign-in credential.");
              }

              const { data, error: signInError } = await supabase.auth.signInWithIdToken({
                provider: "google",
                token: response.credential,
              });

              if (signInError) throw signInError;
              if (data.user) {
                await ensureProfile(data.user.id);
              }

              router.replace("/dashboard");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Google sign-in failed.");
            } finally {
              setGoogleLoading(false);
            }
          },
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          width: 360,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to initialize Google sign-in.");
        }
      }
    };

    void renderGoogleButton();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (!email.trim() || password.length < 6) {
        throw new Error("Enter a valid email and a password with at least 6 characters.");
      }

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: getRedirectUrl(),
          },
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          await ensureProfile(data.user.id);
        }

        setMessage(
          data.session
            ? "Account created. Redirecting..."
            : "Check your email to confirm your signup."
        );

        if (data.session) {
          router.replace("/dashboard");
        }
        return;
      }

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) throw loginError;

      if (data.user) {
        await ensureProfile(data.user.id);
      }

      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === "signup";
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/60 lg:grid-cols-[1fr_1.1fr]">
        <section className="hidden bg-slate-950 p-8 text-white dark:bg-black lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-sm font-bold text-emerald-300 ring-1 ring-emerald-400/50">
              MM
            </div>
            <h1 className="mt-8 text-4xl font-semibold tracking-tight">
              MoneyMap
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
              Track spending, split group costs, and keep every balance in one calm workspace.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-lg font-semibold text-white">24/7</p>
              <p className="mt-1">Access</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-lg font-semibold text-white">OAuth</p>
              <p className="mt-1">Secure sign-in</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-lg font-semibold text-white">Sync</p>
              <p className="mt-1">Persistent data</p>
            </div>
          </div>
        </section>

        <section className="p-5 sm:p-8">
          <div className="mx-auto w-full max-w-md">
            <div className="lg:hidden">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-sm font-bold text-emerald-600 ring-1 ring-emerald-500/40 dark:text-emerald-300">
                MM
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">MoneyMap</h1>
            </div>

            <div className="mt-8 lg:mt-0">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {isSignup ? "Create your account" : "Welcome back"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {isSignup ? "Start managing your money." : "Sign in to continue."}
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Use email and password, or continue securely with Google.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm dark:bg-slate-800">
              {(["login", "signup"] as AuthMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setMode(item);
                    setError(null);
                    setMessage(null);
                  }}
                  className={`rounded-lg px-3 py-2 font-medium transition ${
                    mode === item
                      ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  {item === "login" ? "Login" : "Sign up"}
                </button>
              ))}
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleEmailAuth}>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={loading || googleLoading}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading || googleLoading}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              )}

              {message && (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Please wait..." : isSignup ? "Create account" : "Login"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              or
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            {googleClientId ? (
              <div className={googleLoading || loading ? "pointer-events-none opacity-60" : ""}>
                <div
                  ref={googleButtonRef}
                  className="flex min-h-11 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                Google sign-in needs NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
