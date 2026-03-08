import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderOpen, Loader2, Trash2, Users, Search, ChevronDown, ChevronUp, Pencil, Check, X, UserMinus, UserPlus, Calendar } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const statusColors = {
    active: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
    on_hold: "bg-yellow-100 text-yellow-700",
};

export default function AdminProjects() {
    const [search, setSearch] = useState("");
    const [expandedProject, setExpandedProject] = useState(null);
    const [editingProject, setEditingProject] = useState(null); // { id, name, status }
    const [addingMember, setAddingMember] = useState({}); // { [projectId]: { email, role } }
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

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allProjects'] });
            toast.success("Project updated");
            setEditingProject(null);
        },
        onError: () => toast.error("Failed to update project"),
    });

    const handleDelete = (project) => {
        if (confirm(`Delete project "${project.name}"? Expenses will remain but won't be linked.`)) {
            deleteMutation.mutate(project.id);
        }
    };

    const handleSaveEdit = () => {
        updateMutation.mutate({
            id: editingProject.id,
            data: {
                name: editingProject.name,
                status: editingProject.status,
                description: editingProject.description,
                currency: editingProject.currency,
                startDate: editingProject.startDate,
                endDate: editingProject.endDate,
            },
        });
    };

    const handleRemoveMember = (project, email) => {
        const updated = (project.sharedWith || []).filter(s => s.email !== email);
        updateMutation.mutate({ id: project.id, data: { sharedWith: updated } });
    };

    const handleChangeRole = (project, email, newRole) => {
        const updated = (project.sharedWith || []).map(s => s.email === email ? { ...s, role: newRole } : s);
        updateMutation.mutate({ id: project.id, data: { sharedWith: updated } });
    };

    const handleAddMember = (project) => {
        const { email, role = "editor" } = addingMember[project.id] || {};
        if (!email?.trim()) return toast.error("Enter an email");
        if ((project.sharedWith || []).some(s => s.email === email)) return toast.error("Already a member");
        const updated = [...(project.sharedWith || []), { email: email.trim(), role }];
        updateMutation.mutate({ id: project.id, data: { sharedWith: updated } });
        setAddingMember(prev => ({ ...prev, [project.id]: {} }));
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
                        {filtered.map((project) => {
                            const isExpanded = expandedProject === project.id;
                            const isEditing = editingProject?.id === project.id;
                            const adding = addingMember[project.id] || {};

                            return (
                                <div key={project.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                    {/* Header row */}
                                    <div className="flex items-center justify-between p-3 bg-slate-50 gap-3">
                                        <div className="min-w-0 flex-1">
                                            {isEditing ? (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Input
                                                        value={editingProject.name}
                                                        onChange={e => setEditingProject(p => ({ ...p, name: e.target.value }))}
                                                        className="h-7 text-sm flex-1 min-w-[120px]"
                                                    />
                                                    <Select
                                                        value={editingProject.status}
                                                        onValueChange={v => setEditingProject(p => ({ ...p, status: v }))}
                                                    >
                                                        <SelectTrigger className="h-7 text-xs w-28">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="active">Active</SelectItem>
                                                            <SelectItem value="completed">Completed</SelectItem>
                                                            <SelectItem value="on_hold">On Hold</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Button size="icon" className="h-7 w-7 bg-green-600 hover:bg-green-700" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                                                        <Check className="w-3 h-3" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingProject(null)}>
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
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
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {!isEditing && (
                                                <Button
                                                    variant="ghost" size="icon"
                                                    className="h-7 w-7 text-slate-400 hover:text-blue-600"
                                                    onClick={() => setEditingProject({ id: project.id, name: project.name, status: project.status || "active" })}
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-7 w-7 text-slate-400 hover:text-slate-700"
                                                onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                                            >
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDelete(project)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Expanded members panel */}
                                    {isExpanded && (
                                        <div className="px-3 pb-3 pt-2 bg-white border-t border-slate-100 space-y-2">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Members</p>

                                            {/* Owner row */}
                                            <div className="flex items-center justify-between text-xs py-1 px-2 bg-slate-50 rounded">
                                                <span className="text-slate-700">{project.created_by}</span>
                                                <Badge className="text-xs bg-purple-100 text-purple-700">Owner</Badge>
                                            </div>

                                            {/* Shared members */}
                                            {(project.sharedWith || []).map(member => (
                                                <div key={member.email} className="flex items-center justify-between text-xs py-1 px-2 bg-slate-50 rounded gap-2">
                                                    <span className="text-slate-700 truncate flex-1">{member.email}</span>
                                                    <Select
                                                        value={member.role}
                                                        onValueChange={v => handleChangeRole(project, member.email, v)}
                                                    >
                                                        <SelectTrigger className="h-6 text-xs w-24 border-slate-200">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="viewer">Viewer</SelectItem>
                                                            <SelectItem value="editor">Editor</SelectItem>
                                                            <SelectItem value="admin">Admin</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="h-6 w-6 text-red-400 hover:text-red-600"
                                                        onClick={() => handleRemoveMember(project, member.email)}
                                                    >
                                                        <UserMinus className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}

                                            {/* Add member row */}
                                            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 flex-wrap">
                                                <Input
                                                    value={adding.email || ""}
                                                    onChange={e => setAddingMember(prev => ({ ...prev, [project.id]: { ...prev[project.id], email: e.target.value } }))}
                                                    placeholder="Email address..."
                                                    className="h-7 text-xs flex-1 min-w-[140px]"
                                                />
                                                <Select
                                                    value={adding.role || "editor"}
                                                    onValueChange={v => setAddingMember(prev => ({ ...prev, [project.id]: { ...prev[project.id], role: v } }))}
                                                >
                                                    <SelectTrigger className="h-7 text-xs w-24 border-slate-200">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="viewer">Viewer</SelectItem>
                                                        <SelectItem value="editor">Editor</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    size="sm"
                                                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700 gap-1"
                                                    onClick={() => handleAddMember(project)}
                                                    disabled={updateMutation.isPending}
                                                >
                                                    <UserPlus className="w-3 h-3" /> Add
                                                </Button>
                                            </div>
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