import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Users, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { useProjectPermissions } from "./useProjectPermissions";

export default function ProjectCard({ project, currentProjectId, onShare, onEdit, onDelete }) {
    const { t } = useLanguage();
    const { canEdit, canEditProject, canDelete } = useProjectPermissions(project);

    return (
        <Card className={currentProjectId === project.id ? 'ring-2 ring-blue-500' : ''}>
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
                    <div className="flex flex-col gap-2">
                        {canEditProject && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onShare(project)}
                                title="Share project"
                            >
                                <Users className="w-4 h-4" />
                            </Button>
                        )}
                        {canEditProject && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit(project)}
                            >
                                <Pencil className="w-4 h-4" />
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onDelete(project.id)}
                                className="text-red-600 hover:text-red-700"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}