import React, { useState, useEffect, useRef } from "react";
import { Command, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../LanguageContext";

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 767px)");
        const handler = (e) => setIsMobile(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);
    return isMobile;
}

export default function CategoryCombobox({ value, onChange, existingCategories }) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const isMobile = useIsMobile();
    const inputRef = useRef(null);

    const suggestedCategories = [
        t('materials'), t('labor'), t('equipment'), t('permits'),
        t('professionalServices'), t('utilities'), t('electrician'),
        t('plumber'), t('cabinetmaker'), t('concrete'), t('other')
    ];

    const allCategories = [...new Set([...existingCategories, ...suggestedCategories])].sort();
    const filtered = allCategories.filter(cat => cat.toLowerCase().includes(search.toLowerCase()));
    const hasExactMatch = allCategories.some(cat => cat.toLowerCase() === search.toLowerCase().trim());

    const handleSelect = (category) => {
        onChange(category);
        setOpen(false);
        setSearch("");
    };

    const handleCreate = () => {
        const val = search.trim();
        if (val) {
            onChange(val);
            setOpen(false);
            setSearch("");
        }
    };

    // Desktop: Popover + Command
    if (!isMobile) {
        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between font-normal"
                    >
                        <span className={cn("truncate", !value && "text-muted-foreground")}>
                            {value || t('selectCategory')}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                    <Command>
                        <CommandInput
                            placeholder={t('searchCategory')}
                            value={search}
                            onValueChange={setSearch}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && search.trim() && !hasExactMatch) {
                                    e.preventDefault();
                                    handleCreate();
                                }
                            }}
                        />
                        <CommandGroup className="max-h-64 overflow-auto">
                            {filtered.map((category) => (
                                <CommandItem key={category} value={category} onSelect={() => handleSelect(category)}>
                                    <Check className={cn("mr-2 h-4 w-4", value === category ? "opacity-100" : "opacity-0")} />
                                    {category}
                                </CommandItem>
                            ))}
                            {search.trim() && !hasExactMatch && (
                                <CommandItem onSelect={handleCreate} className="text-blue-600 font-medium">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create "{search.trim()}"
                                </CommandItem>
                            )}
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
        );
    }

    // Mobile: Drawer with plain input + flat list (no cmdk portal)
    return (
        <>
            <Button
                variant="outline"
                className="w-full justify-between font-normal"
                onClick={() => { setSearch(""); setOpen(true); }}
                type="button"
            >
                <span className={cn("truncate", !value && "text-muted-foreground")}>
                    {value || t('selectCategory')}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>

            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerContent className="pb-safe">
                    <div className="p-4 pb-8">
                        <div className="text-sm font-semibold text-foreground mb-3">Category</div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search or type new category..."
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            inputMode="text"
                            className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-3"
                            onFocus={() => setTimeout(() => inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                        />
                        <ul className="max-h-64 overflow-y-auto divide-y divide-border rounded-md border border-border">
                            {search.trim() && !hasExactMatch && (
                                <li>
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-3 text-sm text-blue-600 font-medium flex items-center gap-2 hover:bg-blue-50 active:bg-blue-100"
                                        onClick={handleCreate}
                                    >
                                        <Plus className="w-4 h-4 shrink-0" />
                                        Add "{search.trim()}"
                                    </button>
                                </li>
                            )}
                            {filtered.map((category) => (
                                <li key={category}>
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-3 text-sm flex items-center justify-between hover:bg-accent active:bg-accent"
                                        onClick={() => handleSelect(category)}
                                    >
                                        <span>{category}</span>
                                        {value === category && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                                    </button>
                                </li>
                            ))}
                            {filtered.length === 0 && !search.trim() && (
                                <li className="px-3 py-3 text-sm text-muted-foreground">No categories found. Type to add one.</li>
                            )}
                        </ul>
                    </div>
                </DrawerContent>
            </Drawer>
        </>
    );
}