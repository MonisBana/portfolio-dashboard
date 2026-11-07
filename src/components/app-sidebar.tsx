"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UploadCloud, IndianRupee, DollarSign } from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar";

const navItems = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Indian Stocks",
        url: "/indian-stocks",
        icon: IndianRupee,
    },
    {
        title: "US Stocks",
        url: "/us-stocks",
        icon: DollarSign,
    },
    {
        title: "Upload",
        url: "/upload",
        icon: UploadCloud,
    },
];

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b border-sidebar-border">
                <div className="flex items-center gap-2 px-2 py-3">
                    <Image
                        src="/brand/icon.svg"
                        alt="Portfolio Dashboard"
                        width={32}
                        height={32}
                        unoptimized
                        className="hidden h-8 w-8 rounded-lg group-data-[collapsible=icon]:block"
                    />
                    <Image
                        src="/brand/logo-sidebar.svg"
                        alt="Portfolio Dashboard"
                        width={133}
                        height={32}
                        unoptimized
                        className="h-8 w-auto group-data-[collapsible=icon]:hidden"
                        priority
                    />
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.url}
                                        tooltip={item.title}
                                    >
                                        <Link href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    );
}
