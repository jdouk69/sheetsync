import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Loader2, Mail, Shield, User, Pencil, Trash2, FolderOpen, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "../activityLogger";

const roleLabel = (role) => role === 'admin' ? 'Super Admin' : 'User';
const projectRoleColor = { admin: 'bg-blue-100 text-blue-700', editor: 'bg-green-100 text-green-700', viewer: 'bg-slate-100 text-slate-600' };

export default function AdminUsers({ currentUser }) {
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("user");
    const [inviting, setInviting] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editName, setEditName] = useState("");
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const queryClient = useQueryClient();

    const [expandedUser, setExpandedUser] = useState(null);
    const [addingToProject, setAddingToProject] = useState({}); // { [userId]: { projectId, role } }

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['allUsers'],
        queryFn: () => base44.entities.User.list(),
    });

    const { data: projects = [] } = useQuery({
        queryKey: ['allProjects'],
        queryFn: () => base44.entities.Project.list(),
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

    const updateProjectRoleMutation = useMutation({
        mutationFn: ({ project, userEmail, newRole }) => {
            const updated = (project.sharedWith || []).map(s =>
                s.email === userEmail ? { ...s, role: newRole } : s
            );
            return base44.entities.Project.update(project.id, { sharedWith: updated }).then(() => ({ project, userEmail, newRole }));
        },
        onSuccess: ({ project, userEmail, newRole }) => {
            queryClient.invalidateQueries({ queryKey: ['allProjects'] });
            toast.success("Project role updated");
            logActivity({ action: "updated_project_role", entityType: "project", entityId: project.id, entityLabel: project.name, user: currentUser, details: `${userEmail} role changed to ${newRole}` });
        },
        onError: () => toast.error("Failed to update project role"),
    });

    const removeFromProjectMutation = useMutation({
        mutationFn: ({ project, userEmail }) => {
            const updated = (project.sharedWith || []).filter(s => s.email !== userEmail);
            return base44.entities.Project.update(project.id, { sharedWith: updated }).then(() => ({ project, userEmail }));
        },
        onSuccess: ({ project, userEmail }) => {
            queryClient.invalidateQueries({ queryKey: ['allProjects'] });
            toast.success("User removed from project");
            logActivity({ action: "removed_from_project", entityType: "project", entityId: project.id, entityLabel: project.name, user: currentUser, details: `${userEmail} removed` });
        },
        onError: () => toast.error("Failed to remove user from project"),
    });

    const addToProjectMutation = useMutation({
        mutationFn: ({ project, userEmail, role }) => {
            const updated = [...(project.sharedWith || []), { email: userEmail, role }];
            return base44.entities.Project.update(project.id, { sharedWith: updated }).then(() => ({ project, userEmail, role }));
        },
        onSuccess: ({ project, userEmail, role }) => {
            queryClient.invalidateQueries({ queryKey: ['allProjects'] });
            toast.success(`Added to ${project.name} as ${role}`);
            logActivity({ action: "added_to_project", entityType: "project", entityId: project.id, entityLabel: project.name, user: currentUser, details: `${userEmail} added as ${role}` });
            setAddingToProject({});
        },
        onError: () => toast.error("Failed to add user to project"),
    });

    const getUserProjects = (email) =>
        projects.filter(p => (p.sharedWith || []).some(s => s.email === email) || p.created_by === email);

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
                            <SelectTrigger className="w-full sm:w-36">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Super Admin</SelectItem>
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
                                <div key={u.id} className="p-3 bg-slate-50 rounded-lg">
                                    {/* Top row: avatar + info */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                            <span className="text-blue-700 text-sm font-semibold">
                                                {(u.full_name || u.email)?.[0]?.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-900 truncate">{u.full_name || "—"}</p>
                                            <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                                                <Mail className="w-3 h-3 shrink-0" />{u.email}
                                            </p>
                                            {u.created_date && (
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    Joined {new Date(u.created_date).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {/* Bottom row: controls */}
                                    <div className="flex items-center gap-2 mt-2 pl-12">
                                       {u.id === currentUser?.id ? (
                                           <Badge variant="outline" className="text-blue-600 border-blue-200">You</Badge>
                                       ) : (
                                           <>
                                               <Select
                                                   value={u.role || 'user'}
                                                   onValueChange={(role) => updateRoleMutation.mutate({ id: u.id, role, targetEmail: u.email })}
                                               >
                                                   <SelectTrigger className="w-32 h-8 text-xs">
                                                       <SelectValue>{roleLabel(u.role || 'user')}</SelectValue>
                                                   </SelectTrigger>
                                                   <SelectContent>
                                                       <SelectItem value="user">User</SelectItem>
                                                       <SelectItem value="admin">Super Admin</SelectItem>
                                                   </SelectContent>
                                               </Select>
                                               <Button variant="ghost" size="icon" className="h-11 w-11 text-slate-400 hover:text-blue-600" onClick={() => { setEditingUser(u); setEditName(u.full_name || ""); }}>
                                                   <Pencil className="w-4 h-4" />
                                               </Button>
                                               <Button variant="ghost" size="icon" className="h-11 w-11 text-slate-400 hover:text-red-600" onClick={() => setDeleteConfirmId(u.id)}>
                                                   <Trash2 className="w-4 h-4" />
                                               </Button>
                                           </>
                                       )}
                                       {u.role === 'admin' && (
                                           <Shield className="w-4 h-4 text-blue-500" title="Super Admin" />
                                       )}
                                       {/* Expand project roles */}
                                       <button
                                           onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                                           className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                                       >
                                           <FolderOpen className="w-3.5 h-3.5" />
                                           Projects
                                           {expandedUser === u.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                       </button>
                                    </div>

                                    {/* Project roles panel */}
                                    {expandedUser === u.id && (() => {
                                       const userProjects = getUserProjects(u.email);
                                       const availableProjects = projects.filter(p =>
                                           p.created_by !== u.email && !(p.sharedWith || []).some(s => s.email === u.email)
                                       );
                                       const adding = addingToProject[u.id] || {};
                                       return (
                                           <div className="mt-2 ml-12 space-y-1.5">
                                               {userProjects.length === 0 ? (
                                                   <p className="text-xs text-slate-400 italic">Not part of any project</p>
                                               ) : userProjects.map(p => {
                                                   const isOwner = p.created_by === u.email;
                                                   const shared = (p.sharedWith || []).find(s => s.email === u.email);
                                                   const projRole = isOwner ? 'owner' : shared?.role;
                                                   return (
                                                       <div key={p.id} className="flex items-center gap-2 flex-wrap bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                                                           <FolderOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                           <span className="text-xs font-medium text-slate-700 flex-1 truncate">{p.name}</span>
                                                           {isOwner ? (
                                                               <Badge className="text-xs bg-purple-100 text-purple-700 border-0">Owner</Badge>
                                                           ) : (
                                                               <>
                                                                   <Select
                                                                       value={projRole}
                                                                       onValueChange={(newRole) => updateProjectRoleMutation.mutate({ project: p, userEmail: u.email, newRole })}
                                                                   >
                                                                       <SelectTrigger className="w-28 h-7 text-xs border-slate-200">
                                                                           <SelectValue />
                                                                       </SelectTrigger>
                                                                       <SelectContent>
                                                                           <SelectItem value="viewer">Viewer</SelectItem>
                                                                           <SelectItem value="editor">Editor</SelectItem>
                                                                           <SelectItem value="admin">Project Admin</SelectItem>
                                                                       </SelectContent>
                                                                   </Select>
                                                                   <Button
                                                                       variant="ghost"
                                                                       size="icon"
                                                                       className="h-11 w-11 text-slate-300 hover:text-red-500"
                                                                       onClick={() => removeFromProjectMutation.mutate({ project: p, userEmail: u.email })}
                                                                   >
                                                                       <Trash2 className="w-3.5 h-3.5" />
                                                                   </Button>
                                                               </>
                                                           )}
                                                       </div>
                                                   );
                                               })}
                                           </div>
                                       );
                                    })()}
                                    </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}