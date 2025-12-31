import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
    const [currentProjectId, setCurrentProjectId] = useState(null);

    const { data: projects = [], isLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const user = await base44.auth.me();
            if (!user) return [];
            return base44.entities.Project.filter({ created_by: user.email }, '-created_date');
        },
    });

    // Set the first project as current when projects load
    useEffect(() => {
        if (!currentProjectId && projects.length > 0) {
            const savedProjectId = localStorage.getItem('currentProjectId');
            if (savedProjectId && projects.find(p => p.id === savedProjectId)) {
                setCurrentProjectId(savedProjectId);
            } else {
                setCurrentProjectId(projects[0].id);
            }
        }
    }, [projects, currentProjectId]);

    // Save current project to localStorage
    useEffect(() => {
        if (currentProjectId) {
            localStorage.setItem('currentProjectId', currentProjectId);
        }
    }, [currentProjectId]);

    const currentProject = projects.find(p => p.id === currentProjectId);

    const switchProject = (projectId) => {
        setCurrentProjectId(projectId);
    };

    return (
        <ProjectContext.Provider value={{
            projects,
            currentProject,
            currentProjectId,
            switchProject,
            isLoading
        }}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject must be used within ProjectProvider');
    }
    return context;
}