
'use client';

import type { ApiRequest, ApiResponse } from '@/services/api-testing';
import { sendApiRequest } from '@/services/api-testing';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormLabel as FormContextLabel, FormMessage } from '@/components/ui/form'; // Renamed FormLabel to FormContextLabel
import { PlusCircle, MinusCircle, Send, Loader2, Timer, KeyRound, ListTree, FileText, Network, Lock, AlertCircle, BookOpen, Download, Save, Trash2, History, Settings2, TestTubeDiagonal, FileCode2, Check, X, Bot, Activity, Settings, LinkIcon as LinkIconLucide } from 'lucide-react'; // Added LinkIconLucide
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Buffer } from 'buffer';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import SwaggerUIComponent from './swagger-ui-component';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiCallRecord } from '@/models/api-call-record';
import { db } from '@/lib/firebase/firebase.config';
import { collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

const kvPairSchema = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean().default(true),
}).refine(data => (data.key === '' && data.value === '') || data.key !== '', {
  message: "Key is required if value is provided.",
  path: ['key'],
});

const apiTesterSchema = z.object({
  method: z.string().min(1, 'Method is required'),
  url: z.string().url('Invalid URL format. Please include http:// or https://').min(1, 'URL is required'),
  params: z.array(kvPairSchema).optional(),
  headers: z.array(kvPairSchema).optional(),
  authType: z.string().optional().default('none'),
  authToken: z.string().optional(),
  apiKeyKey: z.string().optional(),
  apiKeyValue: z.string().optional(),
  apiKeyLocation: z.string().optional().default('header'),
  basicAuthUsername: z.string().optional(),
  basicAuthPassword: z.string().optional(),
  bodyType: z.enum(['json', 'xml', 'text', 'none', 'form-data', 'x-www-form-urlencoded']).default('json'),
  body: z.string().optional(),
  formData: z.array(z.object({ key: z.string(), value: z.string(), type: z.enum(['text', 'file']).default('text') })).optional(),
  preRequestScript: z.string().optional(),
  postRequestScript: z.string().optional(),
  requestTimeout: z.number().int().min(0).optional().default(0),
  enableSslVerification: z.boolean().default(true),
  followRedirects: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.bodyType === 'json' && data.body && data.body.trim() !== '') {
    try {
      JSON.parse(data.body);
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'If body type is JSON, content must be valid JSON or empty.',
        path: ['body'],
      });
    }
  }
});

export type ApiTesterFormValues = z.infer<typeof apiTesterSchema>;

interface SavedRequest {
    id: string;
    userId: string;
    timestamp: Timestamp;
    requestSnapshot: ApiTesterFormValues;
    responseSnapshot: ApiResponse | null;
    errorSnapshot: any | null;
    testResultsSnapshot?: TestResultItem[];
}

interface TestResultItem {
    name: string;
    status: 'pass' | 'fail';
    message?: string;
    logs?: string[];
}

const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
const authTypes = [
    { value: 'none', label: 'No Auth' },
    { value: 'bearer', label: 'Bearer Token' },
    { value: 'apiKey', label: 'API Key' },
    { value: 'basic', label: 'Basic Auth' },
];
const apiKeyLocations = [
    { value: 'header', label: 'Header' },
    { value: 'query', label: 'Query Params' },
];
const bodyTypes = [
    { value: 'none', label: 'None' },
    { value: 'json', label: 'JSON (application/json)' },
    { value: 'xml', label: 'XML (application/xml)' },
    { value: 'text', label: 'Text (text/plain)' },
    { value: 'form-data', label: 'Form Data (multipart/form-data)' },
    { value: 'x-www-form-urlencoded', label: 'URL Encoded (application/x-www-form-urlencoded)' },
];


interface KeyValueInputProps {
    fields: any[];
    append: (obj: { key: string; value: string; enabled: boolean }) => void;
    remove: (index: number) => void;
    control: any;
    namePrefix: `params.${number}` | `headers.${number}`;
    keyPlaceholder: string;
    valuePlaceholder: string;
    form: any;
}

function KeyValueInputs({ fields, append, remove, control, namePrefix, keyPlaceholder, valuePlaceholder, form }: KeyValueInputProps) {
    return (
        <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
             <FormField
                control={control}
                name={`${namePrefix}.${index}.enabled`}
                render={({ field: enabledField }) => (
                    <FormItem className="flex items-center h-10">
                         <FormControl>
                             <Checkbox
                                checked={enabledField.value}
                                onCheckedChange={enabledField.onChange}
                                className="mr-2"
                                aria-label={`${namePrefix.split('.')[0]} ${index + 1} enabled`}
                             />
                         </FormControl>
                    </FormItem>
                )}
             />
            <FormField
              control={control}
              name={`${namePrefix}.${index}.key`}
              render={({ field: keyField }) => (
                 <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder={keyPlaceholder} {...keyField} disabled={!form.getValues(`${namePrefix}.${index}.enabled`)} />
                  </FormControl>
                  <FormMessage />
                 </FormItem>
              )}
            />
             <FormField
              control={control}
              name={`${namePrefix}.${index}.value`}
              render={({ field: valueField }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder={valuePlaceholder} {...valueField} disabled={!form.getValues(`${namePrefix}.${index}.enabled`)} />
                  </FormControl>
                   <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              disabled={fields.length <= 1 && index === 0 && !form.getValues(`${namePrefix}.${index}.key`) && !form.getValues(`${namePrefix}.${index}.value`)}
              className="text-muted-foreground hover:text-destructive"
              aria-label={`Remove ${namePrefix.split('.')[0]}`}
            >
              <MinusCircle className="h-4 w-4" />
            </Button>
          </div>
        ))}
         <FormMessage>{form.formState.errors[namePrefix.split('.')[0] as keyof typeof form.formState.errors]?.message as string}</FormMessage>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ key: '', value: '', enabled: true })}
          className="mt-2"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add {namePrefix.split('.')[0] === 'params' ? 'Param' : 'Header'}
        </Button>
      </div>
    );
}

