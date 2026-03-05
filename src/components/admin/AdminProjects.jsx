import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderOpen, Loader2, Trash2, Users, Search } from "lucide-react";
import { toast } from "sonner";

const statusColors = {
    active: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
    on_hold: "bg-yellow-100 text-yellow-700",
};

export default function AdminProjects() {
    const [search, setSearch] = useState("");
    const queryClient = useQueryClient();

    const { data: projects = [], isLoading } = useQuery({
        queryKey: ['allProjects'],
        queryFn: () => base44.entities.Project.list('-created_date'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Project.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allProjects'] });
            toast.success("Project deleted");
        },
        onError: () => toast.error("Failed to delete project"),
    });

    const handleDelete = (project) => {
        if (confirm(`Delete project "${project.name}"? Expenses will remain but won't be linked.`)) {
            deleteMutation.mutate(project.id);
        }
    };

    const filtered = projects.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.created_by?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Card>
            <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                    <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-blue-600" />
                        All Projects ({projects.length})
                    </h2>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search projects..."
                            className="pl-9"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">No projects found</p>
                ) : (
                    <div className="space-y-2">
                        {filtered.map((project) => (
                            <div key={project.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium text-slate-900">{project.name}</p>
                                        <Badge className={`text-xs ${statusColors[project.status] || "bg-slate-100 text-slate-600"}`}>
                                            {project.status || "active"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        <p className="text-xs text-slate-500">Owner: {project.created_by}</p>
                                        {project.sharedWith?.length > 0 && (
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {project.sharedWith.length} member{project.sharedWith.length !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                                    onClick={() => handleDelete(project)}
                                    aria-label="Delete project"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}