import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function InviteUser() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleInvite = async (e) => {
        e.preventDefault();
        
        if (!email || !email.includes('@')) {
            toast.error('Please enter a valid email address');
            return;
        }

        setIsLoading(true);
        try {
            await base44.users.inviteUser(email, "user");
            toast.success(`Invitation sent to ${email}`);
            setEmail("");
        } catch (error) {
            toast.error(error.message || 'Failed to send invitation');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Invite User to App</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleInvite} className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Email Address
                        </label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@example.com"
                            disabled={isLoading}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            User will receive an email to join the app
                        </p>
                    </div>
                    <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Send Invitation
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}