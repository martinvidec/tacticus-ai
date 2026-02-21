'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { saveUserApiKey, getUserApiKeyStatus, deleteUserApiKey, saveClaudeApiKey, getClaudeApiKeyStatus, deleteClaudeApiKey } from '../../lib/actions';
import { Button, TextInput, Text, Select, SelectItem } from '@tremor/react';
import { AlertCircle, CheckCircle, Info, ArrowLeft, Trash2, Bot } from 'lucide-react';
import Link from 'next/link';
import { CLAUDE_MODELS, ClaudeModel } from '@/lib/validation';

export default function SettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const [apiKey, setApiKey] = useState('');
    const [isPending, startTransition] = useTransition();
    const [isDeletePending, startDeleteTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const [keyStatus, setKeyStatus] = useState<{ hasKey: boolean; maskedKey?: string; tacticusUserId?: string | null; loading: boolean; error?: string }>({
        hasKey: false,
        loading: true,
        tacticusUserId: null,
        error: undefined
    });

    // Claude API Key state
    const [claudeApiKey, setClaudeApiKey] = useState('');
    const [claudeModel, setClaudeModel] = useState<ClaudeModel>('claude-sonnet-4-20250514');
    const [isClaudePending, startClaudeTransition] = useTransition();
    const [isClaudeDeletePending, startClaudeDeleteTransition] = useTransition();
    const [claudeError, setClaudeError] = useState<string | null>(null);
    const [claudeSuccess, setClaudeSuccess] = useState<string | null>(null);
    const [showClaudeDeleteConfirm, setShowClaudeDeleteConfirm] = useState(false);
    const [claudeKeyStatus, setClaudeKeyStatus] = useState<{ hasKey: boolean; model?: string; loading: boolean; error?: string }>({
        hasKey: false,
        loading: true,
        error: undefined
    });

    useEffect(() => {
        if (user && !authLoading) {
            setKeyStatus(prev => ({ ...prev, loading: true }));
            setClaudeKeyStatus(prev => ({ ...prev, loading: true }));

            // Fetch both key statuses in parallel
            Promise.all([
                getUserApiKeyStatus(user.uid),
                getClaudeApiKeyStatus(user.uid)
            ]).then(([tacticusStatus, claudeStatus]) => {
                setKeyStatus({ ...tacticusStatus, loading: false });
                setClaudeKeyStatus({ ...claudeStatus, loading: false });
                if (claudeStatus.model && CLAUDE_MODELS.includes(claudeStatus.model as ClaudeModel)) {
                    setClaudeModel(claudeStatus.model as ClaudeModel);
                }
            }).catch(err => {
                console.error("Error fetching API key statuses:", err);
                setKeyStatus({ hasKey: false, loading: false, tacticusUserId: null, error: 'Could not load API key status.' });
                setClaudeKeyStatus({ hasKey: false, loading: false, error: 'Could not load Claude key status.' });
            });
        }
        if (!user && !authLoading) {
            setKeyStatus({ hasKey: false, loading: false, tacticusUserId: null, error: undefined });
            setClaudeKeyStatus({ hasKey: false, loading: false, error: undefined });
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
            setError("API Key cannot be empty.");
            return;
        }

        startTransition(async () => {
            if (!user) {
                setError("User session expired. Please log in again.");
                return;
            }
            let extractedTacticusId: string | null = null;
            
            // --- Step 1: Validate Key and Extract ID via API Route ---
            setSuccess("Validating API Key...");
            setError(null);
            try {
                const validationResponse = await fetch('/api/tacticus/validateKeyAndGetId', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey: apiKey.trim() })
                });

                const validationResult = await validationResponse.json();

                if (!validationResponse.ok || !validationResult.success) {
                    setError(validationResult.error || 'API Key validation failed.');
                    setSuccess(null);
                    return; // Stop if validation fails
                }
                
                // Validation successful
                extractedTacticusId = validationResult.tacticusUserId || null;
                if (extractedTacticusId) {
                    setSuccess("API Key validated successfully. Tacticus ID found.");
                } else {
                    // Key is valid, but ID couldn't be extracted (e.g., no raid entries for test season)
                    setSuccess("API Key validated successfully, but Tacticus ID could not be automatically linked yet."); 
                    console.warn("Tacticus ID not extracted during validation, will be saved as null.");
                }

            } catch (validationError) {
                console.error("Error calling validation API:", validationError);
                setError("Failed to contact validation service.");
                setSuccess(null);
                return;
            }
            // --- End Validation Step --- 

            // --- Step 2: Save Key and Extracted ID --- 
            setSuccess("Saving data...");
            try {
                // Pass the potentially null extracted ID
                const result = await saveUserApiKey(user.uid, apiKey.trim(), extractedTacticusId); 
                if (result.success && result.maskedKey) {
                    setSuccess("API Key saved and linked successfully!");
                    setApiKey('');
                    // Fetch updated status after save
                    const updatedStatus = await getUserApiKeyStatus(user.uid);
                    setKeyStatus({ ...updatedStatus, loading: false }); 
                } else {
                    setError(result.error || "Failed to save API key.");
                    setSuccess(null); // Clear intermediate success message
                    setKeyStatus(prev => ({...prev, loading: false})); 
                }
            } catch (err) {
                setError("An unexpected error occurred while saving.");
                setSuccess(null); // Clear intermediate success message
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

    // Claude API Key handlers
    const handleClaudeSaveSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setClaudeError(null);
        setClaudeSuccess(null);
        setShowClaudeDeleteConfirm(false);

        if (!user) {
            setClaudeError("User not authenticated. Please log in.");
            return;
        }

        if (!claudeApiKey.trim()) {
            setClaudeError("Claude API Key cannot be empty.");
            return;
        }

        if (!claudeApiKey.startsWith('sk-ant-')) {
            setClaudeError("Invalid Claude API Key format. Key should start with 'sk-ant-'.");
            return;
        }

        startClaudeTransition(async () => {
            if (!user) {
                setClaudeError("User session expired. Please log in again.");
                return;
            }

            try {
                const result = await saveClaudeApiKey(user.uid, claudeApiKey.trim(), claudeModel);
                if (result.success) {
                    setClaudeSuccess("Cogitator Link established successfully!");
                    setClaudeApiKey('');
                    const updatedStatus = await getClaudeApiKeyStatus(user.uid);
                    setClaudeKeyStatus({ ...updatedStatus, loading: false });
                } else {
                    setClaudeError(result.error || "Failed to save Claude API key.");
                }
            } catch (err) {
                setClaudeError("An unexpected error occurred while saving.");
                console.error("Claude settings save error:", err);
            }
        });
    };

    const handleClaudeDeleteClick = () => {
        setClaudeError(null);
        setClaudeSuccess(null);
        setShowClaudeDeleteConfirm(true);
    };

    const handleClaudeConfirmDelete = () => {
        setClaudeError(null);
        setClaudeSuccess(null);
        if (!user) {
            setClaudeError("User not authenticated.");
            setShowClaudeDeleteConfirm(false);
            return;
        }
        startClaudeDeleteTransition(async () => {
            if (!user) {
                setClaudeError("User not authenticated.");
                setShowClaudeDeleteConfirm(false);
                return;
            }
            try {
                const result = await deleteClaudeApiKey(user.uid);
                if (result.success) {
                    setClaudeSuccess("Cogitator Link purged successfully!");
                    setShowClaudeDeleteConfirm(false);
                    const updatedStatus = await getClaudeApiKeyStatus(user.uid);
                    setClaudeKeyStatus({ ...updatedStatus, loading: false });
                } else {
                    setClaudeError(result.error || "Failed to delete Claude API key.");
                    setShowClaudeDeleteConfirm(false);
                }
            } catch (err) {
                setClaudeError("An unexpected error occurred while deleting.");
                console.error("Claude settings delete error:", err);
                setShowClaudeDeleteConfirm(false);
            }
        });
    };

    const handleClaudeCancelDelete = () => {
        setShowClaudeDeleteConfirm(false);
    };

    const isLoading = authLoading || keyStatus.loading || claudeKeyStatus.loading;

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><p>Loading settings...</p></div>;
    }

    if (!user) {
        return <div className="flex justify-center items-center h-screen"><p>Please log in to access settings.</p></div>;
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6 text-[rgb(var(--primary-color))] border-b border-[rgb(var(--border-color))] pb-2">Interface Calibration</h1>

            <div className="mb-6">
                 <Link href="/" className="inline-flex items-center text-sm text-[rgb(var(--primary-color))] hover:text-[rgba(var(--primary-color),0.8)] transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Return to Status Report
                </Link>
            </div>

            <div className="max-w-md mx-auto p-6 bg-[rgba(var(--background-start-rgb),0.7)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-center">Tacticus Vox Key</h2>
                
                {keyStatus.error && (
                    <div className="mb-4 flex items-center p-3 text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-md">
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>++ Transmission Error: {keyStatus.error} ++</span>
                    </div>
                )}
                {success && (
                    <div className="mb-4 flex items-center p-3 text-sm text-green-400 bg-green-900/30 border border-green-700 rounded-md">
                        <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" /> 
                        <span>++ {success} ++</span>
                    </div>
                )}
                {error && (
                    <div className="flex items-center p-3 text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-md">
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>++ Error: {error} ++</span>
                    </div>
                )}
                {keyStatus.hasKey && keyStatus.maskedKey && (
                     <div className="mb-4 flex items-center p-3 text-sm text-[rgb(var(--primary-color))] bg-blue-900/30 border border-[rgb(var(--primary-color),0.4)] rounded-md">
                        <Info className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>Vox Key Secured: {keyStatus.maskedKey} {keyStatus.tacticusUserId ? `(Operative ID: ${keyStatus.tacticusUserId.substring(0,4)}...)` : '(Operative ID Link Pending)'}</span>
                    </div>
                )}

                {keyStatus.hasKey ? (
                    <div className="space-y-4">
                        {!showDeleteConfirm ? (
                            <Button
                                variant="secondary"
                                className="w-full justify-center hover:bg-thematic-red hover:border-thematic-red hover:text-white border border-thematic-red text-thematic-red"
                                icon={Trash2}
                                onClick={handleDeleteClick}
                                disabled={isDeletePending}
                            >
                                {isDeletePending ? 'Purging Key...' : 'Purge Vox Key'}
                            </Button>
                        ) : (
                            <div className="p-4 border border-thematic-red rounded-md bg-red-900/20 space-y-3">
                                <Text className="text-red-300 font-medium text-center">Purge the Vox Key? This action cannot be reversed. Confirm transmission.</Text>
                                <div className="flex justify-center space-x-3">
                                    <Button
                                        variant="secondary"
                                        onClick={handleCancelDelete}
                                        disabled={isDeletePending}
                                        className="border-gray-500 text-gray-300 hover:bg-gray-600"
                                    >
                                        Abort
                                    </Button>
                                    <Button
                                        className="bg-thematic-red border-thematic-red text-white hover:bg-red-700 hover:border-red-700"
                                        onClick={handleConfirmDelete}
                                        loading={isDeletePending}
                                        disabled={isDeletePending}
                                    >
                                        Confirm Purge
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSaveSubmit} className="space-y-4">
                        <div>
                            <Text className="text-sm font-medium text-[rgb(var(--foreground))] mb-1 block">Enter Vox Key</Text>
                            <TextInput
                                type="password"
                                value={apiKey}
                                onValueChange={setApiKey}
                                placeholder="Input Tacticus Vox Key..."
                                disabled={isPending}
                                className="mt-1"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isPending || !apiKey.trim()}
                            loading={isPending}
                            className="w-full font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                             Establish Vox Link
                        </Button>
                    </form>
                )}
            </div>

            {/* Claude API Key Section */}
            <div className="max-w-md mx-auto mt-8 p-6 bg-[rgba(var(--background-start-rgb),0.7)] border border-[rgb(var(--border-color))] rounded-lg shadow-md">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Bot className="w-6 h-6 text-thematic-red" />
                    <h2 className="text-xl font-semibold text-center">Cogitator Link</h2>
                </div>

                <Text className="text-xs text-gray-400 text-center mb-4">
                    Connect your Claude API key to enable the Cogitator AI assistant for tactical advice.
                </Text>

                {claudeKeyStatus.error && (
                    <div className="mb-4 flex items-center p-3 text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-md">
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>++ Transmission Error: {claudeKeyStatus.error} ++</span>
                    </div>
                )}
                {claudeSuccess && (
                    <div className="mb-4 flex items-center p-3 text-sm text-green-400 bg-green-900/30 border border-green-700 rounded-md">
                        <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>++ {claudeSuccess} ++</span>
                    </div>
                )}
                {claudeError && (
                    <div className="mb-4 flex items-center p-3 text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-md">
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>++ Error: {claudeError} ++</span>
                    </div>
                )}
                {claudeKeyStatus.hasKey && (
                    <div className="mb-4 flex items-center p-3 text-sm text-[rgb(var(--primary-color))] bg-blue-900/30 border border-[rgb(var(--primary-color),0.4)] rounded-md">
                        <Info className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>Cogitator Link Active (Model: {claudeKeyStatus.model || 'claude-sonnet-4-20250514'})</span>
                    </div>
                )}

                {claudeKeyStatus.hasKey ? (
                    <div className="space-y-4">
                        {!showClaudeDeleteConfirm ? (
                            <Button
                                variant="secondary"
                                className="w-full justify-center hover:bg-thematic-red hover:border-thematic-red hover:text-white border border-thematic-red text-thematic-red"
                                icon={Trash2}
                                onClick={handleClaudeDeleteClick}
                                disabled={isClaudeDeletePending}
                            >
                                {isClaudeDeletePending ? 'Purging Link...' : 'Purge Cogitator Link'}
                            </Button>
                        ) : (
                            <div className="p-4 border border-thematic-red rounded-md bg-red-900/20 space-y-3">
                                <Text className="text-red-300 font-medium text-center">Purge the Cogitator Link? This will disconnect the AI assistant.</Text>
                                <div className="flex justify-center space-x-3">
                                    <Button
                                        variant="secondary"
                                        onClick={handleClaudeCancelDelete}
                                        disabled={isClaudeDeletePending}
                                        className="border-gray-500 text-gray-300 hover:bg-gray-600"
                                    >
                                        Abort
                                    </Button>
                                    <Button
                                        className="bg-thematic-red border-thematic-red text-white hover:bg-red-700 hover:border-red-700"
                                        onClick={handleClaudeConfirmDelete}
                                        loading={isClaudeDeletePending}
                                        disabled={isClaudeDeletePending}
                                    >
                                        Confirm Purge
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleClaudeSaveSubmit} className="space-y-4">
                        <div>
                            <Text className="text-sm font-medium text-[rgb(var(--foreground))] mb-1 block">Claude API Key</Text>
                            <TextInput
                                type="password"
                                value={claudeApiKey}
                                onValueChange={setClaudeApiKey}
                                placeholder="sk-ant-..."
                                disabled={isClaudePending}
                                className="mt-1"
                                required
                            />
                            <Text className="text-xs text-gray-500 mt-1">
                                Get your API key from{' '}
                                <a
                                    href="https://console.anthropic.com/settings/keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[rgb(var(--primary-color))] hover:underline"
                                >
                                    console.anthropic.com
                                </a>
                            </Text>
                        </div>

                        <div>
                            <Text className="text-sm font-medium text-[rgb(var(--foreground))] mb-1 block">Preferred Model</Text>
                            <Select
                                value={claudeModel}
                                onValueChange={(val) => setClaudeModel(val as ClaudeModel)}
                                disabled={isClaudePending}
                            >
                                <SelectItem value="claude-sonnet-4-20250514">Claude 4 Sonnet (Latest)</SelectItem>
                                <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Fast)</SelectItem>
                                <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                            </Select>
                        </div>

                        <Button
                            type="submit"
                            disabled={isClaudePending || !claudeApiKey.trim()}
                            loading={isClaudePending}
                            className="w-full font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Establish Cogitator Link
                        </Button>
                    </form>
                )}
            </div>
        </main>
    );
} 