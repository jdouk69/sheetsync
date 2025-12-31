import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, UserPlus, Mail } from "lucide-react";
import { useLanguage } from "./LanguageContext";

export default function ProjectSharing({ project }) {
    const { t } = useLanguage();
    const [email, setEmail] = useState("");
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

        const sharedUsers = project.sharedWithUsers || [];
        
        if (sharedUsers.includes(email)) {
            setError("This user already has access");
            return;
        }

        if (email === project.created_by) {
            setError("Project owner already has access");
            return;
        }

        const updatedSharedUsers = [...sharedUsers, email];
        
        await updateProjectMutation.mutateAsync({
            id: project.id,
            data: { sharedWithUsers: updatedSharedUsers }
        });

        setEmail("");
    };

    const handleRemoveUser = async (userEmail) => {
        const sharedUsers = project.sharedWithUsers || [];
        const updatedSharedUsers = sharedUsers.filter(e => e !== userEmail);
        
        await updateProjectMutation.mutateAsync({
            id: project.id,
            data: { sharedWithUsers: updatedSharedUsers }
        });
    };

    const sharedUsers = project.sharedWithUsers || [];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-lg">Share Project</h3>
            </div>
            
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
                <Button 
                    onClick={handleAddUser}
                    disabled={updateProjectMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    Add
                </Button>
            </div>
            
            {error && (
                <p className="text-sm text-red-600">{error}</p>
            )}

            {sharedUsers.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Shared with:</p>
                    {sharedUsers.map((userEmail) => (
                        <div
                            key={userEmail}
                            className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
                        >
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-slate-500" />
                                <span className="text-sm text-slate-700">{userEmail}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveUser(userEmail)}
                                disabled={updateProjectMutation.isPending}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <div className="text-xs text-slate-500 bg-slate-50 rounded p-3">
                <p className="font-medium mb-1">Note:</p>
                <p>Users you share this project with will be able to view and add expenses to it. Make sure they have an account in the app first.</p>
            </div>
        </div>
    );
}