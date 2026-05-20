import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useProject } from "@/components/ProjectContext";
import { useLanguage } from "@/components/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, PlusCircle, Pencil, Trash2, CheckCircle, Plus, X, ChevronLeft } from "lucide-react";

const CURRENCY_SYMBOLS = { EUR: "€", USD: "$", GBP: "£", CAD: "CA$", CHF: "CHF" };

function formatCurrency(amount, currency = "EUR") {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Budget Form ───────────────────────────────────────────────────────────────
function BudgetForm({ initial, onSubmit, onCancel, isPending, t }) {
    const [form, setForm] = useState({
        name: initial?.name || "",
        amount: initial?.amount ? String(initial.amount) : "",
        month: initial?.month || "",
        notes: initial?.notes || "",
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            name: form.name,
            amount: parseFloat(form.amount),
            month: form.month || undefined,
            notes: form.notes || undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">{t("budgetName")} *</label>
                <Input
                    placeholder={t("budgetNamePlaceholder")}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">{t("budgetAmount", { currency: "" }).replace("()", "").trim()} *</label>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 2000"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">{t("month")} ({t("optional")})</label>
                    <Input
                        type="month"
                        value={form.month}
                        onChange={(e) => setForm({ ...form, month: e.target.value })}
                    />
                </div>
            </div>
            <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">{t("budgetNotes")}</label>
                <Textarea
                    placeholder={t("budgetNotesPlaceholder")}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                />
            </div>
            <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={onCancel}>{t("cancel")}</Button>
                <Button type="submit" disabled={isPending}>
                    {initial ? t("saveChanges") : t("createBudget")}
                </Button>
            </div>
        </form>
    );
}

// ── Budget Expense Form ───────────────────────────────────────────────────────
function BudgetExpenseForm({ budgetId, projectId, onSuccess, onCancel, t, isPending }) {
    const [form, setForm] = useState({
        date: new Date().toISOString().split("T")[0],
        description: "",
        amount: "",
        category: "",
        notes: "",
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSuccess({
            budgetId,
            projectId,
            date: form.date,
            description: form.description,
            amount: parseFloat(form.amount),
            category: form.category || undefined,
            notes: form.notes || undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="min-w-0">
                    <label className="text-sm font-medium text-slate-700 block mb-1">{t("date")} *</label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="w-full" />
                </div>
                <div className="min-w-0">
                    <label className="text-sm font-medium text-slate-700 block mb-1">{t("amount")} *</label>
                    <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required className="w-full" />
                </div>
            </div>
            <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">{t("description")} *</label>
                <Input placeholder={t("descriptionPlaceholder")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">{t("category")}</label>
                <Input placeholder={t("selectCategory")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">{t("notes")}</label>
                <Textarea placeholder={t("notesPlaceholder")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={onCancel}>{t("cancel")}</Button>
                <Button type="submit" disabled={isPending}>{t("add")} {t("expense")}</Button>
            </div>
        </form>
    );
}

// ── Budget Detail View ────────────────────────────────────────────────────────
function BudgetDetail({ budget, currency, onBack, t, projectId }) {
    const queryClient = useQueryClient();
    const [showExpenseForm, setShowExpenseForm] = useState(false);

    const { data: budgetExpenses = [], isLoading } = useQuery({
        queryKey: ["budgetExpenses", budget.id],
        queryFn: () => base44.entities.BudgetExpense.filter({ budgetId: budget.id }, "-date"),
    });

    const totalSpent = useMemo(() => budgetExpenses.reduce((sum, e) => sum + (e.amount || 0), 0), [budgetExpenses]);
    const remaining = budget.amount - totalSpent;
    const percentUsed = budget.amount > 0 ? Math.min((totalSpent / budget.amount) * 100, 100) : 0;
    const isOverBudget = totalSpent > budget.amount;

    const createBudgetExpense = useMutation({
        mutationFn: (data) => base44.entities.BudgetExpense.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["budgetExpenses", budget.id] });
            setShowExpenseForm(false);
        },
    });

    const deleteBudgetExpense = useMutation({
        mutationFn: (id) => base44.entities.BudgetExpense.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgetExpenses", budget.id] }),
    });

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <button onClick={onBack} className="text-slate-500 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{budget.name}</h2>
                    {budget.month && <p className="text-xs text-slate-400">{budget.month}</p>}
                </div>
            </div>

            {/* Progress Card */}
            <Card className={isOverBudget ? "border-red-400" : "border-slate-200"}>
                <CardContent className="pt-4 space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-500">{t("spent")}</span>
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
                            <span>{t("percentUsed", { percent: percentUsed.toFixed(1) })}</span>
                            <span>{budgetExpenses.length} {t("expenses")}</span>
                        </div>
                    </div>

                    {isOverBudget ? (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-red-700">{t("overBudget")}</p>
                                <p className="text-xs text-red-500">{t("exceededBy", { amount: formatCurrency(Math.abs(remaining), currency) })}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-green-700">{t("remaining")}</p>
                                <p className="text-xs text-green-600">{t("remainingLeft", { amount: formatCurrency(remaining, currency) })}</p>
                            </div>
                        </div>
                    )}

                    {budget.notes && <p className="text-xs text-slate-500 italic border-t pt-2">{budget.notes}</p>}
                </CardContent>
            </Card>

            {/* Add Expense Button */}
            {!showExpenseForm && (
                <Button onClick={() => setShowExpenseForm(true)} variant="outline" className="w-full gap-2">
                    <Plus className="w-4 h-4" /> {t("addExpense")}
                </Button>
            )}

            {/* Add Expense Form */}
            {showExpenseForm && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center justify-between">
                            <span>{t("addNewExpense")}</span>
                            <button onClick={() => setShowExpenseForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <BudgetExpenseForm
                            budgetId={budget.id}
                            projectId={projectId}
                            onSuccess={(data) => createBudgetExpense.mutate(data)}
                            onCancel={() => setShowExpenseForm(false)}
                            isPending={createBudgetExpense.isPending}
                            t={t}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Expense List */}
            {isLoading ? (
                <p className="text-center text-slate-400 py-4">{t("loading")}</p>
            ) : budgetExpenses.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-600">{t("expensesThisMonth")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {budgetExpenses.map((e) => (
                            <div key={e.id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 last:border-0">
                                <div className="flex-1 min-w-0">
                                    <span className="text-slate-700 truncate block">{e.description}</span>
                                    <span className="text-xs text-slate-400">{e.date}{e.category ? ` · ${e.category}` : ""}</span>
                                </div>
                                <div className="flex items-center gap-2 ml-3">
                                    <span className="text-slate-900 font-medium">{formatCurrency(e.amount, currency)}</span>
                                    <button onClick={() => deleteBudgetExpense.mutate(e.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ── Budget List Card ──────────────────────────────────────────────────────────
function BudgetListCard({ budget, currency, onSelect, onEdit, onDelete, t }) {
    const { data: budgetExpenses = [] } = useQuery({
        queryKey: ["budgetExpenses", budget.id],
        queryFn: () => base44.entities.BudgetExpense.filter({ budgetId: budget.id }, "-date"),
    });

    const totalSpent = budgetExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const remaining = budget.amount - totalSpent;
    const percentUsed = budget.amount > 0 ? Math.min((totalSpent / budget.amount) * 100, 100) : 0;
    const isOver = totalSpent > budget.amount;

    return (
        <Card
            className={`cursor-pointer hover:shadow-md transition-shadow ${isOver ? "border-red-300" : "border-slate-200"}`}
            onClick={() => onSelect(budget)}
        >
            <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="font-semibold text-slate-800">{budget.name}</p>
                        {budget.month && <p className="text-xs text-slate-400">{budget.month}</p>}
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => onEdit(budget)} className="text-slate-400 hover:text-blue-600 p-1"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onDelete(budget)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{t("spent")}: {formatCurrency(totalSpent, currency)}</span>
                        <span>{t("remaining")}: <span className={isOver ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>{formatCurrency(remaining, currency)}</span></span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                            className={`h-2 rounded-full ${isOver ? "bg-red-500" : percentUsed > 80 ? "bg-yellow-400" : "bg-blue-500"}`}
                            style={{ width: `${Math.min(percentUsed, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>{percentUsed.toFixed(1)}% {t("percentUsed", { percent: "" }).replace("%", "").trim()}</span>
                        <span>{formatCurrency(budget.amount, currency)} {t("budgetTracker").toLowerCase()}</span>
                    </div>
                </div>

                {budgetExpenses.length > 0 && (
                    <p className="text-xs text-slate-400">{budgetExpenses.length} {t("expenses")}</p>
                )}
            </CardContent>
        </Card>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BudgetPage() {
    const { currentProject } = useProject();
    const { t } = useLanguage();
    const queryClient = useQueryClient();

    const [selectedBudget, setSelectedBudget] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);

    const currency = currentProject?.currency || "EUR";
    const projectId = currentProject?.id;

    const { data: budgets = [], isLoading } = useQuery({
        queryKey: ["budgets", projectId],
        queryFn: () => projectId ? base44.entities.Budget.filter({ projectId }, "-created_date") : Promise.resolve([]),
        enabled: !!projectId,
    });

    const createBudget = useMutation({
        mutationFn: (data) => base44.entities.Budget.create({ ...data, projectId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["budgets", projectId] });
            setShowCreateForm(false);
        },
    });

    const updateBudget = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Budget.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["budgets", projectId] });
            setEditingBudget(null);
        },
    });

    const deleteBudget = useMutation({
        mutationFn: (id) => base44.entities.Budget.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets", projectId] }),
    });

    const handleDelete = (budget) => {
        if (window.confirm(t("deleteBudgetConfirm"))) {
            deleteBudget.mutate(budget.id);
            if (selectedBudget?.id === budget.id) setSelectedBudget(null);
        }
    };

    if (!projectId) {
        return (
            <div className="max-w-xl mx-auto px-4 py-12 text-center text-slate-500">
                {t("selectProjectForBudget")}
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
            {/* If a budget is selected, show its detail view */}
            {selectedBudget ? (
                <BudgetDetail
                    budget={selectedBudget}
                    currency={currency}
                    projectId={projectId}
                    onBack={() => setSelectedBudget(null)}
                    t={t}
                />
            ) : (
                <>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-slate-800">{t("budgetTracker")}</h1>
                        <Button onClick={() => { setShowCreateForm(true); setEditingBudget(null); }} size="sm" className="gap-1">
                            <Plus className="w-4 h-4" /> {t("createBudget")}
                        </Button>
                    </div>

                    <p className="text-sm text-slate-500">
                        {t("budgetProject")}: <span className="font-medium text-slate-700">{currentProject?.name}</span>
                    </p>

                    {/* Create / Edit Budget Form */}
                    {(showCreateForm || editingBudget) && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center justify-between">
                                    <span>{editingBudget ? t("editBudgetTitle") : t("setBudgetTitle")}</span>
                                    <button onClick={() => { setShowCreateForm(false); setEditingBudget(null); }} className="text-slate-400 hover:text-slate-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BudgetForm
                                    initial={editingBudget}
                                    onSubmit={(data) => {
                                        if (editingBudget) updateBudget.mutate({ id: editingBudget.id, data });
                                        else createBudget.mutate(data);
                                    }}
                                    onCancel={() => { setShowCreateForm(false); setEditingBudget(null); }}
                                    isPending={createBudget.isPending || updateBudget.isPending}
                                    t={t}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Budget List */}
                    {isLoading ? (
                        <p className="text-center text-slate-400 py-12">{t("loading")}</p>
                    ) : budgets.length === 0 ? (
                        <Card className="border-dashed border-slate-300">
                            <CardContent className="py-10 text-center space-y-3">
                                <p className="text-slate-500 text-sm">{t("noBudgetsYet")}</p>
                                <Button onClick={() => setShowCreateForm(true)} className="gap-2">
                                    <PlusCircle className="w-4 h-4" /> {t("createBudget")}
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {budgets.map((b) => (
                                <BudgetListCard
                                    key={b.id}
                                    budget={b}
                                    currency={currency}
                                    onSelect={setSelectedBudget}
                                    onEdit={(b) => { setEditingBudget(b); setShowCreateForm(false); }}
                                    onDelete={handleDelete}
                                    t={t}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}