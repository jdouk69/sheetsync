import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
                <Link
                    to={createPageUrl("Reports")}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-6"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Reports
                </Link>

                <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
                <p className="text-slate-500 text-sm mb-8">Last updated: March 2026</p>

                <div className="space-y-8 text-slate-700 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">1. Introduction</h2>
                        <p>
                            Welcome to SheetSync ("we", "our", or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">2. Information We Collect</h2>
                        <p className="mb-2">We may collect the following types of information:</p>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            <li><strong>Account Information:</strong> Name, email address, and role when you register.</li>
                            <li><strong>Project & Expense Data:</strong> Information you enter into the application, such as project names, expense descriptions, amounts, vendors, and categories.</li>
                            <li><strong>Usage Data:</strong> Activity logs within the app, such as actions performed and timestamps.</li>
                            <li><strong>Uploaded Files:</strong> Photos or documents you attach to expense records.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">3. How We Use Your Information</h2>
                        <p className="mb-2">We use the information we collect to:</p>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            <li>Provide, operate, and maintain the application.</li>
                            <li>Allow you to manage projects and expenses.</li>
                            <li>Enable collaboration by sharing data with users you explicitly invite.</li>
                            <li>Generate reports and analytics based on your data.</li>
                            <li>Improve and develop new features.</li>
                            <li>Send administrative notifications related to your account.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">4. How We Share Your Information</h2>
                        <p>
                            We do not sell, trade, or rent your personal information to third parties. We may share information with:
                        </p>
                        <ul className="list-disc list-inside space-y-1 pl-2 mt-2">
                            <li><strong>Team Members:</strong> Users you invite to your projects can view shared project data.</li>
                            <li><strong>Service Providers:</strong> Third-party services that help us operate the platform (e.g., cloud hosting, authentication).</li>
                            <li><strong>Legal Requirements:</strong> If required by law or to protect the rights of our users.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">5. Data Retention</h2>
                        <p>
                            We retain your data for as long as your account is active or as needed to provide you with our services. You may delete your account at any time, which will remove your personal data from our systems, subject to any legal obligations.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">6. Security</h2>
                        <p>
                            We implement appropriate technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">7. Your Rights</h2>
                        <p className="mb-2">Depending on your location, you may have the right to:</p>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            <li>Access the personal data we hold about you.</li>
                            <li>Request correction of inaccurate data.</li>
                            <li>Request deletion of your personal data.</li>
                            <li>Object to or restrict our processing of your data.</li>
                            <li>Data portability (receive your data in a machine-readable format).</li>
                        </ul>
                        <p className="mt-2">To exercise any of these rights, please contact us using the information below.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">8. Cookies</h2>
                        <p>
                            We may use cookies and similar tracking technologies to enhance your experience, remember your preferences, and analyze usage patterns. You can control cookie settings through your browser settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">9. Children's Privacy</h2>
                        <p>
                            Our application is not intended for use by children under the age of 13. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us so we can remove it.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">10. Changes to This Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page with an updated date. We encourage you to review this policy periodically.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">11. Contact Us</h2>
                        <p>
                            If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
                        </p>
                        <div className="mt-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="font-medium text-slate-900">SheetSync</p>
                            <p className="text-slate-600 text-sm mt-1">Please use the contact information provided within your account or organization.</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}