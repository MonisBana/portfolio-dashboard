"use client";

import { useState, useRef, useCallback } from "react";
import { UploadCloud, FileText, CheckCircle2, Clock, AlertCircle, Banknote, Trash2, Pencil } from "lucide-react";
import { parseZerodhaExcel, PortfolioItem } from "@/lib/excel-parser";
import { usePortfolioStorage, UploadedFile } from "@/lib/storage";

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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";



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

export default function UploadPage() {
    const { data, savePortfolio, uploadedFiles, addUploadedFile, updateUploadedFileStatus } = usePortfolioStorage();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [broker, setBroker] = useState<string>("");
    const [owner, setOwner] = useState<string>("Self");
    const [conversionRate, setConversionRate] = useState<number>(90.27);

    // Manual Asset State
    const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
    const [manualType, setManualType] = useState<"Cash" | "Fixed Deposit">("Cash");
    const [manualAmount, setManualAmount] = useState<string>("");
    const [manualName, setManualName] = useState<string>("");
    const [editingAssetIsin, setEditingAssetIsin] = useState<string | null>(null); // Track if editing

    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((file: File) => {
        setPendingFile(file);
        setIsDialogOpen(true);
    }, []);

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
            // Reset input so same file can be selected again
            e.target.value = "";
        },
        [handleFileSelect]
    );

    const handleSubmit = useCallback(async () => {
        if (!pendingFile || !broker) return;

        const newFileId = Date.now().toString();
        const newFile: UploadedFile = {
            id: newFileId,
            filename: pendingFile.name,
            size: pendingFile.size,
            source: broker,
            owner: owner,
            status: "processing",
            description: "Portfolio Import",
            uploadDate: new Date().toISOString(),
        };

        addUploadedFile(newFile);
        setIsDialogOpen(false);

        try {
            let items;
            if (broker === "Zerodha") {
                items = await parseZerodhaExcel(pendingFile);
            } else if (broker === "Groww") {
                const { parseGrowwExcel } = await import("@/lib/excel-parser");
                items = await parseGrowwExcel(pendingFile);
            } else if (broker === "Vested") {
                const { parseVestedExcel } = await import("@/lib/excel-parser");
                items = await parseVestedExcel(pendingFile, conversionRate);
            } else if (broker === "IndMoney") {
                const { parseIndMoneyExcel } = await import("@/lib/excel-parser");
                items = await parseIndMoneyExcel(pendingFile, conversionRate);
            } else {
                throw new Error("Unsupported broker selected");
            }

            if (items) {
                const success = savePortfolio(items, broker, owner);
                if (success) {
                    updateUploadedFileStatus(newFileId, "completed");
                } else {
                    throw new Error("Failed to save data");
                }
            } else {
                throw new Error("No items parsed");
            }

        } catch (error) {
            console.error("Upload processing failed:", error);
            updateUploadedFileStatus(newFileId, "failed");
        }

        setPendingFile(null);
        setBroker("");
        setOwner("Self");
    }, [pendingFile, broker, owner, conversionRate, savePortfolio, addUploadedFile, updateUploadedFileStatus]);

    const handleCancel = useCallback(() => {
        setIsDialogOpen(false);
        setPendingFile(null);
        setBroker("");
        setOwner("Self");
        setConversionRate(90.27);
    }, []);

    const handleManualSubmit = useCallback(() => {
        const amount = parseFloat(manualAmount);
        if (isNaN(amount) || amount <= 0) return;

        // Get existing manual items
        const existingManualItems = data?.items.filter(i => i.source === "Manual") || [];

        // If editing, find and replace, OR remove old one
        let updatedItems = existingManualItems;
        if (editingAssetIsin) {
            updatedItems = existingManualItems.filter(i => i.isin !== editingAssetIsin);
        }

        const newItem: PortfolioItem = {
            symbol: manualName || manualType,
            isin: editingAssetIsin || `IN:${manualType.toUpperCase()}_${Date.now()}`,
            sector: manualType,
            instrumentType: manualType,
            quantity: 1,
            averagePrice: amount,
            currentValue: amount,
            pnl: 0,
            source: "Manual",
            owner: "Self" // Manual assets default to Self for now
        };

        const newItems = [...updatedItems, newItem];

        savePortfolio(newItems, "Manual", "Self");

        setIsManualDialogOpen(false);
        setManualAmount("");
        setManualName("");
        setManualType("Cash");
        setEditingAssetIsin(null);
    }, [manualAmount, manualName, manualType, editingAssetIsin, data, savePortfolio]);

    const handleEditManualAsset = (item: PortfolioItem) => {
        setManualType(item.instrumentType as "Cash" | "Fixed Deposit");
        setManualAmount(item.currentValue.toString());
        setManualName(item.symbol === item.instrumentType ? "" : item.symbol);
        setEditingAssetIsin(item.isin);
        setIsManualDialogOpen(true);
    };

    const handleDeleteManualAsset = (isin: string) => {
        const existingManualItems = data?.items.filter(i => i.source === "Manual") || [];
        const newItems = existingManualItems.filter(i => i.isin !== isin);
        savePortfolio(newItems, "Manual", "Self");
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Upload</h1>
                <p className="text-muted-foreground mt-1">
                    Upload and manage your data files
                </p>
            </div>

            {/* Drag & Drop Zone */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                    <CardTitle className="text-lg">Upload Files</CardTitle>
                    <CardDescription>
                        Drag and drop files or click to browse
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
                        setIsManualDialogOpen(true);
                    }} variant="outline" size="sm" className="gap-2">
                        <Banknote className="h-4 w-4" />
                        Add Asset
                    </Button>
                </CardHeader>
                <CardContent>
                    {(!data?.items.some(i => i.source === "Manual")) ? (
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
                                    <TableHead className="font-semibold">Type</TableHead>
                                    <TableHead className="font-semibold">Amount</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.items.filter(i => i.source === "Manual").map((item) => (
                                    <TableRow key={item.isin} className="border-border/50">
                                        <TableCell className="font-medium">
                                            {item.symbol}
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
                                                    onClick={() => handleDeleteManualAsset(item.isin)}
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
                        View and manage your uploaded documents
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {uploadedFiles.length === 0 ? (
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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {uploadedFiles.map((file) => (
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
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

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
                            <Select value={broker} onValueChange={setBroker}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select broker" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Zerodha">Zerodha</SelectItem>
                                    <SelectItem value="Groww">Groww</SelectItem>
                                    <SelectItem value="Vested">Vested (US Stocks)</SelectItem>
                                    <SelectItem value="IndMoney">Ind Money (US Stocks)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Family Member</label>
                            <input
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={owner}
                                onChange={(e) => setOwner(e.target.value)}
                                placeholder="e.g. Self, Spouse"
                            />
                        </div>

                        {(broker === "Vested") && (
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
                        <Button onClick={handleSubmit} disabled={!broker}>
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
                            <label className="text-sm font-medium">Asset Type</label>
                            <Select value={manualType} onValueChange={(v: any) => setManualType(v)}>
                                <SelectTrigger>
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
                        <Button onClick={handleManualSubmit} disabled={!manualAmount}>
                            {editingAssetIsin ? "Save Changes" : "Add Asset"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
