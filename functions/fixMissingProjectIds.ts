import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
        }

        const body = await req.json();
        const { projectId } = body;

        if (!projectId) {
            return Response.json({ error: 'projectId is required' }, { status: 400 });
        }

        // Get all expenses without a projectId
        const allExpenses = await base44.asServiceRole.entities.Expense.list();
        const expensesWithoutProject = allExpenses.filter(exp => !exp.projectId);

        // Update each expense with the provided projectId
        let updated = 0;
        for (const expense of expensesWithoutProject) {
            await base44.asServiceRole.entities.Expense.update(expense.id, {
                projectId: projectId
            });
            updated++;
        }

        return Response.json({
            success: true,
            updated: updated,
            message: `Updated ${updated} expenses with projectId`
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});