export default function ApiTesterClient() {
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [errorResponse, setErrorResponse] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true); // Set to true initially
  const [swaggerSpecUrlInput, setSwaggerSpecUrlInput] = useState<string>('');
  const [loadedSwaggerSpec, setLoadedSwaggerSpec] = useState<string | object | null>(null);
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([]);
  const [testResultsState, setTestResultsState] = useState<TestResultItem[]>([]);
  const [scriptLogs, setScriptLogs] = useState<string[]>([]);

  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<ApiTesterFormValues>({
    resolver: zodResolver(apiTesterSchema),
    defaultValues: {
      method: 'GET',
      url: '',
      params: [{ key: '', value: '', enabled: true }],
      headers: [{ key: '', value: '', enabled: true }],
      authType: 'none',
      authToken: '',
      apiKeyKey: '',
      apiKeyValue: '',
      apiKeyLocation: 'header',
      basicAuthUsername: '',
      basicAuthPassword: '',
      bodyType: 'json',
      body: '',
      formData: [{ key: '', value: '', type: 'text' }],
      preRequestScript: `// Example: pm.environment.set("timestamp", Date.now());\n// console.log("Pre-request script running...");`,
      postRequestScript: `// Example: pm.test("Status code is 200", function () { \n//   pm.response.to.have.status(200);\n// });\n// console.log("Response Time:", pm.response.responseTime + "ms");`,
      requestTimeout: 0,
      enableSslVerification: true,
      followRedirects: true,
    },
  });

  const { fields: paramFields, append: appendParam, remove: removeParam } = useFieldArray({
    control: form.control,
    name: 'params',
  });

  const { fields: headerFields, append: appendHeader, remove: removeHeader } = useFieldArray({
    control: form.control,
    name: 'headers',
  });

  const { fields: formDataFields, append: appendFormData, remove: removeFormData } = useFieldArray({
    control: form.control,
    name: 'formData',
  });


  const [activeRequestTab, setActiveRequestTab] = useState<'params' | 'auth' | 'headers' | 'body' | 'scripts' | 'settings'>('params');
  const [responseActiveTab, setResponseActiveTab] = useState<'body' | 'headers' | 'tests' | 'logs'>('body');

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && user) {
      const fetchSavedRequests = async () => {
        setIsHistoryLoading(true);
        try {
          const q = query(
            collection(db, 'users', user.uid, 'api_tester_saved_requests'),
            orderBy('timestamp', 'desc'),
            limit(50)
          );
          const querySnapshot = await getDocs(q);
          const fetchedRequests: SavedRequest[] = [];
          querySnapshot.forEach((docSnap) => {
            fetchedRequests.push({ id: docSnap.id, ...docSnap.data() } as SavedRequest);
          });
          setSavedRequests(fetchedRequests);
        } catch (error) {
          console.error("Error fetching saved API requests:", error);
          toast({ title: "Error Fetching History", description: "Could not load saved API requests.", variant: "destructive" });
        } finally {
          setIsHistoryLoading(false);
        }
      };
      fetchSavedRequests();
    } else if (!user) { // Clear history if user logs out
      setSavedRequests([]);
      setIsHistoryLoading(false);
    }
  }, [isClient, user, toast]);


  const watchAuthType = form.watch('authType');
  const watchMethod = form.watch('method');
  const watchBodyType = form.watch('bodyType');

  const addScriptLog = (message: string) => {
    setScriptLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 99)]);
  }

  const createPmObject = (requestData: ApiTesterFormValues, currentResponse?: ApiResponse | null) => {
    const environment: Record<string, any> = JSON.parse(localStorage.getItem(`pmEnvironment_${user?.uid || 'shared'}`) || '{}');
    
    const pm = {
        environment: {
            get: (key: string) => environment[key],
            set: (key: string, value: any) => {
                environment[key] = value;
                localStorage.setItem(`pmEnvironment_${user?.uid || 'shared'}`, JSON.stringify(environment));
                addScriptLog(`ENV_SET: ${key} = ${JSON.stringify(value)}`);
            },
            unset: (key: string) => {
                delete environment[key];
                localStorage.setItem(`pmEnvironment_${user?.uid || 'shared'}`, JSON.stringify(environment));
                addScriptLog(`ENV_UNSET: ${key}`);
            },
            clear: () => {
                localStorage.removeItem(`pmEnvironment_${user?.uid || 'shared'}`);
                addScriptLog(`ENV_CLEAR: Environment cleared`);
            },
            all: () => ({...environment}),
        },
        request: { 
            url: requestData.url,
            method: requestData.method,
            headers: requestData.headers?.reduce((acc, h) => { if(h.enabled && h.key) acc[h.key] = h.value; return acc; }, {} as Record<string, string>),
        },
        response: currentResponse ? {
            code: currentResponse.statusCode,
            status: httpStatusText(currentResponse.statusCode),
            headers: {...currentResponse.headers},
            json: () => {
                const contentType = currentResponse.headers['content-type']?.toLowerCase() || currentResponse.headers['Content-Type']?.toLowerCase();
                const body = currentResponse.body;

                if (!contentType || !contentType.includes('application/json')) {
                    addScriptLog(`ERROR: pm.response.json() - Content-Type is not 'application/json'. Actual: '${contentType}'`);
                    throw new Error(`Cannot parse response as JSON: Content-Type is not 'application/json'. Actual: '${contentType}'`);
                }

                if (typeof body === 'object' && body !== null) {
                    try {
                        return JSON.parse(JSON.stringify(body)); // Deep clone
                    } catch (e: any) {
                        addScriptLog(`ERROR: pm.response.json() - Failed to deep clone pre-parsed object. Error: ${e.message}`);
                        throw new Error(`Failed to process pre-parsed JSON object: ${e.message}`);
                    }
                }

                if (typeof body === 'string') {
                    if (body.trim() === '') {
                        addScriptLog('WARN: pm.response.json() - Response body is an empty string with Content-Type application/json. Returning null.');
                        return null; 
                    }
                    try {
                        return JSON.parse(body);
                    } catch (e: any) {
                        const bodyStart = body.substring(0, 70); // Show more context
                        addScriptLog(`ERROR: pm.response.json() - Failed to parse string body as JSON. Body starts with: "${bodyStart}...". Error: ${e.message}`);
                        throw new Error(`Failed to parse response body as JSON: ${e.message}. Body starts with: "${bodyStart}..."`);
                    }
                }

                addScriptLog(`ERROR: pm.response.json() - Response body is not a string or object (type: ${typeof body}), cannot parse as JSON.`);
                throw new Error(`Response body is not a string or object (type: ${typeof body}), cannot parse as JSON.`);
            },
            text: () => {
                if (typeof currentResponse.body === 'string') return currentResponse.body;
                if (typeof currentResponse.body === 'object' && currentResponse.body !== null) return JSON.stringify(currentResponse.body);
                return String(currentResponse.body); 
            },
            responseTime: currentResponse.responseTimeMs,
            to: { 
                have: {
                    status: (expectedStatus: number) => {
                        if (currentResponse.statusCode !== expectedStatus) {
                            throw new Error(`Expected status code ${expectedStatus} but got ${currentResponse.statusCode}`);
                        }
                    },
                }
            }
        } : null,
        test: (testName: string, callback: () => void) => {
            let currentTestLogs: string[] = [];
            const originalConsoleLog = pm.console.log;
            pm.console.log = (...args: any[]) => { 
                const logMsg = `TEST_LOG (${testName}): ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')}`;
                currentTestLogs.push(logMsg); 
                addScriptLog(logMsg); 
            };

            try {
                callback();
                setTestResultsState(prev => [...prev, { name: testName, status: 'pass', logs: currentTestLogs }]);
                addScriptLog(`TEST_PASS: ${testName}`);
            } catch (e: any) {
                setTestResultsState(prev => [...prev, { name: testName, status: 'fail', message: e.message, logs: currentTestLogs }]);
                addScriptLog(`TEST_FAIL: ${testName} - ${e.message}`);
            } finally {
                 pm.console.log = originalConsoleLog; 
            }
        },
        console: {
          log: (...args: any[]) => addScriptLog(`CONSOLE_LOG: ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')}`),
          error: (...args: any[]) => addScriptLog(`CONSOLE_ERROR: ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')}`),
        }
    };
    return pm;
  };

  const executeScript = (scriptCode: string, pm: any, scriptType: 'Pre-request' | 'Post-request') => {
    if (!scriptCode.trim()) {
        addScriptLog(`${scriptType} script is empty, skipping.`);
        return;
    }
    addScriptLog(`Executing ${scriptType} script...`);
    try {
        const F = new Function('pm', scriptCode);
        F(pm);
        addScriptLog(`${scriptType} script executed successfully.`);
    } catch (e: any) {
        addScriptLog(`ERROR in ${scriptType} script: ${e.message}`);
        console.error(`${scriptType} script error:`, e);
    }
  };


  const onSubmit = async (data: ApiTesterFormValues) => {
    setIsLoading(true);
    setResponse(null);
    setErrorResponse(null);
    setTestResultsState([]); 
    setScriptLogs([]); 

    const pmForPreRequest = createPmObject(data);
    if (data.preRequestScript) {
        executeScript(data.preRequestScript, pmForPreRequest, 'Pre-request');
    }
    
    let url: URL;
    try {
        url = new URL(data.url);
    } catch (e) {
        toast({ title: "Invalid URL", description: "Please enter a valid URL including http:// or https://.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    data.params?.forEach(param => {
        if (param.enabled && param.key) {
            url.searchParams.append(param.key, param.value);
        }
    });

     if (data.authType === 'apiKey' && data.apiKeyLocation === 'query' && data.apiKeyKey && data.apiKeyValue) {
       url.searchParams.append(data.apiKeyKey, data.apiKeyValue);
     }

    const finalHeaders: Record<string, string> = data.headers?.reduce((acc, header) => {
        if (header.enabled && header.key) {
          acc[header.key] = header.value;
        }
        return acc;
      }, {} as Record<string, string>) || {};

    if (data.authType === 'bearer' && data.authToken) {
        finalHeaders['Authorization'] = `Bearer ${data.authToken}`;
    } else if (data.authType === 'apiKey' && data.apiKeyLocation === 'header' && data.apiKeyKey && data.apiKeyValue) {
       finalHeaders[data.apiKeyKey] = data.apiKeyValue;
    } else if (data.authType === 'basic' && data.basicAuthUsername && data.basicAuthPassword) {
       const basicToken = Buffer.from(`${data.basicAuthUsername}:${data.basicAuthPassword}`).toString('base64');
       finalHeaders['Authorization'] = `Basic ${basicToken}`;
    }

    let requestBody: any;
    let contentTypeHeaderSetByUser = Object.keys(finalHeaders).some(key => key.toLowerCase() === 'content-type');

    if ((data.method === 'POST' || data.method === 'PUT' || data.method === 'PATCH')) {
        if (data.bodyType === 'json') {
            if (!contentTypeHeaderSetByUser) finalHeaders['Content-Type'] = 'application/json';
            try {
                requestBody = (data.body && data.body.trim() !== '') ? JSON.parse(data.body) : undefined; 
            } catch (e) {
                toast({ title: "Invalid JSON Body", description: "The request body is not valid JSON.", variant: "destructive" });
                setIsLoading(false); return;
            }
        } else if (data.bodyType === 'xml') {
            if (!contentTypeHeaderSetByUser) finalHeaders['Content-Type'] = 'application/xml';
            requestBody = data.body;
        } else if (data.bodyType === 'text') {
            if (!contentTypeHeaderSetByUser) finalHeaders['Content-Type'] = 'text/plain';
            requestBody = data.body;
        } else if (data.bodyType === 'form-data') {
            const formDataInstance = new FormData();
            data.formData?.forEach(item => {
                if (item.key) {
                    formDataInstance.append(item.key, item.value);
                }
            });
            requestBody = formDataInstance;
            if (!contentTypeHeaderSetByUser) delete finalHeaders['Content-Type'];
        } else if (data.bodyType === 'x-www-form-urlencoded') {
            if (!contentTypeHeaderSetByUser) finalHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
            const urlSearchParams = new URLSearchParams();
            data.formData?.forEach(item => {
                 if (item.key) {
                    urlSearchParams.append(item.key, item.value);
                }
            });
            requestBody = urlSearchParams.toString();
        }
    }
    
    const requestDataForService: ApiRequest = {
      method: data.method,
      url: url.toString(),
      headers: finalHeaders,
      body: requestBody,
      timeout: data.requestTimeout && data.requestTimeout > 0 ? data.requestTimeout : undefined,
    };

    let apiResponseData: ApiResponse | null = null;
    let rawErrorData: any | null = null;

    try {
      apiResponseData = await sendApiRequest(requestDataForService);
      setResponse(apiResponseData);
      setErrorResponse(null);
      toast({
        title: "Request Successful",
        description: `Status: ${apiResponseData.statusCode}, Time: ${apiResponseData.responseTimeMs}ms`,
      });
    } catch (error: any) {
      const errorBody = error.response?.data || { message: error.message || "An unexpected error occurred." };
      const errorStatus = error.response?.status || 500;
      const errorHeaders = error.response?.headers || {};
      const errorTime = error.responseTimeMs || 0;

      apiResponseData = {
        statusCode: errorStatus,
        headers: errorHeaders,
        body: errorBody,
        responseTimeMs: errorTime,
      };
      setResponse(apiResponseData);
      rawErrorData = {
          name: error.name,
          message: error.message,
          stack: error.stack,
      };
      setErrorResponse(rawErrorData);

      toast({
        title: "API Request Failed",
        description: `Status: ${errorStatus}. ${typeof errorBody.message === 'string' ? errorBody.message : "Check response body for details."} (Time: ${errorTime || 'N/A'}ms)`,
        variant: "destructive",
      });
    } finally {
      if (apiResponseData && data.postRequestScript) {
        const pmForPostRequest = createPmObject(data, apiResponseData);
        executeScript(data.postRequestScript, pmForPostRequest, 'Post-request');
      }
      if (testResultsState.length > 0) {
          setResponseActiveTab('tests');
      }

      setIsLoading(false);
      if (apiResponseData && user) { 
        const recordToSave: Omit<ApiCallRecord, '_id'> = {
          userId: user.uid,
          timestamp: serverTimestamp(), 
          request: {
            method: requestDataForService.method,
            url: requestDataForService.url,
            headers: requestDataForService.headers,
            body: requestDataForService.body instanceof FormData ? "FormData (not logged)" : requestDataForService.body,
          },
          response: {
            statusCode: apiResponseData.statusCode,
            headers: apiResponseData.headers,
            body: apiResponseData.body,
            responseTimeMs: apiResponseData.responseTimeMs,
          },
          rawError: rawErrorData,
          testResults: testResultsState,
          scriptLogs: scriptLogs,
        };
        
        try {
          await addDoc(collection(db, 'users', user.uid, 'api_calls_history'), recordToSave);
        } catch (dbError) {
            console.error("DB Save Error for API call history:", dbError);
            toast({ title: "History Save Error", description: "Could not save API call to Firestore history.", variant: "destructive" });
        }
      }
    }
  };

  const handleSaveRequest = async () => {
    if (!user) {
      toast({ title: "Not Authenticated", description: "You must be logged in to save requests.", variant: "destructive" });
      return;
    }
    const currentFormValues = form.getValues();
    const newSavedRequestData = {
      userId: user.uid,
      timestamp: serverTimestamp(),
      requestSnapshot: { ...currentFormValues },
      responseSnapshot: response ? { ...response } : null,
      errorSnapshot: errorResponse ? { ...errorResponse } : null,
      testResultsSnapshot: [...testResultsState]
    };

    try {
      const docRef = await addDoc(collection(db, 'users', user.uid, 'api_tester_saved_requests'), newSavedRequestData);
      setSavedRequests(prev => [{ id: docRef.id, ...newSavedRequestData, timestamp: Timestamp.now() }, ...prev.slice(0, 49)]);
      toast({ title: "Request Saved", description: "Current request configuration saved." });
    } catch (error) {
      console.error("Error saving request to Firestore:", error);
      toast({ title: "Save Failed", description: "Could not save request.", variant: "destructive" });
    }
  };


  const loadSavedRequest = (savedReq: SavedRequest) => {
    form.reset(savedReq.requestSnapshot);
    setResponse(savedReq.responseSnapshot);
    setErrorResponse(savedReq.errorSnapshot);
    setTestResultsState(savedReq.testResultsSnapshot || []);
    setScriptLogs([]);
    toast({ title: "Request Loaded", description: "Loaded request from history." });
  };

  const deleteSavedRequest = async (id: string) => {
     if (!user) {
      toast({ title: "Not Authenticated", description: "You must be logged in to delete requests.", variant: "destructive" });
      return;
    }
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'api_tester_saved_requests', id));
      setSavedRequests(prev => prev.filter(req => req.id !== id));
      toast({ title: "Request Deleted", description: "Removed request from history." });
    } catch (error) {
        console.error("Error deleting request from Firestore:", error);
        toast({ title: "Delete Failed", description: "Could not delete request.", variant: "destructive" });
    }
  };

  const isValidUrl = (string: string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
  };

  const handleLoadSwaggerSpec = async () => {
     if (!swaggerSpecUrlInput.trim()) {
         toast({ title: "URL/Spec Required", description: "Please enter a URL or paste raw JSON/YAML for the Swagger/OpenAPI specification.", variant: "destructive" });
         setLoadedSwaggerSpec(null);
         return;
     }
     const inputString = swaggerSpecUrlInput.trim();

     if (isValidUrl(inputString)) {
         setLoadedSwaggerSpec(inputString);
         toast({ title: "Swagger Spec URL Set", description: `Attempting to load spec from URL: ${inputString}` });
     } else {
        // For pasted content
        try {
            const parsedSpec = JSON.parse(inputString); // Attempt JSON parse first
            if (typeof parsedSpec === 'object' && parsedSpec !== null && Object.keys(parsedSpec).length > 0) {
                setLoadedSwaggerSpec(parsedSpec);
                toast({ title: "Raw JSON Spec Parsed", description: "Attempting to display raw JSON spec." });
            } else {
                throw new Error("Parsed JSON is empty or not an object.");
            }
        } catch (jsonError) {
            // If JSON parse fails, check if it looks like XML/HTML as a common mistake
            const trimmedInput = inputString.trim();
            if (trimmedInput.startsWith('<')) { // Generic check for XML/HTML
                toast({ variant: "destructive", title: "Invalid Input for Raw Spec", description: "Raw input appears to be XML/HTML. Please provide a URL if the spec is XML/HTML, or paste raw JSON/YAML content." });
            } else {
                // Not a valid URL, not valid JSON, and doesn't look like common XML/HTML mistake
                toast({ variant: "destructive", title: "Invalid Format for Paste", description: "Could not parse as JSON. Please provide a valid URL or paste raw JSON/YAML content for the specification." });
            }
            setLoadedSwaggerSpec(null);
        }
     }
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="ml-2 text-muted-foreground">Loading API Tester...</p>
      </div>
    );
  }

  const renderActiveTabContent = () => {
    switch (activeRequestTab) {
      case 'params':
        return <KeyValueInputs fields={paramFields} append={appendParam} remove={removeParam} control={form.control} namePrefix="params" keyPlaceholder="Param Key" valuePlaceholder="Param Value" form={form} />;
      case 'auth':
        return renderAuthTab();
      case 'headers':
        return <KeyValueInputs fields={headerFields} append={appendHeader} remove={removeHeader} control={form.control} namePrefix="headers" keyPlaceholder="Header Key" valuePlaceholder="Header Value" form={form} />;
      case 'body':
        return renderBodyTab();
      case 'scripts':
        return renderScriptsTab();
      case 'settings':
        return renderSettingsTab();
      default:
        return null;
    }
  };

  const renderAuthTab = () => (
    <div className="space-y-4 p-1">
        <FormField
            control={form.control}
            name="authType"
            render={({ field }) => (
                <FormItem>
                <FormContextLabel>Authorization Type</FormContextLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Auth Type" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {authTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                         {type.label === 'No Auth' && <Lock size={16} className="inline-block mr-2 text-muted-foreground opacity-50" />}
                         {type.label === 'Bearer Token' && <KeyRound size={16} className="inline-block mr-2 text-accent" />}
                         {type.label === 'API Key' && <KeyRound size={16} className="inline-block mr-2 text-accent" />}
                         {type.label === 'Basic Auth' && <Lock size={16} className="inline-block mr-2 text-accent" />}
                         {type.label}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
        />

        {watchAuthType === 'bearer' && (
             <FormField
                control={form.control}
                name="authToken"
                render={({ field }) => (
                <FormItem>
                    <FormContextLabel>Bearer Token</FormContextLabel>
                    <FormControl>
                    <Input placeholder="Enter your Bearer Token" {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        )}

        {watchAuthType === 'apiKey' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="apiKeyKey"
                    render={({ field }) => (
                    <FormItem>
                        <FormContextLabel>API Key Name</FormContextLabel>
                        <FormControl>
                        <Input placeholder="e.g., X-API-KEY or api_key" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="apiKeyValue"
                    render={({ field }) => (
                    <FormItem>
                        <FormContextLabel>API Key Value</FormContextLabel>
                        <FormControl>
                        <Input placeholder="Enter your API Key Value" {...field} type="password" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="apiKeyLocation"
                    render={({ field }) => (
                        <FormItem className="md:col-span-2">
                        <FormContextLabel>Add to</FormContextLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Location" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {apiKeyLocations.map((loc) => (
                                <SelectItem key={loc.value} value={loc.value}>
                                {loc.label}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            </div>
        )}

         {watchAuthType === 'basic' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="basicAuthUsername"
                    render={({ field }) => (
                    <FormItem>
                        <FormContextLabel>Username</FormContextLabel>
                        <FormControl>
                        <Input placeholder="Enter Username" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="basicAuthPassword"
                    render={({ field }) => (
                    <FormItem>
                        <FormContextLabel>Password</FormContextLabel>
                        <FormControl>
                        <Input placeholder="Enter Password" {...field} type="password" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
         )}

        {watchAuthType === 'none' && (
             <p className="text-sm text-muted-foreground">No authentication will be added to the request.</p>
        )}
    </div>
  );

 const renderBodyTab = () => {
    const isBodyDisabled = watchMethod === 'GET' || watchMethod === 'HEAD' || watchMethod === 'OPTIONS' || watchBodyType === 'none';
    const isRawBodyType = ['json', 'xml', 'text'].includes(watchBodyType);
    const isFormDataBodyType = ['form-data', 'x-www-form-urlencoded'].includes(watchBodyType);

    return (
    <div className="space-y-4">
        <FormField
            control={form.control}
            name="bodyType"
            render={({ field }) => (
                <FormItem>
                    <FormContextLabel>Body Type</FormContextLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={watchMethod === 'GET' || watchMethod === 'HEAD' || watchMethod === 'OPTIONS'}
                    >
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Body Type" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {bodyTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
        />
        {isRawBodyType && (
            <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                    <FormItem>
                    <FormContextLabel>Request Body Content</FormContextLabel>
                    <FormControl>
                        <Textarea
                        placeholder={
                            isBodyDisabled ? 'Body not applicable for this method or type.' :
                            watchBodyType === 'json' ? '{ "key": "value" }' :
                            watchBodyType === 'xml' ? '<root><key>value</key></root>' :
                            'Enter plain text body...'
                        }
                        className="min-h-[200px] font-mono text-sm resize-y bg-muted/20"
                        {...field}
                        disabled={isBodyDisabled}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}
        {isFormDataBodyType && !isBodyDisabled && (
            <div className="space-y-3">
                <FormContextLabel>Form Data</FormContextLabel>
                {formDataFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <FormField control={form.control} name={`formData.${index}.key`}
                            render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="Key" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`formData.${index}.value`}
                            render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="Value" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeFormData(index)} className="text-muted-foreground hover:text-destructive" aria-label="Remove Form Data Item">
                            <MinusCircle className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendFormData({ key: '', value: '', type: 'text' })} className="mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Form Item
                </Button>
            </div>
        )}
    </div>
    );
};

 const renderScriptsTab = () => (
    <div className="space-y-6">
        <div>
            <FormField
                control={form.control}
                name="preRequestScript"
                render={({ field }) => (
                    <FormItem>
                        <FormContextLabel className="text-base font-semibold">Pre-request Script</FormContextLabel>
                         <p className="text-sm text-muted-foreground">JavaScript code to run before the request is sent. Use <code className="font-mono text-xs bg-muted px-1 rounded">pm.environment.set/get</code> for variables.</p>
                        <FormControl>
                            <Textarea placeholder="// console.log('Pre-request script running...');" className="min-h-[150px] font-mono text-sm bg-muted/20" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div>
            <FormField
                control={form.control}
                name="postRequestScript"
                render={({ field }) => (
                    <FormItem>
                        <FormContextLabel className="text-base font-semibold">Post-request Script (Tests)</FormContextLabel>
                        <p className="text-sm text-muted-foreground">JavaScript code to run after the response is received. Use <code className="font-mono text-xs bg-muted px-1 rounded">pm.test()</code> for assertions.</p>
                        <FormControl>
                            <Textarea placeholder="// pm.test('Status code is 200', function () { pm.response.to.have.status(200); });" className="min-h-[150px] font-mono text-sm bg-muted/20" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    </div>
);

const renderSettingsTab = () => (
    <div className="space-y-6 p-1">
        <FormField
            control={form.control}
            name="requestTimeout"
            render={({ field }) => (
                <FormItem>
                    <FormContextLabel>Request Timeout (ms)</FormContextLabel>
                     <p className="text-sm text-muted-foreground">Set timeout for the request in milliseconds. 0 for no timeout (or default behavior of the HTTP client).</p>
                    <FormControl>
                        <Input type="number" placeholder="0" {...field} 
                         onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="enableSslVerification"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/20">
                    <div className="space-y-0.5">
                        <FormContextLabel>Enable SSL Certificate Verification</FormContextLabel>
                        <p className="text-sm text-muted-foreground">
                            Turn off to bypass SSL certificate validation (not recommended for production).
                        </p>
                    </div>
                    <FormControl>
                         <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="followRedirects"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/20">
                    <div className="space-y-0.5">
                        <FormContextLabel>Follow Redirects</FormContextLabel>
                        <p className="text-sm text-muted-foreground">
                            Automatically follow HTTP redirects (e.g., 301, 302).
                        </p>
                    </div>
                    <FormControl>
                         <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                </FormItem>
            )}
        />
        <Alert variant="default" className="mt-4">
            <Activity className="h-4 w-4" />
            <AlertTitle>Note on Settings</AlertTitle>
            <AlertDescription className="text-xs">
                These settings (Timeout, SSL Verification, Follow Redirects) are for illustrative purposes.
                The actual behavior depends on the underlying HTTP client used by the <code className="font-mono text-xs bg-muted px-1 rounded">sendApiRequest</code> service, which is currently a mock.
                In a real implementation, these settings would configure the behavior of <code className="font-mono text-xs bg-muted px-1 rounded">fetch</code> or <code className="font-mono text-xs bg-muted px-1 rounded">axios</code>.
            </AlertDescription>
        </Alert>
    </div>
);

const renderTestResultsTab = () => (
    <div className="space-y-4">
        {testResultsState.length === 0 ? (
            <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg min-h-[150px] flex flex-col justify-center items-center">
                <TestTubeDiagonal className="mx-auto h-10 w-10 mb-2" />
                <p>No tests run for this request, or no tests defined in the Post-request Script.</p>
            </div>
        ) : (
            <div className="space-y-2">
                {testResultsState.map((result, index) => (
                    <Card key={index} className={cn("p-3", result.status === 'pass' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30')}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {result.status === 'pass' ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />}
                                <span className={cn("font-medium text-sm", result.status === 'pass' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>{result.name}</span>
                            </div>
                            <Badge variant={result.status === 'pass' ? 'default' : 'destructive'} className={cn(result.status === 'pass' ? 'bg-green-600' : '')}>{result.status.toUpperCase()}</Badge>
                        </div>
                        {result.message && <p className="text-xs text-muted-foreground mt-1 pl-6">{result.message}</p>}
                        {result.logs && result.logs.length > 0 && (
                            <div className="mt-1 pl-6">
                                <p className="text-xs font-semibold text-muted-foreground">Logs:</p>
                                <ScrollArea className="max-h-24">
                                  <pre className="text-xs bg-muted p-1 rounded-sm overflow-auto">{result.logs.join('\n')}</pre>
                                </ScrollArea>
                            </div>
                        )}
                    </Card>
                ))}
            </div>
        )}
    </div>
);


  return (
    <div className="flex flex-col h-full space-y-6">
         <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow">
            <Card className="shadow-lg mb-6">
                <CardHeader className="pb-2">
                    <CardTitle className="text-primary">API Request Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-2 mb-4 items-end">
                        <FormField
                        control={form.control}
                        name="method"
                        render={({ field }) => (
                            <FormItem className="w-full sm:w-auto sm:min-w-[120px]">
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger className="font-semibold">
                                    <SelectValue placeholder="Method" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {httpMethods.map((method) => (
                                    <SelectItem key={method} value={method}>
                                    {method}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="url"
                        render={({ field }) => (
                            <FormItem className="flex-1">
                            <FormControl>
                                <Input placeholder="https://api.example.com/data" {...field} className="text-base"/>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                         <Button type="submit" disabled={isLoading || !form.formState.isValid || !form.getValues('url')} className="w-full sm:w-auto min-w-[100px]">
                            {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                            <Send className="mr-2 h-4 w-4" />
                            )}
                            Send
                        </Button>
                    </div>

                     <Tabs value={activeRequestTab} onValueChange={(value) => setActiveRequestTab(value as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto">
                        <TabsTrigger value="params" className="flex items-center gap-1"><ListTree size={16}/> Params ({paramFields.filter(f => f.key && f.enabled).length})</TabsTrigger>
                        <TabsTrigger value="auth" className="flex items-center gap-1"><KeyRound size={16}/> Authorization</TabsTrigger>
                        <TabsTrigger value="headers" className="flex items-center gap-1"><Network size={16}/> Headers ({headerFields.filter(f => f.key && f.enabled).length})</TabsTrigger>
                        <TabsTrigger value="body" className="flex items-center gap-1"><FileText size={16}/> Body</TabsTrigger>
                        <TabsTrigger value="scripts" className="flex items-center gap-1"><FileCode2 size={16}/> Scripts</TabsTrigger>
                        <TabsTrigger value="settings" className="flex items-center gap-1"><Settings2 size={16}/> Settings</TabsTrigger>
                        </TabsList>
                         <ScrollArea className="h-[320px] w-full mt-4 border rounded-md p-4">
                            {renderActiveTabContent()}
                         </ScrollArea>
                    </Tabs>
                </CardContent>
                 <CardFooter className="border-t pt-4">
                    <Button type="button" variant="outline" onClick={handleSaveRequest} disabled={isLoading || !user}>
                        <Save className="mr-2 h-4 w-4" /> Save Request
                    </Button>
                </CardFooter>
            </Card>

            <Card className="shadow-lg flex-grow flex flex-col mb-6">
                <CardHeader className="pb-2">
                <CardTitle className="text-primary">API Response</CardTitle>
                {response && (
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm pt-2">
                         <div className="flex items-center">
                             <span className="mr-2 font-medium">Status:</span>
                             <span className={cn("font-bold px-2 py-0.5 rounded", response.statusCode >= 200 && response.statusCode < 300 ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300')}>
                                {response.statusCode} {httpStatusText(response.statusCode)}
                             </span>
                         </div>
                         <div className="flex items-center">
                            <Timer className="h-4 w-4 mr-1 text-muted-foreground" />
                             <span className="mr-1 font-medium">Time:</span>
                             <span className="font-bold text-foreground">{response.responseTimeMs} ms</span>
                         </div>
                    </div>
                 )}
                 {!response && !isLoading && (
                      <CardDescription>The API response will appear here after sending a request.</CardDescription>
                 )}
                 {isLoading && (
                     <CardDescription>Fetching response...</CardDescription>
                 )}
                 {errorResponse && response && response.statusCode >= 400 && (
                     <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error Details</AlertTitle>
                        <AlertDescription className="text-xs">
                            <p><strong>Message:</strong> {errorResponse.message || 'Unknown error'}</p>
                            {errorResponse.name && <p><strong>Type:</strong> {errorResponse.name}</p>}
                        </AlertDescription>
                    </Alert>
                 )}
                </CardHeader>
                <CardContent className="flex-grow flex flex-col pt-2">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground">
                    <Loader2 className="h-12 w-12 animate-spin text-accent mb-4" />
                    <p>Waiting for response...</p>
                    </div>
                )}
                {!isLoading && !response && (
                    <div className="flex flex-col items-center justify-center flex-grow text-center p-4 border border-dashed rounded-lg">
                    <Network className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Send a request to see the response.</p>
                    </div>
                )}
                {response && (
                    <Tabs value={responseActiveTab} onValueChange={(value) => setResponseActiveTab(value as any)} className="w-full flex-grow flex flex-col">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="body">Body</TabsTrigger>
                            <TabsTrigger value="headers">Headers ({Object.keys(response.headers).length})</TabsTrigger>
                            <TabsTrigger value="tests">Test Results ({testResultsState.length})</TabsTrigger>
                            <TabsTrigger value="logs">Script Logs ({scriptLogs.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="body" className="mt-4 flex-grow">
                        <ScrollArea className="h-full max-h-[400px] w-full rounded-md border p-3 bg-muted/20">
                           <pre className="text-sm whitespace-pre-wrap break-all">
                            {
                                (() => {
                                    const body = response.body;
                                    const contentType = response.headers['content-type']?.toLowerCase() || response.headers['Content-Type']?.toLowerCase();

                                    if (typeof body === 'object' && body !== null) {
                                        return JSON.stringify(body, null, 2);
                                    }

                                    if (typeof body === 'string') {
                                        const trimmedBody = body.trim();
                                        // Priority: Check if it's explicitly XML/HTML based on typical starting tags
                                        if (trimmedBody.startsWith('<?xml') || trimmedBody.startsWith('<html') || (trimmedBody.startsWith('<') && trimmedBody.includes('</'))) {
                                            return body;
                                        }
                                        // If Content-Type suggests JSON AND it looks like JSON, try to parse and pretty-print.
                                        if (contentType && contentType.includes('application/json')) {
                                            if (trimmedBody.startsWith('{') || trimmedBody.startsWith('[')) {
                                                try {
                                                    return JSON.stringify(JSON.parse(body), null, 2);
                                                } catch (e: any) {
                                                    return `(JSON Parse Error: ${e.message} for Content-Type: ${contentType})\n${body}`;
                                                }
                                            } else if (trimmedBody === '') {
                                                return '(Empty response with Content-Type: application/json)';
                                            } else {
                                                // Content-Type is JSON, but body doesn't look like JSON.
                                                return `(Raw content; Content-Type was ${contentType} but body does not appear to be JSON)\n${body}`;
                                            }
                                        }
                                        // If Content-Type is not JSON, or no Content-Type, display raw string.
                                        return body;
                                    }
                                    // Fallback for other data types (e.g. number, boolean, null).
                                    return String(body);
                                })()
                            }
                           </pre>
                        </ScrollArea>
                        </TabsContent>
                        <TabsContent value="headers" className="mt-4 flex-grow">
                        <ScrollArea className="h-full max-h-[400px] w-full rounded-md border p-3 bg-muted/20">
                            {Object.entries(response.headers).map(([key, value]) => (
                            <div key={key} className="flex text-sm py-1.5 border-b border-dashed last:border-b-0">
                                <strong className="w-1/3 text-foreground truncate font-medium">{key}:</strong>
                                <span className="w-2/3 text-muted-foreground break-all">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                            </div>
                            ))}
                            {Object.keys(response.headers).length === 0 && <p className="text-sm text-muted-foreground">No headers in response.</p>}
                        </ScrollArea>
                        </TabsContent>
                        <TabsContent value="tests" className="mt-4 flex-grow">
                            <ScrollArea className="h-full max-h-[400px] w-full rounded-md border p-3 bg-muted/20">
                                {renderTestResultsTab()}
                            </ScrollArea>
                        </TabsContent>
                        <TabsContent value="logs" className="mt-4 flex-grow">
                            <ScrollArea className="h-full max-h-[400px] w-full rounded-md border p-3 bg-muted/50">
                                {scriptLogs.length === 0 ? (
                                    <div className="text-center text-muted-foreground p-6">
                                        <Bot className="mx-auto h-10 w-10 mb-2" />
                                        No script logs for this request.
                                    </div>
                                ) : (
                                    <pre className="text-xs whitespace-pre-wrap break-all">
                                        {scriptLogs.join('\n')}
                                    </pre>
                                )}
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                )}
                </CardContent>
            </Card>
           </form>
        </Form>

        <Card className="shadow-lg mb-6">
            <CardHeader>
                <CardTitle className="text-primary flex items-center"><History className="mr-2 h-5 w-5 text-accent"/>Request History</CardTitle>
                <CardDescription>View and manage your saved API requests. (Last 50 saved from Firestore)</CardDescription>
            </CardHeader>
            <CardContent>
                {isHistoryLoading ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        <Loader2 className="mr-2 h-6 w-6 animate-spin text-accent" /> Loading History...
                    </div>
                ) : savedRequests.length === 0 ? (
                    <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg">
                        <History className="mx-auto h-10 w-10 mb-2" />
                        <p>No saved requests yet. Send and save a request to see it here.</p>
                    </div>
                ) : (
                    <ScrollArea className="h-[300px] border rounded-md p-2">
                        <div className="space-y-2">
                            {savedRequests.map((savedReq) => (
                                <Card key={savedReq.id} className="bg-muted/30">
                                    <CardHeader className="p-3 pb-2">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-0.5">
                                                <CardTitle className="text-sm font-semibold flex items-center">
                                                    <span className={cn("mr-2 px-1.5 py-0.5 rounded text-xs font-mono",
                                                        savedReq.requestSnapshot.method === 'GET' && 'bg-green-600 text-white',
                                                        savedReq.requestSnapshot.method === 'POST' && 'bg-blue-600 text-white',
                                                        savedReq.requestSnapshot.method === 'PUT' && 'bg-yellow-600 text-black',
                                                        savedReq.requestSnapshot.method === 'DELETE' && 'bg-red-600 text-white',
                                                        savedReq.requestSnapshot.method === 'PATCH' && 'bg-purple-600 text-white',
                                                    )}>{savedReq.requestSnapshot.method}</span>
                                                    <span className="truncate text-foreground" title={savedReq.requestSnapshot.url}>{savedReq.requestSnapshot.url}</span>
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    Saved: {savedReq.timestamp ? format(savedReq.timestamp.toDate(), 'PPpp') : 'N/A'}
                                                </CardDescription>
                                            </div>
                                            {savedReq.responseSnapshot && (
                                                <Badge variant={savedReq.responseSnapshot.statusCode >= 400 ? "destructive" : "default"}>
                                                    {savedReq.responseSnapshot.statusCode}
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardFooter className="p-3 pt-1 flex justify-end gap-2">
                                        <Button variant="outline" size="sm" onClick={() => loadSavedRequest(savedReq)}>Load</Button>
                                        <Button variant="destructive" size="sm" onClick={() => deleteSavedRequest(savedReq.id)}>Delete</Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>

        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-primary flex items-center">
                    <BookOpen className="mr-2 h-5 w-5 text-accent"/> OpenAPI / Swagger Specification Viewer
                </CardTitle>
                <CardDescription>
                    Load and view an OpenAPI (Swagger) specification.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="space-y-1 flex-grow">
                        <Label htmlFor="swagger-url">Swagger/OpenAPI Spec URL or Raw JSON</Label>
                        <Input
                            id="swagger-url"
                            type="text"
                            placeholder="e.g., https://petstore.swagger.io/v2/swagger.json or paste raw JSON/YAML"
                            value={swaggerSpecUrlInput}
                            onChange={(e) => setSwaggerSpecUrlInput(e.target.value)}
                            className="bg-background border-input"
                        />
                         <p className="text-sm text-muted-foreground">
                            Provide a direct link to a raw JSON/YAML specification file or paste the raw JSON/YAML content.
                         </p>
                    </div>
                    <Button
                        onClick={handleLoadSwaggerSpec}
                        className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px] self-end"
                    >
                        <Download className="mr-2 h-4 w-4" /> Load Spec
                    </Button>
                </div>
                {loadedSwaggerSpec ? (
                     <SwaggerUIComponent specUrlOrObject={loadedSwaggerSpec} />
                 ) : (
                    <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg min-h-[200px] flex flex-col justify-center items-center">
                        <BookOpen className="mx-auto h-12 w-12 mb-4" />
                        <p>Enter a Swagger/OpenAPI URL (or paste raw JSON/YAML) and click "Load Spec" to view API documentation.</p>
                    </div>
                 )}
            </CardContent>
        </Card>
    </div>
  );
}

function httpStatusText(statusCode: number): string {
  const statusMap: Record<number, string> = {
    100: 'Continue', 101: 'Switching Protocols', 102: 'Processing',
    200: 'OK', 201: 'Created', 202: 'Accepted', 203: 'Non-Authoritative Info', 204: 'No Content', 205: 'Reset Content', 206: 'Partial Content',
    300: 'Multiple Choices', 301: 'Moved Permanently', 302: 'Found', 303: 'See Other', 304: 'Not Modified', 307: 'Temporary Redirect', 308: 'Permanent Redirect',
    400: 'Bad Request', 401: 'Unauthorized', 402: 'Payment Required', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 406: 'Not Acceptable', 407: 'Proxy Auth Required', 408: 'Request Timeout', 409: 'Conflict', 410: 'Gone', 411: 'Length Required', 412: 'Precondition Failed', 413: 'Payload Too Large', 414: 'URI Too Long', 415: 'Unsupported Media Type', 416: 'Range Not Satisfiable', 417: 'Expectation Failed', 422: 'Unprocessable Entity', 429: 'Too Many Requests',
    500: 'Internal Server Error', 501: 'Not Implemented', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout', 505: 'HTTP Version Not Supported'
  };
  return statusMap[statusCode] || 'Unknown Status';
}
    