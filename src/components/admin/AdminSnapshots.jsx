import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Loader2, RotateCcw, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminSnapshots() {
    const [expandedProject, setExpandedProject] = useState(null);
    const [takingSnapshot, setTakingSnapshot] = useState(false);
    const [restoringId, setRestoringId] = useState(null);
    const queryClient = useQueryClient();

    const { data: snapshots = [], isLoading } = useQuery({
        queryKey: ['projectSnapshots'],
        queryFn: () => base44.entities.ProjectSnapshot.list('-snapshotDate', 200),
    });

    // Group snapshots by projectId
    const grouped = snapshots.reduce((acc, snap) => {
        if (!acc[snap.projectId]) {
            acc[snap.projectId] = { projectName: snap.projectName, snapshots: [] };
        }
        acc[snap.projectId].snapshots.push(snap);
        return acc;
    }, {});

    const handleTakeSnapshot = async () => {
        setTakingSnapshot(true);
        try {
            const res = await base44.functions.invoke('snapshotProjects', {});
            if (res.data?.success) {
                toast.success(`Snapshot created for ${res.data.snapshotsCreated} projects`);
                queryClient.invalidateQueries({ queryKey: ['projectSnapshots'] });
            } else {
                toast.error(res.data?.error || "Snapshot failed");
            }
        } catch (e) {
            toast.error("Snapshot failed: " + e.message);
        } finally {
            setTakingSnapshot(false);
        }
    };

    const handleRestore = async (snap) => {
        if (!confirm(`Restore project "${snap.projectName}" to its state from ${format(new Date(snap.snapshotDate), 'MMM d, yyyy HH:mm')}? This will overwrite current project data.`)) return;

        setRestoringId(snap.id);
        try {
            const { id, created_date, updated_date, created_by, ...projectData } = snap.data;
            await base44.entities.Project.update(snap.projectId, projectData);
            toast.success(`Project "${snap.projectName}" restored successfully`);
            queryClient.invalidateQueries({ queryKey: ['allProjects'] });
        } catch (e) {
            toast.error("Restore failed: " + e.message);
        } finally {
            setRestoringId(null);
        }
    };

    const statusColors = {
        active: "bg-green-100 text-green-700",
        completed: "bg-blue-100 text-blue-700",
        on_hold: "bg-yellow-100 text-yellow-700",
    };

    return (
        <Card>
            <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-blue-600" />
                        Project Snapshots
                    </h2>
                    <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 gap-2"
                        onClick={handleTakeSnapshot}
                        disabled={takingSnapshot}
                    >
                        {takingSnapshot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        Take Snapshot Now
                    </Button>
                </div>

                <p className="text-xs text-slate-500 mb-4">
                    Each snapshot captures all project data at a point in time. You can restore any project to a previous state.
                </p>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                ) : Object.keys(grouped).length === 0 ? (
                    <p className="text-center text-slate-400 py-8">No snapshots yet. Take your first snapshot above.</p>
                ) : (
                    <div className="space-y-2">
                        {Object.entries(grouped).map(([projectId, { projectName, snapshots: projSnaps }]) => {
                            const isExpanded = expandedProject === projectId;
                            return (
                                <div key={projectId} className="border border-slate-200 rounded-lg overflow-hidden">
                                    <button
                                        className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                                        onClick={() => setExpandedProject(isExpanded ? null : projectId)}
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{projectName}</p>
                                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {projSnaps.length} snapshot{projSnaps.length !== 1 ? 's' : ''} · Latest: {format(new Date(projSnaps[0].snapshotDate), 'MMM d, yyyy HH:mm')}
                                            </p>
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                    </button>

                                    {isExpanded && (
                                        <div className="px-3 pb-3 pt-2 bg-white border-t border-slate-100 space-y-2">
                                            {projSnaps.map(snap => (
                                                <div key={snap.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-slate-700 font-medium">{format(new Date(snap.snapshotDate), 'MMM d, yyyy · HH:mm')}</p>
                                                        <p className="text-slate-400 mt-0.5">By: {snap.triggeredBy}</p>
                                                    </div>
                                                    <Badge className={`text-xs shrink-0 ${statusColors[snap.data?.status] || "bg-slate-100 text-slate-600"}`}>
                                                        {snap.data?.status || "active"}
                                                    </Badge>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-xs gap-1 shrink-0 text-orange-600 border-orange-300 hover:bg-orange-50"
                                                        onClick={() => handleRestore(snap)}
                                                        disabled={restoringId === snap.id}
                                                    >
                                                        {restoringId === snap.id
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <RotateCcw className="w-3 h-3" />
                                                        }
                                                        Restore
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}