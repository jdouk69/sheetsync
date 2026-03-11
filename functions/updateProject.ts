import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { projectId, updates } = await req.json();

        if (!projectId) {
            return Response.json({ error: 'projectId is required' }, { status: 400 });
        }

        // SECURITY: Get project and validate access
        const project = await base44.asServiceRole.entities.Project.get(projectId);
        
        if (!project) {
            return Response.json({ error: 'Project not found' }, { status: 404 });
        }

        // SECURITY: Check if user can edit project settings
        const isOwner = project.created_by === user.email;
        const isSuperAdmin = user.role === 'admin';
        const sharedAccess = project.sharedWith?.find(s => s.email === user.email);
        const canEditProject = isOwner || isSuperAdmin || (sharedAccess && sharedAccess.role === 'admin');

        if (!canEditProject) {
            return Response.json({ error: 'Access denied: Only project owner or project admins can edit project settings' }, { status: 403 });
        }

        // SECURITY: Prevent modification of protected fields
        const secureUpdates = { ...updates };
        
        // SECURITY: Cannot change owner through this endpoint (use transferProjectOwnership)
        delete secureUpdates.created_by;
        delete secureUpdates.id;
        delete secureUpdates.created_date;
        delete secureUpdates.updated_date;

        // SECURITY: Validate sharedWith changes
        if (secureUpdates.sharedWith) {
            const oldSharedWith = project.sharedWith || [];
            const newSharedWith = secureUpdates.sharedWith;
            
            // Prevent users from modifying their own role (privilege escalation)
            const userOldShare = oldSharedWith.find(s => s.email === user.email);
            const userNewShare = newSharedWith.find(s => s.email === user.email);
            
            if (userOldShare && userNewShare && userOldShare.role !== userNewShare.role && !isOwner && !isSuperAdmin) {
                return Response.json({ error: 'Access denied: Cannot modify your own access level' }, { status: 403 });
            }

            // Validate all email formats
            for (const share of newSharedWith) {
                if (!share.email || !share.email.includes('@')) {
                    return Response.json({ error: 'Invalid email format in sharedWith' }, { status: 400 });
                }
                if (!['admin', 'editor', 'viewer'].includes(share.role)) {
                    return Response.json({ error: 'Invalid role in sharedWith. Must be admin, editor, or viewer' }, { status: 400 });
                }
            }
        }

        // Update project
        const updatedProject = await base44.asServiceRole.entities.Project.update(projectId, secureUpdates);

        // Log activity
        await base44.asServiceRole.entities.ActivityLog.create({
            action: 'updated_project',
            entityType: 'project',
            entityId: projectId,
            entityLabel: updatedProject.name,
            performedBy: user.email,
            performedByName: user.full_name || user.email,
            details: 'Project settings updated'
        });

        return Response.json({ success: true, project: updatedProject });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});