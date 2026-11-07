"use client";

import { useState, useEffect } from "react";
import { growwClient, GrowwAccountStatus } from "@/lib/api/groww-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Unplug, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface GrowwConnectProps {
    onSyncSuccess?: () => void;
}

const DEFAULT_ACCOUNTS: GrowwAccountStatus[] = [
    { accountName: 'Self', isConnected: false },
    { accountName: 'Wife', isConnected: false },
];

export function GrowwConnect({ onSyncSuccess }: GrowwConnectProps) {
    const [accounts, setAccounts] = useState<GrowwAccountStatus[]>(DEFAULT_ACCOUNTS);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
    const [authMethod, setAuthMethod] = useState<'api-key' | 'totp'>('api-key');
    const [selectedAccount, setSelectedAccount] = useState<'Self' | 'Wife'>('Self');
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [totp, setTotp] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

    const loadStatus = async () => {
        try {
            const status = await growwClient.getStatus();
            // The API always returns the Self/Wife accounts. An empty list means
            // the request did not reach the API server, so keep the default rows
            // visible (with Connect buttons) instead of rendering an empty card.
            setAccounts(status.accounts.length > 0 ? status.accounts : DEFAULT_ACCOUNTS);
            setStatusError(status.accounts.length > 0 ? null : 'Could not load account status from the portfolio API. Is the server running on port 3001?');
        } catch (error) {
            console.error('Failed to load Groww status:', error);
            setAccounts(DEFAULT_ACCOUNTS);
            setStatusError(error instanceof Error ? error.message : 'Failed to load Groww account status');
        }
    };

    useEffect(() => {
        loadStatus();
        const savedSyncTime = localStorage.getItem("groww_last_sync");
        if (savedSyncTime) {
            setLastSyncTime(savedSyncTime);
        }
    }, []);

    const handleAuthenticate = async () => {
        if (authMethod === 'api-key' && (!apiKey || !apiSecret)) {
            toast.error('Please enter both API Key and API Secret');
            return;
        }

        if (authMethod === 'totp' && (!apiKey || !totp)) {
            toast.error('Please enter API Key and TOTP code');
            return;
        }

        setIsAuthenticating(true);
        try {
            if (authMethod === 'api-key') {
                await growwClient.authenticateWithApiKey(apiKey, apiSecret, selectedAccount);
            } else {
                await growwClient.authenticateWithTOTP(apiKey, totp, selectedAccount);
            }

            toast.success(`${selectedAccount} account connected successfully`);
            setIsAuthDialogOpen(false);
            setApiKey('');
            setApiSecret('');
            setTotp('');
            await loadStatus();
        } catch (error: any) {
            toast.error(error.message || 'Authentication failed');
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleSync = async (accountName?: 'Self' | 'Wife') => {
        setIsSyncing(true);
        try {
            const holdings = await growwClient.syncHoldings(accountName);

            const syncTime = new Date().toISOString();
            setLastSyncTime(syncTime);
            localStorage.setItem("groww_last_sync", syncTime);

            toast.success(`Synced ${holdings.length} holdings from Groww${accountName ? ` (${accountName})` : ''}`);

            if (onSyncSuccess) {
                onSyncSuccess();
            }
        } catch (error: any) {
            if (error.message === 'TOKEN_EXPIRED') {
                toast.error("Session expired. Please reconnect.");
                await loadStatus();
            } else {
                toast.error("Sync failed: " + error.message);
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDisconnect = async (accountName?: 'Self' | 'Wife') => {
        try {
            await growwClient.disconnect(accountName);
            toast.success(accountName ? `Disconnected ${accountName} account` : 'Disconnected all accounts');
            await loadStatus();
        } catch (error) {
            toast.error('Failed to disconnect');
        }
    };

    const anyConnected = accounts.some(acc => acc.isConnected);

    return (
        <>
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <img src="https://assets-netstorage.groww.in/web-assets/billion_groww_desktop/prod/_next/static/media/logo.8d41d39e.svg" alt="Groww" className="h-5 w-5" />
                        Groww Integration
                    </CardTitle>
                    <CardDescription>
                        Connect your Groww accounts to automatically sync portfolio holdings
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {statusError && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{statusError}</span>
                        </div>
                    )}

                    {/* Account Status */}
                    <div className="space-y-2">
                        {accounts.map(account => (
                            <div key={account.accountName} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                    {account.isConnected ? (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-gray-400" />
                                    )}
                                    <div>
                                        <p className="font-medium">{account.accountName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {account.isConnected ? 'Connected' : 'Not connected'}
                                        </p>
                                    </div>
                                </div>
                                {account.isConnected ? (
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleSync(account.accountName as 'Self' | 'Wife')}
                                            disabled={isSyncing}
                                        >
                                            {isSyncing ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <RefreshCw className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDisconnect(account.accountName as 'Self' | 'Wife')}
                                        >
                                            <Unplug className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setSelectedAccount(account.accountName as 'Self' | 'Wife');
                                            setIsAuthDialogOpen(true);
                                        }}
                                    >
                                        Connect
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Sync All Button */}
                    {anyConnected && (
                        <div className="flex items-center justify-between pt-2 border-t">
                            <div>
                                {lastSyncTime && (
                                    <p className="text-xs text-muted-foreground">
                                        Last synced: {new Date(lastSyncTime).toLocaleString()}
                                    </p>
                                )}
                            </div>
                            <Button
                                onClick={() => handleSync()}
                                disabled={isSyncing}
                                className="gap-2"
                            >
                                {isSyncing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Syncing...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-4 w-4" />
                                        Sync All
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Authentication Dialog */}
            <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Connect Groww - {selectedAccount}</DialogTitle>
                        <DialogDescription>
                            Enter your Groww API credentials to connect this account
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Authentication Method</label>
                            <Select value={authMethod} onValueChange={(v) => setAuthMethod(v as 'api-key' | 'totp')}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="api-key">API Key & Secret</SelectItem>
                                    <SelectItem value="totp">TOTP (Authenticator App)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">API Key</label>
                            <Input
                                type="text"
                                placeholder="Enter your API Key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                        </div>

                        {authMethod === 'api-key' ? (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">API Secret</label>
                                <Input
                                    type="password"
                                    placeholder="Enter your API Secret"
                                    value={apiSecret}
                                    onChange={(e) => setApiSecret(e.target.value)}
                                />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">TOTP Code</label>
                                <Input
                                    type="text"
                                    placeholder="Enter 6-digit TOTP code"
                                    value={totp}
                                    onChange={(e) => setTotp(e.target.value)}
                                    maxLength={6}
                                />
                            </div>
                        )}

                        <div className="text-xs text-muted-foreground space-y-1">
                            <p>Get your API credentials from:</p>
                            <a
                                href="https://groww.in/profile/settings/api"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                Groww Profile → Settings → Trading APIs
                            </a>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAuthDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAuthenticate} disabled={isAuthenticating}>
                            {isAuthenticating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                'Connect'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
