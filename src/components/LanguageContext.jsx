import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
    en: {
        // Layout
        appName: "Greece Construction",
        expenses: "Expenses",
        reports: "Reports",
        logout: "Logout",
        selectProject: "Select Project",
        addProject: "Add Project",
        projectManagement: "Project Management",
        addNewProject: "Add New Project",
        editProject: "Edit Project",
        projectName: "Project Name",
        projectNamePlaceholder: "Enter project name",
        projectDescriptionPlaceholder: "Enter project description",
        status: "Status",
        active: "Active",
        completed: "Completed",
        onHold: "On Hold",
        startDate: "Start Date",
        endDate: "End Date",
        create: "Create",
        current: "Current",
        confirmDeleteProject: "Are you sure you want to delete this project? All associated expenses will remain but won't be linked to any project.",
        inviteUser: "Invite User",
        inviteUserToApp: "Invite User to App",

        // Expenses Page
        constructionExpenses: "Construction Expenses",
        trackExpenses: "Track your Greece house construction costs",
        deleteSelected: "Delete {count} Selected",
        importCsv: "Import CSV",
        addExpense: "Add Expense",
        selectAll: "Select All",
        selected: "selected",
        noExpensesFound: "No expenses found. Add your first expense to get started.",
        
        // Expense Form
        editExpense: "Edit Expense",
        addNewExpense: "Add New Expense",
        vendor: "Vendor",
        vendorPlaceholder: "Vendor name",
        amount: "Amount (€)",
        category: "Category",
        date: "Date",
        description: "Description",
        descriptionPlaceholder: "e.g., Cement bags",
        notes: "Notes",
        notesPlaceholder: "Additional details...",
        photos: "Photos",
        uploading: "Uploading...",
        clickToUpload: "Click to upload photos",
        cancel: "Cancel",
        update: "Update",
        add: "Add",
        expense: "Expense",
        markAsPaid: "Mark as paid",
        paidStatus: "Paid Status",
        all: "All",

        // Expense Card
        viewPhotos: "View Photos",
        expensePhotos: "Expense Photos",
        edit: "Edit",
        delete: "Delete",
        paid: "Paid",
        unpaid: "Unpaid",
        createdBy: "Created by",
        editedBy: "Edited by",
        
        // Category Combobox
        selectCategory: "Select or type category...",
        searchCategory: "Search or type new category...",
        pressEnter: "Press {key} to add \"{value}\"",
        
        // Categories
        materials: "Materials",
        labor: "Labor",
        equipment: "Equipment",
        permits: "Permits",
        professionalServices: "Professional Services",
        utilities: "Utilities",
        electrician: "Electrician",
        plumber: "Plumber",
        cabinetmaker: "Cabinetmaker",
        concrete: "Concrete",
        other: "Other",
        
        // Filters
        allCategories: "All Categories",
        startDate: "Start Date",
        endDate: "End Date",
        
        // Summary
        totalSpent: "Total Spent",
        totalExpenses: "Total Expenses",
        topCategory: "Top Category",
        thisMonth: "This Month",
        na: "N/A",
        
        // Import
        importExpensesTitle: "Import Expenses from CSV",
        importDescription: "Upload a CSV file with your expense data. Required columns: description, amount, category, date",
        downloadTemplate: "Download CSV Template",
        clickToSelect: "Click to select CSV file",
        mapColumns: "Map CSV Columns to Fields",
        mapDescription: "Match your CSV columns to the expense fields. Required: description, amount, category, date",
        selectField: "Select field",
        skipColumn: "Skip column",
        importSuccess: "✓ Import successful!",
        imported: "Imported {count} expenses",
        errorsNote: "Note: {count} rows had errors",
        importFailed: "✗ Import failed",
        importing: "Importing...",
        importExpenses: "Import Expenses",
        
        // Reports
        reportsAnalytics: "Reports & Analytics",
        visualBreakdown: "Visual breakdown of your construction expenses",
        exportCsv: "Export CSV",
        exportPdf: "Export PDF",
        filters: "Filters",
        allVendors: "All Vendors",
        clearFilters: "Clear Filters",
        expensesByCategory: "Expenses by Category",
        monthlySpending: "Monthly Spending",
        categoryBreakdown: "Category Breakdown",
        noDataAvailable: "No data available",
        constructionExpenseReport: "Construction Expense Report",
        generated: "Generated",
        totalAmount: "Total Amount",
        expenseDetails: "Expense Details",
        unpaidExpenses: "Unpaid Expenses",
        totalUnpaidAmount: "Total Unpaid Amount",
        unpaidItems: "unpaid items",
        allExpensesPaid: "All Expenses Paid!",
        noUnpaidExpenses: "You have no unpaid expenses"
    },
    el: {
        // Layout
        appName: "Κατασκευή Ελλάδας",
        expenses: "Έξοδα",
        reports: "Αναφορές",
        logout: "Αποσύνδεση",
        selectProject: "Επιλογή Έργου",
        addProject: "Προσθήκη Έργου",
        projectManagement: "Διαχείριση Έργων",
        addNewProject: "Προσθήκη Νέου Έργου",
        editProject: "Επεξεργασία Έργου",
        projectName: "Όνομα Έργου",
        projectNamePlaceholder: "Εισάγετε όνομα έργου",
        projectDescriptionPlaceholder: "Εισάγετε περιγραφή έργου",
        status: "Κατάσταση",
        active: "Ενεργό",
        completed: "Ολοκληρωμένο",
        onHold: "Σε Αναμονή",
        startDate: "Ημερομηνία Έναρξης",
        endDate: "Ημερομηνία Λήξης",
        create: "Δημιουργία",
        current: "Τρέχον",
        confirmDeleteProject: "Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το έργο; Όλες οι σχετικές δαπάνες θα παραμείνουν αλλά δεν θα συνδέονται με κάποιο έργο.",
        inviteUser: "Πρόσκληση Χρήστη",
        inviteUserToApp: "Πρόσκληση Χρήστη στην Εφαρμογή",

        // Expenses Page
        constructionExpenses: "Έξοδα Κατασκευής",
        trackExpenses: "Παρακολουθήστε τα έξοδα κατασκευής του σπιτιού σας στην Ελλάδα",
        deleteSelected: "Διαγραφή {count} Επιλεγμένων",
        importCsv: "Εισαγωγή CSV",
        addExpense: "Προσθήκη Εξόδου",
        selectAll: "Επιλογή Όλων",
        selected: "επιλεγμένα",
        noExpensesFound: "Δεν βρέθηκαν έξοδα. Προσθέστε το πρώτο σας έξοδο για να ξεκινήσετε.",
        
        // Expense Form
        editExpense: "Επεξεργασία Εξόδου",
        addNewExpense: "Προσθήκη Νέου Εξόδου",
        vendor: "Προμηθευτής",
        vendorPlaceholder: "Όνομα προμηθευτή",
        amount: "Ποσό (€)",
        category: "Κατηγορία",
        date: "Ημερομηνία",
        description: "Περιγραφή",
        descriptionPlaceholder: "π.χ., Τσιμέντο",
        notes: "Σημειώσεις",
        notesPlaceholder: "Επιπλέον λεπτομέρειες...",
        photos: "Φωτογραφίες",
        uploading: "Μεταφόρτωση...",
        clickToUpload: "Κάντε κλικ για ανέβασμα φωτογραφιών",
        cancel: "Ακύρωση",
        update: "Ενημέρωση",
        add: "Προσθήκη",
        expense: "Εξόδου",
        markAsPaid: "Επισημάνετε ως πληρωμένο",
        paidStatus: "Κατάσταση Πληρωμής",
        all: "Όλα",

        // Expense Card
        viewPhotos: "Προβολή Φωτογραφιών",
        expensePhotos: "Φωτογραφίες Εξόδου",
        edit: "Επεξεργασία",
        delete: "Διαγραφή",
        paid: "Πληρωμένο",
        unpaid: "Μη Πληρωμένο",
        createdBy: "Δημιουργήθηκε από",
        editedBy: "Επεξεργάστηκε από",
        
        // Category Combobox
        selectCategory: "Επιλέξτε ή πληκτρολογήστε κατηγορία...",
        searchCategory: "Αναζήτηση ή πληκτρολόγηση νέας κατηγορίας...",
        pressEnter: "Πατήστε {key} για να προσθέσετε \"{value}\"",
        
        // Categories
        materials: "Υλικά",
        labor: "Εργασία",
        equipment: "Εξοπλισμός",
        permits: "Άδειες",
        professionalServices: "Επαγγελματικές Υπηρεσίες",
        utilities: "Υπηρεσίες Κοινής Ωφέλειας",
        electrician: "Ηλεκτρολόγος",
        plumber: "Υδραυλικός",
        cabinetmaker: "Ξυλουργός",
        concrete: "Σκυρόδεμα",
        other: "Άλλο",
        
        // Filters
        allCategories: "Όλες οι Κατηγορίες",
        startDate: "Ημερομηνία Έναρξης",
        endDate: "Ημερομηνία Λήξης",
        
        // Summary
        totalSpent: "Συνολικό Ποσό",
        totalExpenses: "Συνολικά Έξοδα",
        topCategory: "Κύρια Κατηγορία",
        thisMonth: "Αυτόν τον Μήνα",
        na: "Μ/Δ",
        
        // Import
        importExpensesTitle: "Εισαγωγή Εξόδων από CSV",
        importDescription: "Ανεβάστε ένα αρχείο CSV με τα δεδομένα εξόδων σας. Απαιτούμενες στήλες: περιγραφή, ποσό, κατηγορία, ημερομηνία",
        downloadTemplate: "Λήψη Προτύπου CSV",
        clickToSelect: "Κάντε κλικ για επιλογή αρχείου CSV",
        mapColumns: "Αντιστοίχιση Στηλών CSV σε Πεδία",
        mapDescription: "Αντιστοιχίστε τις στήλες του CSV με τα πεδία εξόδων. Απαιτούμενα: περιγραφή, ποσό, κατηγορία, ημερομηνία",
        selectField: "Επιλογή πεδίου",
        skipColumn: "Παράλειψη στήλης",
        importSuccess: "✓ Επιτυχής εισαγωγή!",
        imported: "Εισήχθησαν {count} έξοδα",
        errorsNote: "Σημείωση: {count} σειρές είχαν σφάλματα",
        importFailed: "✗ Αποτυχία εισαγωγής",
        importing: "Εισαγωγή...",
        importExpenses: "Εισαγωγή Εξόδων",
        
        // Reports
        reportsAnalytics: "Αναφορές & Αναλύσεις",
        visualBreakdown: "Οπτική ανάλυση των εξόδων κατασκευής σας",
        exportCsv: "Εξαγωγή CSV",
        exportPdf: "Εξαγωγή PDF",
        filters: "Φίλτρα",
        allVendors: "Όλοι οι Προμηθευτές",
        clearFilters: "Καθαρισμός Φίλτρων",
        expensesByCategory: "Έξοδα ανά Κατηγορία",
        monthlySpending: "Μηνιαίες Δαπάνες",
        categoryBreakdown: "Ανάλυση ανά Κατηγορία",
        noDataAvailable: "Δεν υπάρχουν διαθέσιμα δεδομένα",
        constructionExpenseReport: "Αναφορά Εξόδων Κατασκευής",
        generated: "Δημιουργήθηκε",
        totalAmount: "Συνολικό Ποσό",
        expenseDetails: "Λεπτομέρειες Εξόδων",
        unpaidExpenses: "Ανεξόφλητα Έξοδα",
        totalUnpaidAmount: "Συνολικό Ανεξόφλητο Ποσό",
        unpaidItems: "ανεξόφλητα στοιχεία",
        allExpensesPaid: "Όλα τα Έξοδα Πληρώθηκαν!",
        noUnpaidExpenses: "Δεν έχετε ανεξόφλητα έξοδα"
    }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState(() => {
        // Load language from localStorage on initial render
        const savedLanguage = localStorage.getItem('appLanguage');
        return savedLanguage || 'en';
    });

    useEffect(() => {
        // Save language to localStorage whenever it changes
        localStorage.setItem('appLanguage', language);
    }, [language]);

    const t = (key, params = {}) => {
        let text = translations[language][key] || key;
        
        // Replace parameters like {count}, {value}, etc.
        Object.keys(params).forEach(param => {
            text = text.replace(`{${param}}`, params[param]);
        });
        
        return text;
    };

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'en' ? 'el' : 'en');
    };

    return (
        <LanguageContext.Provider value={{ language, t, toggleLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}