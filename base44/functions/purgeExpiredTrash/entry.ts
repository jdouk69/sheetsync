import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { purgeExpenseAndPayments } from '../../shared/trash.ts';

export default async function (req: Request): Promise<Response> {
    try {
        const base44 = createClientFromRequest(req);

        // Scheduled runs have no user session; manual runs must be admin.
        let caller = 'scheduled';
        try {
            const user = await base44.auth.me();
            if (user) {
                if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
                caller = user.email;
            }
        } catch (_) {
            // no user session: scheduler
        }

        const deleted = await base44.asServiceRole.entities.Expense.filter({ isDeleted: true }, 'purgeAfter', 500);
        let purged = 0;
        let skipped = 0;

        for (const expense of deleted) {
            // Helper refuses to delete anything before purgeAfter
            const done = await purgeExpenseAndPayments(base44, expense, false);
            if (done) {
                purged++;
                await base44.asServiceRole.entities.ActivityLog.create({
                    action: 'purged_expense',
                    entityType: 'expense',
                    entityId: expense.id,
                    entityLabel: expense.description,
                    performedBy: caller,
                    performedByName: caller,
                    details: 'Automatically deleted after 5 days in Recently Deleted',
                });
            } else {
                skipped++;
            }
        }

        return Response.json({ success: true, purged, skipped });
    } catch (error) {
        return Response.json({ error: (error as Error).message }, { status: 500 });
    }
}