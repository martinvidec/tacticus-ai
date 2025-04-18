'use client';

import { useAuth } from '@/lib/contexts/AuthContext';

export default function AuthButton() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return <button className="px-4 py-2 text-sm font-semibold rounded-md bg-gray-700 text-gray-400 cursor-wait">Loading...</button>;
  }

  return user ? (
    <button onClick={signOut} className="px-4 py-2 text-sm font-semibold rounded-md bg-red-700 hover:bg-red-600 text-white transition-colors">
      Sign Out
    </button>
  ) : (
    <button onClick={signInWithGoogle} className="px-4 py-2 text-sm font-semibold rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors">
      Sign In with Google
    </button>
  );
} 