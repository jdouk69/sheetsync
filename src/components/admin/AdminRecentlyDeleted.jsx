import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "../LanguageContext";
import RecentlyDeletedItem from "./RecentlyDeletedItem";
import { refreshExpenseCaches, optimisticExpenseUpdate, rollbackExpenseCaches } from "@/lib/expenseCache";

export default function AdminRecentlyDeleted() {
    const { language } = useLanguage();
    const el = language === 'el';
    const queryClient = useQueryClient();
    const [toPurge, setToPurge] = useState(null);

    const { data: deleted = [], isLoading } = useQuery({
        queryKey: ['recentlyDeletedExpenses'],
        queryFn: () => base44.entities.Expense.filter({ isDeleted: true }, '-deletedAt', 500),
    });

    const { data: projects = [] } = useQuery({
        queryKey: ['allProjects'],
        queryFn: () => base44.entities.Project.list(),
    });
    const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));

    const removeFromTrash = (expense) => (old) => old.filter(e => e.id !== expense.id);
    // Put the restored expense straight back into the active lists of its project
    const addToActive = (expense) => (old, key) => {
        const belongs = key[0] !== 'expenses' || key[1] === expense.projectId;
        if (!belongs || old.some(e => e.id === expense.id)) return old;
        return [{ ...expense, isDeleted: false }, ...old];
    };

    const restoreMutation = useMutation({
        mutationFn: (expense) => base44.functions.invoke('restoreExpense', { expenseId: expense.id }),
        onMutate: async (expense) => {
            const snapshot = await optimisticExpenseUpdate(queryClient, {
                recentlyDeletedExpenses: removeFromTrash(expense),
                expenses: addToActive(expense),
                allExpenses: addToActive(expense),
                'all-expenses': addToActive(expense),
            });
            return { snapshot };
        },
        onSuccess: (data, expense) => {
            toast.success(el ? "Η δαπάνη επαναφέρθηκε" : "Expense restored");
            return refreshExpenseCaches(queryClient, { expenseId: expense.id });
        },
        onError: (err, expense, context) => {
            rollbackExpenseCaches(queryClient, context?.snapshot);
            toast.error(el ? "Η επαναφορά απέτυχε" : "Failed to restore expense");
        },
    });

    const purgeMutation = useMutation({
        mutationFn: (expense) => base44.functions.invoke('purgeExpense', { expenseId: expense.id }),
        onMutate: async (expense) => {
            setToPurge(null);
            const snapshot = await optimisticExpenseUpdate(queryClient, {
                recentlyDeletedExpenses: removeFromTrash(expense),
            });
            return { snapshot };
        },
        onSuccess: (data, expense) => {
            toast.success(el ? "Διαγράφηκε οριστικά" : "Permanently deleted");
            return refreshExpenseCaches(queryClient, { expenseId: expense.id });
        },
        onError: (err, expense, context) => {
            rollbackExpenseCaches(queryClient, context?.snapshot);
            toast.error(el ? "Η διαγραφή απέτυχε" : "Failed to delete permanently");
        },
    });

    const busyId = (restoreMutation.isPending && restoreMutation.variables?.id)
        || (purgeMutation.isPending && purgeMutation.variables?.id);

    return (
        <Card>
            <CardContent className="pt-5">
                <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-1">
                    <Trash2 className="w-4 h-4 text-blue-600" />
                    {el ? "Πρόσφατα Διαγραμμένα" : "Recently Deleted"} ({deleted.length})
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                    {el
                        ? "Οι διαγραμμένες δαπάνες διατηρούνται για 5 ημέρες και μετά διαγράφονται οριστικά μαζί με τις πληρωμές τους."
                        : "Deleted expenses are kept for 5 days, then permanently deleted together with their payments."}
                </p>

                {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                ) : deleted.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">{el ? "Δεν υπάρχουν διαγραμμένες δαπάνες" : "No recently deleted expenses"}</p>
                ) : (
                    <div className="space-y-2">
                        {deleted.map(expense => (
                            <RecentlyDeletedItem
                                key={expense.id}
                                expense={expense}
                                projectName={projectMap[expense.projectId]}
                                el={el}
                                busy={busyId === expense.id}
                                onRestore={(e) => restoreMutation.mutate(e)}
                                onPurge={setToPurge}
                            />
                        ))}
                    </div>
                )}
            </CardContent>

            <AlertDialog open={!!toPurge} onOpenChange={(open) => !open && setToPurge(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{el ? "Οριστική διαγραφή;" : "Delete permanently?"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {el
                                ? `Η δαπάνη "${toPurge?.description}" και όλες οι πληρωμές της θα διαγραφούν οριστικά. Δεν είναι δυνατή η ανάκτηση.`
                                : `"${toPurge?.description}" and all of its payments will be permanently deleted. This cannot be undone.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{el ? "Ακύρωση" : "Cancel"}</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={(e) => { e.preventDefault(); purgeMutation.mutate(toPurge); }}
                        >
                            {el ? "Οριστική διαγραφή" : "Delete Permanently"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}