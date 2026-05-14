import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import CategoryCombobox from "./CategoryCombobox";
import VendorCombobox from "./VendorCombobox";
import VendorPaymentReminder from "./VendorPaymentReminder";
import { format } from "date-fns";
import { useLanguage } from "../LanguageContext";
import { Checkbox } from "@/components/ui/checkbox";
import { useProject } from "../ProjectContext";
import { Sparkles } from "lucide-react";

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', GBP: '£', CAD: 'CA$', CHF: 'Fr' };

export default function ExpenseForm({ expense, onSubmit, onCancel, currentUser, onOpenPaymentFor }) {
    const { t } = useLanguage();
    const { currentProjectId, currentProject } = useProject();
    const currencySymbol = CURRENCY_SYMBOLS[currentProject?.currency] || '€';
    const isAdmin = currentUser?.role === 'admin';
    const formContainerRef = React.useRef(null);

    // iOS Safari: scroll focused input into view above keyboard
    useEffect(() => {
        const handleFocusIn = (e) => {
            const el = e.target;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        };
        const container = formContainerRef.current;
        if (container) container.addEventListener('focusin', handleFocusIn);
        return () => { if (container) container.removeEventListener('focusin', handleFocusIn); };
    }, []);

    const { data: allExpenses = [] } = useQuery({
        queryKey: ['expenses'],
        queryFn: () => base44.entities.Expense.list(),
    });

    // Read-only: needed to determine if this is a true legacy expense (no Payment records yet)
    const { data: existingPayments = [] } = useQuery({
        queryKey: ['payments', expense?.id],
        queryFn: () => base44.entities.Payment.filter({ expenseId: expense.id }, 'date'),
        enabled: !!expense?.id,
    });

    const projectExpenses = allExpenses.filter(exp => exp.projectId === currentProjectId);
    const existingCategories = [...new Set(projectExpenses.map(exp => exp.category).filter(Boolean))];
    const existingVendors = [...new Set(projectExpenses.map(exp => exp.vendor).filter(Boolean))];
    const [formData, setFormData] = useState({
        description: "",
        amount: "",
        totalAmount: "",
        depositAmount: "",
        paymentStatus: "unpaid",
        category: "Materials",
        date: new Date().toISOString().split('T')[0],
        vendor: "",
        photos: [],
        notes: "",
        isPaid: false,
        paidCash: false
    });
    // In edit mode, derive checkbox state from real payment data
    const isEditMode = !!expense;
    // useState declarations must come before any computed values that reference them
    const [reminderDismissed, setReminderDismissed] = useState(false);
    const [isPartialPayment, setIsPartialPayment] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [suggestingCategory, setSuggestingCategory] = useState(false);
    const [categoryJustSuggested, setCategoryJustSuggested] = useState(false);
    // Hide deposit checkbox in create mode when vendor already has an open/partial expense.
    // Reuses projectExpenses (already computed above) + formData.vendor.
    const hasOpenVendorExpense = !isEditMode && !reminderDismissed && !!formData.vendor && projectExpenses.some(exp =>
        exp.vendor?.toLowerCase().trim() === formData.vendor?.toLowerCase().trim() &&
        (exp.paymentStatus === 'deposit_paid' ||
            (exp.totalAmount && (exp.amount || 0) < exp.totalAmount))
    );
    // Derive partial state from actual payment status, not just totalAmount existence.
    // totalAmount = quoted total, amount = paid so far.
    // Only 'deposit_paid' means partial — unpaid and fully_paid should show unchecked.
    const total = Number(expense?.totalAmount || 0);
    const paid = Number(expense?.amount || 0);
    const derivedIsPartial = isEditMode && (
        expense?.paymentStatus === 'deposit_paid' ||
        (total > 0 && paid > 0 && paid < total)
    );

    // True legacy expense: in edit mode, has no totalAmount, and has no Payment records yet
    const isLegacyUpgradeable = isEditMode && !expense?.totalAmount && existingPayments.length === 0;


    useEffect(() => {
        if (expense) {
            let dateValue = new Date().toISOString().split('T')[0];
            if (expense.date) {
                try {
                    dateValue = expense.date.split('T')[0];
                } catch (e) {
                    console.error('Date formatting error:', e);
                }
            }
            
            const hasPartial = !!(expense.totalAmount);
            setIsPartialPayment(hasPartial);
            setFormData({
                description: expense.description || "",
                amount: expense.amount || "",
                totalAmount: expense.totalAmount || "",
                depositAmount: expense.depositAmount || "",
                paymentStatus: expense.paymentStatus || "unpaid",
                category: expense.category || "Materials",
                date: dateValue,
                vendor: expense.vendor || "",
                photos: expense.photos || [],
                notes: expense.notes || "",
                isPaid: expense.isPaid || false,
                paidCash: expense.paidCash || false
            });
        } else {
            setIsPartialPayment(false);
            setFormData({
                description: "",
                amount: "",
                totalAmount: "",
                depositAmount: "",
                paymentStatus: "unpaid",
                category: "Materials",
                date: new Date().toISOString().split('T')[0],
                vendor: "",
                photos: [],
                notes: "",
                isPaid: false,
                paidCash: false
            });
        }
    }, [expense]);

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        setUploading(true);

        try {
            const uploadPromises = files.map(file => 
                base44.integrations.Core.UploadFile({ file })
            );
            const results = await Promise.all(uploadPromises);
            const fileUrls = results.map(r => r.file_url);
            
            setFormData(prev => ({
                ...prev,
                photos: [...(prev.photos || []), ...fileUrls]
            }));
        } catch (error) {
            alert('Failed to upload photos: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const removePhoto = (index) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index)
        }));
    };

    const handleSuggestCategory = async () => {
        if (!formData.description && !formData.vendor) return;

        setSuggestingCategory(true);
        try {
            const response = await base44.functions.invoke('suggestCategory', {
                description: formData.description,
                vendor: formData.vendor,
                projectId: currentProjectId
            });

            if (response.data.suggestedCategory) {
                setFormData(prev => ({
                    ...prev,
                    category: response.data.suggestedCategory
                }));
                setCategoryJustSuggested(true);
                setTimeout(() => setCategoryJustSuggested(false), 2000);
            }
        } catch (error) {
            console.error('Failed to suggest category:', error);
        } finally {
            setSuggestingCategory(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Legacy upgrade path: amount stays as-is, totalAmount comes from form, depositAmount auto-derived
        if (isLegacyUpgradeable && isPartialPayment) {
            const totalAmt = parseFloat(formData.totalAmount);
            onSubmit({
                ...formData,
                amount: parseFloat(expense.amount), // unchanged — running total paid so far
                totalAmount: totalAmt,
                depositAmount: parseFloat(expense.amount), // auto-derived from old amount
                paymentStatus: 'deposit_paid',
                isPaid: false,
                migrateLegacyAmount: true,
            });
            return;
        }

        const totalAmt = isPartialPayment ? parseFloat(formData.totalAmount) : null;
        const depositAmt = isPartialPayment ? parseFloat(formData.depositAmount) : null;
        const paymentStatus = isPartialPayment ? formData.paymentStatus : (formData.isPaid ? "fully_paid" : "unpaid");
        const isFullyPaid = paymentStatus === "fully_paid";

        onSubmit({
            ...formData,
            amount: isPartialPayment ? (depositAmt || parseFloat(formData.amount)) : parseFloat(formData.amount),
            totalAmount: isPartialPayment ? totalAmt : null,
            depositAmount: isPartialPayment ? depositAmt : null,
            paymentStatus,
            isPaid: isFullyPaid,
            paidAt: isFullyPaid ? (formData.paidAt || new Date().toISOString()) : null,
            paidCash: formData.paidCash,
        });
    };

    return (
        <div ref={formContainerRef} className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">
                {expense ? t('editExpense') : t('addNewExpense')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('vendor')}
                        </label>
                        <VendorCombobox
                            value={formData.vendor}
                            onChange={(value) => { setFormData({...formData, vendor: value}); setReminderDismissed(false); }}
                            existingVendors={existingVendors}
                        />
                        {!expense && onOpenPaymentFor && !reminderDismissed && (
                            <VendorPaymentReminder
                                vendorName={formData.vendor}
                                projectExpenses={projectExpenses}
                                currency={currentProject?.currency}
                                onSelectExpense={(exp) => onOpenPaymentFor(exp)}
                                onDismiss={() => setReminderDismissed(true)}
                                onContinueNew={() => setReminderDismissed(true)}
                            />
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {isPartialPayment ? `${t('totalQuotedAmount')} *` : `${t('amount')} *`}
                        </label>
                        <Input
                            required
                            type="number"
                            step="0.01"
                            value={isPartialPayment ? formData.totalAmount : formData.amount}
                            onChange={(e) => setFormData({...formData, [isPartialPayment ? 'totalAmount' : 'amount']: e.target.value})}
                            placeholder="0.00"
                        />
                    </div>
                </div>

                {/* Partial Payment Toggle — hidden in create mode when vendor has an open partial expense */}
                {(isEditMode || !hasOpenVendorExpense) && (
                <div className={`flex items-start gap-3 p-3 rounded-lg border ${
                    isLegacyUpgradeable ? 'bg-amber-50 border-amber-200' :
                    isEditMode && derivedIsPartial ? 'bg-slate-50 border-slate-200' :
                    'bg-amber-50 border-amber-200'
                }`}>
                    <Checkbox
                        id="isPartialPayment"
                        checked={isEditMode && !isLegacyUpgradeable ? derivedIsPartial : isPartialPayment}
                        disabled={isEditMode && !isLegacyUpgradeable}
                        onCheckedChange={(isEditMode && !isLegacyUpgradeable) ? undefined : (checked) => {
                            setIsPartialPayment(checked);
                            if (!checked) {
                                setFormData(prev => ({ ...prev, totalAmount: "", depositAmount: "", paymentStatus: "unpaid" }));
                            }
                        }}
                        className={(isEditMode && !isLegacyUpgradeable) ? 'opacity-60 cursor-not-allowed' : ''}
                    />
                    <div>
                        <label
                            htmlFor="isPartialPayment"
                            className={`text-sm font-medium ${
                                isLegacyUpgradeable ? 'text-amber-800 cursor-pointer' :
                                isEditMode ? 'text-slate-500 cursor-not-allowed' :
                                'text-amber-800 cursor-pointer'
                            }`}
                        >
                            {isLegacyUpgradeable
                                ? t('enablePaymentTracking')
                                : isEditMode
                                    ? t('expenseIsPartiallyPaid')
                                    : t('recordWithDeposit')
                            }
                        </label>
                        {isLegacyUpgradeable && isPartialPayment && (
                            <p className="text-xs text-amber-700 mt-0.5">
                                {t('legacyAmountWillBeMigrated', { amount: `${currencySymbol}${Number(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` })}
                            </p>
                        )}
                        {isEditMode && !isLegacyUpgradeable && (
                            <p className="text-xs text-slate-400 mt-0.5">{t('paymentStatusAutomatic')}</p>
                        )}
                    </div>
                </div>
                )}

                {isPartialPayment && (
                    <div className="grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        {!isLegacyUpgradeable && <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Deposit Amount Paid *
                            </label>
                            <Input
                                required={isPartialPayment && !isLegacyUpgradeable}
                                type="number"
                                step="0.01"
                                value={formData.depositAmount}
                                onChange={(e) => setFormData({...formData, depositAmount: e.target.value})}
                                placeholder="0.00"
                            />
                            {formData.totalAmount && formData.depositAmount && (
                                <p className="text-xs text-slate-500 mt-1">
                                    Balance due: {currencySymbol}{(parseFloat(formData.totalAmount) - parseFloat(formData.depositAmount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            )}
                        </div>}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Payment Status
                            </label>
                            <Select
                                value={formData.paymentStatus}
                                onValueChange={(value) => setFormData({...formData, paymentStatus: value})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unpaid">Unpaid</SelectItem>
                                    <SelectItem value="deposit_paid">Deposit Paid</SelectItem>
                                    <SelectItem value="fully_paid">Fully Paid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('category')} *
                        </label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <CategoryCombobox
                                    value={formData.category}
                                    onChange={(value) => setFormData({...formData, category: value})}
                                    existingCategories={existingCategories}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSuggestCategory}
                                disabled={suggestingCategory || (!formData.description && !formData.vendor)}
                                className={categoryJustSuggested ? "bg-green-50 border-green-300" : ""}
                            >
                                {suggestingCategory ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('date')} *
                        </label>
                        <Input
                            required
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t('description')} *
                    </label>
                    <Textarea
                        required
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder={t('descriptionPlaceholder')}
                        rows={3}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t('notes')}
                    </label>
                    <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        placeholder={t('notesPlaceholder')}
                        rows={3}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        {t('photos')}
                    </label>
                    <div className="space-y-3">
                        {formData.photos?.length > 0 && (
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                {formData.photos.map((photo, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={photo}
                                            alt="Expense"
                                            className="w-full h-20 object-cover rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={uploading}
                            />
                            {uploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                    <span className="text-sm text-slate-600">{t('uploading')}</span>
                                </>
                            ) : (
                                <>
                                    <ImageIcon className="w-5 h-5 text-slate-400" />
                                    <span className="text-sm text-slate-600">{t('clickToUpload')}</span>
                                </>
                            )}
                        </label>
                    </div>
                </div>

                {!isPartialPayment && (
                    <div className="space-y-3">
                        {isAdmin && (
                            <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg">
                                <Checkbox
                                    id="isPaid"
                                    checked={formData.isPaid}
                                    onCheckedChange={(checked) => setFormData({
                                        ...formData,
                                        isPaid: checked,
                                        paymentStatus: checked ? "fully_paid" : "unpaid",
                                        paidAt: checked ? new Date().toISOString() : null,
                                        paidBy: checked ? currentUser?.email : null
                                    })}
                                />
                                <label
                                    htmlFor="isPaid"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {t('markAsPaid')}
                                </label>
                            </div>
                        )}
                        <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg">
                            <Checkbox
                                id="paidCash"
                                checked={formData.paidCash}
                                onCheckedChange={(checked) => setFormData({
                                    ...formData,
                                    paidCash: checked
                                })}
                            />
                            <label
                                htmlFor="paidCash"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                {t('paidCash')}
                            </label>
                        </div>
                    </div>
                )}

                <div className="flex gap-3 pt-4 pb-safe">
                    <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                        {t('cancel')}
                    </Button>
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                        {expense ? t('update') : t('add')} {t('expense')}
                    </Button>
                </div>
                <div className="md:hidden h-16" />
            </form>
        </div>
    );
}