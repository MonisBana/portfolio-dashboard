"use client";

import { useEffect, useState } from "react";
import { PortfolioItem } from "./excel-parser";
export interface PortfolioData {
    lastUpdated: string;
    items: PortfolioItem[];
}

export interface UploadedFile {
    id: string;
    filename: string;
    size: number;
    source: string;
    owner?: string;
    status: "processing" | "completed" | "failed";
    description: string;
    uploadDate: string;
}

const STORAGE_KEY = "portfolio_data";
const FILES_STORAGE_KEY = "uploaded_files";

// Pure function for merging portfolio items
export const mergePortfolioItems = (currentItems: PortfolioItem[], newItems: PortfolioItem[], broker: string, owner: string): PortfolioItem[] => {
    // 1. Tag new items with source and owner
    const taggedNewItems = newItems.map(item => ({ ...item, source: broker, owner: owner }));

    // 2. Filter out OLD items from this specific broker AND owner
    const otherItems = currentItems.filter(item => {
        // Keep item if source is different
        if (item.source !== broker) return true;
        // Keep item if owner is different
        const itemOwner = item.owner || "Self";
        if (itemOwner !== owner) return true;

        return false;
    });

    // 3. Merge
    return [...otherItems, ...taggedNewItems];
};

// Pure function for merging uploaded files
export const mergeUploadedFiles = (currentFiles: UploadedFile[], newFile: UploadedFile): UploadedFile[] => {
    // Remove any existing files with the same source AND owner
    const fileOwner = newFile.owner || "Self";
    const otherFiles = currentFiles.filter(f => {
        if (f.source !== newFile.source) return true;
        const fOwner = f.owner || "Self";
        if (fOwner !== fileOwner) return true;
        return false;
    });

    return [newFile, ...otherFiles];
};

export function usePortfolioStorage() {
    const [data, setData] = useState<PortfolioData | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Load
    useEffect(() => {
        const load = () => {
            try {
                // Load Portfolio Data
                const storedData = localStorage.getItem(STORAGE_KEY);
                if (storedData) {
                    setData(JSON.parse(storedData));
                }

                // Load Uploaded Files
                const storedFiles = localStorage.getItem(FILES_STORAGE_KEY);
                if (storedFiles) {
                    setUploadedFiles(JSON.parse(storedFiles));
                }
            } catch (error) {
                console.error("Failed to load storage data", error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const savePortfolio = (newItems: PortfolioItem[], broker: string, owner: string = "Self") => {
        try {
            // Use functional update to ensure we work with latest data
            setData(prevData => {
                const currentItems = prevData?.items || [];
                const mergedItems = mergePortfolioItems(currentItems, newItems, broker, owner);

                const newData: PortfolioData = {
                    lastUpdated: new Date().toISOString(),
                    items: mergedItems,
                };

                // Side effect: Save to local storage
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));

                return newData;
            });
            return true;
        } catch (error) {
            console.error("Failed to save portfolio data", error);
            return false;
        }
    };

    const addUploadedFile = (file: UploadedFile) => {
        try {
            setUploadedFiles(prevFiles => {
                const newFiles = mergeUploadedFiles(prevFiles, file);
                localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(newFiles));
                return newFiles;
            });
        } catch (error) {
            console.error("Failed to save file history", error);
        }
    };

    const updateUploadedFileStatus = (id: string, status: UploadedFile["status"]) => {
        try {
            setUploadedFiles(prevFiles => {
                const newFiles = prevFiles.map(f => f.id === id ? { ...f, status } : f);
                localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(newFiles));
                return newFiles;
            });
        } catch (error) {
            console.error("Failed to update file status", error);
        }
    };

    const clearPortfolio = () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
            setData(null);
            // Optional: Clear files too? Maybe keep history.
        } catch (error) {
            console.error("Failed to clear portfolio data", error);
        }
    };

    return {
        data,
        uploadedFiles,
        isLoading,
        savePortfolio,
        addUploadedFile,
        updateUploadedFileStatus,
        clearPortfolio,
    };
}
