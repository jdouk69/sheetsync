import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download, PieChart, BarChart3 } from "lucide-react";
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1', '#ec4899', '#64748b'];

export default function ReportsPage() {
    const { data: expenses = [] } = useQuery({
        queryKey: ['expenses'],
        queryFn: () => base44.entities.Expense.list('-date'),
    });

    const categoryData = expenses.reduce((acc, exp) => {
        const existing = acc.find(item => item.name === exp.category);
        if (existing) {
            existing.value += exp.amount;
        } else {
            acc.push({ name: exp.category, value: exp.amount });
        }
        return acc;
    }, []);

    const monthlyData = expenses.reduce((acc, exp) => {
        const monthYear = format(new Date(exp.date), 'MMM yyyy');
        const existing = acc.find(item => item.name === monthYear);
        if (existing) {
            existing.amount += exp.amount;
        } else {
            acc.push({ name: monthYear, amount: exp.amount });
        }
        return acc;
    }, []).sort((a, b) => new Date(a.name) - new Date(b.name));

    const handleExportPDF = async () => {
        const jsPDF = (await import('jspdf')).default;
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('Construction Expense Report', 20, 20);
        
        doc.setFontSize(10);
        doc.text(`Generated: ${format(new Date(), 'PPP')}`, 20, 30);
        doc.text(`Total Expenses: ${expenses.length}`, 20, 35);
        doc.text(`Total Amount: €${expenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, 40);
        
        doc.setFontSize(14);
        doc.text('Expenses by Category', 20, 55);
        
        let y = 65;
        categoryData.forEach((cat) => {
            doc.setFontSize(10);
            doc.text(`${cat.name}: €${cat.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 25, y);
            y += 6;
        });
        
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Expense Details', 20, 20);
        
        y = 30;
        doc.setFontSize(8);
        expenses.forEach((exp) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            doc.text(`${format(new Date(exp.date), 'MM/dd/yyyy')} - ${exp.description} - €${exp.amount.toFixed(2)} - ${exp.category}`, 20, y);
            y += 6;
        });
        
        doc.save('construction-expenses-report.pdf');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
                        <p className="text-slate-600 mt-1">Visual breakdown of your construction expenses</p>
                    </div>
                    <Button onClick={handleExportPDF} className="bg-blue-600 hover:bg-blue-700">
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF Report
                    </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <PieChart className="w-5 h-5 text-blue-600" />
                            <h2 className="text-xl font-semibold">Expenses by Category</h2>
                        </div>
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <RechartsPie>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
                                </RechartsPie>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-center text-slate-500 py-12">No data available</p>
                        )}
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                            <h2 className="text-xl font-semibold">Monthly Spending</h2>
                        </div>
                        {monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
                                    <Bar dataKey="amount" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-center text-slate-500 py-12">No data available</p>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold mb-4">Category Breakdown</h2>
                    <div className="space-y-3">
                        {categoryData.map((cat, index) => {
                            const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
                            const percentage = (cat.value / total) * 100;
                            return (
                                <div key={cat.name}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium">{cat.name}</span>
                                        <span className="text-slate-600">
                                            €{cat.value.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({percentage.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div
                                            className="h-2 rounded-full"
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: COLORS[index % COLORS.length]
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}