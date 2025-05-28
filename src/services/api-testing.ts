/**
 * Represents the structure of an API request.
 */
export interface ApiRequest {
  /**
   * The URL for the API endpoint.
   */
  url: string;
  /**
   * The HTTP method for the request (e.g., GET, POST, PUT, DELETE).
   */
  method: string;
  /**
   * Optional headers for the request.
   */
  headers?: Record<string, string>;
  /**
   * Optional request body. Can be any type, but typically an object for JSON.
   */
  body?: any;
  /**
   * Optional timeout for the request in milliseconds.
   */
  timeout?: number;
}

/**
 * Represents the structure of an API response.
 */
export interface ApiResponse {
  /**
   * The HTTP status code of the response.
   */
  statusCode: number;
  /**
   * The response headers.
   */
  headers: Record<string, string>;
  /**
   * The response body.
   */
  body: any;
  /**
   * The time taken for the API request to complete, in milliseconds.
   */
  responseTimeMs: number;
}

/**
 * Asynchronously sends an API request and returns the response.
 * This is a mock implementation. In a real application, this would use `fetch` or a library like `axios`.
 *
 * @param request The API request to send.
 * @returns A promise that resolves to an ApiResponse object.
 */
export async function sendApiRequest(request: ApiRequest): Promise<ApiResponse> {
  const startTime = performance.now();
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500)); // Random delay between 500ms and 1500ms

  const endTime = performance.now();
  const responseTimeMs = Math.round(endTime - startTime);

  // Mock common scenarios based on URL or method for demonstration
  if (request.url.includes('error')) {
    const statusCode = request.url.includes('404') ? 404 : 500;
    const message = statusCode === 404 ? 'Resource not found' : 'Internal Server Error';
    // Simulating error response structure
    const errorResponse = {
        response: {
            status: statusCode,
            headers: {'Content-Type': 'application/json', 'X-Response-Time': `${responseTimeMs}ms`},
            data: { message: message, details: `Mock error for URL: ${request.url}` }
        }
    };
    // To make the error handling in the client work, we need to reject with an object that has a response property
    const customError: any = new Error(message);
    customError.response = {
        status: statusCode,
        headers: errorResponse.response.headers,
        data: errorResponse.response.data,
    };
    customError.responseTimeMs = responseTimeMs; // Attach response time to the error object
    return Promise.reject(customError);
  }
  
  if (request.method === 'POST' && !request.body) {
     const customError: any = new Error('Bad Request: POST request requires a body.');
     customError.response = {
        status: 400,
        headers: {'Content-Type': 'application/json', 'X-Response-Time': `${responseTimeMs}ms`},
        data: { message: 'Bad Request', details: 'POST request requires a body.' }
     };
     customError.responseTimeMs = responseTimeMs;
     return Promise.reject(customError);
  }
  
  // Default successful response
  let responseBody: any = { 
    message: `Successfully processed ${request.method} request to ${request.url}`,
    receivedHeaders: request.headers,
    // Simulate echoing back some request settings if they were part of the request
    ...(request.timeout && { configuredTimeout: request.timeout }),
  };

  if (request.body) {
    responseBody.receivedBody = request.body;
  }
  
  if (request.url.includes('example.com/data')) {
    responseBody = {
      id: 123,
      name: "Sample Data",
      items: ["item1", "item2"],
      nested: {
        key: "value"
      }
    };
  }


  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Powered-By': 'MockAPI/1.0',
      'Date': new Date().toUTCString(),
      'X-Response-Time': `${responseTimeMs}ms`,
    },
    body: responseBody,
    responseTimeMs: responseTimeMs,
  };
}