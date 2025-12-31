import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, UserPlus, Mail, Shield, Edit, Eye } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProjectSharing({ project }) {
    const { t } = useLanguage();
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("editor");
    const [error, setError] = useState("");
    const queryClient = useQueryClient();

    const updateProjectMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });

    const handleAddUser = async () => {
        setError("");
        
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
        
        await updateProjectMutation.mutateAsync({
            id: project.id,
            data: { sharedWith: updatedSharedWith }
        });

        setEmail("");
        setRole("editor");
    };

    const handleRemoveUser = async (userEmail) => {
        const sharedWith = project.sharedWith || [];
        const updatedSharedWith = sharedWith.filter(s => s.email !== userEmail);
        
        await updateProjectMutation.mutateAsync({
            id: project.id,
            data: { sharedWith: updatedSharedWith }
        });
    };

    const handleChangeRole = async (userEmail, newRole) => {
        const sharedWith = project.sharedWith || [];
        const updatedSharedWith = sharedWith.map(s => 
            s.email === userEmail ? { ...s, role: newRole } : s
        );
        
        await updateProjectMutation.mutateAsync({
            id: project.id,
            data: { sharedWith: updatedSharedWith }
        });
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

    const getRoleLabel = (role) => {
        switch(role) {
            case 'admin': return 'Admin';
            case 'editor': return 'Editor';
            case 'viewer': return 'Viewer';
            default: return role;
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
                            onKeyPress={(e) => e.key === 'Enter' && handleAddUser()}
                        />
                    </div>
                    <Select value={role} onValueChange={setRole}>
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
                        disabled={updateProjectMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        Add
                    </Button>
                </div>
            </div>
            
            {error && (
                <p className="text-sm text-red-600">{error}</p>
            )}

            {sharedWith.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Shared with:</p>
                    {sharedWith.map((share) => (
                        <div
                            key={share.email}
                            className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <Mail className="w-4 h-4 text-slate-500" />
                                <span className="text-sm text-slate-700">{share.email}</span>
                                <div className="flex items-center gap-1">
                                    {getRoleIcon(share.role)}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Select 
                                    value={share.role} 
                                    onValueChange={(newRole) => handleChangeRole(share.email, newRole)}
                                    disabled={updateProjectMutation.isPending}
                                >
                                    <SelectTrigger className="w-28 h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="editor">Editor</SelectItem>
                                        <SelectItem value="viewer">Viewer</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveUser(share.email)}
                                    disabled={updateProjectMutation.isPending}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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