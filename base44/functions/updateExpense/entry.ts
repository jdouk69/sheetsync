import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { expenseId, updates } = await req.json();

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

        // Check edit permissions
        const isOwner = project.created_by === user.email;
        const isAdmin = user.role === 'admin';
        const sharedAccess = project.sharedWith?.find(s => s.email === user.email);
        const canEdit = isOwner || isAdmin || (sharedAccess && ['admin', 'editor'].includes(sharedAccess.role));

        if (!canEdit) {
            return Response.json({ error: 'Access denied: You do not have permission to edit this expense' }, { status: 403 });
        }

        // SECURITY: Prevent modification of protected fields
        const secureUpdates = { ...updates };
        
        // Extract migration flag before sanitizing — it's a signal, not a data field
        const migrateLegacyAmount = !!secureUpdates.migrateLegacyAmount;
        delete secureUpdates.migrateLegacyAmount;

        // Auto-update audit fields
        secureUpdates.updated_by = user.email;
        secureUpdates.updatedByName = user.full_name || user.email;
        
        // SECURITY: Prevent changing these fields
        delete secureUpdates.projectId; // Cannot move expense to different project
        delete secureUpdates.created_by; // Cannot change creator
        delete secureUpdates.createdByName;
        delete secureUpdates.id;
        delete secureUpdates.created_date;
        delete secureUpdates.updated_date;

        // Update expense
        const updatedExpense = await base44.asServiceRole.entities.Expense.update(expenseId, secureUpdates);

        // MIGRATION: Create first Payment record from legacy amount — exactly once
        if (migrateLegacyAmount) {
            const existingPayments = await base44.asServiceRole.entities.Payment.filter({ expenseId });
            if (existingPayments.length === 0) {
                await base44.asServiceRole.entities.Payment.create({
                    expenseId,
                    amount: expense.amount,
                    date: expense.date,
                    method: "Deposit",
                    notes: "Migrated from legacy amount",
                    paidBy: expense.created_by,
                    paidByName: expense.createdByName || expense.created_by,
                });
            }
        }

        return Response.json({ success: true, expense: updatedExpense });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});