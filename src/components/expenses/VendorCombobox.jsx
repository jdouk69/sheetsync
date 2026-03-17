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

export default function VendorCombobox({ value, onChange, existingVendors = [] }) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const isMobile = useIsMobile();
    const inputRef = useRef(null);

    const vendors = [...new Set((existingVendors || []).filter(Boolean))].sort();
    const filtered = vendors.filter(v => v.toLowerCase().includes(search.toLowerCase()));
    const hasExactMatch = vendors.some(v => v.toLowerCase() === search.toLowerCase().trim());

    const handleSelect = (vendor) => {
        onChange(vendor);
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
                            {value || t('vendorPlaceholder')}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                    <Command>
                        <CommandInput
                            placeholder={t('vendorPlaceholder')}
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
                            {filtered.map((vendor) => (
                                <CommandItem key={vendor} value={vendor} onSelect={() => handleSelect(vendor)}>
                                    <Check className={cn("mr-2 h-4 w-4", value === vendor ? "opacity-100" : "opacity-0")} />
                                    {vendor}
                                </CommandItem>
                            ))}
                            {search.trim() && !hasExactMatch && (
                                <CommandItem onSelect={handleCreate} className="text-blue-600 font-medium">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create "{search.trim()}"
                                </CommandItem>
                            )}
                            {vendors.length === 0 && !search && (
                                <div className="px-3 py-3 text-sm text-muted-foreground">No vendors yet. Type to add one.</div>
                            )}
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
        );
    }

    // Mobile: trigger button + Drawer rendered at same level (not nested in grid cell stacking context)
    // The Drawer is outside the Button so it doesn't inherit grid constraints
    return (
        <div>
            <Button
                variant="outline"
                className="w-full justify-between font-normal"
                onClick={() => { setSearch(""); setOpen(true); }}
                type="button"
            >
                <span className={cn("truncate", !value && "text-muted-foreground")}>
                    {value || t('vendorPlaceholder')}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>

            <Drawer open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
                <DrawerContent>
                    <div className="p-4 pb-10">
                        <div className="text-sm font-semibold text-foreground mb-3">Vendor</div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search or type new vendor..."
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            inputMode="text"
                            name="vendor-search-field"
                            className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-3"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (search.trim() && !hasExactMatch) handleCreate();
                                    else if (hasExactMatch) {
                                        const match = vendors.find(v => v.toLowerCase() === search.toLowerCase().trim());
                                        if (match) handleSelect(match);
                                    }
                                }
                            }}
                        />
                        <ul className="max-h-64 overflow-y-auto divide-y divide-border rounded-md border border-border">
                            {search.trim() && !hasExactMatch && (
                                <li>
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-3 text-sm text-blue-600 font-medium flex items-center gap-2 active:bg-blue-100"
                                        onPointerDown={(e) => { e.preventDefault(); handleCreate(); }}
                                    >
                                        <Plus className="w-4 h-4 shrink-0" />
                                        Add "{search.trim()}"
                                    </button>
                                </li>
                            )}
                            {filtered.map((vendor) => (
                                <li key={vendor}>
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-3 text-sm flex items-center justify-between active:bg-accent"
                                        onPointerDown={(e) => { e.preventDefault(); handleSelect(vendor); }}
                                    >
                                        <span>{vendor}</span>
                                        {value === vendor && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                                    </button>
                                </li>
                            ))}
                            {filtered.length === 0 && !search.trim() && (
                                <li className="px-3 py-3 text-sm text-muted-foreground">No vendors yet. Type to add one.</li>
                            )}
                        </ul>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}