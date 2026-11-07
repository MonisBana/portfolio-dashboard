"use client";

import React, { createContext, useContext, useState } from "react";
import { HashbrownProvider } from "@hashbrownai/react";

export type ProviderName = "google" | "ollama";

export interface ModelOption {
    id: string;
    label: string;
}

export const PROVIDER_MODELS: Record<ProviderName, ModelOption[]> = {
    google: [
        { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
        { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
        { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
        { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ],
    ollama: [
        { id: "martain7r/finance-llama-8b:q4_k_m", label: "Finanace Llama 3.1 8B" },
        { id: "gpt-oss:20b", label: "GPT-OSS 20B" },
        { id: "deepseek-r1:8b", label: "DeepSeek R1" },
        { id: "qwen2.5-coder:latest", label: "Qwen Coder 2.5" },
    ],
};

const BACKEND_URLS: Record<ProviderName, string> = {
    google: "http://localhost:3001/api/chat/google",
    ollama: "http://localhost:3001/api/chat/ollama",
};

interface ChatConfigContextValue {
    provider: ProviderName;
    setProvider: (p: ProviderName) => void;
    model: string;
    setModel: (m: string) => void;
}

const ChatConfigContext = createContext<ChatConfigContextValue | null>(null);

export const useChatConfig = () => {
    const ctx = useContext(ChatConfigContext);
    if (!ctx) throw new Error("useChatConfig must be used within ChatProvider");
    return ctx;
};

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
    const [provider, setProvider] = useState<ProviderName>("google");
    const [model, setModel] = useState<string>(PROVIDER_MODELS.google[0].id);

    const handleSetProvider = (p: ProviderName) => {
        setProvider(p);
        setModel(PROVIDER_MODELS[p][0].id);
    };

    return (
        <ChatConfigContext.Provider
            value={{
                provider,
                setProvider: handleSetProvider,
                model,
                setModel,
            }}
        >
            <HashbrownProvider url={BACKEND_URLS[provider]}>
                {children}
            </HashbrownProvider>
        </ChatConfigContext.Provider>
    );
};
