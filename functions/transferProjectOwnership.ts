import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // SECURITY: Only super admins can transfer ownership
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { projectId, newOwnerEmail } = await req.json();

        if (!projectId || !newOwnerEmail) {
            return Response.json({ error: 'projectId and newOwnerEmail are required' }, { status: 400 });
        }

        // SECURITY: Verify project exists
        const project = await base44.asServiceRole.entities.Project.get(projectId);
        if (!project) {
            return Response.json({ error: 'Project not found' }, { status: 404 });
        }

        const oldOwner = project.created_by;

        // SECURITY: Transfer ownership using service role
        // This is safe because we've already validated admin role above
        await base44.asServiceRole.entities.Project.update(projectId, {
            created_by: newOwnerEmail,
        });

        // Log the action
        await base44.asServiceRole.entities.ActivityLog.create({
            action: 'transferred_project_ownership',
            entityType: 'project',
            entityId: projectId,
            entityLabel: project.name,
            performedBy: user.email,
            performedByName: user.full_name || user.email,
            details: `Owner changed from ${oldOwner} to ${newOwnerEmail}`,
        });

        return Response.json({ success: true, oldOwner, newOwner: newOwnerEmail });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});