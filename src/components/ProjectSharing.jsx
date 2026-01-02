import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, UserPlus, Mail, Shield, Edit, Eye } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { useProjectPermissions } from "./useProjectPermissions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProjectSharing({ project }) {
    const { t } = useLanguage();
    const { canEdit, canDelete, isOwner } = useProjectPermissions(project);
    const canManageSharing = canDelete; // Only owners and admins can manage sharing
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("viewer");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const queryClient = useQueryClient();

    const updateProjectMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });

    const handleAddUser = async () => {
        setError("");
        setSuccess("");
        
        if (!email || !email.includes("@")) {
            setError("Please enter a valid email address");
            return;
        }

        const sharedWith = project.sharedWith || [];
        
        if (sharedWith.find(s => s.email === email)) {
            setError("This user already has access");
            return;
        }

        if (email === project.created_by) {
            setError("Project owner already has access");
            return;
        }

        const updatedSharedWith = [...sharedWith, { email, role }];
        
        try {
            await updateProjectMutation.mutateAsync({
                id: project.id,
                data: { sharedWith: updatedSharedWith }
            });
            setSuccess(`✓ User added successfully as ${role}`);
            setEmail("");
            setRole("viewer");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(`Failed to add user: ${err.message}`);
        }
    };

    const handleRemoveUser = async (userEmail) => {
        if (!confirm(`Are you sure you want to remove ${userEmail} from this project?`)) {
            return;
        }

        const sharedWith = project.sharedWith || [];
        const updatedSharedWith = sharedWith.filter(s => s.email !== userEmail);
        
        try {
            await updateProjectMutation.mutateAsync({
                id: project.id,
                data: { sharedWith: updatedSharedWith }
            });
        } catch (err) {
            setError(`Failed to remove user: ${err.message}`);
        }
    };

    const handleChangeRole = async (userEmail, newRole) => {
        const sharedWith = project.sharedWith || [];
        const updatedSharedWith = sharedWith.map(s => 
            s.email === userEmail ? { ...s, role: newRole } : s
        );
        
        try {
            await updateProjectMutation.mutateAsync({
                id: project.id,
                data: { sharedWith: updatedSharedWith }
            });
        } catch (err) {
            setError(`Failed to change role: ${err.message}`);
        }
    };

    const sharedWith = project.sharedWith || [];
    
    const getRoleIcon = (role) => {
        switch(role) {
            case 'admin': return <Shield className="w-4 h-4 text-red-600" />;
            case 'editor': return <Edit className="w-4 h-4 text-blue-600" />;
            case 'viewer': return <Eye className="w-4 h-4 text-slate-600" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-lg">Share Project</h3>
            </div>
            
            <div className="space-y-2">
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Input
                            type="email"
                            placeholder="Enter user email to share"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && canManageSharing && handleAddUser()}
                            disabled={!canManageSharing}
                        />
                    </div>
                    <Select value={role} onValueChange={setRole} disabled={!canManageSharing}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button 
                        onClick={handleAddUser}
                        disabled={updateProjectMutation.isPending || !canManageSharing}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {updateProjectMutation.isPending ? "Adding..." : "Add"}
                    </Button>
                </div>
            </div>
            
            {error && (
                <p className="text-sm text-red-600">{error}</p>
            )}
            
            {success && (
                <p className="text-sm text-green-600">{success}</p>
            )}

            <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 mb-3">Project Access:</p>
                
                {/* Project Owner */}
                <div className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-3 border border-blue-200">
                    <div className="flex items-center gap-3 flex-1">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-slate-900">{project.created_by}</span>
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">Owner</span>
                        </div>
                    </div>
                </div>

                {/* Shared Users */}
                {sharedWith.length > 0 && (
                    <div className="space-y-2 pt-2">
                        {sharedWith.map((share) => (
                            <div
                                key={share.email}
                                className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-200"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                    <span className="text-sm text-slate-700 truncate">{share.email}</span>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {getRoleIcon(share.role)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                    {canManageSharing && (
                                        <Select 
                                            value={share.role} 
                                            onValueChange={(newRole) => handleChangeRole(share.email, newRole)}
                                            disabled={updateProjectMutation.isPending || share.email === project.created_by}
                                        >
                                            <SelectTrigger className="w-28 h-9 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="editor">Editor</SelectItem>
                                                <SelectItem value="viewer">Viewer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {!canManageSharing && (
                                        <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded w-28 text-center">
                                            {share.role}
                                        </span>
                                    )}
                                    {canManageSharing && share.email !== project.created_by && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveUser(share.email)}
                                            disabled={updateProjectMutation.isPending}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9 w-9 p-0"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {sharedWith.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg border border-slate-200">
                        No users added yet. Add someone above to share this project.
                    </p>
                )}
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 rounded p-3">
                <p className="font-medium mb-2">Roles & Permissions:</p>
                <ul className="space-y-1">
                    <li><strong>Admin:</strong> Can view, add, edit, and delete all expenses and project details</li>
                    <li><strong>Editor:</strong> Can view, add, and edit expenses (cannot delete)</li>
                    <li><strong>Viewer:</strong> Can only view expenses (read-only access)</li>
                </ul>
            </div>
        </div>
    );
}