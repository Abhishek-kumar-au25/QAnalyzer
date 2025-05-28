// src/models/api-call-record.ts
import type { Timestamp } from 'firebase/firestore'; // Import Firestore Timestamp

/**
 * Represents the structure of the request part of an API call record.
 */
export interface ApiRequestRecord {
  method: string;
  url:string; // The final URL after params are appended
  headers?: Record<string, string>;
  body?: any; // The processed body that was sent
  // Optionally store script and setting info for history
  preRequestScript?: string;
  postRequestScript?: string;
  requestTimeout?: number;
  enableSslVerification?: boolean;
  followRedirects?: boolean;
}

/**
 * Represents the structure of the response part of an API call record.
 */
export interface ApiResponseRecord {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  responseTimeMs: number;
}

/**
 * Represents an individual test result.
 */
export interface TestResultItemRecord {
    name: string;
    status: 'pass' | 'fail';
    message?: string;
    logs?: string[]; // Logs specific to this test
}


/**
 * Represents a full API call record to be stored.
 * For Firestore, _id is not used as Firestore auto-generates IDs.
 */
export interface ApiCallRecord {
  _id?: any; // Optional, as Firestore handles its own document IDs
  userId?: string | null; // Optional: ID of the user who made the request
  timestamp: Date | Timestamp; // Timestamp of when the call was recorded (can be JS Date or Firestore Timestamp)
  request: ApiRequestRecord;
  response: ApiResponseRecord; // Stores actual successful responses or structured error responses
  rawError?: { 
      name?: string;
      message: string;
      stack?: string;
  } | null;
  testResults?: TestResultItemRecord[]; // Store array of test results
  scriptLogs?: string[]; // Store general script execution logs
}
