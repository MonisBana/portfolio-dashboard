"use client";

import { useState, useEffect } from "react";
import { vestedClient } from "@/lib/api/vested-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Unplug, CheckCircle2, XCircle, Key } from "lucide-react";
import { toast } from "sonner";

interface VestedConnectProps {
    onSyncSuccess?: (holdings: any[]) => void;
}

export function VestedConnect({ onSyncSuccess }: VestedConnectProps) {
    const [isConnected, setIsConnected] = useState(false);
    const [tokenExpiresAt, setTokenExpiresAt] = useState<string | undefined>();
    const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
    const [bearerToken, setBearerToken] = useState('');
    const [csrfToken, setCsrfToken] = useState('');
    const [cookie, setCookie] = useState('');
    const [rawHeaders, setRawHeaders] = useState('');
    const [conversionRate, setConversionRate] = useState<number>(85);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

    const loadStatus = async () => {
        try {
            const status = await vestedClient.getStatus();
            setIsConnected(status.isConnected);
            setTokenExpiresAt(status.tokenExpiresAt);
        } catch {
            setIsConnected(false);
        }
    };

    useEffect(() => {
        loadStatus();
        const savedSyncTime = localStorage.getItem("vested_last_sync");
        if (savedSyncTime) setLastSyncTime(savedSyncTime);
        const savedRate = localStorage.getItem("vested_conversion_rate");
        if (savedRate) setConversionRate(parseFloat(savedRate));
    }, []);

    const parseRawHeaders = (raw: string) => {
        const lines = raw.split('\n');
        let parsedBearer = '';
        let parsedCsrf = '';
        let parsedCookie = '';

        for (const line of lines) {
            const colonIdx = line.indexOf(':');
            if (colonIdx === -1) continue;
            const key = line.substring(0, colonIdx).trim().toLowerCase();
            const value = line.substring(colonIdx + 1).trim();

            if (key === 'authorization') {
                parsedBearer = value.replace(/^Bearer\s+/i, '');
            } else if (key === 'x-csrf-token') {
                parsedCsrf = value;
            } else if (key === 'cookie') {
                parsedCookie = value;
            }
        }

        if (parsedBearer) setBearerToken(parsedBearer);
        if (parsedCsrf) setCsrfToken(parsedCsrf);
        if (parsedCookie) setCookie(parsedCookie);

        if (parsedBearer) {
            toast.success(`Extracted: Bearer${parsedCsrf ? ' + CSRF' : ''}${parsedCookie ? ' + Cookie' : ''}`);
        } else {
            toast.error('Could not find Authorization header in pasted text');
        }
    };

    const handleRawHeadersPaste = (value: string) => {
        setRawHeaders(value);
        if (value.includes(':')) {
            parseRawHeaders(value);
        }
    };

    const handleAuthenticate = async () => {
        if (!bearerToken.trim()) {
            toast.error('Please paste your Bearer token or raw headers');
            return;
        }

        setIsAuthenticating(true);
        try {
            await vestedClient.authenticate(bearerToken.trim(), csrfToken.trim() || undefined, cookie.trim() || undefined);
            toast.success('Vested account connected successfully');
            setIsAuthDialogOpen(false);
            setBearerToken('');
            setCsrfToken('');
            setCookie('');
            setRawHeaders('');
            await loadStatus();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save token');
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            localStorage.setItem("vested_conversion_rate", conversionRate.toString());
            const holdings = await vestedClient.syncHoldings(conversionRate);

            const syncTime = new Date().toISOString();
            setLastSyncTime(syncTime);
            localStorage.setItem("vested_last_sync", syncTime);

            toast.success(`Synced ${holdings.length} holdings from Vested`);

            if (onSyncSuccess) {
                onSyncSuccess(holdings);
            }
        } catch (error: any) {
            if (error.message === 'TOKEN_EXPIRED') {
                toast.error("Token expired. Please paste a new one from app.vestedfinance.com");
                await loadStatus();
            } else {
                toast.error("Sync failed: " + error.message);
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            await vestedClient.disconnect();
            toast.success('Disconnected from Vested');
            await loadStatus();
        } catch {
            toast.error('Failed to disconnect');
        }
    };

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
                        <img src="https://app.vestedfinance.com/favicon.ico" alt="Vested" className="h-5 w-5" />
                        Vested Integration (US Stocks)
                    </CardTitle>
                    <CardDescription>
                        Sync US stock holdings from Vested Finance using browser tokens
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                            {isConnected ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : (
                                <XCircle className="h-5 w-5 text-gray-400" />
                            )}
                            <div>
                                <p className="font-medium">Self</p>
                                <p className="text-xs text-muted-foreground">
                                    {isConnected ? getExpiryText(tokenExpiresAt) : 'Not connected'}
                                </p>
                            </div>
                        </div>
                        {isConnected ? (
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleSync}
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
                                    onClick={() => setIsAuthDialogOpen(true)}
                                    title="Update token"
                                >
                                    <Key className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleDisconnect}
                                    title="Disconnect"
                                >
                                    <Unplug className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <Button
                                size="sm"
                                onClick={() => setIsAuthDialogOpen(true)}
                            >
                                Connect
                            </Button>
                        )}
                    </div>

                    {isConnected && (
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
                                    onClick={handleSync}
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
                                            Sync
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Connect Vested Finance</DialogTitle>
                        <DialogDescription>
                            Paste the raw request headers from DevTools — values are extracted automatically
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Paste Raw Request Headers</label>
                            <textarea
                                className="flex min-h-[140px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono text-xs"
                                placeholder={`Authorization: Bearer eyJhbGciOi...\nx-csrf-token: 82ec25e0-95ff-...\nCookie: _ga=GA1.1...; ...`}
                                value={rawHeaders}
                                onChange={(e) => handleRawHeadersPaste(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Right-click the request → Copy → Copy Request Headers
                            </p>
                        </div>

                        {bearerToken && (
                            <div className="space-y-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <p className="text-xs font-medium text-emerald-600">Extracted values:</p>
                                <div className="space-y-1 text-xs font-mono">
                                    <p className="truncate">Bearer: {bearerToken.substring(0, 40)}...</p>
                                    {csrfToken && <p>CSRF: {csrfToken}</p>}
                                    {cookie && <p className="truncate">Cookie: {cookie.substring(0, 50)}...</p>}
                                </div>
                            </div>
                        )}

                        <div className="text-xs text-muted-foreground space-y-2 bg-muted/50 p-3 rounded-lg">
                            <p className="font-medium">How to get the headers:</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Login to <span className="font-medium">app.vestedfinance.com</span></li>
                                <li>Open DevTools (F12) → Network tab</li>
                                <li>Navigate to your Dashboard</li>
                                <li>Find the request to <span className="font-mono">dashboard-v3</span></li>
                                <li>Right-click → <span className="font-medium">Copy → Copy Request Headers</span></li>
                                <li>Paste everything above</li>
                            </ol>
                            <p className="mt-2 text-yellow-600">Token expires in ~4 hours. You'll need to re-paste after expiry.</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAuthDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAuthenticate} disabled={isAuthenticating || !bearerToken.trim()}>
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
