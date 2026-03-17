import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../LanguageContext";

export default function CategoryCombobox({ value, onChange, existingCategories }) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

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

    const modal = open ? createPortal(
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
            }}
            onClick={handleClose}
        >
            <div
                style={{
                    backgroundColor: '#fff', borderRadius: '16px 16px 0 0',
                    maxHeight: '70vh', display: 'flex', flexDirection: 'column'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px', borderBottom:'1px solid #e5e7eb'}}>
                    <span style={{fontWeight:600, fontSize:'16px'}}>{t('category')}</span>
                    <button type="button" onClick={handleClose} style={{padding:'4px'}}>
                        <X size={20} color="#6b7280" />
                    </button>
                </div>
                <div style={{padding:'12px', borderBottom:'1px solid #e5e7eb'}}>
                    <input
                        type="text"
                        placeholder={t('searchCategory')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width:'100%', padding:'10px 12px', fontSize:'16px',
                            border:'1px solid #d1d5db', borderRadius:'8px', outline:'none',
                            backgroundColor:'#fff'
                        }}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                    />
                </div>
                <div style={{overflowY:'auto', flex:1, paddingBottom:'24px'}}>
                    {search.trim() && (
                        <button
                            type="button"
                            style={{width:'100%', textAlign:'left', padding:'14px 16px', fontSize:'14px', color:'#2563eb', borderBottom:'1px solid #f3f4f6', background:'none'}}
                            onClick={() => handleSelect(search.trim())}
                        >
                            Add "{search.trim()}"
                        </button>
                    )}
                    {filtered.map((category) => (
                        <button
                            type="button"
                            key={category}
                            style={{width:'100%', textAlign:'left', padding:'14px 16px', fontSize:'15px', borderBottom:'1px solid #f3f4f6', display:'flex', alignItems:'center', gap:'8px', background:'none'}}
                            onClick={() => handleSelect(category)}
                        >
                            <Check size={16} color="#2563eb" style={{opacity: value === category ? 1 : 0, flexShrink:0}} />
                            {category}
                        </button>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    ) : null;

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
            {modal}
        </>
    );
}