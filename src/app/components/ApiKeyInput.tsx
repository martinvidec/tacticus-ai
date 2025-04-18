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
        setError('API Key darf nicht leer sein.');
        setIsLoading(false);
        return;
    }

    // Get the current user's ID token
    let idToken: string | undefined = undefined;
    try {
        if (!auth.currentUser) {
            throw new Error("Nicht eingeloggt. Bitte Seite neu laden.");
        }
        idToken = await auth.currentUser.getIdToken();
    } catch (tokenError: any) {
        console.error("Error getting ID token in ApiKeyInput:", tokenError);
        setError(tokenError.message || "Fehler beim Abrufen des Authentifizierungs-Tokens.");
        setIsLoading(false);
        return;
    }

    if (!idToken) {
        setError("Konnte Authentifizierungs-Token nicht abrufen.");
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
        setError(result.error || 'Ein unbekannter Fehler ist aufgetreten.');
      }
    } catch (err: any) {
      console.error('Error calling saveUserApiKey action:', err);
      setError(err.message || 'Fehler beim Speichern des API Keys. Bitte versuche es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)] p-4">
      <Card className="max-w-md w-full bg-[rgb(var(--highlight-bg))] border border-[rgb(var(--border-color))]">
        <Title className="text-xl font-bold text-center mb-4 text-[rgb(var(--primary-color))] flex items-center justify-center">
          <KeyRound className="mr-2" size={24} /> Tacticus API Key benötigt
        </Title>
        <p className="text-center text-sm mb-6 text-[rgb(var(--foreground-rgb),0.9)]">
          Um deine Spieler- und Gildendaten abrufen zu können, benötigen wir deinen persönlichen Tacticus API Key. 
          Du findest diesen in den Einstellungen der Tacticus Web App oder des Spiels (sofern verfügbar).
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
            <span className="text-sm">API Key erfolgreich gespeichert. Daten werden neu geladen...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium mb-1 text-[rgb(var(--foreground-rgb),0.9)]">
              Dein Tacticus API Key
            </label>
            <TextInput
              id="apiKey"
              type="text" 
              placeholder="Gib hier deinen API Key ein"
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
            {isLoading ? 'Speichern...' : 'API Key speichern'}
          </Button>
        </form>
      </Card>
    </div>
  );
} 