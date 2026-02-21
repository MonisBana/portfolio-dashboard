"use client";

import { usePortfolioStorage } from "@/lib/storage";
import { DashboardView } from "@/components/dashboard-view";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function DashboardPage() {
    const { data, isLoading } = usePortfolioStorage();

    return (
        <DashboardLayout>
            <DashboardView
                items={data?.items || []}
                isLoading={isLoading}
                lastUpdated={data?.lastUpdated}
                title="Overview"
            />
        </DashboardLayout>
    );
}
