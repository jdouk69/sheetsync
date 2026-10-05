import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { bulkUpdateExpenseField } from "./vendorCategoryUtils";

export default function RenameFieldDialog({
    open, onOpenChange, fieldLabel, currentValue, otherValues, expenses, projectId, field, onSuccess,
}) {
    const [newValue, setNewValue] = useState("");
    const [step, setStep] = useState("edit"); // 'edit' | 'confirm'
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            setNewValue(currentValue || "");
            setStep("edit");
            setError("");
        }
    }, [open, currentValue]);

    const trimmedNew = newValue.trim();
    const isBlank = trimmedNew.length === 0;
    const isUnchanged = trimmedNew === (currentValue || "").trim();
    const conflictMatch = otherValues.find(v => v.trim().toLowerCase() === trimmedNew.toLowerCase());
    const matchCount = expenses.filter(e => e.projectId === projectId && e[field] === currentValue).length;

    const handleClose = (o) => {
        if (!submitting) onOpenChange(o);
    };

    const handleContinue = () => {
        if (isBlank || isUnchanged) return;
        setStep("confirm");
    };

    const handleConfirm = async () => {
        setSubmitting(true);
        setError("");
        try {
            const count = await bulkUpdateExpenseField(expenses, projectId, field, [currentValue], trimmedNew);
            toast.success(
                conflictMatch
                    ? `${fieldLabel}s merged successfully. ${count} expense${count === 1 ? "" : "s"} updated.`
                    : `${fieldLabel} renamed successfully. ${count} expense${count === 1 ? "" : "s"} updated.`
            );
            await onSuccess();
            onOpenChange(false);
        } catch (e) {
            setError(e.message || "Failed to rename. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rename {fieldLabel}</DialogTitle>
                </DialogHeader>

                {step === "edit" && (
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-slate-500">Current name</label>
                            <p className="text-sm font-medium text-slate-800">{currentValue}</p>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500">New name</label>
                            <Input
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") { e.preventDefault(); handleContinue(); }
                                }}
                            />
                        </div>
                        {!isBlank && !isUnchanged && conflictMatch && (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                "{conflictMatch}" already exists. Renaming will merge these entries.
                            </p>
                        )}
                    </div>
                )}

                {step === "confirm" && (
                    <div className="space-y-2">
                        <p className="text-sm text-slate-700">
                            "{currentValue}" will be {conflictMatch ? "merged into" : "renamed to"} "{trimmedNew}".
                        </p>
                        <p className="text-sm font-medium text-slate-800">
                            {matchCount} historical expense{matchCount === 1 ? "" : "s"} will be updated.
                        </p>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                )}

                <DialogFooter>
                    {step === "edit" ? (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button onClick={handleContinue} disabled={isBlank || isUnchanged}>Rename</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
                            <Button onClick={handleConfirm} disabled={submitting}>
                                {submitting ? "Updating..." : conflictMatch ? `Merge ${fieldLabel}` : `Rename ${fieldLabel}`}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}