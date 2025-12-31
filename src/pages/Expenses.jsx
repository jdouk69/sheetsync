import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Download } from "lucide-react";
import ExpenseForm from "../components/expenses/ExpenseForm";
import ExpenseCard from "../components/expenses/ExpenseCard";
import ExpenseFilters from "../components/expenses/ExpenseFilters";
import ExpenseSummary from "../components/expenses/ExpenseSummary";
import ImportExpenses from "../components/expenses/ImportExpenses";

export default function ExpensesPage() {
    const [showForm, setShowForm] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [filters, setFilters] = useState({ category: "all", startDate: null, endDate: null });
    const [selectedIds, setSelectedIds] = useState([]);
    const formRef = useRef(null);
    
    const queryClient = useQueryClient();

    const { data: expenses = [], isLoading } = useQuery({
        queryKey: ['expenses'],
        queryFn: () => base44.entities.Expense.list('-date'),
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Expense.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            setShowForm(false);
            setEditingExpense(null);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            setShowForm(false);
            setEditingExpense(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Expense.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids) => {
            for (const id of ids) {
                await base44.entities.Expense.delete(id);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            setSelectedIds([]);
        },
    });

    const handleSubmit = (data) => {
        if (editingExpense) {
            updateMutation.mutate({ id: editingExpense.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (expense) => {
        setEditingExpense(expense);
        setShowForm(true);
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this expense?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleBulkDelete = () => {
        if (confirm(`Are you sure you want to delete ${selectedIds.length} expenses?`)) {
            bulkDeleteMutation.mutate(selectedIds);
        }
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredExpenses.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredExpenses.map(exp => exp.id));
        }
    };

    const availableCategories = [...new Set(expenses.map(exp => exp.category).filter(Boolean))];

    const filteredExpenses = expenses
        .filter(expense => {
            const categoryMatch = filters.category === "all" || expense.category === filters.category;
            const startDateMatch = !filters.startDate || new Date(expense.date) >= new Date(filters.startDate);
            const endDateMatch = !filters.endDate || new Date(expense.date) <= new Date(filters.endDate);
            return categoryMatch && startDateMatch && endDateMatch;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-slate-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Construction Expenses</h1>
                        <p className="text-slate-600 mt-1">Track your Greece house construction costs</p>
                    </div>
                    <div className="flex gap-2">
                        {selectedIds.length > 0 && (
                            <Button
                                onClick={handleBulkDelete}
                                variant="destructive"
                                disabled={bulkDeleteMutation.isPending}
                            >
                                Delete {selectedIds.length} Selected
                            </Button>
                        )}
                        <ImportExpenses onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['expenses'] })} />
                        <Button
                            onClick={() => {
                                setEditingExpense(null);
                                setShowForm(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Expense
                        </Button>
                    </div>
                </div>

                <ExpenseSummary expenses={filteredExpenses} />

                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filteredExpenses.length > 0 && selectedIds.length === filteredExpenses.length}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-slate-300"
                            />
                            <span className="text-sm text-slate-600">Select All</span>
                        </label>
                        {selectedIds.length > 0 && (
                            <span className="text-sm text-slate-600">{selectedIds.length} selected</span>
                        )}
                    </div>
                    <ExpenseFilters 
                        filters={filters} 
                        onFiltersChange={setFilters}
                        availableCategories={availableCategories}
                    />
                </div>

                <div ref={formRef}>
                    {showForm && (
                        <ExpenseForm
                            expense={editingExpense}
                            onSubmit={handleSubmit}
                            onCancel={() => {
                                setShowForm(false);
                                setEditingExpense(null);
                            }}
                        />
                    )}
                </div>

                <div className="grid gap-4 pb-20">
                    {filteredExpenses.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                            <p className="text-slate-500">No expenses found. Add your first expense to get started.</p>
                        </div>
                    ) : (
                        filteredExpenses.map((expense) => (
                            <ExpenseCard
                                key={expense.id}
                                expense={expense}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                isSelected={selectedIds.includes(expense.id)}
                                onToggleSelect={() => toggleSelection(expense.id)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}