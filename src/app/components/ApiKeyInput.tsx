'use client';

import { useState } from 'react';
import { Card, Title, TextInput, Button } from '@tremor/react';
import { KeyRound, AlertTriangle, CheckCircle } from 'lucide-react';
// Import the Server Action
import { saveUserApiKey } from '@/app/lib/actions'; 
// Import client-side auth to get token
import { auth } from "@/lib/firebase/firebase"; 

interface ApiKeyInputProps {
  onApiKeySaved: () => void;
}

export default function ApiKeyInput({ onApiKeySaved }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    if (!apiKey.trim()) {
        setError('API key must not be empty.');
        setIsLoading(false);
        return;
    }

    // Get the current user's ID token
    let idToken: string | undefined = undefined;
    try {
        if (!auth.currentUser) {
            throw new Error("Not logged in. Please reload the page.");
        }
        idToken = await auth.currentUser.getIdToken();
    } catch (tokenError: any) {
        console.error("Error getting ID token in ApiKeyInput:", tokenError);
        setError(tokenError.message || "Failed to retrieve authentication token.");
        setIsLoading(false);
        return;
    }

    if (!idToken) {
        setError("Could not retrieve authentication token.");
        setIsLoading(false);
        return;
    }

    try {
      // Call the Server Action with apiKey and idToken
      const result = await saveUserApiKey(apiKey, idToken);

      if (result.success) {
           setSuccess(true);
           setApiKey(''); 
           setTimeout(() => {
               // Potentially clear success message before calling back
               // setSuccess(false);
               onApiKeySaved();
           }, 1500); 
      } else {
        setError(result.error || 'An unknown error occurred.');
      }
    } catch (err: any) {
      console.error('Error calling saveUserApiKey action:', err);
      setError(err.message || 'Failed to save the API key. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)] p-4">
      <Card className="max-w-md w-full bg-[rgb(var(--highlight-bg))] border border-[rgb(var(--border-color))]">
        <Title className="text-xl font-bold text-center mb-4 text-[rgb(var(--primary-color))] flex items-center justify-center">
          <KeyRound className="mr-2" size={24} /> Tacticus API Key Required
        </Title>
        <p className="text-center text-sm mb-6 text-[rgb(var(--foreground-rgb),0.9)]">
          To retrieve your player and guild data, we need your personal Tacticus API key.
          You can find it in the settings of the Tacticus web app or the game (where available).
        </p>

        {/* Custom Alert for Error */} 
        {error && (
          <div className="mb-4 p-3 border border-red-400 bg-red-100 text-red-700 rounded-lg flex items-center space-x-2">
            <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {/* Custom Alert for Success */} 
        {success && (
           <div className="mb-4 p-3 border border-teal-400 bg-teal-100 text-teal-700 rounded-lg flex items-center space-x-2">
             <CheckCircle className="text-teal-500 flex-shrink-0" size={20} />
            <span className="text-sm">API key saved successfully. Reloading data...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium mb-1 text-[rgb(var(--foreground-rgb),0.9)]">
              Your Tacticus API Key
            </label>
            <TextInput
              id="apiKey"
              type="text" 
              placeholder="Enter your API key here"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isLoading || success} 
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            loading={isLoading}
            disabled={isLoading || success}
          >
            {isLoading ? 'Saving...' : 'Save API Key'}
          </Button>
        </form>
      </Card>
    </div>
  );
} 