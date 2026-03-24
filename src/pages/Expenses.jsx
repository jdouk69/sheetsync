import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Download } from "lucide-react";
import ExpenseForm from "../components/expenses/ExpenseForm";
import ExpenseCard from "../components/expenses/ExpenseCard";
import PaymentForm from "../components/expenses/PaymentForm";
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
    const [directPaymentExpense, setDirectPaymentExpense] = useState(null);
    const [filters, setFilters] = useState({ category: "all", vendor: "all", startDate: null, endDate: null, search: "", unpaidOnly: false });
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 20;
    const formRef = useRef(null);
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [pullDistance, setPullDistance] = useState(0);
    const [pullRefreshing, setPullRefreshing] = useState(false);
    const touchStartY = useRef(0);
    const PULL_THRESHOLD = 70;

    const queryClient = useQueryClient();

    const handleTouchStart = (e) => {
        if (window.scrollY === 0) touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
        if (pullRefreshing) return;
        const delta = e.touches[0].clientY - touchStartY.current;
        if (delta > 0 && window.scrollY === 0) {
            setPullDistance(Math.min(delta, PULL_THRESHOLD + 20));
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance >= PULL_THRESHOLD) {
            setPullRefreshing(true);
            await queryClient.invalidateQueries({ queryKey: ['expenses'] });
            setPullRefreshing(false);
        }
        setPullDistance(0);
    };

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
            if (!currentProjectId) return [];
            // Get all expenses for this project (regardless of who created them)
            return base44.entities.Expense.filter({ 
                projectId: currentProjectId
            }, '-date');
        },
        enabled: !!currentProjectId && !authLoading,
    });

    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: () => base44.entities.User.list(),
        enabled: !authLoading,
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.functions.invoke('createExpense', data),
        onMutate: async (newData) => {
            await queryClient.cancelQueries({ queryKey: ['expenses', currentProjectId] });
            const previous = queryClient.getQueryData(['expenses', currentProjectId]);
            queryClient.setQueryData(['expenses', currentProjectId], (old = []) => [
                { ...newData, id: `optimistic-${Date.now()}`, created_date: new Date().toISOString() },
                ...old
            ]);
            setShowForm(false);
            setEditingExpense(null);
            return { previous };
        },
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            toast.success("Expense added successfully");
            logActivity({ action: "created_expense", entityType: "expense", entityId: response?.data?.expense?.id, entityLabel: response?.data?.expense?.description, user });
        },
        onError: (err, newData, context) => {
            queryClient.setQueryData(['expenses', currentProjectId], context?.previous);
            setShowForm(true);
            toast.error("Failed to add expense. Please try again.");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.functions.invoke('updateExpense', { expenseId: id, updates: data }),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            setShowForm(false);
            setEditingExpense(null);
            toast.success("Expense updated successfully");
            logActivity({ action: "updated_expense", entityType: "expense", entityId: response?.data?.expense?.id, entityLabel: response?.data?.expense?.description, user });
        },
        onError: () => {
            toast.error("Failed to update expense. Please try again.");
        },
    });

    const addPaymentMutation = useMutation({
        mutationFn: async (paymentData) => {
            const expense = directPaymentExpense;
            if (!expense) return;
            // Migrate legacy deposit to Payment record if no Payment records exist yet
            const existingPayments = await base44.entities.Payment.filter({ expenseId: expense.id }, 'date');
            if (existingPayments.length === 0 && expense.depositAmount > 0) {
                await base44.entities.Payment.create({
                    expenseId: expense.id,
                    amount: expense.depositAmount,
                    date: expense.depositPaidAt ? expense.depositPaidAt.split('T')[0] : expense.date,
                    method: "Deposit",
                    notes: "Initial deposit",
                    paidBy: expense.created_by,
                    paidByName: expense.createdByName || expense.created_by,
                });
            }
            const payment = await base44.entities.Payment.create({
                ...paymentData,
                expenseId: expense.id,
                paidBy: user?.email,
                paidByName: user?.full_name || user?.email,
            });
            const freshPayments = await base44.entities.Payment.filter({ expenseId: expense.id }, 'date');
            const newTotalPaid = freshPayments.reduce((sum, p) => sum + p.amount, 0);
            const isNowFull = expense.totalAmount && newTotalPaid >= expense.totalAmount;
            await base44.entities.Expense.update(expense.id, {
                amount: newTotalPaid,
                paymentStatus: isNowFull ? 'fully_paid' : 'deposit_paid',
                isPaid: !!isNowFull,
                paidAt: isNowFull ? new Date().toISOString() : expense.paidAt,
            });
            return payment;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            setDirectPaymentExpense(null);
            toast.success("Payment recorded successfully");
        },
        onError: () => toast.error("Failed to record payment"),
    });

    const deleteMutation = useMutation({
        mutationFn: (expense) => base44.entities.Expense.delete(expense.id).then(() => expense),
        onMutate: async (expense) => {
            await queryClient.cancelQueries({ queryKey: ['expenses', currentProjectId] });
            const previous = queryClient.getQueryData(['expenses', currentProjectId]);
            queryClient.setQueryData(['expenses', currentProjectId], (old = []) => old.filter(e => e.id !== expense.id));
            return { previous };
        },
        onSuccess: (expense) => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            toast.success("Expense deleted");
            logActivity({ action: "deleted_expense", entityType: "expense", entityId: expense.id, entityLabel: expense.description, user });
        },
        onError: (err, expense, context) => {
            queryClient.setQueryData(['expenses', currentProjectId], context?.previous);
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

    const handleSubmit = async (data) => {
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

            const unpaidMatch = !filters.unpaidOnly || (
                expense.paymentStatus !== 'fully_paid' && !expense.isPaid
            );

            return categoryMatch && vendorMatch && startDateMatch && endDateMatch && searchMatch && unpaidMatch;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalPages = Math.ceil(filteredExpenses.length / PAGE_SIZE);
    const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    if (authLoading || projectsLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center max-w-md p-8 bg-card rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-foreground mb-4">Authentication Required</h2>
                    <p className="text-muted-foreground mb-6">You need to be logged in to view expenses.</p>
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
            <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-foreground mb-2">No Project Selected</h2>
                            <p className="text-muted-foreground">Please create a project first to start tracking expenses.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-6"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {(pullDistance > 10 || pullRefreshing) && (
                <div
                    className="fixed left-0 right-0 flex justify-center z-50 transition-all pointer-events-none"
                    style={{ 
                        top: 'calc(env(safe-area-inset-top) + 4.5rem)',
                        transform: `translateY(${pullRefreshing ? 8 : Math.min(pullDistance * 0.4, 24)}px)` 
                    }}
                >
                    <div className={`bg-card rounded-full shadow-md px-3 py-1.5 flex items-center gap-2 text-xs text-muted-foreground ${pullRefreshing ? 'animate-pulse' : ''}`}>
                        <div className={`w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent ${pullRefreshing ? 'animate-spin' : ''}`} />
                        {pullRefreshing ? 'Refreshing...' : pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
                    </div>
                </div>
            )}
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{currentProject?.name} Expenses</h1>
                        <p className="text-muted-foreground mt-1">Track and manage all your project expenses</p>
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

                <div className="bg-card rounded-lg shadow-sm p-4 mb-6">
                    {canDelete && (
                        <div className="flex items-center gap-4 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filteredExpenses.length > 0 && selectedIds.length === filteredExpenses.length}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-input"
                                />
                                <span className="text-sm text-muted-foreground">{t('selectAll')}</span>
                            </label>
                            {selectedIds.length > 0 && (
                                <span className="text-sm text-muted-foreground">{selectedIds.length} {t('selected')}</span>
                            )}
                        </div>
                    )}
                    <ExpenseFilters 
                        filters={filters} 
                        onFiltersChange={setFilters}
                        availableCategories={availableCategories}
                        availableVendors={availableVendors}
                    />
                </div>

                <DuplicateSearch
                    expenses={filteredExpenses}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    currentUser={user}
                    users={users}
                />

                {canEdit && !showForm && (
                    <div className="mb-4">
                        <Button
                            onClick={() => {
                                setEditingExpense(null);
                                setShowForm(true);
                                setTimeout(() => {
                                    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 100);
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('addExpense')}
                        </Button>
                    </div>
                )}

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
                            onOpenPaymentFor={(exp) => setDirectPaymentExpense(exp)}
                        />
                    )}
                </div>

                <div className="grid gap-4 pb-20">
                    {filteredExpenses.length === 0 ? (
                        <div className="bg-card rounded-lg shadow-sm p-12 text-center">
                            <p className="text-muted-foreground">{t('noExpensesFound')}</p>
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
                    <div className="flex items-center justify-between bg-card rounded-lg shadow-sm px-4 py-3 mb-6">
                        <span className="text-sm text-muted-foreground">
                            Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredExpenses.length)} of {filteredExpenses.length} expenses
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 rounded border border-input text-sm disabled:opacity-40 hover:bg-accent"
                            >
                                Previous
                            </button>
                            <span className="text-sm font-medium text-foreground">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 rounded border border-input text-sm disabled:opacity-40 hover:bg-accent"
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