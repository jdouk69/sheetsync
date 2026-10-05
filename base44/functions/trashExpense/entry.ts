import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export default async function (req: Request): Promise<Response> {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

        const { expenseIds } = await req.json();
        if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
            return Response.json({ error: 'expenseIds is required' }, { status: 400 });
        }

        const projectCache: Record<string, any> = {};
        const trashed: string[] = [];
        const failed: { id: string; error: string }[] = [];

        for (const expenseId of expenseIds) {
            try {
                const expense = await base44.asServiceRole.entities.Expense.get(expenseId);
                if (!expense) throw new Error('Expense not found');
                if (expense.isDeleted) { trashed.push(expenseId); continue; }
                if (!expense.projectId) throw new Error('Expense has no project');

                if (!projectCache[expense.projectId]) {
                    projectCache[expense.projectId] = await base44.asServiceRole.entities.Project.get(expense.projectId);
                }
                const project = projectCache[expense.projectId];
                if (!project) throw new Error('Project not found');

                const isCreator = expense.created_by === user.email;
                const isOwner = project.created_by === user.email;
                const isSuperAdmin = user.role === 'admin';
                const shared = project.sharedWith?.find((s: any) => s.email === user.email);
                const canDelete = isCreator || isOwner || isSuperAdmin || (shared && shared.role === 'admin');
                if (!canDelete) throw new Error('Access denied');

                const now = new Date();
                await base44.asServiceRole.entities.Expense.update(expenseId, {
                    isDeleted: true,
                    deletedAt: now.toISOString(),
                    deletedBy: user.email,
                    purgeAfter: new Date(now.getTime() + FIVE_DAYS_MS).toISOString(),
                });

                await base44.asServiceRole.entities.ActivityLog.create({
                    action: 'deleted_expense',
                    entityType: 'expense',
                    entityId: expenseId,
                    entityLabel: expense.description,
                    performedBy: user.email,
                    performedByName: user.full_name || user.email,
                    details: `Moved to Recently Deleted (project: ${project.name})`,
                });
                trashed.push(expenseId);
            } catch (e) {
                failed.push({ id: expenseId, error: (e as Error).message });
            }
        }

        return Response.json({ success: failed.length === 0, trashed, failed });
    } catch (error) {
        return Response.json({ error: (error as Error).message }, { status: 500 });
    }
}