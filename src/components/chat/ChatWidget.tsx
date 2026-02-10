"use client";

import React, { useState, useRef, useEffect } from "react";
import { useChat, useTool } from "@hashbrownai/react";
import { generateCSV, getPortfolioData } from "@/lib/tools/portfolio-tools";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

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
    const { messages, sendMessage, isLoading } = useChat({
        model: "gemini-2.5-flash",
        system: `You are a helpful financial portfolio assistant. You have access to tools to retrieve and export the user's portfolio data.

When the user asks about their portfolio, holdings, investments, stocks, or financial data, use the get_portfolio_data tool first to retrieve the current data, then answer based on what you find.

When the user asks to export, download, or save their data, use the export_portfolio_csv tool.

Be concise and helpful. Format currency values nicely (e.g., ₹1,23,456.78). When summarizing, highlight key metrics like total value, top performers, and allocation breakdown.`,
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
        if (!inputValue.trim() || isLoading) return;
        sendMessage({ role: "user", content: inputValue.trim() });
        setInputValue("");
    };

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
                <div className="fixed bottom-20 right-4 z-50 w-[350px] md:w-[450px] h-[500px] bg-background border rounded-lg shadow-xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-muted/50 flex justify-between items-center">
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
                                // Skip tool messages from display
                                if (m.role === "tool") return null;
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
                                            {m.content || ""}
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

                    <form
                        onSubmit={handleSend}
                        className="p-3 border-t flex gap-2"
                    >
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask about your portfolio..."
                            className="flex-1 text-sm"
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={isLoading || !inputValue.trim()}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            )}
        </>
    );
};
