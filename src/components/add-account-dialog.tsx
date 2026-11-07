"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { growwClient } from "@/lib/api/groww-client";
import { indMoneyClient } from "@/lib/api/indmoney-client";
import { vestedClient } from "@/lib/api/vested-client";
import { zerodhaClient } from "@/lib/api/zerodha-client";
import { addFamilyMember } from "@/lib/family-members";

export type Broker = 'Zerodha' | 'Groww' | 'IndMoney' | 'Vested';

export const BROKERS: { value: Broker; label: string }[] = [
    { value: 'Zerodha', label: 'Zerodha' },
    { value: 'Groww', label: 'Groww' },
    { value: 'IndMoney', label: 'IND Money (US Stocks)' },
    { value: 'Vested', label: 'Vested (US Stocks)' },
];

interface AddAccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    members: string[];
    initialBroker?: Broker;
    initialMember?: string;
    onConnected: (broker: Broker, member: string) => void | Promise<void>;
}

function parseHeaders(raw: string): Record<string, string> {
    const headers: Record<string, string> = {};
    for (const line of raw.split('\n')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;
        const key = line.substring(0, colonIdx).trim().toLowerCase();
        const value = line.substring(colonIdx + 1).trim();
        if (key) headers[key] = value;
    }
    return headers;
}

