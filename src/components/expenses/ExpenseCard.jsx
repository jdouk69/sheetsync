import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Calendar, Building2, Image as ImageIcon, User, CheckCircle2, Download, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "../LanguageContext";
import { useProject } from "../ProjectContext";
import { useProjectPermissions } from "../useProjectPermissions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import PaymentForm from "./PaymentForm";
import PaymentHistory from "./PaymentHistory";

const categoryColors = {
    "Materials": "bg-blue-100 text-blue-800",
    "Labor": "bg-green-100 text-green-800",
    "Equipment": "bg-orange-100 text-orange-800",
    "Permits": "bg-purple-100 text-purple-800",
    "Professional Services": "bg-indigo-100 text-indigo-800",
    "Utilities": "bg-yellow-100 text-yellow-800",
    "Other": "bg-slate-100 text-slate-800"
};

export default function ExpenseCard({ expense, onEdit, onDelete, isSelected, onToggleSelect, currentUser, users }) {
    const { t } = useLanguage();
    const { currentProject } = useProject();
    const { canEdit, canDelete } = useProjectPermissions(currentProject);
    const [showPhotos, setShowPhotos] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const queryClient = useQueryClient();

    const { data: payments = [] } = useQuery({
        queryKey: ['payments', expense.id],
        queryFn: () => base44.entities.Payment.filter({ expenseId: expense.id }, 'date'),
    });

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = expense.totalAmount ? expense.totalAmount - totalPaid : 0;
    const isFullyPaid = expense.totalAmount ? totalPaid >= expense.totalAmount : (expense.paymentStatus === 'fully_paid' || expense.isPaid);

    const addPaymentMutation = useMutation({
        mutationFn: async (paymentData) => {
            const payment = await base44.entities.Payment.create({
                ...paymentData,
                expenseId: expense.id,
                paidBy: currentUser?.email,
                paidByName: currentUser?.full_name || currentUser?.email,
            });
            // Update expense status if fully paid
            const newTotalPaid = totalPaid + paymentData.amount;
            if (expense.totalAmount && newTotalPaid >= expense.totalAmount) {
                await base44.entities.Expense.update(expense.id, {
                    paymentStatus: 'fully_paid',
                    isPaid: true,
                    paidAt: new Date().toISOString(),
                    amount: newTotalPaid,
                });
            } else if (expense.totalAmount) {
                await base44.entities.Expense.update(expense.id, {
                    paymentStatus: 'deposit_paid',
                    amount: newTotalPaid,
                });
            }
            return payment;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments', expense.id] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            setShowPaymentForm(false);
            toast.success("Payment recorded successfully");
        },
        onError: () => toast.error("Failed to record payment"),
    });

    const deletePaymentMutation = useMutation({
        mutationFn: async (payment) => {
            await base44.entities.Payment.delete(payment.id);
            const newTotalPaid = totalPaid - payment.amount;
            let newStatus = 'unpaid';
            if (expense.totalAmount) {
                if (newTotalPaid >= expense.totalAmount) newStatus = 'fully_paid';
                else if (newTotalPaid > 0) newStatus = 'deposit_paid';
            }
            await base44.entities.Expense.update(expense.id, {
                paymentStatus: newStatus,
                isPaid: newStatus === 'fully_paid',
                amount: newTotalPaid || expense.depositAmount || expense.amount,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments', expense.id] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            toast.success("Payment deleted");
        },
        onError: () => toast.error("Failed to delete payment"),
    });

    // Check if current user can edit/delete this specific expense
    const isCreator = expense.created_by === currentUser?.email;
    const isProjectOwner = currentProject?.created_by === currentUser?.email;
    const isProjectAdmin = currentProject?.sharedWith?.some(s => s.email === currentUser?.email && s.role === 'admin');
    const canEditThis = isCreator || isProjectOwner || isProjectAdmin;
    const canDeleteThis = isCreator || isProjectOwner || isProjectAdmin;

    // Get user names - prefer stored names, fallback to lookup
    const creatorName = expense.createdByName || users.find(u => u.email === expense.created_by)?.full_name || users.find(u => u.email === expense.created_by)?.email;
    const editorName = expense.updatedByName || (expense.updated_by && users.find(u => u.email === expense.updated_by)?.full_name) || (expense.updated_by && users.find(u => u.email === expense.updated_by)?.email);

    return (
        <>
            <Card className={`transition-shadow ${isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}>
                <CardContent className="p-4">
                    <div className="flex gap-3">
                        {onToggleSelect && (
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={onToggleSelect}
                                className="mt-1 w-4 h-4 rounded border-slate-300"
                                onClick={(e) => e.stopPropagation()}
                            />
                        )}
                        <div className="flex-1 flex flex-col md:flex-row gap-4 cursor-pointer" onClick={() => onEdit(expense)}>
                        <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-2">
                                <div className="flex-1">
                                    {expense.vendor && (
                                        <div className="flex items-center gap-2 text-lg text-slate-700 font-semibold mb-1">
                                            <Building2 className="w-4 h-4" />
                                            {expense.vendor}
                                        </div>
                                    )}
                                    <h3 className="text-sm text-slate-900">
                                        {expense.description}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${categoryColors[expense.category]}`}>
                                            {expense.category}
                                        </span>
                                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(expense.date), 'MMM d, yyyy')}
                                        </span>
                                        {expense.paymentStatus === 'fully_paid' || expense.isPaid ? (
                                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1 font-semibold" title={expense.paidAt && expense.paidBy ? `Paid by ${expense.paidBy} on ${format(new Date(expense.paidAt), 'dd/MM/yyyy HH:mm')}` : undefined}>
                                                <CheckCircle2 className="w-3 h-3" />
                                                {t('paid')}
                                                {expense.paidAt && ` · ${format(new Date(expense.paidAt), 'dd/MM/yy')}`}
                                            </span>
                                        ) : expense.paymentStatus === 'deposit_paid' ? (
                                            <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1 font-semibold">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Deposit Paid
                                            </span>
                                        ) : (
                                            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 flex items-center gap-1 font-semibold">
                                                <CheckCircle2 className="w-3 h-3" />
                                                {t('unpaid')}
                                            </span>
                                        )}
                                        </div>
                                </div>
                                <div className="text-left sm:text-right">
                                    {expense.totalAmount ? (
                                        <div>
                                            <div className="text-xs text-slate-500">Total Quoted</div>
                                            <div className="text-2xl font-bold text-slate-900">
                                                €{expense.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <div className="text-sm text-green-700 font-medium">
                                                Paid: €{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            {!isFullyPaid && balanceDue > 0 && (
                                                <div className="text-sm text-red-600 font-semibold">
                                                    Balance Due: €{balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-2xl font-bold text-slate-900">
                                            €{expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {expense.notes && (
                                <p className="text-sm text-slate-600 mt-2">{expense.notes}</p>
                            )}

                            <div className="flex flex-wrap gap-2 mt-3 text-xs">
                                {creatorName && (
                                    <div className="flex items-center gap-1 text-red-600">
                                        <User className="w-3 h-3" />
                                        <span>{t('createdBy')}: {creatorName}</span>
                                    </div>
                                )}
                                {editorName && expense.updated_by !== expense.created_by && (
                                    <div className="flex items-center gap-1 text-slate-500">
                                        <User className="w-3 h-3" />
                                        <span>{t('editedBy')}: {editorName}</span>
                                    </div>
                                )}
                            </div>

                            <PaymentHistory
                                payments={payments}
                                canDelete={canEdit}
                                onDelete={(payment) => deletePaymentMutation.mutate(payment)}
                            />

                            {expense.totalAmount && !isFullyPaid && canEdit && (
                                <div className="mt-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); setShowPaymentForm(true); }}
                                        className="text-xs text-blue-600 border-blue-300 hover:bg-blue-50"
                                    >
                                        <PlusCircle className="w-3 h-3 mr-1" />
                                        Add Payment
                                    </Button>
                                </div>
                            )}

                            {expense.photos?.length > 0 && (
                                <div className="mt-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowPhotos(true);
                                        }}
                                        className="text-xs"
                                    >
                                        <ImageIcon className="w-3 h-3 mr-1" />
                                        {t('viewPhotos')} ({expense.photos.length})
                                    </Button>
                                </div>
                            )}
                        </div>

                        {(canEdit || canDelete) && (
                            <div className="flex md:flex-col gap-2">
                                {canEdit && canEditThis && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(expense);
                                        }}
                                        className="flex-1 md:flex-none"
                                    >
                                        <Pencil className="w-4 h-4 md:mr-0" />
                                        <span className="md:hidden ml-2">{t('edit')}</span>
                                    </Button>
                                )}
                                {canDelete && canDeleteThis && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(expense);
                                        }}
                                        className="flex-1 md:flex-none text-red-600 hover:text-red-700"
                                    >
                                        <Trash2 className="w-4 h-4 md:mr-0" />
                                        <span className="md:hidden ml-2">{t('delete')}</span>
                                    </Button>
                                )}
                            </div>
                        )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <PaymentForm
                open={showPaymentForm}
                onClose={() => setShowPaymentForm(false)}
                onSubmit={(data) => addPaymentMutation.mutate(data)}
                balanceDue={balanceDue}
            />

            <Dialog open={showPhotos} onOpenChange={setShowPhotos}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{t('expensePhotos')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-auto">
                        {expense.photos?.map((photo, index) => (
                            <img
                                key={index}
                                src={photo}
                                alt={`Photo ${index + 1}`}
                                className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setSelectedPhoto(photo)}
                            />
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
                <DialogContent className="max-w-5xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>Photo</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = selectedPhoto;
                                    link.download = `expense-photo-${Date.now()}.jpg`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download
                            </Button>
                        </DialogTitle>
                    </DialogHeader>
                    <img
                        src={selectedPhoto}
                        alt="Full size"
                        className="w-full h-auto"
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}