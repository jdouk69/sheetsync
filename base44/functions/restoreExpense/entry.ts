import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function (req: Request): Promise<Response> {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });
        if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

        const { expenseId } = await req.json();
        if (!expenseId) return Response.json({ error: 'expenseId is required' }, { status: 400 });

        const expense = await base44.asServiceRole.entities.Expense.get(expenseId);
        if (!expense) return Response.json({ error: 'Expense not found' }, { status: 404 });
        if (!expense.isDeleted) return Response.json({ error: 'Expense is not deleted' }, { status: 400 });

        await base44.asServiceRole.entities.Expense.update(expenseId, {
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
            purgeAfter: null,
        });

        await base44.asServiceRole.entities.ActivityLog.create({
            action: 'restored_expense',
            entityType: 'expense',
            entityId: expenseId,
            entityLabel: expense.description,
            performedBy: user.email,
            performedByName: user.full_name || user.email,
            details: 'Restored from Recently Deleted',
        });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: (error as Error).message }, { status: 500 });
    }
}