import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Loader2, Mail, Shield, User, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "../activityLogger";

export default function AdminUsers({ currentUser }) {
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("user");
    const [inviting, setInviting] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editName, setEditName] = useState("");
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const queryClient = useQueryClient();

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['allUsers'],
        queryFn: () => base44.entities.User.list(),
    });

    const updateRoleMutation = useMutation({
        mutationFn: ({ id, role, targetEmail }) => base44.entities.User.update(id, { role }).then(() => ({ id, role, targetEmail })),
        onSuccess: ({ role, targetEmail }) => {
            queryClient.invalidateQueries({ queryKey: ['allUsers'] });
            toast.success("User role updated");
            logActivity({ action: "updated_user_role", entityType: "user", entityId: "", entityLabel: targetEmail, user: currentUser, details: `Role changed to ${role}` });
        },
        onError: () => toast.error("Failed to update role"),
    });

    const updateNameMutation = useMutation({
        mutationFn: ({ id, full_name }) => base44.entities.User.update(id, { full_name }).then(() => ({ id, full_name })),
        onSuccess: ({ full_name }) => {
            queryClient.invalidateQueries({ queryKey: ['allUsers'] });
            toast.success("User info updated");
            logActivity({ action: "updated_user_info", entityType: "user", entityId: editingUser?.id, entityLabel: editingUser?.email, user: currentUser, details: `Name changed to ${full_name}` });
            setEditingUser(null);
        },
        onError: () => toast.error("Failed to update user info"),
    });

    const deleteUserMutation = useMutation({
        mutationFn: (u) => base44.entities.User.delete(u.id).then(() => u),
        onSuccess: (u) => {
            queryClient.invalidateQueries({ queryKey: ['allUsers'] });
            toast.success("User deleted");
            logActivity({ action: "deleted_user", entityType: "user", entityId: u.id, entityLabel: u.email, user: currentUser });
            setDeleteConfirmId(null);
        },
        onError: () => toast.error("Failed to delete user"),
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

    const userToDelete = users.find(u => u.id === deleteConfirmId);

    return (
        <div className="space-y-6">
            {/* Edit Name Dialog */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div>
                            <label className="text-sm text-slate-600 mb-1 block">Full Name</label>
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full name" />
                        </div>
                        <div>
                            <label className="text-sm text-slate-600 mb-1 block">Email</label>
                            <Input value={editingUser?.email || ""} disabled className="bg-slate-50 text-slate-500" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => updateNameMutation.mutate({ id: editingUser.id, full_name: editName })} disabled={updateNameMutation.isPending}>
                            {updateNameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-slate-600 py-2">Are you sure you want to delete <strong>{userToDelete?.full_name || userToDelete?.email}</strong>? This cannot be undone.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteUserMutation.mutate(userToDelete)} disabled={deleteUserMutation.isPending}>
                            {deleteUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
                                            <>
                                                <Select
                                                    value={u.role || 'user'}
                                                    onValueChange={(role) => updateRoleMutation.mutate({ id: u.id, role, targetEmail: u.email })}
                                                >
                                                    <SelectTrigger className="w-24 h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="user">User</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => { setEditingUser(u); setEditName(u.full_name || ""); }}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => setDeleteConfirmId(u.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
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