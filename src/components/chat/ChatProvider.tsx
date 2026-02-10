"use client";

import React, { useState } from "react";
import { HashbrownProvider } from "@hashbrownai/react";

type ProviderName = "google" | "ollama";

const BACKEND_URLS: Record<ProviderName, string> = {
    google: "http://localhost:3001/api/chat/google",
    ollama: "http://localhost:3001/api/chat/ollama",
};

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
    const [providerName, setProviderName] = useState<ProviderName>("google");

    return (
        <HashbrownProvider url={BACKEND_URLS[providerName]}>
            {children}

            {/* Provider Switcher */}
            <div className="fixed bottom-4 left-4 z-50 bg-card border border-border p-2 rounded-lg shadow-md text-xs">
                <label className="text-muted-foreground mr-1">AI:</label>
                <select
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value as ProviderName)}
                    className="bg-background text-foreground p-1 border border-border rounded text-xs"
                >
                    <option value="google">Gemini (Cloud)</option>
                    <option value="ollama">Ollama (Local)</option>
                </select>
            </div>
        </HashbrownProvider>
    );
};
