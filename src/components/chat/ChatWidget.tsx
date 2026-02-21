"use client";

import React, { useState, useRef, useEffect } from "react";
import { useChat, useTool } from "@hashbrownai/react";
import { generateCSV, getPortfolioData } from "@/lib/tools/portfolio-tools";
import {
    useChatConfig,
    PROVIDER_MODELS,
    type ProviderName,
} from "./ChatProvider";
import { MessageCircle, X, Send, ChevronDown, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const { provider, setProvider, model, setModel } = useChatConfig();

    // Register tools via useTool hook
    const exportTool = useTool({
        name: "export_portfolio_csv",
        description:
            "Export the user's portfolio holdings to a CSV file and trigger a download. Use this when the user asks to download, export, or save their portfolio data.",
        handler: async () => {
            return await generateCSV();
        },
        deps: [],
    });

    const getDataTool = useTool({
        name: "get_portfolio_data",
        description:
            "Retrieve the current portfolio holdings data including all stocks, ETFs, mutual funds, their values, quantities, P&L, sectors, and broker sources. Use this to answer any question about the user's investments.",
        handler: async () => {
            return await getPortfolioData();
        },
        deps: [],
    });

    // Set up chat with useChat hook
    const { messages, sendMessage, isLoading, stop } = useChat({
        model,
        system: `You are a helpful financial portfolio assistant. You have access to tools to retrieve and export the user's portfolio data.

When the user asks about their portfolio, holdings, investments, stocks, or financial data, use the get_portfolio_data tool first to retrieve the current data, then answer based on what you find.

When the user asks to export, download, or save their data, use the export_portfolio_csv tool.

Be concise and helpful. Format currency values nicely (e.g., ₹1,23,456.78). When summarizing, highlight key metrics like total value, top performers, and allocation breakdown. Respond in clean text format not code.`,
        tools: [exportTool, getDataTool],
    });

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) {
            stop();
            return;
        }
        if (!inputValue.trim()) return;
        sendMessage({ role: "user", content: inputValue.trim() });
        setInputValue("");
    };

    const availableModels = PROVIDER_MODELS[provider];

    return (
        <>
            {/* Floating Action Button */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-4 right-4 z-50 rounded-full h-14 w-14 shadow-lg"
                size="icon"
            >
                {isOpen ? (
                    <X className="h-6 w-6" />
                ) : (
                    <MessageCircle className="h-6 w-6" />
                )}
            </Button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-20 right-4 z-50 w-[350px] md:w-[450px] h-[550px] bg-background border rounded-lg shadow-xl flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="p-3 border-b bg-muted/50 space-y-2">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-sm">
                                Portfolio Assistant
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="h-6 w-6"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Provider + Model Selectors */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <select
                                    value={provider}
                                    onChange={(e) =>
                                        setProvider(
                                            e.target.value as ProviderName
                                        )
                                    }
                                    className="w-full appearance-none bg-background text-foreground text-xs pl-2 pr-6 py-1.5 border border-border rounded-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    <option value="google">
                                        ☁️ Gemini (Cloud)
                                    </option>
                                    <option value="ollama">
                                        🖥️ Ollama (Local)
                                    </option>
                                </select>
                                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                            </div>
                            <div className="relative flex-1">
                                <select
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="w-full appearance-none bg-background text-foreground text-xs pl-2 pr-6 py-1.5 border border-border rounded-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    {availableModels.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1" ref={scrollRef}>
                        <div className="p-4 space-y-3">
                            {messages.length === 0 && (
                                <div className="text-center text-muted-foreground text-sm mt-10 space-y-1">
                                    <p>Ask something like:</p>
                                    <p className="italic">
                                        &quot;What is my total portfolio
                                        value?&quot;
                                    </p>
                                    <p className="italic">
                                        &quot;Export my data to CSV&quot;
                                    </p>
                                </div>
                            )}
                            {messages.map((m, index) => {
                                if (!('content' in m) || m.role === ("tool" as string)) return null;
                                if (m.role === "error") {
                                    return (
                                        <div
                                            key={index}
                                            className="flex justify-start"
                                        >
                                            <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 max-w-[85%] text-sm">
                                                Error: {m.content}
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                    <div
                                        key={index}
                                        className={cn(
                                            "flex w-full",
                                            m.role === "user"
                                                ? "justify-end"
                                                : "justify-start"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "rounded-lg px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap",
                                                m.role === "user"
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted"
                                            )}
                                        >
                                            {String(m.content ?? "")}
                                        </div>
                                    </div>
                                );
                            })}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground animate-pulse">
                                        Thinking...
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Input */}
                    <form
                        onSubmit={handleSend}
                        className="p-3 border-t flex gap-2"
                    >
                        <input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask about your portfolio..."
                            disabled={isLoading}
                            className="flex-1 text-sm bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!isLoading && !inputValue.trim()}
                            variant={isLoading ? "destructive" : "default"}
                        >
                            {isLoading ? (
                                <Square className="h-4 w-4 fill-current" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </form>
                </div>
            )}
        </>
    );
};
