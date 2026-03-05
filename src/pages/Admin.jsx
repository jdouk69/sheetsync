import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Shield, Users, FolderOpen, Receipt, AlertTriangle } from "lucide-react";
import AdminUsers from "../components/admin/AdminUsers";
import AdminProjects from "../components/admin/AdminProjects";
import AdminExpenses from "../components/admin/AdminExpenses";

const tabs = [
    { id: "users", label: "Users", Icon: Users },
    { id: "projects", label: "Projects", Icon: FolderOpen },
    { id: "expenses", label: "Expenses", Icon: Receipt },
];

export default function Admin() {
    const [activeTab, setActiveTab] = useState("users");

    const { data: user, isLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (user?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800">Access Denied</h1>
                <p className="text-slate-500 text-center">You need admin privileges to access this page.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                    <p className="text-sm text-slate-500">Manage users, projects, and expenses</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
                {tabs.map(({ id, label, Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === id
                                ? "bg-white text-blue-700 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "users" && <AdminUsers currentUser={user} />}
            {activeTab === "projects" && <AdminProjects />}
            {activeTab === "expenses" && <AdminExpenses />}
        </div>
    );
}