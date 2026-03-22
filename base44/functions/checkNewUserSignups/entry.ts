import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        // SECURITY: This function runs as a scheduled task (service role)
        // It notifies admins about new signups - no user authentication needed
        const allUsers = await base44.asServiceRole.entities.User.list();
        const admins = allUsers.filter(u => u.role === 'admin');

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const newUsers = allUsers.filter(u => u.created_date && new Date(u.created_date) > oneDayAgo);

        if (newUsers.length === 0) {
            return Response.json({ success: true, message: 'No new users in the last 24 hours', newUsers: 0 });
        }

        const userList = newUsers.map(u =>
            `<li><strong>${u.full_name || 'No name'}</strong> (${u.email}) — joined ${new Date(u.created_date).toLocaleString()}</li>`
        ).join('');

        for (const admin of admins) {
            const newNonAdminUsers = newUsers.filter(u => u.email !== admin.email);
            if (newNonAdminUsers.length === 0) continue;

            await base44.asServiceRole.integrations.Core.SendEmail({
                to: admin.email,
                subject: `${newUsers.length} New User${newUsers.length > 1 ? 's' : ''} Signed Up Today`,
                body: `
                    <h2>${newUsers.length} new user${newUsers.length > 1 ? 's' : ''} joined in the last 24 hours</h2>
                    <ul>${userList}</ul>
                    <br/>
                    <p>You can manage these users from the Super Admin Dashboard.</p>
                `
            });
        }

        return Response.json({ success: true, newUsers: newUsers.length, notifiedAdmins: admins.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});