import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Home, FileText, LogOut, Languages } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { LanguageProvider, useLanguage } from "./components/LanguageContext";
import { ProjectProvider } from "./components/ProjectContext";
import ProjectSelector from "./components/ProjectSelector";

function LayoutContent({ children, currentPageName }) {
    const { language, t, toggleLanguage } = useLanguage();
    
    const handleLogout = () => {
        base44.auth.logout();
    };

    return (
        <div className="min-h-screen bg-slate-50 overflow-y-auto">
            <nav className="bg-white shadow-sm border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <Home className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-bold text-xl text-slate-900">{t('appName')}</span>
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
                                            <ProjectSelector />
                                            </div>
                                            </div>

                    <div className="md:hidden flex gap-2 pb-3">
                        <Link
                            to={createPageUrl('Expenses')}
                            className={`flex-1 px-4 py-2 rounded-lg text-center transition-colors ${
                                currentPageName === 'Expenses'
                                    ? 'bg-blue-100 text-blue-700 font-medium'
                                    : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                    >
                                    {t('expenses')}
                                    </Link>
                                    <Link
                                    to={createPageUrl('Reports')}
                                    className={`flex-1 px-4 py-2 rounded-lg text-center transition-colors ${
                                    currentPageName === 'Reports'
                                        ? 'bg-blue-100 text-blue-700 font-medium'
                                        : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                    >
                                    {t('reports')}
                                    </Link>
                    </div>
                </div>
            </nav>

            <main>{children}</main>
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