import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { expenseId } = await req.json();

        if (!expenseId) {
            return Response.json({ error: 'expenseId is required' }, { status: 400 });
        }

        // SECURITY: Get expense and validate access
        const expense = await base44.asServiceRole.entities.Expense.get(expenseId);
        
        if (!expense) {
            return Response.json({ error: 'Expense not found' }, { status: 404 });
        }

        if (!expense.projectId) {
            return Response.json({ error: 'Expense not associated with a project' }, { status: 400 });
        }

        // SECURITY: Validate user has access to the project
        const project = await base44.asServiceRole.entities.Project.get(expense.projectId);
        
        if (!project) {
            return Response.json({ error: 'Project not found' }, { status: 404 });
        }

        // Check delete permissions (owner or admin role in project)
        const isProjectOwner = project.created_by === user.email;
        const isSuperAdmin = user.role === 'admin';
        const sharedAccess = project.sharedWith?.find(s => s.email === user.email);
        const canDelete = isProjectOwner || isSuperAdmin || (sharedAccess && sharedAccess.role === 'admin');

        if (!canDelete) {
            return Response.json({ error: 'Access denied: Only project owner or project admins can delete expenses' }, { status: 403 });
        }

        // Delete associated payments first
        const payments = await base44.asServiceRole.entities.Payment.filter({ expenseId });
        for (const payment of payments) {
            await base44.asServiceRole.entities.Payment.delete(payment.id);
        }

        // Delete expense
        await base44.asServiceRole.entities.Expense.delete(expenseId);

        // Log activity
        await base44.asServiceRole.entities.ActivityLog.create({
            action: 'deleted_expense',
            entityType: 'expense',
            entityId: expenseId,
            entityLabel: expense.description,
            performedBy: user.email,
            performedByName: user.full_name || user.email,
            details: `Deleted from project: ${project.name}`
        });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});