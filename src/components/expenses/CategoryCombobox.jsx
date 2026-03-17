import React, { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../LanguageContext";

export default function CategoryCombobox({ value, onChange, existingCategories }) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const isMobile = window.innerWidth < 768;

    const suggestedCategories = [
        t('materials'), t('labor'), t('equipment'), t('permits'),
        t('professionalServices'), t('utilities'), t('electrician'),
        t('plumber'), t('cabinetmaker'), t('concrete'), t('other')
    ];

    const allCategories = [...new Set([...existingCategories, ...suggestedCategories])].sort();
    const filtered = allCategories.filter(cat => cat.toLowerCase().includes(search.toLowerCase()));

    const handleSelect = (category) => {
        onChange(category);
        setOpen(false);
        setSearch("");
    };

    const handleClose = () => {
        setOpen(false);
        setSearch("");
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && search.trim()) {
            e.preventDefault();
            handleSelect(search.trim());
        }
    };

    if (isMobile) {
        return (
            <>
                <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setOpen(true)}
                >
                    <span className={cn(!value && "text-muted-foreground")}>
                        {value || t('selectCategory')}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>

                {open && (
                    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                        <div className="bg-white rounded-t-2xl flex flex-col" style={{maxHeight: '70vh'}}>
                            <div className="flex items-center justify-between p-4 border-b">
                                <span className="font-semibold text-base">{t('category')}</span>
                                <button type="button" onClick={handleClose} className="p-1">
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>
                            <div className="p-3 border-b">
                                <input
                                    type="text"
                                    placeholder={t('searchCategory')}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base outline-none bg-white"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck="false"
                                />
                            </div>
                            <div className="overflow-y-auto flex-1 pb-6">
                                {search.trim() && (
                                    <button
                                        type="button"
                                        className="w-full text-left px-4 py-4 text-sm text-blue-600 border-b border-gray-100 active:bg-gray-100"
                                        onClick={() => handleSelect(search.trim())}
                                    >
                                        Add "{search.trim()}"
                                    </button>
                                )}
                                {filtered.map((category) => (
                                    <button
                                        type="button"
                                        key={category}
                                        className="w-full text-left px-4 py-4 text-sm border-b border-gray-100 flex items-center gap-2 active:bg-gray-100"
                                        onClick={() => handleSelect(category)}
                                    >
                                        <Check className={cn("h-4 w-4 shrink-0 text-blue-600", value === category ? "opacity-100" : "opacity-0")} />
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {value || t('selectCategory')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput
                        placeholder={t('searchCategory')}
                        value={search}
                        onValueChange={setSearch}
                        onKeyDown={handleKeyDown}
                    />
                    <CommandEmpty>
                        <div className="p-2 text-sm">{t('pressEnter', { key: 'Enter', value: search })}</div>
                    </CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                        {allCategories.filter(cat => cat.toLowerCase().includes(search.toLowerCase())).map((category) => (
                            <CommandItem key={category} value={category} onSelect={() => handleSelect(category)}>
                                <Check className={cn("mr-2 h-4 w-4", value === category ? "opacity-100" : "opacity-0")} />
                                {category}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}