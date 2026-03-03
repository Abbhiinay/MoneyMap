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

    const init = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        // If there's no authenticated user, just use the default currency.
        if (!user) {
          if (isMounted) {
            setCurrency(DEFAULT_CURRENCY);
          }
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id, currency")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        // If no profile row exists, create one with default currency.
        if (!data) {
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({ id: user.id, currency: DEFAULT_CURRENCY });

          if (insertError) throw insertError;

          if (isMounted) {
            setCurrency(DEFAULT_CURRENCY);
          }
        } else {
          if (isMounted) {
            setCurrency(data.currency || DEFAULT_CURRENCY);
          }
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

    void init();

    return () => {
      isMounted = false;
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

