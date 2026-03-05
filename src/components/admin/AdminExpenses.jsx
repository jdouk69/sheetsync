import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Loader2, Trash2, Search, Euro } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminExpenses() {
    const [search, setSearch] = useState("");
    const [selectedProject, setSelectedProject] = useState("all");
    const queryClient = useQueryClient();

    const { data: expenses = [], isLoading } = useQuery({
        queryKey: ['allExpenses'],
        queryFn: () => base44.entities.Expense.list('-date', 200),
    });

    const { data: projects = [] } = useQuery({
        queryKey: ['allProjects'],
        queryFn: () => base44.entities.Project.list(),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Expense.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allExpenses'] });
            toast.success("Expense deleted");
        },
        onError: () => toast.error("Failed to delete expense"),
    });

    const handleDelete = (expense) => {
        if (confirm(`Delete expense "${expense.description}"?`)) {
            deleteMutation.mutate(expense.id);
        }
    };

    const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));

    const filtered = expenses.filter(e => {
        const matchesProject = selectedProject === "all" || e.projectId === selectedProject;
        const matchesSearch = !search ||
            e.description?.toLowerCase().includes(search.toLowerCase()) ||
            e.vendor?.toLowerCase().includes(search.toLowerCase()) ||
            e.category?.toLowerCase().includes(search.toLowerCase()) ||
            e.created_by?.toLowerCase().includes(search.toLowerCase());
        return matchesProject && matchesSearch;
    });

    const totalAmount = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);

    return (
        <Card>
            <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                    <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-blue-600" />
                        All Expenses ({expenses.length})
                    </h2>
                    <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                        <Select value={selectedProject} onValueChange={setSelectedProject}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="All Projects" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Projects</SelectItem>
                                {projects.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search expenses..."
                                className="pl-9"
                            />
                        </div>
                    </div>
                </div>

                {/* Summary bar */}
                <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
                    <Euro className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-700 font-medium">
                        Total shown: €{totalAmount.toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-blue-500 ml-auto">{filtered.length} records</span>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">No expenses found</p>
                ) : (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                        {filtered.map((expense) => (
                            <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium text-slate-900 truncate">{expense.description}</p>
                                        <Badge variant="outline" className="text-xs shrink-0">{expense.category}</Badge>
                                        {expense.isPaid && (
                                            <Badge className="text-xs bg-green-100 text-green-700 shrink-0">Paid</Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        <span className="text-sm font-semibold text-slate-700">
                                            €{(expense.amount || 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                                        </span>
                                        {expense.vendor && (
                                            <span className="text-xs text-slate-500">{expense.vendor}</span>
                                        )}
                                        {expense.date && (
                                            <span className="text-xs text-slate-400">
                                                {format(new Date(expense.date), 'dd MMM yyyy')}
                                            </span>
                                        )}
                                        {expense.projectId && projectMap[expense.projectId] && (
                                            <span className="text-xs text-blue-500">{projectMap[expense.projectId]}</span>
                                        )}
                                        <span className="text-xs text-slate-400">by {expense.created_by}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                                    onClick={() => handleDelete(expense)}
                                    aria-label="Delete expense"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}