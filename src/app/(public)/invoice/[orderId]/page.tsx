
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getOrderById } from '@/lib/order-service';
import { fetchSettings } from '@/lib/settings-service';
import type { Order, Settings, User } from '@/types';
import { Loader2, Printer, BookOpen, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getUserProfile } from '@/lib/user-service';

const InvoicePageSkeleton = () => (
  <div className="max-w-4xl mx-auto p-8 bg-gray-50 animate-pulse">
    <div className="p-10 border bg-white shadow-sm rounded-lg">
      <div className="flex justify-between items-start mb-10">
        <div className="h-12 w-32 bg-gray-200 rounded"></div>
        <div className="text-right">
          <div className="h-8 w-40 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
      <div className="h-8 w-24 bg-gray-200 rounded mb-6"></div>
      <div className="grid grid-cols-2 gap-8 mb-10">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-gray-200 rounded"></div>
          <div className="h-4 w-40 bg-gray-200 rounded"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 bg-gray-200 rounded"></div>
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
      <div className="w-full h-40 bg-gray-200 rounded mb-10"></div>
      <div className="flex justify-end">
        <div className="w-64 h-24 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
);

const InvoicePage = () => {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({ title: "Unauthorized", description: "You must be logged in to view an invoice.", variant: "destructive" });
      router.push(`/login?redirect=/invoice/${orderId}`);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [orderData, settingsData, profileData] = await Promise.all([
          getOrderById(orderId, user.uid),
          fetchSettings(),
          getUserProfile(user.uid),
        ]);

        if (!orderData) {
          toast({ title: "Error", description: "Invoice not found or you do not have permission to view it.", variant: "destructive" });
          router.push('/account/orders');
          return;
        }

        setOrder(orderData);
        setUserProfile(profileData);
        setSettings(settingsData);
      } catch (e) {
        toast({ title: "Error", description: "Failed to load invoice details.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [orderId, user, authLoading, router, toast]);

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (printContent) {
      const originalContent = document.body.innerHTML;
      document.body.innerHTML = printContent;
      window.print();
      document.body.innerHTML = originalContent;
      // It's common to have to reload to restore event listeners after this
      window.location.reload();
    }
  };

  if (loading || !settings) {
    return <InvoicePageSkeleton />;
  }

  if (!order) return null;

  const isPaid = order.status === 'completed';

  const subtotal = order.originalPrice;
  const discount = order.discountAmount || 0;
  const total = order.finalAmount;
  
  // Dummy values for invoice details
  const invoiceDate = new Date(order.createdAt);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 14); // Due in 14 days

  return (
    <>
      <div className="bg-gray-100 dark:bg-gray-900 min-h-screen p-4 sm:p-8">
        <div className="max-w-4xl mx-auto mb-8 flex justify-end gap-2">
            <Button onClick={handlePrint} variant="outline">
                <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF
            </Button>
        </div>
        <div ref={printRef}>
            <style type="text/css" media="print">
                {`
                @page { size: auto;  margin: 0mm; }
                body { background-color: #fff; }
                .no-print { display: none; }
                `}
            </style>
             <div className="max-w-4xl mx-auto p-8 sm:p-12 bg-white dark:bg-gray-800 shadow-lg rounded-lg relative overflow-hidden">
                {/* Status Banner */}
                 <div className={cn(
                    "absolute -right-28 top-8 transform rotate-45 text-white text-center font-bold text-lg py-2 w-72",
                    isPaid ? "bg-green-500" : "bg-orange-500"
                )}>
                    {isPaid ? 'PAID' : 'UNPAID'}
                </div>

                {/* Header */}
                <div className="flex justify-between items-start mb-10">
                    <div className="flex items-center gap-3">
                         <BookOpen className="h-10 w-10 text-primary" />
                         <div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white font-headline">{settings.siteName}</h1>
                            <p className="text-muted-foreground">{settings.siteDescription}</p>
                         </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">INVOICE</h2>
                        <p className="text-muted-foreground"># {order.id.substring(0,8)}</p>
                    </div>
                </div>

                {/* Invoice Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
                    <div>
                        <h3 className="font-semibold text-gray-600 dark:text-gray-400 mb-2">INVOICED TO:</h3>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{userProfile?.name}</p>
                        <p className="text-muted-foreground">{userProfile?.email}</p>
                    </div>
                    <div className="text-left sm:text-right">
                         <div className="grid grid-cols-2 sm:grid-cols-1">
                            <span className="font-semibold text-gray-600 dark:text-gray-400">Invoice Date:</span>
                            <span className="text-gray-800 dark:text-gray-200">{format(invoiceDate, "PPP")}</span>
                        </div>
                         <div className="grid grid-cols-2 sm:grid-cols-1">
                            <span className="font-semibold text-gray-600 dark:text-gray-400">Due Date:</span>
                            <span className="text-gray-800 dark:text-gray-200">{format(dueDate, "PPP")}</span>
                        </div>
                    </div>
                </div>

                {/* Line Items Table */}
                 <div className="w-full overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-sm">
                                <th className="p-3">Description</th>
                                <th className="p-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <td className="p-3">
                                    {order.planName} - {order.pricingOptionLabel}
                                </td>
                                <td className="p-3 text-right">PKR {subtotal.toFixed(2)}</td>
                            </tr>
                           {discount > 0 && (
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <td className="p-3">
                                        Discount Applied ({order.discountCode || 'Offer'})
                                    </td>
                                    <td className="p-3 text-right text-green-600">- PKR {discount.toFixed(2)}</td>
                                </tr>
                           )}
                        </tbody>
                    </table>
                </div>

                {/* Totals Section */}
                <div className="flex justify-end mt-8">
                    <div className="w-full max-w-xs space-y-3">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">PKR {subtotal.toFixed(2)}</span>
                        </div>
                         {discount > 0 && (
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Discount:</span>
                                <span className="font-medium text-green-600">- PKR {discount.toFixed(2)}</span>
                            </div>
                         )}
                        <div className="flex justify-between text-xl font-bold border-t pt-3">
                            <span className="text-gray-800 dark:text-white">Total:</span>
                            <span className="text-gray-800 dark:text-white">PKR {total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-16 pt-6 border-t text-center text-xs text-gray-500">
                    <p>Thank you for your business!</p>
                    <p>{settings.siteName} - {settings.contactEmail}</p>
                </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default InvoicePage;
