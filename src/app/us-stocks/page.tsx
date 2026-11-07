"use client";

import { usePortfolioStorage } from "@/lib/storage";
import { DashboardView } from "@/components/dashboard-view";
import { useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function UsStocksPage() {
    const { data, isLoading } = usePortfolioStorage();
    const items = data?.items;

    const usItems = useMemo(() => {
        if (!items) return [];
        return items.filter(item => {
            const source = (item.source || "").toLowerCase();
            return source === "vested" || source === "indmoney";
        });
    }, [items]);

    return (
        <DashboardLayout>
            <DashboardView
                items={usItems}
                isLoading={isLoading}
                title="US Stocks"
                lastUpdated={data?.lastUpdated}
                showCountryChart={false}
            />
        </DashboardLayout>
    );
}
