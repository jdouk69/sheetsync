import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Merge, Pencil, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

function MergeSection({ items, label, onMerge }) {
    const [selected, setSelected] = useState([]);
    const [canonicalName, setCanonicalName] = useState("");
    const [merging, setMerging] = useState(false);

    const toggleSelect = (item) => {
        setSelected(prev =>
            prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
        );
    };

    const handleMerge = async () => {
        if (selected.length < 2 || !canonicalName.trim()) return;
        setMerging(true);
        await onMerge(selected, canonicalName.trim());
        setSelected([]);
        setCanonicalName("");
        setMerging(false);
    };

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-3">
                {items.map(item => (
                    <button
                        key={item}
                        onClick={() => toggleSelect(item)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                            selected.includes(item)
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-slate-700 border-slate-200 hover:border-blue-400"
                        }`}
                    >
                        {item}
                    </button>
                ))}
            </div>

            {selected.length >= 2 && (
                <div className="flex items-center gap-2 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Merge className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-sm text-blue-700 shrink-0">Merge into:</span>
                    <Input
                        value={canonicalName}
                        onChange={e => setCanonicalName(e.target.value)}
                        placeholder={`e.g. ${selected[0]}`}
                        className="h-8 text-sm"
                    />
                    <Button size="sm" onClick={handleMerge} disabled={!canonicalName.trim() || merging}>
                        {merging ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <Check className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelected([])}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}
            {selected.length === 1 && (
                <p className="text-xs text-slate-500 mt-1">Select at least one more to merge.</p>
            )}
        </div>
    );
}

function ProjectSection({ project, expenses, onMerge, onRename }) {
    const [open, setOpen] = useState(false);

    const projectExpenses = expenses.filter(e => e.projectId === project.id);
    const vendors = [...new Set(projectExpenses.map(e => e.vendor).filter(Boolean))].sort();
    const categories = [...new Set(projectExpenses.map(e => e.category).filter(Boolean))].sort();

    if (vendors.length === 0 && categories.length === 0) return null;

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    {open ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                    <span className="font-semibold text-slate-800">{project.name}</span>
                    <Badge variant="secondary">{vendors.length} vendors</Badge>
                    <Badge variant="secondary">{categories.length} categories</Badge>
                </div>
            </button>

            {open && (
                <div className="p-5 space-y-6">
                    <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Vendors</h4>
                        {vendors.length > 0 ? (
                            <MergeSection
                                items={vendors}
                                label="vendor"
                                onMerge={(selected, canonical) => onMerge(project.id, "vendor", selected, canonical)}
                            />
                        ) : <p className="text-sm text-slate-400">No vendors.</p>}
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Categories</h4>
                        {categories.length > 0 ? (
                            <MergeSection
                                items={categories}
                                label="category"
                                onMerge={(selected, canonical) => onMerge(project.id, "category", selected, canonical)}
                            />
                        ) : <p className="text-sm text-slate-400">No categories.</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminVendorsCategories() {
    const queryClient = useQueryClient();

    const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
        queryKey: ['all-expenses'],
        queryFn: () => base44.entities.Expense.list(),
    });

    const { data: projects = [], isLoading: loadingProjects } = useQuery({
        queryKey: ['all-projects'],
        queryFn: () => base44.entities.Project.list(),
    });

    const handleMerge = async (projectId, field, selected, canonical) => {
        // Find all expenses in this project with one of the selected values
        const toUpdate = expenses.filter(
            e => e.projectId === projectId && selected.includes(e[field])
        );

        await Promise.all(
            toUpdate.map(e => base44.entities.Expense.update(e.id, { [field]: canonical }))
        );

        queryClient.invalidateQueries({ queryKey: ['all-expenses'] });
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        toast.success(`Merged ${toUpdate.length} expense(s) into "${canonical}"`);
    };

    if (loadingExpenses || loadingProjects) {
        return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="mb-2">
                <p className="text-sm text-slate-500">Select multiple items to merge them into one. Changes apply to all expenses in the project.</p>
            </div>

            {projects.map(project => (
                <ProjectSection
                    key={project.id}
                    project={project}
                    expenses={expenses}
                    onMerge={handleMerge}
                />
            ))}
        </div>
    );
}