import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ReceiptText, BarChart3 } from "lucide-react";
import { useLanguage } from "./LanguageContext";

export default function MobileTabBar({ currentPageName }) {
    const { t } = useLanguage();

    const tabs = [
        { name: "Expenses", label: t('expenses'), icon: ReceiptText },
        { name: "Reports", label: t('reports'), icon: BarChart3 },
    ];

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex"
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
                                ? "text-blue-600"
                                : "text-slate-500 hover:text-slate-700"
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