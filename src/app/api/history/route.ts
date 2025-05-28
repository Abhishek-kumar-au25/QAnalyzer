// src/app/api/history/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/firebase.config'; // Firebase Firestore instance
import { collection as firestoreCollection, addDoc, Timestamp } from 'firebase/firestore'; // Firestore methods
import type { ApiCallRecord, ApiRequestRecord, ApiResponseRecord } from '@/models/api-call-record';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { userId, request: requestData, response: responseData, rawError } = body as Omit<ApiCallRecord, '_id' | 'timestamp'>;

    if (!requestData || !responseData) {
      return NextResponse.json({ message: 'Missing request or response data' }, { status: 400 });
    }

    const historyCollectionRef = firestoreCollection(db, 'api_calls_history');

    const newApiCallRecord: Omit<ApiCallRecord, '_id'> = {
      userId: userId || null,
      timestamp: Timestamp.fromDate(new Date()), // Use Firestore Timestamp
      request: requestData as ApiRequestRecord, 
      response: responseData as ApiResponseRecord,
      rawError: rawError || null,
    };

    const docRef = await addDoc(historyCollectionRef, newApiCallRecord);

    if (!docRef.id) {
        console.error('Firestore addDoc failed to return a document ID');
        return NextResponse.json({ message: 'Failed to save API call history, no ID returned.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'API call history saved successfully to Firestore', id: docRef.id }, { status: 201 });
  } catch (error: any) {
    console.error('Error saving API call history to Firestore:', error);
    // Check for specific Firestore errors if needed, otherwise generic server error
    return NextResponse.json({ message: 'Failed to save API call history', error: error.message }, { status: 500 });
  }
}
