import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Allow both authenticated admin users and service-level calls (scheduled)
        let triggeredBy = 'scheduled';
        try {
            const user = await base44.auth.me();
            if (user) {
                if (user.role !== 'admin') {
                    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
                }
                triggeredBy = user.email;
            }
        } catch (_) {
            // Called from scheduler without user session — allow it
        }

        const projects = await base44.asServiceRole.entities.Project.list('-created_date', 500);

        const snapshotDate = new Date().toISOString();

        const snapshots = projects.map(project => ({
            projectId: project.id,
            projectName: project.name,
            snapshotDate,
            triggeredBy,
            data: project,
        }));

        let created = 0;
        for (const snap of snapshots) {
            await base44.asServiceRole.entities.ProjectSnapshot.create(snap);
            created++;
        }

        return Response.json({ success: true, snapshotsCreated: created, snapshotDate });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});