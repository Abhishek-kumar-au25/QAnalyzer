// src/services/api-history-service.ts
import type { ApiCallRecord } from '@/models/api-call-record';

/**
 * Saves an API call record to the server.
 * @param record - The API call record data, excluding MongoDB _id and server-generated timestamp.
 */
export async function saveApiCallToServer(
  record: Omit<ApiCallRecord, '_id' | 'timestamp'>
): Promise<{ success: boolean; message: string; id?: string }> {
  try {
    const response = await fetch('/api/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Failed to save API call to history server-side:', responseData);
      return { success: false, message: responseData.message || 'Server error saving history.' };
    }
    
    return { success: true, message: responseData.message, id: responseData.id };
  } catch (error: any) {
    console.error('Error sending API call history to server:', error);
    return { success: false, message: error.message || 'Network error or client-side issue saving history.' };
  }
}
