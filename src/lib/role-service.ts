
'use server';

import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  DocumentData,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Role } from '@/types';

const docToRole = (doc: DocumentData): Role => {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name,
    };
};

export async function fetchRoles(): Promise<Role[]> {
  const rolesCol = collection(db, 'roles');
  const q = query(rolesCol, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToRole);
}

export async function getRoleById(id: string): Promise<Role | null> {
  const docRef = doc(db, 'roles', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docToRole(docSnap) : null;
}

export async function addRole(roleData: Omit<Role, 'id'>) {
  const rolesCol = collection(db, 'roles');
  await addDoc(rolesCol, roleData);
}

export async function updateRole(id: string, roleData: Partial<Omit<Role, 'id'>>) {
  const docRef = doc(db, 'roles', id);
  await updateDoc(docRef, roleData);
}

export async function deleteRole(id: string) {
  const docRef = doc(db, 'roles', id);
  await deleteDoc(docRef);
}

export async function countUsersWithRole(roleName: string): Promise<number> {
    if (!roleName) return 0;
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('role', '==', roleName));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
}
