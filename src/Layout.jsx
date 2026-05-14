import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Home, LogOut, Languages, ChevronLeft, Shield, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { LanguageProvider, useLanguage } from "./components/LanguageContext";
import { ProjectProvider } from "./components/ProjectContext";
import ProjectSelector from "./components/ProjectSelector";
import MobileTabBar from "./components/MobileTabBar";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";

function LayoutContent({ children, currentPageName }) {
    const { language, t, toggleLanguage } = useLanguage();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDeleteAccount = async () => {
        setDeleting(true);
        try {
            const me = await base44.auth.me();
            await base44.entities.User.delete(me.id);
            base44.auth.logout();
        } catch (error) {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    // Show back button only on sub-pages (not main nav pages)
    const mainPages = ['/', '/Expenses', '/Reports', '/Admin'];
    const canGoBack = !mainPages.includes(window.location.pathname);

    const { data: user } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
        staleTime: 5 * 60 * 1000,
    });
    
    const handleLogout = () => {
        base44.auth.logout();
    };

    return (
        <div className="h-screen bg-slate-50 flex flex-col overflow-hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <style>{`
            html, body { overscroll-behavior: none; -webkit-overflow-scrolling: touch; }
            button, [role="tab"], nav, [role="navigation"] { user-select: none; -webkit-user-select: none; }
            @media (prefers-color-scheme: dark) { html { color-scheme: light !important; } }
        `}</style>
            <nav className="bg-card shadow-sm border-b border-border">
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
                                <span className="font-bold text-xl text-foreground select-none">SheetSync</span>
                            </div>
                            
                            <div className="hidden md:flex gap-2">
                                <Link
                                    to={createPageUrl('Expenses')}
                                    className={`px-4 py-2 rounded-lg transition-colors ${
                                        currentPageName === 'Expenses'
                                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100 font-medium'
                                            : 'text-muted-foreground hover:bg-accent'
                                    }`}
                                >
                                    {t('expenses')}
                                </Link>
                                <Link
                                    to={createPageUrl('Reports')}
                                    className={`px-4 py-2 rounded-lg transition-colors ${
                                        currentPageName === 'Reports'
                                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100 font-medium'
                                            : 'text-muted-foreground hover:bg-accent'
                                    }`}
                                >
                                    {t('reports')}
                                </Link>
                                {user?.role === 'admin' && (
                                    <Link
                                        to={createPageUrl('Admin')}
                                        className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                                            currentPageName === 'Admin'
                                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100 font-medium'
                                                : 'text-muted-foreground hover:bg-accent'
                                        }`}
                                    >
                                        <Shield className="w-4 h-4" />
                                        Admin
                                    </Link>
                                )}
                                    </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                    <button
                                    onClick={toggleLanguage}
                                    className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                                    title={language === 'en' ? 'Switch to Greek' : 'Αλλαγή σε Αγγλικά'}
                                    >
                                    <Languages className="w-4 h-4" />
                                    <span className="text-sm font-medium">{language === 'en' ? 'EL' : 'EN'}</span>
                                    </button>
                                    <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title={t('deleteMyAccount')}
                                    >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="hidden md:inline text-sm">{t('deleteAccount')}</span>
                                    </button>
                                    <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                                    >
                                    <LogOut className="w-4 h-4" />
                                    <span className="hidden md:inline">{t('logout')}</span>
                                    </button>
                                    </div>

                                    {/* Delete Account Confirmation Dialog */}
                                    <Dialog open={showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(false)}>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>{t('deleteMyAccount')}</DialogTitle>
                                            </DialogHeader>
                                            <p className="text-sm text-slate-600 py-2">
                                                {t('deleteAccountConfirm')}
                                            </p>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>{t('cancel')}</Button>
                                                <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
                                                    {deleting ? t('deleting') : t('deleteMyAccount')}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                    </div>

                    <div className="border-t border-border py-3">
                        <ProjectSelector />
                    </div>


                </div>
            </nav>

            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPageName}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>
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