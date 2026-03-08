import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useProject } from "./ProjectContext";
import { useLanguage } from "./LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, FolderOpen, Users, UserPlus } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import ProjectSharing from "./ProjectSharing";
import InviteUser from "./InviteUser";
import { useProjectPermissions } from "./useProjectPermissions";
import ProjectCard from "./ProjectCard";

export default function ProjectManagement({ onClose }) {
    const { projects, currentProjectId, switchProject, currentProject } = useProject();
    const { t } = useLanguage();
    const currentProjectPermissions = useProjectPermissions(currentProject);
    
    const { data: user } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
        staleTime: 5 * 60 * 1000,
    });
    
    // Check if user is admin or has created any project
    const isAdmin = user?.role === 'admin';
    const hasCreatedProject = projects.some(p => p.created_by === user?.email);
    const canInviteUsers = isAdmin || hasCreatedProject;
    const [editingProject, setEditingProject] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [sharingProject, setSharingProject] = useState(null);
    const [showInviteUser, setShowInviteUser] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "active",
        startDate: "",
        endDate: ""
    });

    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Project.create(data),
        onSuccess: (newProject) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            switchProject(newProject.id);
            setShowForm(false);
            resetForm();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setShowForm(false);
            setEditingProject(null);
            resetForm();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Project.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
    });

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            status: "active",
            startDate: "",
            endDate: ""
        });
    };

    const handleEdit = (project) => {
        setEditingProject(project);
        setFormData({
            name: project.name || "",
            description: project.description || "",
            status: project.status || "active",
            startDate: project.startDate || "",
            endDate: project.endDate || ""
        });
        setShowForm(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingProject) {
            updateMutation.mutate({ id: editingProject.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id) => {
        if (confirm(t('confirmDeleteProject'))) {
            deleteMutation.mutate(id);
        }
    };

    // Get the fresh project data from the projects array
    const currentSharingProject = sharingProject 
        ? projects.find(p => p.id === sharingProject.id) 
        : null;

    return (
        <div className="space-y-4 pb-8">
            <div className="flex justify-between items-center mb-4">
                {currentProjectPermissions.canEdit && (
                    <Button
                        onClick={() => setShowForm(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('addNewProject')}
                    </Button>
                )}
                
                {canInviteUsers && (
                    <Dialog open={showInviteUser} onOpenChange={setShowInviteUser}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <UserPlus className="w-4 h-4" />
                                <span>{t('inviteUser')}</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>{t('inviteUserToApp')}</DialogTitle>
                            </DialogHeader>
                            <InviteUser />
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {currentSharingProject ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Share "{currentSharingProject.name}"</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSharingProject(null)}
                            >
                                Close
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ProjectSharing project={currentSharingProject} />
                    </CardContent>
                </Card>
            ) : showForm ? (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {editingProject ? t('editProject') : t('addNewProject')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('projectName')} *
                                </label>
                                <Input
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder={t('projectNamePlaceholder')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('description')}
                                </label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    placeholder={t('projectDescriptionPlaceholder')}
                                    rows={2}
                                />
                            </div>

                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        {t('status')}
                                    </label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value) => setFormData({...formData, status: value})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t('active')}</SelectItem>
                                            <SelectItem value="completed">{t('completed')}</SelectItem>
                                            <SelectItem value="on_hold">{t('onHold')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        {t('startDate')}
                                    </label>
                                    <Input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        {t('endDate')}
                                    </label>
                                    <Input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingProject(null);
                                        resetForm();
                                    }}
                                    className="flex-1"
                                >
                                    {t('cancel')}
                                </Button>
                                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                                    {editingProject ? t('update') : t('create')}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {projects.length === 0 && !currentProjectPermissions.canEdit ? (
                        <div className="text-center py-10 text-slate-500">
                            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <p className="font-medium text-slate-700">No projects yet</p>
                            <p className="text-sm mt-1">You haven't been added to any project. Please contact your administrator to get access.</p>
                        </div>
                    ) : (
                        projects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                currentProjectId={currentProjectId}
                                onShare={setSharingProject}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}