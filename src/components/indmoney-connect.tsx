"use client";

import { useState, useEffect } from "react";
import { indMoneyClient, IndMoneyAccountStatus } from "@/lib/api/indmoney-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Unplug, CheckCircle2, XCircle, Key, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface IndMoneyConnectProps {
    onSyncSuccess?: (holdings: any[], accountName: string) => void;
}

const DEFAULT_ACCOUNTS: IndMoneyAccountStatus[] = [
    { accountName: 'Self', isConnected: false },
    { accountName: 'Wife', isConnected: false },
];

export function IndMoneyConnect({ onSyncSuccess }: IndMoneyConnectProps) {
    const [accounts, setAccounts] = useState<IndMoneyAccountStatus[]>(DEFAULT_ACCOUNTS);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<'Self' | 'Wife'>('Self');
    const [bearerToken, setBearerToken] = useState('');
    const [rawHeaders, setRawHeaders] = useState('');
    const [conversionRate, setConversionRate] = useState<number>(85);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

    const loadStatus = async () => {
        try {
            const status = await indMoneyClient.getStatus();
            // Keep the default Self/Wife rows (and Connect buttons) visible even
            // if the API is unreachable or returns no accounts.
            setAccounts(status.accounts.length > 0 ? status.accounts : DEFAULT_ACCOUNTS);
            setStatusError(status.accounts.length > 0 ? null : 'Could not load account status from the portfolio API. Is the server running on port 3001?');
        } catch (error) {
            console.error('Failed to load INDMoney status:', error);
            setAccounts(DEFAULT_ACCOUNTS);
            setStatusError(error instanceof Error ? error.message : 'Failed to load INDMoney account status');
        }
    };

    useEffect(() => {
        loadStatus();
        const savedSyncTime = localStorage.getItem("indmoney_last_sync");
        if (savedSyncTime) setLastSyncTime(savedSyncTime);
        const savedRate = localStorage.getItem("indmoney_conversion_rate");
        if (savedRate) setConversionRate(parseFloat(savedRate));
    }, []);

    const parseRawHeaders = (raw: string) => {
        const lines = raw.split('\n');
        let parsedBearer = '';

        for (const line of lines) {
            const colonIdx = line.indexOf(':');
            if (colonIdx === -1) continue;
            const key = line.substring(0, colonIdx).trim().toLowerCase();
            const value = line.substring(colonIdx + 1).trim();

            if (key === 'authorization') {
                parsedBearer = value.replace(/^Bearer\s+/i, '');
            }
        }

        if (parsedBearer) {
            setBearerToken(parsedBearer);
            toast.success('Extracted Authorization token');
        } else {
            toast.error('Could not find Authorization header in pasted text');
        }
    };

    const handleRawHeadersPaste = (value: string) => {
        setRawHeaders(value);

        if (value.trim() && !value.includes(':')) {
            // Allow pasting just the token as a convenience.
            setBearerToken(value.trim().replace(/^Bearer\s+/i, ''));
            return;
        }

        if (value.includes(':')) {
            parseRawHeaders(value);
        } else {
            setBearerToken('');
        }
    };

    const handleAuthenticate = async () => {
        if (!bearerToken.trim()) {
            toast.error('Please paste the request headers or a Bearer token');
            return;
        }

        setIsAuthenticating(true);
        try {
            await indMoneyClient.authenticate(bearerToken.trim(), selectedAccount);
            toast.success(`${selectedAccount} account connected successfully`);
            setIsAuthDialogOpen(false);
            setBearerToken('');
            setRawHeaders('');
            await loadStatus();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save token');
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleSync = async (accountName?: 'Self' | 'Wife') => {
        setIsSyncing(true);
        try {
            localStorage.setItem("indmoney_conversion_rate", conversionRate.toString());
            const holdings = await indMoneyClient.syncHoldings(accountName, conversionRate);

            const syncTime = new Date().toISOString();
            setLastSyncTime(syncTime);
            localStorage.setItem("indmoney_last_sync", syncTime);

            toast.success(`Synced ${holdings.length} holdings from INDMoney${accountName ? ` (${accountName})` : ''}`);

            if (onSyncSuccess) {
                onSyncSuccess(holdings, accountName || 'Self');
            }
        } catch (error: any) {
            if (error.message === 'TOKEN_EXPIRED') {
                toast.error("Token expired. Please paste a new one from indmoney.com");
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
            await indMoneyClient.disconnect(accountName);
            toast.success(accountName ? `Disconnected ${accountName} account` : 'Disconnected all accounts');
            await loadStatus();
        } catch {
            toast.error('Failed to disconnect');
        }
    };

    const anyConnected = accounts.some(acc => acc.isConnected);

    const getExpiryText = (expiresAt?: string) => {
        if (!expiresAt) return 'Connected';
        const expiry = new Date(expiresAt);
        const now = new Date();
        const hoursLeft = Math.max(0, Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10);
        return `Expires in ~${hoursLeft}h`;
    };

    return (
        <>
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <img src="https://www.indmoney.com/favicon.ico" alt="INDMoney" className="h-5 w-5" />
                        INDMoney Integration (US Stocks)
                    </CardTitle>
                    <CardDescription>
                        Sync US stock holdings from INDMoney using browser tokens
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
                                            {account.isConnected ? getExpiryText(account.tokenExpiresAt) : 'Not connected'}
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
                                            title="Sync holdings"
                                        >
                                            {isSyncing ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <RefreshCw className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setSelectedAccount(account.accountName as 'Self' | 'Wife');
                                                setIsAuthDialogOpen(true);
                                            }}
                                            title="Update token"
                                        >
                                            <Key className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDisconnect(account.accountName as 'Self' | 'Wife')}
                                            title="Disconnect"
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

                    {/* Conversion Rate + Sync All */}
                    {anyConnected && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium whitespace-nowrap">USD to INR:</label>
                                <Input
                                    type="number"
                                    value={conversionRate}
                                    onChange={(e) => setConversionRate(parseFloat(e.target.value) || 85)}
                                    className="w-24 h-8 text-sm"
                                    step="0.1"
                                />
                            </div>
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
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Authentication Dialog */}
            <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Connect INDMoney - {selectedAccount}</DialogTitle>
                        <DialogDescription>
                            Paste the raw request headers from {selectedAccount === 'Self' ? 'your' : "your wife's"} browser session — the Authorization token is extracted automatically
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Paste Raw Request Headers</label>
                            <textarea
                                className="flex min-h-[140px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono text-xs"
                                placeholder={`authorization: Bearer eyJhbGciOi...`}
                                value={rawHeaders}
                                onChange={(e) => handleRawHeadersPaste(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Right-click the request → Copy → Copy Request Headers
                            </p>
                        </div>

                        {bearerToken && (
                            <div className="space-y-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <p className="text-xs font-medium text-emerald-600">Extracted token:</p>
                                <p className="text-xs font-mono truncate">{bearerToken.substring(0, 40)}...</p>
                            </div>
                        )}

                        <div className="text-xs text-muted-foreground space-y-2 bg-muted/50 p-3 rounded-lg">
                            <p className="font-medium">How to get the headers:</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Login to <span className="font-medium">indmoney.com</span> ({selectedAccount === 'Self' ? 'your account' : "wife's account"})</li>
                                <li>Open DevTools (F12) → Network tab</li>
                                <li>Navigate to US Stocks → Portfolio</li>
                                <li>Find any request to <span className="font-mono">apixt-us.indmoney.com</span></li>
                                <li>Right-click → <span className="font-medium">Copy → Copy Request Headers</span></li>
                                <li>Paste everything above</li>
                            </ol>
                            <p className="mt-2 text-yellow-600">Token expires in ~9 hours. You&apos;ll need to re-paste after expiry.</p>
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
                                    Saving...
                                </>
                            ) : (
                                'Save Token'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
