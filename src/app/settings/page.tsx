'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { saveUserApiKey, getUserApiKeyStatus, deleteUserApiKey } from '../../lib/actions';
import { Button, TextInput, Text } from '@tremor/react';
import { AlertCircle, CheckCircle, Info, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const [apiKey, setApiKey] = useState('');
    const [isPending, startTransition] = useTransition();
    const [isDeletePending, startDeleteTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
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

    const handleSaveSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        setShowDeleteConfirm(false);

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
                if (result.success && result.maskedKey) {
                    setSuccess("API Key saved successfully!");
                    setApiKey('');
                    setKeyStatus({ 
                        hasKey: true, 
                        maskedKey: result.maskedKey, 
                        loading: false, 
                        error: undefined 
                    });
                } else {
                    setError(result.error || "Failed to save API key.");
                    setKeyStatus(prev => ({...prev, loading: false}));
                }
            } catch (err) {
                setError("An unexpected error occurred while saving.");
                console.error("Settings save error:", err);
                setKeyStatus(prev => ({...prev, loading: false}));
            }
        });
    };

    const handleDeleteClick = () => {
        setError(null);
        setSuccess(null);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = () => {
        setError(null);
        setSuccess(null);
        if (!user) {
            setError("User not authenticated.");
            setShowDeleteConfirm(false);
            return;
        }
        startDeleteTransition(async () => {
             if (!user) {
                setError("User not authenticated.");
                setShowDeleteConfirm(false);
                return;
            }
            try {
                const result = await deleteUserApiKey(user.uid);
                if (result.success) {
                    setSuccess("API Key deleted successfully!");
                    setShowDeleteConfirm(false);
                    const updatedStatus = await getUserApiKeyStatus(user.uid);
                    setKeyStatus({ ...updatedStatus, loading: false });
                } else {
                    setError(result.error || "Failed to delete API key.");
                    setShowDeleteConfirm(false);
                }
            } catch (err) {
                 setError("An unexpected error occurred while deleting.");
                 console.error("Settings delete error:", err);
                 setShowDeleteConfirm(false);
            }
        });
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
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
                {success && (
                    <div className="mb-4 flex items-center p-3 text-sm text-green-400 bg-green-900/30 border border-green-700 rounded-md">
                        <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>{success}</span>
                    </div>
                )}
                {error && (
                    <div className="flex items-center p-3 text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-md">
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {keyStatus.hasKey && keyStatus.maskedKey && (
                     <div className="mb-4 flex items-center p-3 text-sm text-blue-300 bg-blue-900/30 border border-blue-700 rounded-md">
                        <Info className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>API Key configured: {keyStatus.maskedKey}</span>
                    </div>
                )}

                {keyStatus.hasKey ? (
                    <div className="space-y-4">
                        {!showDeleteConfirm ? (
                            <Button
                                variant="secondary"
                                color="red"
                                icon={Trash2}
                                onClick={handleDeleteClick}
                                disabled={isDeletePending}
                                className="w-full justify-center"
                            >
                                {isDeletePending ? 'Deleting...' : 'Delete API Key'}
                            </Button>
                        ) : (
                            <div className="p-4 border border-red-700 rounded-md bg-red-900/20 space-y-3">
                                <Text className="text-red-300 font-medium text-center">Are you sure you want to delete your API key? This cannot be undone.</Text>
                                <div className="flex justify-center space-x-3">
                                    <Button 
                                        variant="secondary"
                                        onClick={handleCancelDelete}
                                        disabled={isDeletePending}
                                    >
                                        Cancel
                                    </Button>
                                    <Button 
                                        color="red"
                                        onClick={handleConfirmDelete}
                                        loading={isDeletePending}
                                        disabled={isDeletePending}
                                    >
                                        Confirm Delete
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSaveSubmit} className="space-y-4">
                        <div>
                            <Text className="text-sm font-medium text-[rgb(var(--foreground))] mb-1 block">Enter API Key</Text>
                            <TextInput
                                type="password" 
                                value={apiKey}
                                onValueChange={setApiKey}
                                placeholder="Enter your Tacticus API Key"
                                disabled={isPending}
                                className="mt-1"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isPending || !apiKey.trim()}
                            loading={isPending}
                            className="w-full bg-[rgb(var(--primary-color))] hover:bg-[rgba(var(--primary-color),0.8)] text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                             Save Key
                        </Button>
                    </form>
                )}
            </div>
        </main>
    );
} 