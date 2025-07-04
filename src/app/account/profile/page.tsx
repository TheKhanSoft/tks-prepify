'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function AccountProfilePage() {
    const { user, loading } = useAuth();
    
    if (loading) {
        return <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!user) {
        // This case is handled by the layout, but as a fallback:
        return <p>You must be logged in to view this page.</p>;
    }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>This is your personal information. Update functionality coming soon!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
             <Avatar className="h-20 w-20">
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} data-ai-hint="user avatar" />
                <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <Button variant="outline" disabled>Change Avatar</Button>
                <p className="text-xs text-muted-foreground mt-2">JPG, GIF or PNG. 1MB max.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" value={user.displayName || ''} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" value={user.email || ''} disabled />
          </div>
          <div className="space-y-2">
            <Label>Email Verified</Label>
            <p className={`text-sm font-medium ${user.emailVerified ? 'text-green-600' : 'text-destructive'}`}>
                {user.emailVerified ? 'Yes' : 'No'}
            </p>
          </div>
          <div className="flex justify-end">
            <Button disabled>Update Profile</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
