"use client";

import { usePortfolioStorage } from "@/lib/storage";
import { DashboardView } from "@/components/dashboard-view";

export default function DashboardPage() {
    const { data, isLoading } = usePortfolioStorage();

    return (
        <DashboardView
            items={data?.items || []}
            isLoading={isLoading}
            title="Dashboard"
            lastUpdated={data?.lastUpdated}
        />
    );
}
