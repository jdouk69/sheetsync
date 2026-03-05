import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Loader2, Mail, Shield, User } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsers({ currentUser }) {
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("user");
    const [inviting, setInviting] = useState(false);
    const queryClient = useQueryClient();

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['allUsers'],
        queryFn: () => base44.entities.User.list(),
    });

    const updateRoleMutation = useMutation({
        mutationFn: ({ id, role }) => base44.entities.User.update(id, { role }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allUsers'] });
            toast.success("User role updated");
        },
        onError: () => toast.error("Failed to update role"),
    });

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail.includes('@')) {
            toast.error('Please enter a valid email address');
            return;
        }
        setInviting(true);
        try {
            await base44.users.inviteUser(inviteEmail, inviteRole);
            toast.success(`Invitation sent to ${inviteEmail}`);
            setInviteEmail("");
        } catch (error) {
            toast.error(error.message || 'Failed to send invitation');
        } finally {
            setInviting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Invite User */}
            <Card>
                <CardContent className="pt-5">
                    <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-blue-600" />
                        Invite New User
                    </h2>
                    <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                        <Input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="flex-1"
                            disabled={inviting}
                        />
                        <Select value={inviteRole} onValueChange={setInviteRole}>
                            <SelectTrigger className="w-full sm:w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={inviting}>
                            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Invite"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Users List */}
            <Card>
                <CardContent className="pt-5">
                    <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        All Users ({users.length})
                    </h2>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {users.map((u) => (
                                <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                            <span className="text-blue-700 text-sm font-semibold">
                                                {(u.full_name || u.email)?.[0]?.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">{u.full_name || "—"}</p>
                                            <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                                                <Mail className="w-3 h-3" />{u.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {u.id === currentUser?.id ? (
                                            <Badge variant="outline" className="text-blue-600 border-blue-200">You</Badge>
                                        ) : (
                                            <Select
                                                value={u.role || 'user'}
                                                onValueChange={(role) => updateRoleMutation.mutate({ id: u.id, role })}
                                            >
                                                <SelectTrigger className="w-24 h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="user">User</SelectItem>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                        {u.role === 'admin' && (
                                            <Shield className="w-4 h-4 text-blue-500" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}