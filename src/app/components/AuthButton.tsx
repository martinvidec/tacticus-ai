'use client';

import { useAuth } from '@/lib/hooks/useAuth';

export default function AuthButton() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return <div className="h-10 w-32 animate-pulse rounded bg-[rgba(var(--border-color),0.3)]"></div>;
  }

  return (
    <div>
      {user ? (
        <div className="flex items-center space-x-4">
          <span className="text-sm text-[rgb(var(--foreground-rgb),0.8)]">Codex Access: {user.displayName || user.email}</span>
          <button
            onClick={signOut}
            className="rounded bg-[rgb(var(--secondary-color))] px-4 py-2 text-sm text-white hover:brightness-110 transition-all duration-150 border border-red-400/50"
          >
            Purge Session
          </button>
        </div>
      ) : (
        <button
          onClick={signInWithGoogle}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors duration-150 border border-blue-500/50 shadow-md"
        >
          ++ Authenticate via Google Relay ++
        </button>
      )}
    </div>
  );
} 