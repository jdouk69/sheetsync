import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Calendar, Building2, Image as ImageIcon, UserCircle } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const categoryColors = {
    "Materials": "bg-blue-100 text-blue-800",
    "Labor": "bg-green-100 text-green-800",
    "Equipment": "bg-orange-100 text-orange-800",
    "Permits": "bg-purple-100 text-purple-800",
    "Professional Services": "bg-indigo-100 text-indigo-800",
    "Utilities": "bg-yellow-100 text-yellow-800",
    "Other": "bg-slate-100 text-slate-800"
};

export default function ExpenseCard({ expense, onEdit, onDelete, isSelected, onToggleSelect }) {
    const { t } = useLanguage();
    const { currentProject } = useProject();
    const { canEdit, canDelete } = useProjectPermissions(currentProject);
    const [showPhotos, setShowPhotos] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    const { data: creatorUser } = useQuery({
        queryKey: ['user', expense.created_by],
        queryFn: async () => {
            if (!expense.created_by) return null;
            const users = await base44.entities.User.filter({ email: expense.created_by });
            return users.length > 0 ? users[0] : null;
        },
        enabled: !!expense.created_by,
        staleTime: Infinity,
    });

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
                        <div className="flex-1 flex flex-col md:flex-row gap-4 cursor-pointer min-w-0" onClick={() => onEdit(expense)}>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2 gap-4">
                                <div>
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
                                    </div>
                                </div>
                                <div className="text-right min-w-0">
                                    <div className="text-2xl font-bold text-slate-900">
                                        €{expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    {creatorUser && (
                                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 justify-end">
                                            <UserCircle className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">{creatorUser.full_name || creatorUser.email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {expense.notes && (
                                <p className="text-sm text-slate-600 mt-2">{expense.notes}</p>
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
                                {canEdit && (
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
                                {canDelete && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(expense.id);
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