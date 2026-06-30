"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import {
  DbInvitation,
  fetchPendingInvitationsForEmail,
  acceptGroupInvitation,
  declineGroupInvitation,
} from "@/lib/invitationsDb";
import { useRouter } from "next/navigation";

export default function NotificationsDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [invitations, setInvitations] = useState<DbInvitation[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.email) {
        setInvitations([]);
        return;
      }

      setUserEmail(user.email);
      setUserId(user.id);
      setUserName(user.user_metadata?.full_name || user.email.split("@")[0]);

      const pending = await fetchPendingInvitationsForEmail(user.email, user.id);
      setInvitations(pending);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();

    // Refresh notifications every 10 seconds or on window focus
    const interval = setInterval(() => {
      void loadNotifications();
    }, 10000);

    const onFocus = () => void loadNotifications();
    window.addEventListener("focus", onFocus);

    // Listen to custom invitation sent event
    const onInvitesUpdated = () => void loadNotifications();
    window.addEventListener("moneymap:invites-updated", onInvitesUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("moneymap:invites-updated", onInvitesUpdated);
    };
  }, [loadNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAccept = async (inv: DbInvitation) => {
    if (!userId || !userEmail) return;
    setActionLoadingId(inv.id);
    try {
      const success = await acceptGroupInvitation(inv.id, {
        id: userId,
        email: userEmail,
        name: userName || "Member",
      });
      if (success) {
        setInvitations((prev) => prev.filter((item) => item.id !== inv.id));
        // Redirect to groups page if not already there
        router.push("/groups");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (inv: DbInvitation) => {
    setActionLoadingId(inv.id);
    try {
      await declineGroupInvitation(inv.id);
      setInvitations((prev) => prev.filter((item) => item.id !== inv.id));
    } finally {
      setActionLoadingId(null);
    }
  };

  const badgeCount = invitations.length;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        title="Notifications"
      >
        <span className="text-base">🔔</span>
        {badgeCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-slate-950 shadow-sm">
            {badgeCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-80 sm:w-96 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-4 text-xs shadow-xl shadow-slate-900/10 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-50">Notifications</span>
                {badgeCount > 0 && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    {badgeCount} pending
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void loadNotifications()}
                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Refresh
              </button>
            </div>

            <div className="mt-3 max-h-80 overflow-y-auto space-y-2.5">
              {invitations.length === 0 ? (
                <div className="py-8 text-center text-slate-400 dark:text-slate-500">
                  <p className="text-lg">✨</p>
                  <p className="mt-1 text-xs font-medium">No new notifications</p>
                  <p className="mt-0.5 text-[11px]">You're all caught up!</p>
                </div>
              ) : (
                invitations.map((inv) => (
                  <motion.div
                    key={inv.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 p-3 dark:border-emerald-500/20 dark:bg-emerald-950/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Group Invitation
                        </p>
                        <p className="mt-1 text-xs text-slate-800 dark:text-slate-200">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {inv.inviter_name}
                          </span>{" "}
                          invited you to join{" "}
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                            "{inv.group_name}"
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={actionLoadingId === inv.id}
                        onClick={() => void handleAccept(inv)}
                        className="flex-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-center text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {actionLoadingId === inv.id ? "Joining..." : "Accept & Join"}
                      </button>
                      <button
                        type="button"
                        disabled={actionLoadingId === inv.id}
                        onClick={() => void handleDecline(inv)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
