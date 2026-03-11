import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ReceiptText, BarChart3, Shield } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function MobileTabBar({ currentPageName }) {
    const { t } = useLanguage();
    const { data: user } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
        staleTime: 5 * 60 * 1000,
    });

    const tabs = [
        { name: "Expenses", label: t('expenses'), icon: ReceiptText },
        { name: "Reports", label: t('reports'), icon: BarChart3 },
        ...(user?.role === 'admin' ? [{ name: "Admin", label: "Admin", icon: Shield }] : []),
    ];

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            {tabs.map(({ name, label, icon: Icon }) => {
                const isActive = currentPageName === name;
                return (
                    <Link
                        key={name}
                        to={createPageUrl(name)}
                        className={`flex-1 flex flex-col items-center justify-center py-2 gap-1 select-none transition-colors ${
                            isActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}