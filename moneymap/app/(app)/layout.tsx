"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/sidebar"; // adjust if needed
import ThemeToggle from "@/app/components/theme-toggle";
import NotificationsDropdown from "@/app/components/notifications-dropdown";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const joinId = params.get("join");
          if (joinId) {
            sessionStorage.setItem("moneymap_join_group_id", joinId);
          }
        }
        router.replace("/auth");
      }
    });

    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const joinId = params.get("join");
          if (joinId) {
            sessionStorage.setItem("moneymap_join_group_id", joinId);
          }
        }
        router.replace("/auth");
      } else {
        setLoading(false);
        if (typeof window !== "undefined") {
          const storedJoinId = sessionStorage.getItem("moneymap_join_group_id");
          if (storedJoinId) {
            sessionStorage.removeItem("moneymap_join_group_id");
            router.replace(`/groups?join=${storedJoinId}`);
          }
        }
      }
    };

    checkUser();

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return <div className="p-6 text-sm text-slate-500 dark:text-slate-400">Checking authentication...</div>;
  }

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-slate-50 dark:bg-slate-950 lg:flex-row">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <div className="flex justify-end items-center gap-3 px-4 py-3 sm:px-6">
          <NotificationsDropdown />
          <ThemeToggle />
        </div>

        <main className="min-w-0 px-4 pb-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

