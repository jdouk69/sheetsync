import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const allUsers = await base44.asServiceRole.entities.User.list();
        const admins = allUsers.filter(u => u.role === 'admin');

        // Find users created in the last 10 minutes
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const newUsers = allUsers.filter(u => {
            if (!u.created_date) return false;
            return new Date(u.created_date) > tenMinutesAgo;
        });

        if (newUsers.length === 0) {
            return Response.json({ success: true, message: 'No new users', newUsers: 0 });
        }

        for (const newUser of newUsers) {
            const email = newUser.email || 'Unknown';
            const name = newUser.full_name || 'No name provided';
            const joinedAt = newUser.created_date ? new Date(newUser.created_date).toLocaleString() : 'Unknown';

            for (const admin of admins) {
                // Don't notify the admin about themselves signing up
                if (admin.email === newUser.email) continue;

                await base44.asServiceRole.integrations.Core.SendEmail({
                    to: admin.email,
                    subject: `New User Signed Up: ${name}`,
                    body: `
                        <h2>A new user has joined the app</h2>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Joined:</strong> ${joinedAt}</p>
                        <br/>
                        <p>You can manage this user from the Super Admin Dashboard.</p>
                    `
                });
            }
        }

        return Response.json({ success: true, newUsers: newUsers.length, notifiedAdmins: admins.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});