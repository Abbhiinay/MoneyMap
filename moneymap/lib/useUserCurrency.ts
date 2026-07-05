import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const DEFAULT_CURRENCY = "USD";

type UseUserCurrencyResult = {
  currency: string;
  loading: boolean;
  error: string | null;
  updateCurrency: (next: string) => Promise<void>;
};

export function useUserCurrency(): UseUserCurrencyResult {
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadForUser = async (userId: string) => {
      try {
        setError(null);

        // 1. Try to read the existing profile.
        const { data: existing, error: selectError } = await supabase
          .from("profiles")
          .select("id, currency")
          .eq("id", userId)
          .maybeSingle();

        if (selectError) throw selectError;

        if (existing) {
          if (isMounted) setCurrency(existing.currency || DEFAULT_CURRENCY);
          return;
        }

        // 2. No row found — create one, but make it idempotent so a
        // concurrent create (race condition) doesn't throw a duplicate-key
        // error. ignoreDuplicates makes this a safe no-op if the row
        // actually already exists.
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert(
            { id: userId, currency: DEFAULT_CURRENCY },
            { onConflict: "id", ignoreDuplicates: true }
          );

        if (upsertError) throw upsertError;

        // 3. Re-read authoritatively — this covers both the "we just
        // created it" case and the "someone else created it a moment
        // before us" race, so we never show a stale default over a real
        // saved value.
        const { data: afterUpsert, error: reselectError } = await supabase
          .from("profiles")
          .select("id, currency")
          .eq("id", userId)
          .maybeSingle();

        if (reselectError) throw reselectError;

        if (isMounted) {
          setCurrency(afterUpsert?.currency || DEFAULT_CURRENCY);
        }
      } catch (e) {
        if (isMounted) {
          setError("Failed to load currency preference");
          setCurrency(DEFAULT_CURRENCY);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        if (isMounted) {
          setCurrency(DEFAULT_CURRENCY);
          setLoading(false);
        }
        return;
      }

      await loadForUser(session.user.id);
    };

    void init();

    // Re-run whenever auth state actually changes (sign in / token
    // refresh), instead of relying purely on component mount timing. This
    // protects against loading the hook before the session is fully
    // hydrated after a fresh login.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setLoading(true);
        void loadForUser(session.user.id);
      }
      if (event === "SIGNED_OUT") {
        if (isMounted) {
          setCurrency(DEFAULT_CURRENCY);
          setError(null);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const updateCurrency = async (next: string) => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("No authenticated user");

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, currency: next }, { onConflict: "id" });

      if (upsertError) throw upsertError;

      setCurrency(next);
    } catch (e) {
      setError("Failed to update currency preference");
    } finally {
      setLoading(false);
    }
  };

  return { currency, loading, error, updateCurrency };
}