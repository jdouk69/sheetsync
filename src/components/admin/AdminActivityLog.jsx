import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Activity, Search, Loader2, Plus, Pencil, Trash2, UserCheck, FolderOpen, Receipt } from "lucide-react";
import { format } from "date-fns";

const ACTION_CONFIG = {
    created_expense:    { label: "Created Expense",    color: "bg-green-100 text-green-700",  Icon: Plus },
    updated_expense:    { label: "Updated Expense",    color: "bg-blue-100 text-blue-700",    Icon: Pencil },
    deleted_expense:    { label: "Deleted Expense",    color: "bg-red-100 text-red-700",      Icon: Trash2 },
    created_project:    { label: "Created Project",    color: "bg-green-100 text-green-700",  Icon: Plus },
    updated_project:    { label: "Updated Project",    color: "bg-blue-100 text-blue-700",    Icon: Pencil },
    deleted_project:    { label: "Deleted Project",    color: "bg-red-100 text-red-700",      Icon: Trash2 },
    updated_user_role:  { label: "Updated Role",       color: "bg-purple-100 text-purple-700", Icon: UserCheck },
    marked_paid:        { label: "Marked Paid",        color: "bg-emerald-100 text-emerald-700", Icon: Receipt },
};

const ENTITY_ICON = {
    expense: Receipt,
    project: FolderOpen,
    user: UserCheck,
};

export default function AdminActivityLog() {
    const [search, setSearch] = useState("");

    const { data: logs = [], isLoading } = useQuery({
        queryKey: ['activityLogs'],
        queryFn: () => base44.entities.ActivityLog.list('-created_date', 200),
    });

    const filtered = logs.filter(log => {
        const q = search.toLowerCase();
        return (
            !q ||
            log.performedBy?.toLowerCase().includes(q) ||
            log.performedByName?.toLowerCase().includes(q) ||
            log.entityLabel?.toLowerCase().includes(q) ||
            log.action?.toLowerCase().includes(q) ||
            log.details?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="pt-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-600" />
                            Activity Log ({filtered.length})
                        </h2>
                        <div className="relative w-56">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search logs..."
                                className="pl-8 h-8 text-sm"
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-center text-slate-400 py-10 text-sm">No activity logs found.</p>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map(log => {
                                const config = ACTION_CONFIG[log.action] || { label: log.action, color: "bg-slate-100 text-slate-700", Icon: Activity };
                                const ActionIcon = config.Icon;
                                const EntityIcon = ENTITY_ICON[log.entityType] || Activity;
                                return (
                                    <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                            <EntityIcon className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                                <span className="text-sm font-medium text-slate-900">
                                                    {log.performedByName || log.performedBy}
                                                </span>
                                                <Badge className={`text-xs px-2 py-0.5 ${config.color} flex items-center gap-1`}>
                                                    <ActionIcon className="w-3 h-3" />
                                                    {config.label}
                                                </Badge>
                                                {log.entityLabel && (
                                                    <span className="text-sm text-slate-600 truncate">
                                                        <span className="text-slate-400">→</span> {log.entityLabel}
                                                    </span>
                                                )}
                                            </div>
                                            {log.details && (
                                                <p className="text-xs text-slate-500 truncate">{log.details}</p>
                                            )}
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {log.created_date ? format(new Date(log.created_date), 'MMM d, yyyy · h:mm a') : ''}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}