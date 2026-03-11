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
            
            // SECURITY: Get all projects - server should enforce RLS
            // Client-side filter as defense-in-depth only
            const allProjects = await base44.entities.Project.list('-created_date');
            
            // SECURITY: Filter to show only projects user has access to
            // This is a client-side safety net - true security must be server-side
            return allProjects.filter(project => 
                project.created_by === user.email || 
                (project.sharedWith && project.sharedWith.some(s => s.email === user.email)) ||
                (project.sharedWithUsers && project.sharedWithUsers.includes(user.email)) ||
                user.role === 'admin'
            );
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