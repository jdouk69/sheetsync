import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "../LanguageContext";
import ExpenseCard from "./ExpenseCard";

export default function DuplicateSearch({ expenses, onEdit, onDelete, currentUser, users }) {
    const { t } = useLanguage();
    const [searchType, setSearchType] = useState("amount");
    const [showResults, setShowResults] = useState(false);
    const [duplicates, setDuplicates] = useState([]);

    const findDuplicates = () => {
        const groups = {};
        
        // Group expenses by the selected criteria
        expenses.forEach(expense => {
            let key;
            if (searchType === "amount") {
                key = expense.amount.toFixed(2);
            } else if (searchType === "vendor") {
                key = expense.vendor?.toLowerCase() || "no-vendor";
            }
            
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(expense);
        });
        
        // Filter to only groups with 2+ items (duplicates)
        const duplicateGroups = Object.entries(groups)
            .filter(([_, items]) => items.length > 1)
            .sort((a, b) => b[1].length - a[1].length);
        
        setDuplicates(duplicateGroups);
        setShowResults(true);
    };

    const clearSearch = () => {
        setShowResults(false);
        setDuplicates([]);
    };

    return (
        <Card className="mb-6">
            <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                    <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1">{t('searchForDuplicates')}</h3>
                        <p className="text-sm text-slate-600">{t('findMatchingExpenses')}</p>
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto">
                        <Select value={searchType} onValueChange={setSearchType}>
                            <SelectTrigger className="w-full md:w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="amount">{t('byAmount')}</SelectItem>
                                <SelectItem value="vendor">{t('byVendor')}</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        {showResults ? (
                            <Button onClick={clearSearch} variant="outline">
                                <X className="w-4 h-4 mr-2" />
                                {t('clear')}
                            </Button>
                        ) : (
                            <Button onClick={findDuplicates} className="bg-blue-600 hover:bg-blue-700">
                                <Search className="w-4 h-4 mr-2" />
                                {t('search')}
                            </Button>
                        )}
                    </div>
                </div>

                {showResults && (
                    <div className="mt-4 border-t pt-4">
                        {duplicates.length === 0 ? (
                            <p className="text-center text-slate-600 py-4">
                                {t('noDuplicatesFound', { type: searchType === "amount" ? t('amounts') : t('vendors') })}
                            </p>
                        ) : (
                            <div className="space-y-6">
                                <p className="text-sm font-medium text-slate-900">
                                    {t('foundDuplicateGroups', { count: duplicates.length })}
                                </p>
                                
                                {duplicates.map(([key, items], groupIdx) => (
                                    <div key={groupIdx} className="border-l-4 border-blue-500 pl-4">
                                        <h4 className="font-semibold text-slate-900 mb-2">
                                            {searchType === "amount" 
                                                ? `${t('amount')}: €${parseFloat(key).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                : `${t('vendor')}: ${key === "no-vendor" ? t('noVendor') : items[0].vendor}`
                                            }
                                            <span className="ml-2 text-sm text-slate-600">
                                                ({items.length} {t('expenses')})
                                            </span>
                                        </h4>
                                        <div className="space-y-3">
                                            {items.map(expense => (
                                                <ExpenseCard
                                                    key={expense.id}
                                                    expense={expense}
                                                    onEdit={onEdit}
                                                    onDelete={onDelete}
                                                    isSelected={false}
                                                    currentUser={currentUser}
                                                    users={users}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}