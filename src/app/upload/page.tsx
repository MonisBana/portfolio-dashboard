"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
    UploadCloud,
    FileText,
    CheckCircle2,
    Clock,
    AlertCircle,
    Banknote,
    Trash2,
    Pencil,
    RefreshCw,
    Loader2,
    Plus,
    Users,
    Unplug,
} from "lucide-react";
import { parseZerodhaExcel, PortfolioItem } from "@/lib/excel-parser";
import { usePortfolioStorage, UploadedFile } from "@/lib/storage";
import { useFamilyMembers } from "@/lib/family-members";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { zerodhaClient } from "@/lib/api/zerodha-client";
import { growwClient } from "@/lib/api/groww-client";
import { indMoneyClient } from "@/lib/api/indmoney-client";
import { vestedClient } from "@/lib/api/vested-client";
import { AddAccountDialog, Broker, BROKERS } from "@/components/add-account-dialog";
import { FamilyMembersDialog } from "@/components/family-members-dialog";
import { toast } from "sonner";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface ConnectionRow {
    broker: Broker;
    member: string;
    isConnected: boolean;
    tokenExpiresAt?: string;
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getStatusIcon(status: UploadedFile["status"]) {
    switch (status) {
        case "completed":
            return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
        case "processing":
            return <Clock className="h-4 w-4 text-yellow-500" />;
        case "failed":
            return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
}

function getStatusText(status: UploadedFile["status"]) {
    switch (status) {
        case "completed":
            return <span className="text-emerald-500">Completed</span>;
        case "processing":
            return <span className="text-yellow-500">Processing</span>;
        case "failed":
            return <span className="text-red-500">Failed</span>;
    }
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export default function UploadPage() {
    const {
        data,
        savePortfolio,
        uploadedFiles,
        addUploadedFile,
        updateUploadedFileStatus,
        removeUploadedFile,
        clearPortfolio,
    } = usePortfolioStorage();
    const { members } = useFamilyMembers();
    const familyNames = useMemo(
        () => members.length > 0 ? members.map(member => member.name) : ['Self'],
        [members]
    );

    // File upload state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [fileBroker, setFileBroker] = useState<string>("");
    const [fileOwner, setFileOwner] = useState<string>("Self");
    const [conversionRate, setConversionRate] = useState<number>(94.60);

    // Connection state
    const [connections, setConnections] = useState<ConnectionRow[]>([]);
    const [connectionsError, setConnectionsError] = useState<string | null>(null);
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
    const [accountDialogBroker, setAccountDialogBroker] = useState<Broker>('Zerodha');
    const [accountDialogMember, setAccountDialogMember] = useState('Self');
    const [isFamilyDialogOpen, setIsFamilyDialogOpen] = useState(false);
    const [syncingKey, setSyncingKey] = useState<string | null>(null);
    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const [usdInrRate, setUsdInrRate] = useState<number>(94.60);
    const [memberFilter, setMemberFilter] = useState<string>('All');

    // Manual Asset State
    const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
    const [manualType, setManualType] = useState<"Cash" | "Fixed Deposit">("Cash");
    const [manualAmount, setManualAmount] = useState<string>("");
    const [manualName, setManualName] = useState<string>("");
    const [manualOwner, setManualOwner] = useState<string>("Self");
    const [editingAssetIsin, setEditingAssetIsin] = useState<string | null>(null);

    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const didInit = useRef(false);

    useEffect(() => {
        const savedRate = localStorage.getItem("portfolio_usd_inr_rate");
        if (savedRate) {
            setUsdInrRate(parseFloat(savedRate));
        }
    }, []);

    useEffect(() => {
        if (familyNames.length > 0 && !familyNames.includes(fileOwner)) {
            setFileOwner(familyNames[0]);
        }
        if (familyNames.length > 0 && !familyNames.includes(manualOwner)) {
            setManualOwner(familyNames[0]);
        }
        if (memberFilter !== 'All' && !familyNames.includes(memberFilter)) {
            setMemberFilter('All');
        }
    }, [familyNames, fileOwner, manualOwner, memberFilter]);

    const loadConnections = useCallback(async () => {
        const results = await Promise.allSettled([
            growwClient.getStatus().then(status => status.accounts.map(account => ({
                broker: 'Groww' as Broker,
                member: account.accountName,
                isConnected: account.isConnected,
            }))),
            indMoneyClient.getStatus().then(status => status.accounts.map(account => ({
                broker: 'IndMoney' as Broker,
                member: account.accountName,
                isConnected: account.isConnected,
                tokenExpiresAt: account.tokenExpiresAt,
            }))),
            vestedClient.getStatus().then(status => (status.accounts || []).map(account => ({
                broker: 'Vested' as Broker,
                member: account.accountName,
                isConnected: account.isConnected,
                tokenExpiresAt: account.tokenExpiresAt,
            }))),
            zerodhaClient.getStatus().then(status => (status.accounts || []).map(account => ({
                broker: 'Zerodha' as Broker,
                member: account.accountName,
                isConnected: account.isConnected,
            }))),
        ]);

        const rows: ConnectionRow[] = [];
        let firstError: unknown = null;
        for (const result of results) {
            if (result.status === 'fulfilled') {
                rows.push(...result.value);
            } else if (!firstError) {
                firstError = result.reason;
            }
        }

        setConnections(rows);
        setConnectionsError(firstError ? getErrorMessage(firstError) : null);
    }, []);

    const syncConnection = useCallback(async (row: ConnectionRow) => {
        const key = `${row.broker}:${row.member}`;
        setSyncingKey(key);

        try {
            let holdings: PortfolioItem[];

            switch (row.broker) {
                case 'Zerodha':
                    holdings = await zerodhaClient.syncHoldings(row.member);
                    break;
                case 'Groww':
                    holdings = await growwClient.syncHoldings(row.member);
                    break;
                case 'IndMoney':
                    holdings = await indMoneyClient.syncHoldings(row.member, usdInrRate);
                    break;
                case 'Vested':
                    holdings = await vestedClient.syncHoldings(usdInrRate, row.member);
                    break;
            }

            await savePortfolio(holdings, row.broker, row.member);
            await addUploadedFile({
                id: `${Date.now()}-${row.broker}-${row.member}`,
                filename: `${row.broker} API Sync - ${row.member}`,
                size: 0,
                source: row.broker,
                owner: row.member,
                status: "completed",
                description: `API Sync - ${holdings.length} holdings`,
                uploadDate: new Date().toISOString(),
            });

            toast.success(`Synced ${holdings.length} holdings from ${row.broker} (${row.member})`);
            await loadConnections();
        } catch (error) {
            toast.error(`Sync failed for ${row.broker} (${row.member}): ${getErrorMessage(error)}`);
        } finally {
            setSyncingKey(null);
        }
    }, [savePortfolio, addUploadedFile, usdInrRate, loadConnections]);

    useEffect(() => {
        if (didInit.current) return;
        didInit.current = true;

        loadConnections();

        const params = new URLSearchParams(window.location.search);
        if (params.get('zerodha_connected') === 'true') {
            const member = params.get('zerodha_member')
                || sessionStorage.getItem('zerodha_pending_member')
                || 'Self';
            sessionStorage.removeItem('zerodha_pending_member');
            window.history.replaceState({}, '', '/upload');
            toast.success(`Zerodha connected for ${member}`);
            loadConnections().then(() => {
                void syncConnection({ broker: 'Zerodha', member, isConnected: true });
            });
        }
    }, [loadConnections, syncConnection]);

    const openAccountDialog = (broker: Broker = 'Zerodha', member: string = familyNames[0] || 'Self') => {
        setAccountDialogBroker(broker);
        setAccountDialogMember(member);
        setIsAccountDialogOpen(true);
    };

    const handleAccountConnected = useCallback(async (broker: Broker, member: string) => {
        await loadConnections();
        void syncConnection({ broker, member, isConnected: true });
    }, [loadConnections, syncConnection]);

    const handleSyncAll = async () => {
        const connectedRows = connections.filter(row => row.isConnected);
        if (connectedRows.length === 0) {
            toast.error('No connected accounts to sync');
            return;
        }

        setIsSyncingAll(true);
        try {
            for (const row of connectedRows) {
                await syncConnection(row);
            }
        } finally {
            setIsSyncingAll(false);
        }
    };

    const handleDisconnect = async (row: ConnectionRow) => {
        if (!confirm(`Disconnect ${row.broker} for ${row.member}?`)) {
            return;
        }

        try {
            switch (row.broker) {
                case 'Zerodha':
                    await zerodhaClient.disconnect(row.member);
                    break;
                case 'Groww':
                    await growwClient.disconnect(row.member);
                    break;
                case 'IndMoney':
                    await indMoneyClient.disconnect(row.member);
                    break;
                case 'Vested':
                    await vestedClient.disconnect(row.member);
                    break;
            }
            toast.success(`Disconnected ${row.broker} for ${row.member}`);
            await loadConnections();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleUsdInrRateChange = (value: string) => {
        const rate = parseFloat(value) || 0;
        setUsdInrRate(rate);
        localStorage.setItem("portfolio_usd_inr_rate", rate.toString());
    };

    const handleFileSelect = useCallback((file: File) => {
        setPendingFile(file);
        setFileBroker("");
        setFileOwner(familyNames[0] || 'Self');
        setIsDialogOpen(true);
    }, [familyNames]);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) {
                handleFileSelect(file);
            }
        },
        [handleFileSelect]
    );

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                handleFileSelect(file);
            }
            e.target.value = "";
        },
        [handleFileSelect]
    );

    const handleSubmit = useCallback(async () => {
        if (!pendingFile || !fileBroker) return;

        const newFileId = Date.now().toString();
        const newFile: UploadedFile = {
            id: newFileId,
            filename: pendingFile.name,
            size: pendingFile.size,
            source: fileBroker,
            owner: fileOwner,
            status: "processing",
            description: "Portfolio Import",
            uploadDate: new Date().toISOString(),
        };

        await addUploadedFile(newFile);
        setIsDialogOpen(false);

        try {
            let items;
            if (fileBroker === "Zerodha") {
                items = await parseZerodhaExcel(pendingFile);
            } else if (fileBroker === "Groww") {
                const { parseGrowwExcel } = await import("@/lib/excel-parser");
                items = await parseGrowwExcel(pendingFile);
            } else if (fileBroker === "Vested") {
                const { parseVestedExcel } = await import("@/lib/excel-parser");
                items = await parseVestedExcel(pendingFile, conversionRate);
            } else if (fileBroker === "IndMoney") {
                const { parseIndMoneyExcel } = await import("@/lib/excel-parser");
                items = await parseIndMoneyExcel(pendingFile, conversionRate);
            } else {
                throw new Error("Unsupported broker selected");
            }

            if (items) {
                const success = await savePortfolio(items, fileBroker, fileOwner);
                if (success) {
                    await updateUploadedFileStatus(newFileId, "completed");
                } else {
                    throw new Error("Failed to save data");
                }
            } else {
                throw new Error("No items parsed");
            }
        } catch (error) {
            console.error("Upload processing failed:", error);
            toast.error(getErrorMessage(error));
            await updateUploadedFileStatus(newFileId, "failed");
        }

        setPendingFile(null);
        setFileBroker("");
    }, [pendingFile, fileBroker, fileOwner, conversionRate, savePortfolio, addUploadedFile, updateUploadedFileStatus]);

    const handleCancel = useCallback(() => {
        setIsDialogOpen(false);
        setPendingFile(null);
        setFileBroker("");
        setConversionRate(94.60);
    }, []);

    const handleDeleteFile = useCallback(async (id: string, source: string, owner?: string) => {
        if (confirm("Are you sure you want to delete this file and its associated portfolio items?")) {
            await removeUploadedFile(id, source, owner || "Self");
        }
    }, [removeUploadedFile]);

    const handleClearAllData = useCallback(async () => {
        if (confirm("Are you sure you want to clear ALL portfolio data? This action cannot be undone.")) {
            await clearPortfolio();
        }
    }, [clearPortfolio]);

    const handleManualSubmit = useCallback(async () => {
        const amount = parseFloat(manualAmount);
        if (isNaN(amount) || amount <= 0) return;

        const existingManualItems = data?.items.filter(item =>
            item.source === "Manual" && (item.owner || "Self") === manualOwner
        ) || [];

        let updatedItems = existingManualItems;
        if (editingAssetIsin) {
            updatedItems = existingManualItems.filter(item => item.isin !== editingAssetIsin);
        }

        const newItem: PortfolioItem = {
            symbol: manualName || manualType,
            isin: editingAssetIsin || `IN:${manualType.toUpperCase().replace(/\s+/g, '_')}_${Date.now()}`,
            sector: manualType,
            instrumentType: manualType,
            quantity: 1,
            averagePrice: amount,
            currentValue: amount,
            pnl: 0,
            source: "Manual",
            owner: manualOwner,
        };

        await savePortfolio([...updatedItems, newItem], "Manual", manualOwner);

        setIsManualDialogOpen(false);
        setManualAmount("");
        setManualName("");
        setManualType("Cash");
        setEditingAssetIsin(null);
    }, [manualAmount, manualName, manualType, manualOwner, editingAssetIsin, data, savePortfolio]);

    const handleEditManualAsset = (item: PortfolioItem) => {
        setManualType(item.instrumentType as "Cash" | "Fixed Deposit");
        setManualAmount(item.currentValue.toString());
        setManualName(item.symbol === item.instrumentType ? "" : item.symbol);
        setManualOwner(item.owner || "Self");
        setEditingAssetIsin(item.isin);
        setIsManualDialogOpen(true);
    };

    const handleDeleteManualAsset = async (item: PortfolioItem) => {
        const itemOwner = item.owner || "Self";
        const remainingItems = data?.items.filter(existing =>
            existing.source === "Manual"
            && (existing.owner || "Self") === itemOwner
            && existing.isin !== item.isin
        ) || [];
        await savePortfolio(remainingItems, "Manual", itemOwner);
    };

    const matchesMemberFilter = (owner?: string) =>
        memberFilter === 'All' || (owner || 'Self') === memberFilter;

    const filteredConnections = connections.filter(row => matchesMemberFilter(row.member));
    const filteredUploadedFiles = uploadedFiles.filter(file => matchesMemberFilter(file.owner));
    const manualItems = (data?.items || []).filter(item =>
        item.source === "Manual" && matchesMemberFilter(item.owner)
    );

    const getLastSyncTime = (row: ConnectionRow) => uploadedFiles.find(file =>
        file.source === row.broker && (file.owner || 'Self') === row.member
    )?.uploadDate;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Upload & Connections</h1>
                        <p className="text-muted-foreground mt-1">
                            Add broker accounts, import files, and manage manual assets for your family.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setIsFamilyDialogOpen(true)} className="gap-2">
                            <Users className="h-4 w-4" />
                            Family Members
                        </Button>
                        <Button onClick={() => openAccountDialog()} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Account
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleClearAllData}
                            className="gap-2"
                            data-testid="clear-all-data-btn"
                        >
                            <Trash2 className="h-4 w-4" />
                            Clear All Data
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Family:</span>
                    <Button
                        size="sm"
                        variant={memberFilter === 'All' ? 'default' : 'outline'}
                        onClick={() => setMemberFilter('All')}
                    >
                        All
                    </Button>
                    {familyNames.map(name => (
                        <Button
                            key={name}
                            size="sm"
                            variant={memberFilter === name ? 'default' : 'outline'}
                            onClick={() => setMemberFilter(name)}
                        >
                            {name}
                        </Button>
                    ))}
                </div>

                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-lg">Connected Accounts</CardTitle>
                                <CardDescription>
                                    Sync holdings directly from your broker accounts.
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                    USD → INR
                                </label>
                                <Input
                                    type="number"
                                    value={usdInrRate}
                                    onChange={(event) => handleUsdInrRateChange(event.target.value)}
                                    className="h-8 w-24 text-sm"
                                    step="0.1"
                                />
                                <Button
                                    onClick={handleSyncAll}
                                    disabled={isSyncingAll || connections.filter(row => row.isConnected).length === 0}
                                    className="gap-2"
                                >
                                    {isSyncingAll ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4" />
                                    )}
                                    Sync All
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {connectionsError && (
                            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{connectionsError}</span>
                            </div>
                        )}

                        {filteredConnections.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <RefreshCw className="h-8 w-8 text-muted-foreground/50" />
                                <p className="mt-3 text-sm text-muted-foreground">
                                    No broker accounts connected{memberFilter === 'All' ? '' : ` for ${memberFilter}`}.
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-4 gap-2"
                                    onClick={() => openAccountDialog('Zerodha', memberFilter === 'All' ? familyNames[0] : memberFilter)}
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Account
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border/50 hover:bg-transparent">
                                        <TableHead className="font-semibold">Broker</TableHead>
                                        <TableHead className="font-semibold">Member</TableHead>
                                        <TableHead className="font-semibold">Status</TableHead>
                                        <TableHead className="font-semibold">Last Synced</TableHead>
                                        <TableHead className="w-[220px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredConnections.map(row => {
                                        const key = `${row.broker}:${row.member}`;
                                        const isSyncing = syncingKey === key;
                                        const lastSync = getLastSyncTime(row);

                                        return (
                                            <TableRow key={key} className="border-border/50">
                                                <TableCell className="font-medium">{row.broker}</TableCell>
                                                <TableCell>{row.member}</TableCell>
                                                <TableCell>
                                                    {row.isConnected ? (
                                                        <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                                                            <CheckCircle2 className="h-4 w-4" />
                                                            Connected
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                                            <AlertCircle className="h-4 w-4" />
                                                            Expired
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {row.isConnected ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => syncConnection(row)}
                                                                disabled={isSyncing}
                                                                className="gap-1"
                                                            >
                                                                {isSyncing ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <RefreshCw className="h-4 w-4" />
                                                                )}
                                                                Sync
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openAccountDialog(row.broker, row.member)}
                                                            >
                                                                Reconnect
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDisconnect(row)}
                                                            title="Disconnect"
                                                        >
                                                            <Unplug className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Drag & Drop Zone */}
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Upload Files</CardTitle>
                        <CardDescription>
                            Import a broker export file and choose the family member it belongs to.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className={`
                  relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200
                  ${isDragOver
                                    ? "border-primary bg-primary/10 scale-[1.02]"
                                    : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
                                }
                `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={handleFileInputChange}
                                accept=".csv,.xlsx,.xls,.json,.pdf"
                                data-testid="file-upload-input"
                            />
                            <div
                                className={`rounded-full p-4 transition-colors ${isDragOver ? "bg-primary/20" : "bg-muted/50"
                                    }`}
                            >
                                <UploadCloud
                                    className={`h-10 w-10 transition-colors ${isDragOver ? "text-primary" : "text-muted-foreground"
                                        }`}
                                />
                            </div>
                            <p className="mt-4 text-sm font-medium">
                                {isDragOver
                                    ? "Drop your file here"
                                    : "Drop files here or click to upload"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Supports CSV, Excel, JSON, and PDF files
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Manual Assets Card */}
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Manual Assets</CardTitle>
                            <CardDescription>Add Cash or Fixed Deposits manually</CardDescription>
                        </div>
                        <Button onClick={() => {
                            setEditingAssetIsin(null);
                            setManualType("Cash");
                            setManualAmount("");
                            setManualName("");
                            setManualOwner(familyNames[0] || "Self");
                            setIsManualDialogOpen(true);
                        }} variant="outline" size="sm" className="gap-2" data-testid="add-manual-asset-btn">
                            <Banknote className="h-4 w-4" />
                            Add Asset
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {manualItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <Banknote className="h-8 w-8 text-muted-foreground/50" />
                                <p className="mt-2 text-sm text-muted-foreground">
                                    No manual assets added
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border/50 hover:bg-transparent">
                                        <TableHead className="font-semibold">Asset Name</TableHead>
                                        <TableHead className="font-semibold">Member</TableHead>
                                        <TableHead className="font-semibold">Type</TableHead>
                                        <TableHead className="font-semibold">Amount</TableHead>
                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {manualItems.map((item) => (
                                        <TableRow key={item.isin} className="border-border/50">
                                            <TableCell className="font-medium">
                                                {item.symbol}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                                                    {item.owner || "Self"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                                                    {item.instrumentType}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-mono">
                                                ₹{item.currentValue.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        onClick={() => handleEditManualAsset(item)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleDeleteManualAsset(item)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Uploaded Files Table */}
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Uploaded Files</CardTitle>
                        <CardDescription>
                            View and manage your imported documents
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {filteredUploadedFiles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <FileText className="h-12 w-12 text-muted-foreground/50" />
                                <p className="mt-4 text-sm text-muted-foreground">
                                    No files uploaded yet
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border/50 hover:bg-transparent">
                                        <TableHead className="font-semibold">Filename</TableHead>
                                        <TableHead className="font-semibold">Size</TableHead>
                                        <TableHead className="font-semibold">Source</TableHead>
                                        <TableHead className="font-semibold">Owner</TableHead>
                                        <TableHead className="font-semibold">Status</TableHead>
                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUploadedFiles.map((file) => (
                                        <TableRow key={file.id} className="border-border/50">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    {file.filename}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground font-mono text-sm">
                                                {formatFileSize(file.size)}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                                                    {file.source}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                                                    {file.owner || "Self"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(file.status)}
                                                    {getStatusText(file.status)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDeleteFile(file.id, file.source, file.owner)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <AddAccountDialog
                    open={isAccountDialogOpen}
                    onOpenChange={setIsAccountDialogOpen}
                    members={familyNames}
                    initialBroker={accountDialogBroker}
                    initialMember={accountDialogMember}
                    onConnected={handleAccountConnected}
                />

                <FamilyMembersDialog
                    open={isFamilyDialogOpen}
                    onOpenChange={setIsFamilyDialogOpen}
                    onChanged={loadConnections}
                />

                {/* Upload Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Upload File</DialogTitle>
                            <DialogDescription>
                                {pendingFile
                                    ? `Configure upload for "${pendingFile.name}"`
                                    : "Configure your file upload"}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Broker / Source</label>
                                <Select value={fileBroker} onValueChange={setFileBroker}>
                                    <SelectTrigger data-testid="broker-select-trigger">
                                        <SelectValue placeholder="Select broker" />
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
                                <Select value={fileOwner} onValueChange={setFileOwner}>
                                    <SelectTrigger className="w-full" data-testid="owner-input">
                                        <SelectValue placeholder="Select member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {familyNames.map(name => (
                                            <SelectItem key={name} value={name}>
                                                {name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {(fileBroker === "Vested" || fileBroker === "IndMoney") && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">USD to INR Rate</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold">₹</span>
                                        <input
                                            type="number"
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            value={conversionRate}
                                            onChange={(e) => setConversionRate(Number(e.target.value))}
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                            )}

                        </div>
                        <DialogFooter className="gap-2 sm:gap-2">
                            <Button variant="outline" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit} disabled={!fileBroker} data-testid="upload-submit-btn">
                                Upload
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Manual Entry Dialog */}
                <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editingAssetIsin ? "Edit Manual Asset" : "Add Manual Asset"}</DialogTitle>
                            <DialogDescription>
                                Enter details for your manual asset entry
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Family Member</label>
                                <Select value={manualOwner} onValueChange={setManualOwner}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {familyNames.map(name => (
                                            <SelectItem key={name} value={name}>
                                                {name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Asset Type</label>
                                <Select value={manualType} onValueChange={(v) => setManualType(v as "Cash" | "Fixed Deposit")}>
                                    <SelectTrigger data-testid="manual-type-select">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cash">Cash</SelectItem>
                                        <SelectItem value="Fixed Deposit">Fixed Deposit</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Amount (INR)</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold">₹</span>
                                    <input
                                        type="number"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={manualAmount}
                                        onChange={(e) => setManualAmount(e.target.value)}
                                        placeholder="0.00"
                                        data-testid="manual-amount-input"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name (Optional)</label>
                                <input
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={manualName}
                                    onChange={(e) => setManualName(e.target.value)}
                                    placeholder={manualType === "Cash" ? "e.g., Savings Account" : "e.g., SBI FD"}
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-2">
                            <Button variant="outline" onClick={() => setIsManualDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleManualSubmit} disabled={!manualAmount} data-testid="manual-submit-btn">
                                {editingAssetIsin ? "Save Changes" : "Add Asset"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
