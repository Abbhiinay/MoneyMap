"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_CURRENCY = "USD";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const completeSignIn = async () => {
      const providerError = searchParams.get("error_description") ?? searchParams.get("error");
      if (providerError) {
        setError(providerError);
        return;
      }

      const code = searchParams.get("code");

      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error("Google sign-in did not return a user session.");

        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(
            { id: user.id, currency: DEFAULT_CURRENCY },
            { onConflict: "id", ignoreDuplicates: true }
          );

        if (profileError) throw profileError;
        if (mounted) router.replace("/dashboard");
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to complete sign-in.");
        }
      }
    };

    void completeSignIn();

    return () => {
      mounted = false;
    };
  }, [router, searchParams]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-xl dark:border-red-900/70 dark:bg-slate-900">
          <p className="text-sm font-semibold">Sign-in failed</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</p>
          <button
            type="button"
            onClick={() => router.replace("/auth")}
            className="mt-5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Back to login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm shadow-xl dark:border-slate-800 dark:bg-slate-900">
        Completing sign-in...
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm dark:bg-slate-950">
          Completing sign-in...
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
