"use client";

import { usePortfolioStorage } from "@/lib/storage";
import { DashboardView } from "@/components/dashboard-view";
import { useMemo } from "react";

export default function UsStocksPage() {
    const { data, isLoading } = usePortfolioStorage();

    const usItems = useMemo(() => {
        if (!data?.items) return [];
        return data.items.filter(item => {
            const source = (item.source || "").toLowerCase();
            return source === "vested" || source === "indmoney";
        });
    }, [data?.items]);

    return (
        <DashboardView
            items={usItems}
            isLoading={isLoading}
            title="US Stocks"
            lastUpdated={data?.lastUpdated}
            showCountryChart={false}
        />
    );
}
