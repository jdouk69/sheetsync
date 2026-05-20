import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useProject } from "@/components/ProjectContext";
import { useLanguage } from "@/components/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, PlusCircle, Pencil, Trash2, CheckCircle } from "lucide-react";
import { format } from "date-fns";

const CURRENCY_SYMBOLS = { EUR: "€", USD: "$", GBP: "£", CAD: "CA$", CHF: "CHF" };

function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(amount, currency = "EUR") {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BudgetPage() {
    const { currentProject } = useProject();
    const { t } = useLanguage();
    const queryClient = useQueryClient();

    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(false);
    const [formAmount, setFormAmount] = useState("");
    const [formNotes, setFormNotes] = useState("");

    const currency = currentProject?.currency || "EUR";
    const projectId = currentProject?.id;

    // Fetch budget for this project+month
    const { data: budgets = [], isLoading: loadingBudget } = useQuery({
        queryKey: ["budget", projectId, selectedMonth],
        queryFn: () =>
            projectId
                ? base44.entities.Budget.filter({ projectId, month: selectedMonth })
                : Promise.resolve([]),
        enabled: !!projectId,
    });

    const budget = budgets[0] || null;

    // Fetch expenses for this project+month
    const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
        queryKey: ["expenses-budget", projectId, selectedMonth],
        queryFn: async () => {
            if (!projectId) return [];
            const all = await base44.entities.Expense.filter({ projectId });
            const [year, month] = selectedMonth.split("-");
            return all.filter((e) => {
                if (!e.date) return false;
                const d = new Date(e.date);
                return (
                    d.getFullYear() === parseInt(year) &&
                    d.getMonth() + 1 === parseInt(month)
                );
            });
        },
        enabled: !!projectId,
    });

    const totalSpent = useMemo(
        () => expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
        [expenses]
    );

    const remaining = budget ? budget.amount - totalSpent : null;
    const percentUsed = budget ? Math.min((totalSpent / budget.amount) * 100, 100) : 0;
    const isOverBudget = budget && totalSpent > budget.amount;

    // Mutations
    const createBudget = useMutation({
        mutationFn: (data) => base44.entities.Budget.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["budget", projectId, selectedMonth] });
            setShowForm(false);
            setEditing(false);
        },
    });

    const updateBudget = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Budget.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["budget", projectId, selectedMonth] });
            setShowForm(false);
            setEditing(false);
        },
    });

    const deleteBudget = useMutation({
        mutationFn: (id) => base44.entities.Budget.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["budget", projectId, selectedMonth] });
        },
    });

    const handleOpenCreate = () => {
        setFormAmount("");
        setFormNotes("");
        setEditing(false);
        setShowForm(true);
    };

    const handleOpenEdit = () => {
        setFormAmount(String(budget.amount));
        setFormNotes(budget.notes || "");
        setEditing(true);
        setShowForm(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            projectId,
            month: selectedMonth,
            amount: parseFloat(formAmount),
            notes: formNotes || undefined,
        };
        if (editing && budget) {
            updateBudget.mutate({ id: budget.id, data: payload });
        } else {
            createBudget.mutate(payload);
        }
    };

    const handleDelete = () => {
        if (budget && window.confirm("Delete this budget?")) {
            deleteBudget.mutate(budget.id);
        }
    };

    if (!projectId) {
        return (
            <div className="max-w-xl mx-auto px-4 py-12 text-center text-slate-500">
                Please select a project to manage its budget.
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Budget Tracker</h1>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <p className="text-sm text-slate-500">
                Project: <span className="font-medium text-slate-700">{currentProject?.name}</span>
            </p>

            {loadingBudget || loadingExpenses ? (
                <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : budget ? (
                <>
                    {/* Progress Card */}
                    <Card className={isOverBudget ? "border-red-400" : "border-slate-200"}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center justify-between">
                                <span>
                                    {format(new Date(selectedMonth + "-01"), "MMMM yyyy")} Budget
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={handleOpenEdit} className="text-slate-400 hover:text-blue-600">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={handleDelete} className="text-slate-400 hover:text-red-600">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Progress Bar */}
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-500">Spent</span>
                                    <span className={isOverBudget ? "text-red-600 font-semibold" : "text-slate-700"}>
                                        {formatCurrency(totalSpent, currency)} / {formatCurrency(budget.amount, currency)}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div
                                        className={`h-3 rounded-full transition-all ${isOverBudget ? "bg-red-500" : percentUsed > 80 ? "bg-yellow-400" : "bg-blue-500"}`}
                                        style={{ width: `${Math.min(percentUsed, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-slate-400 mt-1">
                                    <span>{percentUsed.toFixed(1)}% used</span>
                                    <span>{expenses.length} expense{expenses.length !== 1 ? "s" : ""}</span>
                                </div>
                            </div>

                            {/* Remaining / Over Budget */}
                            {isOverBudget ? (
                                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-700">Over Budget!</p>
                                        <p className="text-xs text-red-500">
                                            Exceeded by {formatCurrency(Math.abs(remaining), currency)}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-green-700">Remaining</p>
                                        <p className="text-xs text-green-600">{formatCurrency(remaining, currency)} left</p>
                                    </div>
                                </div>
                            )}

                            {budget.notes && (
                                <p className="text-xs text-slate-500 italic border-t pt-2">{budget.notes}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Expense Breakdown */}
                    {expenses.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-slate-600">Expenses this month</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {expenses.map((e) => (
                                    <div key={e.id} className="flex justify-between text-sm">
                                        <span className="text-slate-700 truncate max-w-[60%]">{e.description}</span>
                                        <span className="text-slate-900 font-medium">{formatCurrency(e.amount, currency)}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </>
            ) : (
                <Card className="border-dashed border-slate-300">
                    <CardContent className="py-10 text-center space-y-3">
                        <p className="text-slate-500 text-sm">No budget set for {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}.</p>
                        <Button onClick={handleOpenCreate} className="gap-2">
                            <PlusCircle className="w-4 h-4" />
                            Set Budget
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Create / Edit Form */}
            {showForm && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">{editing ? "Edit Budget" : "Set Monthly Budget"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">
                                    Budget Amount ({currency})
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="e.g. 2000"
                                    value={formAmount}
                                    onChange={(e) => setFormAmount(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Notes (optional)</label>
                                <Textarea
                                    placeholder="Any notes about this budget..."
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createBudget.isPending || updateBudget.isPending}
                                >
                                    {editing ? "Save Changes" : "Create Budget"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}