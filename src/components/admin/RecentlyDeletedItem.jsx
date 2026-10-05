import React from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

function timeRemaining(purgeAfter, el) {
    const ms = new Date(purgeAfter).getTime() - Date.now();
    if (isNaN(ms)) return "";
    if (ms <= 0) return el ? "Διαγράφεται οσονούπω" : "Deleting soon";
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    return el
        ? `Διαγράφεται οριστικά σε ${days}μ ${hours}ω`
        : `Permanently deletes in ${days}d ${hours}h`;
}

export default function RecentlyDeletedItem({ expense, projectName, el, busy, onRestore, onPurge }) {
    return (
        <div className="p-3 bg-slate-50 rounded-lg space-y-2">
            <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 break-words">{expense.description}</p>
                <div className="flex items-center gap-x-3 gap-y-1 mt-1 flex-wrap text-xs text-slate-500">
                    <span className="text-sm font-semibold text-slate-700">
                        €{(expense.totalAmount || expense.amount || 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })}
                    </span>
                    {expense.vendor && <span>{expense.vendor}</span>}
                    {projectName && <span className="text-blue-500">{projectName}</span>}
                    {expense.date && <span>{el ? "Ημ. δαπάνης" : "Expense date"}: {format(new Date(expense.date), 'dd MMM yyyy')}</span>}
                    {expense.deletedAt && <span>{el ? "Διαγράφηκε" : "Deleted"}: {format(new Date(expense.deletedAt), 'dd MMM yyyy HH:mm')}</span>}
                </div>
                <p className="text-xs font-medium text-red-600 mt-1">{timeRemaining(expense.purgeAfter, el)}</p>
            </div>
            <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => onRestore(expense)}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    {el ? "Επαναφορά" : "Restore"}
                </Button>
                <Button size="sm" variant="destructive" disabled={busy} onClick={() => onPurge(expense)}>
                    <Trash2 className="w-4 h-4" />
                    {el ? "Οριστική διαγραφή" : "Delete Permanently"}
                </Button>
            </div>
        </div>
    );
}