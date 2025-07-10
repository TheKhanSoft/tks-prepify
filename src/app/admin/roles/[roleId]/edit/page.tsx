
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getRoleById, updateRole } from "@/lib/role-service";

const roleFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

export default function EditRolePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const roleId = params.roleId as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentRoleName, setCurrentRoleName] = useState('');

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (!roleId) return;
    const loadData = async () => {
        setLoading(true);
        try {
            const roleData = await getRoleById(roleId);
            if (roleData) {
                form.reset({ name: roleData.name });
                setCurrentRoleName(roleData.name);
            } else {
                toast({ title: "Error", description: "Role not found.", variant: "destructive" });
                router.push('/admin/roles');
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to load role data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [roleId, form, router, toast]);

  async function onSubmit(data: RoleFormValues) {
    setIsSubmitting(true);
    try {
      await updateRole(roleId, data);
      toast({ title: "Role Updated", description: "The role has been updated successfully." });
      router.push("/admin/roles");
      router.refresh();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update the role.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
        <div className="flex justify-center items-center h-full min-h-[calc(100vh-20rem)]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Roles
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Edit Role: {currentRoleName}</CardTitle>
          <CardDescription>Update the name for this role.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Role Name</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.push('/admin/roles')} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
