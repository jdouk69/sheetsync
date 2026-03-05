import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Home, LogOut, Languages, User, ChevronLeft, Shield } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { LanguageProvider, useLanguage } from "./components/LanguageContext";
import { ProjectProvider } from "./components/ProjectContext";
import ProjectSelector from "./components/ProjectSelector";
import MobileTabBar from "./components/MobileTabBar";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";

function LayoutContent({ children, currentPageName }) {
    const { language, t, toggleLanguage } = useLanguage();
    const canGoBack = window.history.length > 1;
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const { data: user } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
        staleTime: 5 * 60 * 1000,
    });
    
    const handleLogout = () => {
        base44.auth.logout();
    };

    return (
        <div className="min-h-screen bg-slate-50 overflow-y-auto" style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <nav className="bg-white shadow-sm border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-2">
                                {canGoBack && (
                                    <button
                                        onClick={() => window.history.back()}
                                        className="md:hidden p-1 rounded-lg text-slate-600 hover:bg-slate-100 select-none"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                )}
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <Home className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-bold text-xl text-slate-900 select-none">{t('appName')}</span>
                            </div>
                            
                            <div className="hidden md:flex gap-2">
                                <Link
                                    to={createPageUrl('Expenses')}
                                    className={`px-4 py-2 rounded-lg transition-colors ${
                                        currentPageName === 'Expenses'
                                            ? 'bg-blue-100 text-blue-700 font-medium'
                                            : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    {t('expenses')}
                                </Link>
                                <Link
                                    to={createPageUrl('Reports')}
                                    className={`px-4 py-2 rounded-lg transition-colors ${
                                        currentPageName === 'Reports'
                                            ? 'bg-blue-100 text-blue-700 font-medium'
                                            : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    {t('reports')}
                                    </Link>
                                    </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                    <button
                                    onClick={toggleLanguage}
                                    className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                    title={language === 'en' ? 'Switch to Greek' : 'Αλλαγή σε Αγγλικά'}
                                    >
                                    <Languages className="w-4 h-4" />
                                    <span className="text-sm font-medium">{language === 'en' ? 'EL' : 'EN'}</span>
                                    </button>
                                    <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                    <LogOut className="w-4 h-4" />
                                    <span className="hidden md:inline">{t('logout')}</span>
                                    </button>
                                    </div>
                    </div>

                    <div className="border-t border-slate-200 py-3">
                        {user && (
                            <div className="flex items-center justify-between px-3 py-2 bg-slate-100 rounded-lg mb-3">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-slate-600" />
                                    <span className="text-sm font-medium text-slate-900 select-none">{user.full_name || user.email}</span>
                                </div>
                                {!showDeleteConfirm ? (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="text-xs text-red-500 hover:text-red-700 select-none"
                                    >
                                        Delete Account
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-red-600 font-medium">Sure?</span>
                                        <button
                                            onClick={async () => {
                                                await base44.auth.deleteAccount();
                                                base44.auth.logout();
                                            }}
                                            className="text-xs bg-red-600 text-white px-2 py-0.5 rounded hover:bg-red-700 select-none"
                                        >
                                            Yes
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="text-xs text-slate-500 hover:text-slate-700 select-none"
                                        >
                                            No
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        <ProjectSelector />
                    </div>


                </div>
            </nav>

            <main className="pb-16 md:pb-0">{children}</main>
            <MobileTabBar currentPageName={currentPageName} />
            <Toaster position="bottom-right" richColors />
        </div>
    );
}

export default function Layout({ children, currentPageName }) {
    return (
        <LanguageProvider>
            <ProjectProvider>
                <LayoutContent children={children} currentPageName={currentPageName} />
            </ProjectProvider>
        </LanguageProvider>
    );
}