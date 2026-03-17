import React, { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
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

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && search.trim()) {
            e.preventDefault();
            onChange(search.trim());
            setOpen(false);
            setSearch("");
        }
    };

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        <span className={cn(!value && "text-muted-foreground")}>
                            {value || t('selectCategory')}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </DrawerTrigger>
                <DrawerContent className="p-0 max-h-[70vh]">
                    <div className="flex flex-col h-full">
                        <div className="p-3 border-b">
                            <input
                                type="text"
                                placeholder={t('searchCategory')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full px-3 py-2 border border-input rounded-md text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
                                autoFocus
                            />
                        </div>
                        <div className="overflow-y-auto flex-1 pb-8">
                            {search.trim() && (
                                <button
                                    className="w-full text-left px-4 py-3 text-sm text-blue-600 border-b border-border hover:bg-accent"
                                    onTouchEnd={(e) => { e.preventDefault(); handleSelect(search.trim()); }}
                                    onClick={() => handleSelect(search.trim())}
                                >
                                    Add "{search.trim()}"
                                </button>
                            )}
                            {filtered.map((category) => (
                                <button
                                    key={category}
                                    className="w-full text-left px-4 py-3 text-sm border-b border-border last:border-0 flex items-center gap-2 hover:bg-accent active:bg-accent"
                                    onTouchEnd={(e) => { e.preventDefault(); handleSelect(category); }}
                                    onClick={() => handleSelect(category)}
                                >
                                    <Check className={cn("h-4 w-4 shrink-0", value === category ? "opacity-100 text-blue-600" : "opacity-0")} />
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>
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