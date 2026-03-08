import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useProjectPermissions(project) {
    const { data: user } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
        staleTime: 5 * 60 * 1000,
    });

    const permissions = useMemo(() => {
        if (!user || !project) {
            return {
                canView: false,
                canEdit: false,
                canDelete: false,
                isOwner: false,
                role: null
            };
        }

        // Super admins have full permissions on all projects
        if (user.role === 'admin') {
            return {
                canView: true,
                canEdit: true,
                canDelete: true,
                isOwner: project.created_by === user.email,
                role: project.created_by === user.email ? 'owner' : 'admin'
            };
        }

        // Project owner has all permissions
        const isOwner = project.created_by === user.email;
        if (isOwner) {
            return {
                canView: true,
                canEdit: true,
                canDelete: true,
                isOwner: true,
                role: 'owner'
            };
        }

        // Check shared access with new structure
        const sharedAccess = project.sharedWith?.find(s => s.email === user.email);
        
        // Fallback: check old structure for backward compatibility
        const hasOldAccess = project.sharedWithUsers?.includes(user.email);
        
        if (!sharedAccess && !hasOldAccess) {
            return {
                canView: false,
                canEdit: false,
                canDelete: false,
                isOwner: false,
                role: null
            };
        }

        // If using old structure, treat as editor
        if (hasOldAccess && !sharedAccess) {
            return {
                canView: true,
                canEdit: true,
                canDelete: false,
                isOwner: false,
                role: 'editor'
            };
        }

        // New role-based permissions
        const role = sharedAccess.role;
        
        return {
            canView: true,
            canEdit: role === 'admin' || role === 'editor',
            canDelete: role === 'admin',
            isOwner: false,
            role
        };
    }, [user, project]);

    return permissions;
}