export function AddAccountDialog({
    open,
    onOpenChange,
    members,
    initialBroker = 'Zerodha',
    initialMember = 'Self',
    onConnected,
}: AddAccountDialogProps) {
    const [broker, setBroker] = useState<Broker>(initialBroker);
    const [member, setMember] = useState(initialMember);
    const [isConnecting, setIsConnecting] = useState(false);

    // Groww
    const [growwMethod, setGrowwMethod] = useState<'api-key' | 'totp'>('api-key');
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [totp, setTotp] = useState('');

    // IND Money / Vested raw headers
    const [rawHeaders, setRawHeaders] = useState('');

    // Inline family member creation
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');

    useEffect(() => {
        if (open) {
            setBroker(initialBroker);
            setMember(initialMember);
        }
    }, [open, initialBroker, initialMember]);

    useEffect(() => {
        if (members.length > 0 && !members.includes(member)) {
            setMember(members[0]);
        }
    }, [members, member]);

    const resetCredentials = () => {
        setApiKey('');
        setApiSecret('');
        setTotp('');
        setRawHeaders('');
        setNewMemberName('');
        setIsAddingMember(false);
    };

    const handleAddMember = async () => {
        if (!newMemberName.trim()) return;
        try {
            const created = await addFamilyMember(newMemberName);
            setMember(created.name);
            setNewMemberName('');
            setIsAddingMember(false);
            toast.success(`${created.name} added`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to add family member');
        }
    };

    const completeConnection = (brokerName: Broker, message: string) => {
        toast.success(message);
        resetCredentials();
        onOpenChange(false);
        void onConnected(brokerName, member);
    };

    const handleConnect = async () => {
        if (!member) {
            toast.error('Please select a family member');
            return;
        }

        setIsConnecting(true);
        try {
            if (broker === 'Zerodha') {
                sessionStorage.setItem('zerodha_pending_member', member);
                const loginUrl = await zerodhaClient.getLoginUrl(member);
                window.location.href = loginUrl;
                return;
            }

            if (broker === 'Groww') {
                if (!apiKey.trim()) {
                    toast.error('Please enter your Groww API Key');
                    return;
                }
                if (growwMethod === 'api-key' && !apiSecret.trim()) {
                    toast.error('Please enter your Groww API Secret');
                    return;
                }
                if (growwMethod === 'totp' && !totp.trim()) {
                    toast.error('Please enter your TOTP code');
                    return;
                }

                if (growwMethod === 'api-key') {
                    await growwClient.authenticateWithApiKey(apiKey.trim(), apiSecret.trim(), member);
                } else {
                    await growwClient.authenticateWithTOTP(apiKey.trim(), totp.trim(), member);
                }
                completeConnection('Groww', `Groww connected for ${member}`);
            }

            if (broker === 'IndMoney') {
                const headers = parseHeaders(rawHeaders);
                const token = (headers['authorization'] || (rawHeaders.includes(':') ? '' : rawHeaders))
                    .replace(/^Bearer\s+/i, '')
                    .trim();

                if (!token) {
                    toast.error('Could not find an Authorization header in the pasted text');
                    return;
                }

                await indMoneyClient.authenticate(token, member);
                completeConnection('IndMoney', `IND Money connected for ${member}`);
            }

            if (broker === 'Vested') {
                const headers = parseHeaders(rawHeaders);
                const token = (headers['authorization'] || (rawHeaders.includes(':') ? '' : rawHeaders))
                    .replace(/^Bearer\s+/i, '')
                    .trim();

                if (!token) {
                    toast.error('Could not find an Authorization header in the pasted text');
                    return;
                }

                await vestedClient.authenticate(
                    token,
                    headers['x-csrf-token'],
                    headers['cookie'],
                    member,
                );
                completeConnection('Vested', `Vested connected for ${member}`);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to connect account');
        } finally {
            setIsConnecting(false);
        }
    };

    const authorizationPreview = (() => {
        const headers = parseHeaders(rawHeaders);
        const rawToken = headers['authorization'] || (rawHeaders.includes(':') ? '' : rawHeaders);
        return rawToken.replace(/^Bearer\s+/i, '').trim();
    })();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Account</DialogTitle>
                    <DialogDescription>
                        Choose a broker and the family member it belongs to.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Broker / Source</label>
                            <Select value={broker} onValueChange={(value) => setBroker(value as Broker)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {BROKERS.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Family Member</label>
                            <Select value={member} onValueChange={setMember}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select member" />
                                </SelectTrigger>
                                <SelectContent>
                                    {members.map(name => (
                                        <SelectItem key={name} value={name}>
                                            {name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {!isAddingMember ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-2 px-0"
                            onClick={() => setIsAddingMember(true)}
                        >
                            <Plus className="h-4 w-4" />
                            Add new family member
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Input
                                value={newMemberName}
                                onChange={(event) => setNewMemberName(event.target.value)}
                                placeholder="e.g. Spouse, Father"
                                autoFocus
                            />
                            <Button type="button" size="sm" onClick={handleAddMember} disabled={!newMemberName.trim()}>
                                Add
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setIsAddingMember(false)}>
                                Cancel
                            </Button>
                        </div>
                    )}

                    <div className="border-t border-border/50 pt-4">
                        {broker === 'Zerodha' && (
                            <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">
                                    You will be redirected to Zerodha to log in. The selected family member will be linked after the callback.
                                </p>
                                <Button onClick={handleConnect} disabled={isConnecting} className="w-full">
                                    {isConnecting ? 'Redirecting...' : 'Continue to Zerodha'}
                                </Button>
                            </div>
                        )}

                        {broker === 'Groww' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Authentication Method</label>
                                    <Select value={growwMethod} onValueChange={(value) => setGrowwMethod(value as 'api-key' | 'totp')}>
                                        <SelectTrigger className="w-full">
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
                                    <Input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Enter your API Key" />
                                </div>

                                {growwMethod === 'api-key' ? (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">API Secret</label>
                                        <Input type="password" value={apiSecret} onChange={(event) => setApiSecret(event.target.value)} placeholder="Enter your API Secret" />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">TOTP Code</label>
                                        <Input value={totp} onChange={(event) => setTotp(event.target.value)} placeholder="Enter 6-digit TOTP code" maxLength={6} />
                                    </div>
                                )}

                                <p className="text-xs text-muted-foreground">
                                    Get credentials from Groww Profile → Settings → Trading APIs.
                                </p>
                                <Button onClick={handleConnect} disabled={isConnecting} className="w-full">
                                    {isConnecting ? 'Connecting...' : `Connect Groww for ${member}`}
                                </Button>
                            </div>
                        )}

                        {(broker === 'IndMoney' || broker === 'Vested') && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Paste Raw Request Headers</label>
                                    <textarea
                                        className="flex min-h-[140px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono text-xs"
                                        placeholder={`authorization: Bearer eyJhbGciOi...\nx-csrf-token: ...\ncookie: ...`}
                                        value={rawHeaders}
                                        onChange={(event) => setRawHeaders(event.target.value)}
                                    />
                                </div>

                                {authorizationPreview && (
                                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                                        <p className="text-xs font-medium text-emerald-600">Extracted token:</p>
                                        <p className="truncate text-xs font-mono">{authorizationPreview.substring(0, 40)}...</p>
                                    </div>
                                )}

                                <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                                    <p className="font-medium">How to get the headers:</p>
                                    <ol className="list-inside list-decimal space-y-1">
                                        <li>Log in to {broker === 'IndMoney' ? 'indmoney.com' : 'app.vestedfinance.com'} as {member}</li>
                                        <li>Open DevTools (F12) → Network tab</li>
                                        <li>{broker === 'IndMoney' ? 'Open US Stocks → Portfolio' : 'Open your Dashboard'}</li>
                                        <li>Find a request to {broker === 'IndMoney' ? 'apixt-us.indmoney.com' : 'dashboard-v3'}</li>
                                        <li>Right-click → Copy → Copy Request Headers</li>
                                        <li>Paste everything above</li>
                                    </ol>
                                </div>

                                <Button onClick={handleConnect} disabled={isConnecting || !authorizationPreview} className="w-full">
                                    {isConnecting ? 'Saving...' : `Connect ${broker === 'IndMoney' ? 'IND Money' : 'Vested'} for ${member}`}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConnecting}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
