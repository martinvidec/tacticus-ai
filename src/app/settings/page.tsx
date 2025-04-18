'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { saveUserApiKey, getUserApiKeyStatus } from '../../lib/actions';
import { Button, TextInput, Text } from '@tremor/react';
import { AlertCircle, CheckCircle, Info, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const [apiKey, setApiKey] = useState('');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [keyStatus, setKeyStatus] = useState<{ hasKey: boolean; maskedKey?: string; loading: boolean; error?: string }>({ 
        hasKey: false, 
        loading: true,
        error: undefined 
    });

    useEffect(() => {
        if (user && !authLoading) {
            setKeyStatus(prev => ({ ...prev, loading: true }));
            getUserApiKeyStatus(user.uid)
                .then(status => {
                    setKeyStatus({ ...status, loading: false });
                })
                .catch(err => {
                    console.error("Error fetching API key status:", err);
                    setKeyStatus({ hasKey: false, loading: false, error: 'Could not load API key status.' });
                });
        }
        if (!user && !authLoading) {
             setKeyStatus({ hasKey: false, loading: false, error: undefined });
        }
    }, [user, authLoading]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        if (!user) {
            setError("User not authenticated. Please log in.");
            return;
        }

        if (!apiKey.trim()) {
            setError("API Key cannot be empty if you intend to save/update.");
            return;
        }

        startTransition(async () => {
            if (!user) {
                setError("User session expired. Please log in again.");
                return;
            }
            try {
                const result = await saveUserApiKey(user.uid, apiKey);
                if (result.success) {
                    setSuccess("API Key saved successfully!");
                    setApiKey('');
                    const updatedStatus = await getUserApiKeyStatus(user.uid);
                    setKeyStatus({ ...updatedStatus, loading: false });
                } else {
                    setError(result.error || "Failed to save API key.");
                }
            } catch (err) {
                setError("An unexpected error occurred while saving.");
                console.error("Settings save error:", err);
            }
        });
    };

    const isLoading = authLoading || keyStatus.loading;

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><p>Loading settings...</p></div>;
    }

    if (!user) {
        return <div className="flex justify-center items-center h-screen"><p>Please log in to access settings.</p></div>;
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6 text-[rgb(var(--primary-color))] border-b border-[rgb(var(--border-color))] pb-2">Settings</h1>

            <div className="mb-6">
                 <Link href="/" className="inline-flex items-center text-sm text-[rgb(var(--primary-color))] hover:text-[rgba(var(--primary-color),0.8)] transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Player Intel
                </Link>
            </div>

            <div className="max-w-md mx-auto p-6 bg-[rgba(var(--background-start-rgb),0.7)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-center">Tacticus API Key</h2>
                
                {keyStatus.error && (
                    <div className="mb-4 flex items-center p-3 text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-md">
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>{keyStatus.error}</span>
                    </div>
                )}
                {keyStatus.hasKey && keyStatus.maskedKey && (
                     <div className="mb-4 flex items-center p-3 text-sm text-blue-300 bg-blue-900/30 border border-blue-700 rounded-md">
                        <Info className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>API Key configured: {keyStatus.maskedKey}</span>
                    </div>
                )}
                {!keyStatus.hasKey && !keyStatus.error && (
                     <p className="text-sm text-[rgb(var(--muted-foreground))] mb-4 text-center">Enter your Tacticus API key here. This key is required to fetch your game data.</p>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Text className="text-sm font-medium text-[rgb(var(--foreground))] mb-1 block">{keyStatus.hasKey ? 'Update API Key' : 'Enter API Key'}</Text>
                        <TextInput
                            type="password" 
                            value={apiKey}
                            onValueChange={setApiKey}
                            placeholder={keyStatus.hasKey ? "Enter new key to update" : "Enter your Tacticus API Key"}
                            disabled={isPending}
                            className="mt-1"
                            required
                        />
                    </div>

                    {error && (
                        <div className="flex items-center p-3 text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-md">
                            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center p-3 text-sm text-green-400 bg-green-900/30 border border-green-700 rounded-md">
                            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span>{success}</span>
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={isPending || !apiKey.trim()}
                        className="w-full bg-[rgb(var(--primary-color))] hover:bg-[rgba(var(--primary-color),0.8)] text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPending ? 'Saving...' : (keyStatus.hasKey ? 'Update Key' : 'Save Key')}
                    </Button>
                </form>
            </div>
        </main>
    );
} 