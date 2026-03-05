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
import DuplicateSearch from "../components/expenses/DuplicateSearch";
import { useLanguage } from "../components/LanguageContext";
import { useProject } from "../components/ProjectContext";
import { useProjectPermissions } from "../components/useProjectPermissions";
import { logActivity } from "../components/activityLogger";
import { toast } from "sonner";

export default function ExpensesPage() {
    const { t } = useLanguage();
    const { currentProjectId, currentProject, projects, isLoading: projectsLoading } = useProject();
    const { canEdit, canDelete } = useProjectPermissions(currentProject);
    const [showForm, setShowForm] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [filters, setFilters] = useState({ category: "all", vendor: "all", startDate: null, endDate: null, search: "" });
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 20;
    const formRef = useRef(null);
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    
    const queryClient = useQueryClient();

    React.useEffect(() => {
        const checkAuth = async () => {
            try {
                const currentUser = await base44.auth.me();
                setUser(currentUser);
            } catch (error) {
                setUser(null);
            } finally {
                setAuthLoading(false);
            }
        };
        checkAuth();
    }, []);

    const { data: expenses = [], isLoading } = useQuery({
        queryKey: ['expenses', currentProjectId],
        queryFn: async () => {
            if (!currentProjectId || !user) return [];
            // Get all expenses for this project (regardless of who created them)
            return base44.entities.Expense.filter({ 
                projectId: currentProjectId
            }, '-date');
        },
        enabled: !!currentProjectId && !!user,
    });

    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: () => base44.entities.User.list(),
        enabled: !!user,
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Expense.create(data),
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            setShowForm(false);
            setEditingExpense(null);
            toast.success("Expense added successfully");
            logActivity({ action: "created_expense", entityType: "expense", entityId: created?.id, entityLabel: created?.description, user });
        },
        onError: () => {
            toast.error("Failed to add expense. Please try again.");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Expense.update(id, { ...data, updated_by: user?.email }),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            setShowForm(false);
            setEditingExpense(null);
            toast.success("Expense updated successfully");
            logActivity({ action: "updated_expense", entityType: "expense", entityId: updated?.id, entityLabel: updated?.description, user });
        },
        onError: () => {
            toast.error("Failed to update expense. Please try again.");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (expense) => base44.entities.Expense.delete(expense.id).then(() => expense),
        onSuccess: (expense) => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            toast.success("Expense deleted");
            logActivity({ action: "deleted_expense", entityType: "expense", entityId: expense.id, entityLabel: expense.description, user });
        },
        onError: () => {
            toast.error("Failed to delete expense. Please try again.");
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
            toast.success("Expenses deleted successfully");
        },
        onError: () => {
            toast.error("Failed to delete expenses. Please try again.");
        },
    });

    const handleSubmit = (data) => {
        const expenseData = { 
            ...data, 
            projectId: currentProjectId,
            createdByName: user?.full_name || user?.email,
            updatedByName: user?.full_name || user?.email
        };
        if (editingExpense) {
            updateMutation.mutate({ id: editingExpense.id, data: expenseData });
        } else {
            createMutation.mutate(expenseData);
        }
    };

    const handleEdit = (expense) => {
        // Only expense creator, project owner, or project admin can edit
        const isCreator = expense.created_by === user?.email;
        const isProjectOwner = currentProject?.created_by === user?.email;
        const isProjectAdmin = currentProject?.sharedWith?.some(s => s.email === user?.email && s.role === 'admin');
        
        if (!isCreator && !isProjectOwner && !isProjectAdmin) {
            alert('You do not have permission to edit this expense. Only the creator, project owner, or project admins can edit.');
            return;
        }
        
        setShowForm(true);
        setEditingExpense(expense);
        requestAnimationFrame(() => {
            setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        });
    };

    const handleDelete = (expense) => {
        // Only expense creator, project owner, or project admin can delete
        const isCreator = expense.created_by === user?.email;
        const isProjectOwner = currentProject?.created_by === user?.email;
        const isProjectAdmin = currentProject?.sharedWith?.some(s => s.email === user?.email && s.role === 'admin');
        
        if (!isCreator && !isProjectOwner && !isProjectAdmin) {
            alert('You do not have permission to delete this expense. Only the creator, project owner, or project admins can delete.');
            return;
        }
        
        if (confirm('Are you sure you want to delete this expense?')) {
            deleteMutation.mutate(expense);
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
    const availableVendors = [...new Set(expenses.map(exp => exp.vendor).filter(Boolean))];

    // Reset to page 1 when filters change
    React.useEffect(() => { setCurrentPage(1); }, [filters, currentProjectId]);

    const filteredExpenses = expenses
        .filter(expense => {
            const categoryMatch = filters.category === "all" || expense.category === filters.category;
            const vendorMatch = filters.vendor === "all" || expense.vendor === filters.vendor;
            const expenseDate = new Date(expense.date);
            const startDateMatch = !filters.startDate || expenseDate >= new Date(filters.startDate);
            const endDateMatch = !filters.endDate || expenseDate <= new Date(filters.endDate + 'T23:59:59');

            const searchTerm = filters.search?.toLowerCase();
            const searchNumber = parseFloat(filters.search);
            const searchMatch = !filters.search || 
                expense.description?.toLowerCase().includes(searchTerm) ||
                expense.vendor?.toLowerCase().includes(searchTerm) ||
                expense.category?.toLowerCase().includes(searchTerm) ||
                expense.notes?.toLowerCase().includes(searchTerm) ||
                (!isNaN(searchNumber) && expense.amount === searchNumber);

            return categoryMatch && startDateMatch && endDateMatch && searchMatch;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalPages = Math.ceil(filteredExpenses.length / PAGE_SIZE);
    const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    if (authLoading || projectsLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-slate-600">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Authentication Required</h2>
                    <p className="text-slate-600 mb-6">You need to be logged in to view expenses.</p>
                    <button
                        onClick={() => base44.auth.redirectToLogin()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Log In
                    </button>
                </div>
            </div>
        );
    }

    if (projects.length === 0 || !currentProjectId) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">No Project Selected</h2>
                            <p className="text-slate-600">Please create a project first to start tracking expenses.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{t('constructionExpenses')}</h1>
                        <p className="text-slate-600 mt-1">{t('trackExpenses')}</p>
                    </div>
                    <div className="flex gap-2">
                        {selectedIds.length > 0 && canDelete && (
                            <Button
                                onClick={handleBulkDelete}
                                variant="destructive"
                                disabled={bulkDeleteMutation.isPending}
                            >
                                {t('deleteSelected', { count: selectedIds.length })}
                            </Button>
                        )}
                        {canEdit && <ImportExpenses onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['expenses'] })} />}
                        {canEdit && (
                            <Button
                                onClick={() => {
                                    setEditingExpense(null);
                                    setShowForm(true);
                                    setTimeout(() => {
                                        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }, 100);
                                }}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {t('addExpense')}
                            </Button>
                        )}
                    </div>
                </div>

                <ExpenseSummary expenses={filteredExpenses} />

                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                    {canDelete && (
                        <div className="flex items-center gap-4 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filteredExpenses.length > 0 && selectedIds.length === filteredExpenses.length}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-slate-300"
                                />
                                <span className="text-sm text-slate-600">{t('selectAll')}</span>
                            </label>
                            {selectedIds.length > 0 && (
                                <span className="text-sm text-slate-600">{selectedIds.length} {t('selected')}</span>
                            )}
                        </div>
                    )}
                    <ExpenseFilters 
                        filters={filters} 
                        onFiltersChange={setFilters}
                        availableCategories={availableCategories}
                    />
                </div>

                <DuplicateSearch
                    expenses={filteredExpenses}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    currentUser={user}
                    users={users}
                />

                <div ref={formRef}>
                    {showForm && canEdit && (
                        <ExpenseForm
                            expense={editingExpense}
                            onSubmit={handleSubmit}
                            onCancel={() => {
                                setShowForm(false);
                                setEditingExpense(null);
                            }}
                            currentUser={user}
                        />
                    )}
                </div>

                <div className="grid gap-4 pb-20">
                    {filteredExpenses.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                            <p className="text-slate-500">{t('noExpensesFound')}</p>
                        </div>
                    ) : (
                        paginatedExpenses.map((expense) => (
                            <ExpenseCard
                                key={expense.id}
                                expense={expense}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                isSelected={canDelete ? selectedIds.includes(expense.id) : false}
                                onToggleSelect={canDelete ? () => toggleSelection(expense.id) : undefined}
                                currentUser={user}
                                users={users}
                            />
                        ))
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between bg-white rounded-lg shadow-sm px-4 py-3 mb-6">
                        <span className="text-sm text-slate-600">
                            Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredExpenses.length)} of {filteredExpenses.length} expenses
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 rounded border border-slate-300 text-sm disabled:opacity-40 hover:bg-slate-50"
                            >
                                Previous
                            </button>
                            <span className="text-sm font-medium text-slate-700">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 rounded border border-slate-300 text-sm disabled:opacity-40 hover:bg-slate-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}