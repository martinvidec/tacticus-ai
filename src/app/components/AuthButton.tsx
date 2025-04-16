'use client';

import { useAuth } from '@/lib/hooks/useAuth';

export default function AuthButton() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return <div className="h-8 w-24 animate-pulse rounded bg-gray-200"></div>;
  }

  return (
    <div>
      {user ? (
        <div className="flex items-center space-x-4">
          <span>Welcome, {user.displayName || user.email}</span>
          <button
            onClick={signOut}
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <button
          onClick={signInWithGoogle}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Sign in with Google
        </button>
      )}
    </div>
  );
} 