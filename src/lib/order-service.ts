
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
} from 'firebase/firestore';
import { db } from './firebase';
import type { Order } from '@/types';
import { serializeDate } from './utils';

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
    status: 'pending', // Default status for all new orders
    createdAt: serverTimestamp(),
  };

  const newOrderRef = await addDoc(ordersCollection, newOrderData);
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
