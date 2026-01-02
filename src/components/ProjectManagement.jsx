import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

export default function ProjectManagement({ onClose }) {
    const { projects, currentProjectId, switchProject, currentProject } = useProject();
    const { t } = useLanguage();
    const currentProjectPermissions = useProjectPermissions(currentProject);
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
                        {projects.map((project) => (
                            <Card key={project.id} className={currentProjectId === project.id ? 'ring-2 ring-blue-500' : ''}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <FolderOpen className="w-5 h-5 text-blue-600" />
                                                <h3 className="text-lg font-semibold">{project.name}</h3>
                                                {currentProjectId === project.id && (
                                                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                                                        {t('current')}
                                                    </span>
                                                )}
                                            </div>
                                            {project.description && (
                                                <p className="text-sm text-slate-600 mb-2">{project.description}</p>
                                            )}
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                    project.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    project.status === 'completed' ? 'bg-slate-100 text-slate-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {t(project.status)}
                                                </span>
                                                {project.startDate && (
                                                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                                                        {new Date(project.startDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                            {project.sharedWith && project.sharedWith.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-slate-200">
                                                    <p className="text-xs font-medium text-slate-500 mb-2">Shared with:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {project.sharedWith.map((share) => (
                                                            <div 
                                                                key={share.email}
                                                                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700"
                                                            >
                                                                <span>{share.email}</span>
                                                                <span className="text-blue-500">•</span>
                                                                <span className="font-medium capitalize">{share.role}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {(() => {
                                            const perms = useProjectPermissions(project);
                                            return (
                                                <div className="flex flex-col gap-2">
                                                    {perms.canEdit && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setSharingProject(project)}
                                                            title="Share project"
                                                        >
                                                            <Users className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {perms.canEdit && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(project)}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {perms.canDelete && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(project.id)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                </div>
            )}
        </div>
    );
}