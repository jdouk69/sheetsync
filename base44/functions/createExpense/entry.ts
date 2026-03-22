import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Authentication required' }, { status: 401 });
        }

        const expenseData = await req.json();

        // SECURITY: Validate projectId is provided
        if (!expenseData.projectId) {
            return Response.json({ error: 'projectId is required' }, { status: 400 });
        }

        // SECURITY: Validate user has editor or admin access to the project
        const project = await base44.asServiceRole.entities.Project.get(expenseData.projectId);
        
        if (!project) {
            return Response.json({ error: 'Project not found' }, { status: 404 });
        }

        // Check access
        const isOwner = project.created_by === user.email;
        const isAdmin = user.role === 'admin';
        const sharedAccess = project.sharedWith?.find(s => s.email === user.email);
        const canEdit = isOwner || isAdmin || (sharedAccess && ['admin', 'editor'].includes(sharedAccess.role));

        if (!canEdit) {
            return Response.json({ error: 'Access denied: You do not have permission to create expenses in this project' }, { status: 403 });
        }

        // SECURITY: Auto-set ownership and audit fields - prevent user spoofing
        const secureExpenseData = {
            ...expenseData,
            // Force correct ownership
            created_by: user.email,
            createdByName: user.full_name || user.email,
            updated_by: user.email,
            updatedByName: user.full_name || user.email,
            // Ensure projectId cannot be changed
            projectId: expenseData.projectId
        };

        // Remove any fields user shouldn't control
        delete secureExpenseData.id;
        delete secureExpenseData.created_date;
        delete secureExpenseData.updated_date;

        // Create expense using service role to bypass client restrictions
        const newExpense = await base44.asServiceRole.entities.Expense.create(secureExpenseData);

        // Log activity
        await base44.asServiceRole.entities.ActivityLog.create({
            action: 'created_expense',
            entityType: 'expense',
            entityId: newExpense.id,
            entityLabel: newExpense.description,
            performedBy: user.email,
            performedByName: user.full_name || user.email,
            details: `Created in project: ${project.name}`
        });

        return Response.json({ success: true, expense: newExpense });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});