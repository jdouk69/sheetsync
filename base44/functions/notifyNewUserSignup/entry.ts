import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();

        const newUser = payload.data;
        const email = newUser?.email || 'Unknown';
        const name = newUser?.full_name || 'No name provided';
        const joinedAt = newUser?.created_date ? new Date(newUser.created_date).toLocaleString() : 'Unknown';

        // Get all super admins to notify
        const allUsers = await base44.asServiceRole.entities.User.list();
        const admins = allUsers.filter(u => u.role === 'admin');

        for (const admin of admins) {
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

        return Response.json({ success: true, notified: admins.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});