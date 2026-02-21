"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { PortfolioItem } from "./excel-parser";
import { UploadedFile as UploadedFileType } from "./types";
import { db } from "./db";
import { useState } from "react";

export interface PortfolioData {
    lastUpdated: string;
    items: PortfolioItem[];
}

export type UploadedFile = UploadedFileType; // Re-export type

// Pure function for merging portfolio items (Preserved for compatibility)
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

// Pure function for merging uploaded files (Preserved for compatibility)
export const mergeUploadedFiles = (currentFiles: UploadedFileType[], newFile: UploadedFileType): UploadedFileType[] => {
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
    // We use useLiveQuery for reactive DB updates
    const items = useLiveQuery(() => db.items.toArray());
    const uploadedFiles = useLiveQuery(() => db.files.toArray());

    // We can't easily get loading state from useLiveQuery (it returns undefined initially)
    // but practically for IDB it's fast. 
    // If items is undefined, it's loading.
    const isLoading = items === undefined || uploadedFiles === undefined;

    // Helper to construct the data object expected by consumers
    // We'll read lastUpdated from localStorage for simplicity as metadata
    // Or just default to current time if missing, since we don't have a metadata table yet.
    // For a "flawless" impl, we should store it.
    const lastUpdated = typeof window !== 'undefined' ? localStorage.getItem("portfolio_last_updated") || new Date().toISOString() : new Date().toISOString();

    const data: PortfolioData | null = items ? {
        lastUpdated,
        items
    } : null;

    const savePortfolio = async (newItems: PortfolioItem[], broker: string, owner: string = "Self") => {
        try {
            await db.transaction('rw', db.items, async () => {
                // 1. Delete existing items for the specific Broker + Owner
                // We can't rely on compound index easily for delete in one go with simple API, 
                // but we can find primary keys and bulkDelete.
                // Or simply: db.items.where({source: broker, owner: owner}).delete() 
                // BUT 'owner' might be optional/missing in DB vs "Self".
                // Let's be careful. The index is [source+owner].

                await db.items.where({ source: broker, owner: owner }).delete();

                // 2. Prepare new items
                const taggedItems = newItems.map(item => ({
                    ...item,
                    source: broker,
                    owner: owner
                }));

                // 3. Add new items
                await db.items.bulkAdd(taggedItems);
            });

            // Side effect: update timestamp
            localStorage.setItem("portfolio_last_updated", new Date().toISOString());

            return true;
        } catch (error) {
            console.error("Failed to save portfolio data", error);
            return false;
        }
    };

    const addUploadedFile = async (file: UploadedFileType) => {
        try {
            await db.transaction('rw', db.files, async () => {
                // Remove existing file for same source+owner if logic dictates
                // The original logic was: remove if source & owner match.
                await db.files.where({ source: file.source, owner: file.owner || "Self" }).delete();

                // Add new file
                await db.files.put(file);
            });
        } catch (error) {
            console.error("Failed to save file history", error);
        }
    };

    const updateUploadedFileStatus = async (id: string, status: UploadedFileType["status"]) => {
        try {
            await db.files.update(id, { status });
        } catch (error) {
            console.error("Failed to update file status", error);
        }
    };

    const clearPortfolio = async () => {
        try {
            await db.items.clear();
            await db.files.clear();
            localStorage.removeItem("portfolio_last_updated");
        } catch (error) {
            console.error("Failed to clear portfolio data", error);
        }
    };

    return {
        data,
        uploadedFiles: uploadedFiles || [],
        isLoading,
        savePortfolio,
        addUploadedFile,
        updateUploadedFileStatus,
        clearPortfolio,
    };
}
