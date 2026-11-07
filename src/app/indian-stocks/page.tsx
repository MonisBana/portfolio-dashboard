"use client";

import { usePortfolioStorage } from "@/lib/storage";
import { DashboardView } from "@/components/dashboard-view";
import { useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function IndianStocksPage() {
    const { data, isLoading } = usePortfolioStorage();
    const items = data?.items;

    const indianItems = useMemo(() => {
        if (!items) return [];
        return items.filter(item => {
            const source = (item.source || "").toLowerCase();
            return source === "zerodha" || source === "groww";
        });
    }, [items]);

    return (
        <DashboardLayout>
            <DashboardView
                items={indianItems}
                isLoading={isLoading}
                title="Indian Stocks"
                lastUpdated={data?.lastUpdated}
                showCountryChart={false}
            />
        </DashboardLayout>
    );
}
