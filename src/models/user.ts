// src/models/user.ts
import type { Timestamp } from 'firebase/firestore';

export interface FirestoreUser {
  uid: string;
  email: string | null; // Email can be null for phone auth initially
  displayName?: string | null;
  photoURL?: string | null;
  createdAt: Timestamp;
  signUpMethod?: 'Email' | 'Google' | 'Phone' | 'Unknown';
  phoneNumber?: string | null; // For users signed up with phone
  // Add any other custom fields you want to store for a user
  // e.g., roles, preferences, etc.
}
