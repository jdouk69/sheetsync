import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        // SECURITY: This webhook is triggered by entity updates
        // The update itself was already authorized, so we just notify
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
        const notified = [];
        const skipped = [];

        for (const member of newMembers) {
            try {
                await base44.asServiceRole.integrations.Core.SendEmail({
                    to: member.email,
                    subject: `You've been added to "${projectName}"`,
                    body: `<p>Hello,</p><p>You have been added to the project <strong>"${projectName}"</strong> with the role of <strong>${member.role}</strong>.</p><p>You can now log in to view and manage this project.</p><p>Best regards,<br>The Team</p>`
                });
                notified.push(member.email);
            } catch (e) {
                skipped.push({ email: member.email, reason: e.message });
            }
        }

        return Response.json({ success: true, notified, skipped });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});