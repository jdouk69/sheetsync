import React, { useState } from "react";
import { useProject } from "./ProjectContext";
import { useLanguage } from "./LanguageContext";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, Settings } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import ProjectManagement from "./ProjectManagement";

export default function ProjectSelector() {
    const { projects, currentProject, switchProject } = useProject();
    const { t } = useLanguage();
    const [showManagement, setShowManagement] = useState(false);

    if (projects.length === 0) {
        return (
            <Dialog open={showManagement} onOpenChange={setShowManagement}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        <span className="hidden md:inline">{t('addProject')}</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="shrink-0 pb-4">
                        <DialogTitle>{t('projectManagement')}</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto flex-1 -mx-6 px-6 overscroll-contain">
                        <ProjectManagement onClose={() => setShowManagement(false)} />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-slate-600 hidden md:block" />
            <Select value={currentProject?.id} onValueChange={switchProject}>
                <SelectTrigger className="w-[180px] md:w-[220px]">
                    <SelectValue placeholder={t('selectProject')} />
                </SelectTrigger>
                <SelectContent>
                    {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                            {project.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Dialog open={showManagement} onOpenChange={setShowManagement}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Settings className="w-4 h-4" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="shrink-0 pb-4">
                        <DialogTitle>{t('projectManagement')}</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto flex-1 -mx-6 px-6 overscroll-contain">
                        <ProjectManagement onClose={() => setShowManagement(false)} />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}