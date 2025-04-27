'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { Button } from '@tremor/react';

export default function AuthButton() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return (
        <Button 
            variant="secondary"
            className="px-4 py-2 text-sm font-semibold rounded-md cursor-wait" 
            loading={true}
            disabled
        >
           Connecting...
        </Button>
    );
  }

  return user ? (
    <Button 
        onClick={signOut} 
        className="btn-terminate"
    >
      Terminate Connection
    </Button>
  ) : (
    <Button 
        onClick={signInWithGoogle} 
        variant="secondary"
        className="px-4 py-2 text-sm font-semibold rounded-md transition-colors"
    >
      Authenticate (Google Relay)
    </Button>
  );
} 