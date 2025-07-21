
'use server';

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  DocumentData,
  query,
  where,
  orderBy,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Order, OrderStatus, Plan, Discount } from '@/types';
import { serializeDate } from './utils';
import { sendEmail } from './email-provider';
import { format } from 'date-fns';
import { changeUserSubscription } from './user-service';
import { fetchPlans } from './plan-service';

// This type represents the data received from the client for creating an order
export type OrderCreationData = Omit<Order, 'id' | 'createdAt' | 'status'>;

const docToOrder = (doc: DocumentData): Order => {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    planId: data.planId,
    planName: data.planName,
    pricingOptionLabel: data.pricingOptionLabel,
    originalPrice: data.originalPrice,
    finalAmount: data.finalAmount,
    discountId: data.discountId,
    discountCode: data.discountCode,
    discountAmount: data.discountAmount,
    paymentMethod: data.paymentMethod,
    paymentMethodType: data.paymentMethodType,
    createdAt: serializeDate(data.createdAt)!,
    status: data.status,
  };
};

/**
 * Creates a new order in the 'orders' collection.
 * @param orderData The data for the new order.
 * @returns The ID of the newly created order document.
 */
export async function createOrder(orderData: OrderCreationData): Promise<string> {
  const ordersCollection = collection(db, 'orders');
  
  const newOrderData = {
    ...orderData,
    status: 'pending' as const, // Default status for all new orders
    createdAt: serverTimestamp(),
  };

  const newOrderRef = await addDoc(ordersCollection, newOrderData);

  // Send order confirmation email
  if (orderData.userEmail) {
    await sendEmail({
      templateId: 'order-confirmation',
      to: orderData.userEmail,
      props: {
        userName: orderData.userName || 'Valued Customer',
        orderId: newOrderRef.id,
        planName: orderData.planName,
        duration: orderData.pricingOptionLabel,
        orderDate: format(new Date(), 'PPP'),
        orderStatus: 'Pending',
        originalPrice: orderData.originalPrice.toFixed(2),
        finalAmount: orderData.finalAmount.toFixed(2),
        paymentMethod: orderData.paymentMethod,
        discountCode: orderData.discountCode,
        discountAmount: orderData.discountAmount?.toFixed(2),
      }
    }).catch(error => console.error(`Failed to send order confirmation email for order ${newOrderRef.id}:`, error));
  }

  return newOrderRef.id;
}


/**
 * Fetches a single order by its ID, ensuring the user is authorized.
 * @param orderId The ID of the order to fetch.
 * @param userId The ID of the user requesting the order.
 * @returns The order data or null if not found or not authorized.
 */
export async function getOrderById(orderId: string, userId: string): Promise<Order | null> {
    if (!orderId || !userId) return null;
    
    const orderDocRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderDocRef);

    if (!orderDoc.exists()) {
        return null;
    }

    const order = docToOrder(orderDoc);

    // Security check: ensure the user owns this order
    if (order.userId !== userId) {
        return null;
    }
    
    return order;
}

/**
 * Fetches all orders for a specific user.
 */
export async function fetchOrdersForUser(userId: string): Promise<Order[]> {
    if (!userId) return [];
    
    const ordersCol = collection(db, 'orders');
    const q = query(ordersCol, where("userId", "==", userId), orderBy("createdAt", "desc"));

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(docToOrder);
}

// Admin function to fetch all orders
export type OrderWithUserData = Order & { userName?: string; userEmail?: string; };

export async function fetchAllOrders(): Promise<OrderWithUserData[]> {
  const ordersCol = collection(db, 'orders');
  const q = query(ordersCol, orderBy('createdAt', 'desc'));
  
  const [ordersSnapshot, usersSnapshot] = await Promise.all([
    getDocs(q),
    getDocs(collection(db, 'users'))
  ]);

  const userMap = new Map(usersSnapshot.docs.map(doc => [doc.id, { name: doc.data().name, email: doc.data().email }]));

  return ordersSnapshot.docs.map(doc => {
    const orderData = docToOrder(doc);
    const userData = userMap.get(orderData.userId);
    return {
      ...orderData,
      userName: userData?.name,
      userEmail: userData?.email,
    };
  });
}

/**
 * Processes an order by updating its status and activating/modifying the user's subscription.
 * @param orderId The ID of the order to process.
 * @param newStatus The new status to set for the order.
 */
export async function processOrder(orderId: string, newStatus: OrderStatus) {
  const orderDocRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderDocRef);

  if (!orderSnap.exists()) {
    throw new Error('Order not found.');
  }

  const order = docToOrder(orderSnap);

  // If the status is already what we want, do nothing.
  if (order.status === newStatus) {
    return;
  }

  // If the new status is 'completed', this means we are activating a subscription.
  if (newStatus === 'completed') {
    if (order.status === 'completed') {
      throw new Error('This order has already been completed and the subscription activated.');
    }

    const allPlans = await fetchPlans();
    const plan = allPlans.find(p => p.id === order.planId);
    if (!plan) throw new Error("Plan associated with this order not found.");
    
    const pricingOption = plan.pricingOptions.find(opt => opt.label === order.pricingOptionLabel);
    if (!pricingOption) throw new Error("Pricing option for this order not found.");

    let discount: Discount | undefined = undefined;
    if (order.discountId) {
        const discountDoc = await getDoc(doc(db, 'discounts', order.discountId));
        if (discountDoc.exists()) {
            const data = discountDoc.data();
            discount = { id: discountDoc.id, ...data } as Discount;
        }
    }

    // Call the subscription service to handle the user's plan change.
    await changeUserSubscription(order.userId, order.planId, {
      status: 'active',
      remarks: `Subscription activated from Order ID: ${order.id}. Payment via ${order.paymentMethod}.`,
      pricingOption,
      discount,
    });
  }

  // Update the order's status.
  await updateDoc(orderDocRef, { status: newStatus });
}
