import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useProject } from "@/components/ProjectContext";
import { useLanguage } from "@/components/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, PlusCircle, Pencil, Trash2, CheckCircle, Plus, X } from "lucide-react";
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
    const [showBudgetForm, setShowBudgetForm] = useState(false);
    const [editing, setEditing] = useState(false);
    const [formAmount, setFormAmount] = useState("");
    const [formNotes, setFormNotes] = useState("");

    // Budget Expense form state
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [expForm, setExpForm] = useState({
        date: new Date().toISOString().split("T")[0],
        description: "",
        amount: "",
        category: "",
        notes: "",
    });

    const currency = currentProject?.currency || "EUR";
    const projectId = currentProject?.id;

    // ── Fetch Budget ──────────────────────────────────────────────────────────
    const { data: budgets = [], isLoading: loadingBudget } = useQuery({
        queryKey: ["budget", projectId, selectedMonth],
        queryFn: () =>
            projectId
                ? base44.entities.Budget.filter({ projectId, month: selectedMonth })
                : Promise.resolve([]),
        enabled: !!projectId,
    });

    const budget = budgets[0] || null;

    // ── Fetch BudgetExpenses (ONLY from BudgetExpense entity) ─────────────────
    const { data: budgetExpenses = [], isLoading: loadingExpenses } = useQuery({
        queryKey: ["budgetExpenses", budget?.id],
        queryFn: () =>
            budget?.id
                ? base44.entities.BudgetExpense.filter({ budgetId: budget.id }, "-date")
                : Promise.resolve([]),
        enabled: !!budget?.id,
    });

    const totalSpent = useMemo(
        () => budgetExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
        [budgetExpenses]
    );

    const remaining = budget ? budget.amount - totalSpent : null;
    const percentUsed = budget && budget.amount > 0 ? Math.min((totalSpent / budget.amount) * 100, 100) : 0;
    const isOverBudget = budget && totalSpent > budget.amount;

    // ── Budget CRUD ───────────────────────────────────────────────────────────
    const createBudget = useMutation({
        mutationFn: (data) => base44.entities.Budget.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["budget", projectId, selectedMonth] });
            setShowBudgetForm(false);
            setEditing(false);
        },
    });

    const updateBudget = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Budget.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["budget", projectId, selectedMonth] });
            setShowBudgetForm(false);
            setEditing(false);
        },
    });

    const deleteBudget = useMutation({
        mutationFn: (id) => base44.entities.Budget.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["budget", projectId, selectedMonth] });
        },
    });

    // ── BudgetExpense CRUD ────────────────────────────────────────────────────
    const createBudgetExpense = useMutation({
        mutationFn: (data) => base44.entities.BudgetExpense.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["budgetExpenses", budget?.id] });
            setShowExpenseForm(false);
            setExpForm({ date: new Date().toISOString().split("T")[0], description: "", amount: "", category: "", notes: "" });
        },
    });

    const deleteBudgetExpense = useMutation({
        mutationFn: (id) => base44.entities.BudgetExpense.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["budgetExpenses", budget?.id] });
        },
    });

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleOpenCreate = () => {
        setFormAmount("");
        setFormNotes("");
        setEditing(false);
        setShowBudgetForm(true);
    };

    const handleOpenEdit = () => {
        setFormAmount(String(budget.amount));
        setFormNotes(budget.notes || "");
        setEditing(true);
        setShowBudgetForm(true);
    };

    const handleBudgetSubmit = (e) => {
        e.preventDefault();
        const payload = { projectId, month: selectedMonth, amount: parseFloat(formAmount), notes: formNotes || undefined };
        if (editing && budget) {
            updateBudget.mutate({ id: budget.id, data: payload });
        } else {
            createBudget.mutate(payload);
        }
    };

    const handleDeleteBudget = () => {
        if (budget && window.confirm(t("deleteBudgetConfirm"))) {
            deleteBudget.mutate(budget.id);
        }
    };

    const handleExpenseSubmit = (e) => {
        e.preventDefault();
        createBudgetExpense.mutate({
            budgetId: budget.id,
            projectId,
            date: expForm.date,
            description: expForm.description,
            amount: parseFloat(expForm.amount),
            category: expForm.category || undefined,
            notes: expForm.notes || undefined,
        });
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">{t("budgetTracker")}</h1>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <p className="text-sm text-slate-500">
                {t("budgetProject")}: <span className="font-medium text-slate-700">{currentProject?.name}</span>
            </p>

            {loadingBudget ? (
                <div className="text-center py-12 text-slate-400">{t("loading")}</div>
            ) : budget ? (
                <>
                    {/* Progress Card */}
                    <Card className={isOverBudget ? "border-red-400" : "border-slate-200"}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center justify-between">
                                <span>
                                    {format(new Date(selectedMonth + "-01"), "MMMM yyyy")} {t("budgetTracker")}
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={handleOpenEdit} className="text-slate-400 hover:text-blue-600">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={handleDeleteBudget} className="text-slate-400 hover:text-red-600">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Progress Bar */}
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

                            {/* Remaining / Over Budget */}
                            {isOverBudget ? (
                                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-700">{t("overBudget")}</p>
                                        <p className="text-xs text-red-500">
                                            {t("exceededBy", { amount: formatCurrency(Math.abs(remaining), currency) })}
                                        </p>
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

                            {budget.notes && (
                                <p className="text-xs text-slate-500 italic border-t pt-2">{budget.notes}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Add Budget Expense Button */}
                    {!showExpenseForm && (
                        <Button onClick={() => setShowExpenseForm(true)} variant="outline" className="w-full gap-2">
                            <Plus className="w-4 h-4" />
                            {t("addExpense")}
                        </Button>
                    )}

                    {/* Add Budget Expense Form */}
                    {showExpenseForm && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center justify-between">
                                    <span>{t("addNewExpense")}</span>
                                    <button onClick={() => setShowExpenseForm(false)} className="text-slate-400 hover:text-slate-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleExpenseSubmit} className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-sm font-medium text-slate-700 block mb-1">{t("date")} *</label>
                                            <Input
                                                type="date"
                                                value={expForm.date}
                                                onChange={(e) => setExpForm({ ...expForm, date: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-700 block mb-1">{t("amount")} *</label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={expForm.amount}
                                                onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 block mb-1">{t("description")} *</label>
                                        <Input
                                            placeholder={t("descriptionPlaceholder")}
                                            value={expForm.description}
                                            onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 block mb-1">{t("category")}</label>
                                        <Input
                                            placeholder={t("selectCategory")}
                                            value={expForm.category}
                                            onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 block mb-1">{t("notes")}</label>
                                        <Textarea
                                            placeholder={t("notesPlaceholder")}
                                            value={expForm.notes}
                                            onChange={(e) => setExpForm({ ...expForm, notes: e.target.value })}
                                            rows={2}
                                        />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <Button type="button" variant="outline" onClick={() => setShowExpenseForm(false)}>
                                            {t("cancel")}
                                        </Button>
                                        <Button type="submit" disabled={createBudgetExpense.isPending}>
                                            {t("add")} {t("expense")}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    {/* Budget Expense List */}
                    {budgetExpenses.length > 0 && (
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
                                            <button
                                                onClick={() => deleteBudgetExpense.mutate(e.id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </>
            ) : (
                <Card className="border-dashed border-slate-300">
                    <CardContent className="py-10 text-center space-y-3">
                        <p className="text-slate-500 text-sm">{t("noBudgetSet", { month: format(new Date(selectedMonth + "-01"), "MMMM yyyy") })}</p>
                        <Button onClick={handleOpenCreate} className="gap-2">
                            <PlusCircle className="w-4 h-4" />
                            {t("setBudget")}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Create / Edit Budget Form */}
            {showBudgetForm && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">{editing ? t("editBudgetTitle") : t("setBudgetTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleBudgetSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">
                                    {t("budgetAmount", { currency })}
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
                                <label className="text-sm font-medium text-slate-700 block mb-1">{t("budgetNotes")}</label>
                                <Textarea
                                    placeholder={t("budgetNotesPlaceholder")}
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={() => setShowBudgetForm(false)}>
                                    {t("cancel")}
                                </Button>
                                <Button type="submit" disabled={createBudget.isPending || updateBudget.isPending}>
                                    {editing ? t("saveChanges") : t("createBudget")}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}