import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        const { data, old_data } = body;

        if (!data || !old_data) {
            return Response.json({ skipped: true, reason: "Missing data or old_data" });
        }

        const newMembers = (data.sharedWith || []).filter(member => {
            return !(old_data.sharedWith || []).some(old => old.email === member.email);
        });

        if (newMembers.length === 0) {
            return Response.json({ skipped: true, reason: "No new members added" });
        }

        const projectName = data.name || "a project";

        // Fetch all registered users to check if the new member has an account
        const allUsers = await base44.asServiceRole.entities.User.list();
        const registeredEmails = new Set(allUsers.map(u => u.email));

        const notified = [];
        const skipped = [];

        for (const member of newMembers) {
            if (!registeredEmails.has(member.email)) {
                skipped.push(member.email);
                continue;
            }
            await base44.asServiceRole.integrations.Core.SendEmail({
                to: member.email,
                subject: `You've been added to "${projectName}"`,
                body: `Hello,\n\nYou have been added to the project "${projectName}" with the role of ${member.role}.\n\nYou can now log in to view and manage this project.\n\nBest regards,\nThe Team`
            });
            notified.push(member.email);
        }

        return Response.json({ success: true, notified, skipped });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});