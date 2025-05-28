// src/components/feature/test-cases/test-case-manager-client.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Filter, ClipboardList, Construction, Edit2, Trash2, Save, LayoutTemplate, FilePlus2, Download, FileText as ReportIcon, Loader2, TableIcon, LinkIcon, MessageSquare, ListChecks, Package, Database, Code, X, Tool } from 'lucide-react'; // Added Tool
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, AlertDialog, AlertDialogContent as AlertDialogContentNested, AlertDialogHeader as AlertDialogHeaderNested, AlertDialogTitle as AlertDialogTitleNested, AlertDialogDescription as AlertDialogDescriptionNested, AlertDialogFooter as AlertDialogFooterNested, AlertDialogCancel, AlertDialogAction } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useHistory } from '@/contexts/HistoryContext';
import type { HistoryItemType } from '@/types/history';
import { Separator } from '@/components/ui/separator';
import { db } from '@/lib/firebase/firebase.config';
import { collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc, Timestamp, serverTimestamp, writeBatch, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';


// Define TestCase interface and schema
export interface TestCase {
  id: string; // Test Case ID
  module: string;
  testScenario: string;
  preconditions: string;
  dependency: string;
  steps: string;
  inputData: string;
  expectedResults: string;
  actualResult: string;
  defectUrlOrAttachment: string;
  status: 'To Do' | 'In Progress' | 'Passed' | 'Failed' | 'Blocked';
  comment: string;
  lastUpdated: Date | Timestamp;
  title?: string;
  verificationDetails?: string; // New field for verification tools/notes
}

const testCaseSchema = z.object({
  id: z.string().optional(),
  module: z.string().min(1, "Module is required.").max(100, "Module cannot exceed 100 characters."),
  testScenario: z.string().min(1, "Test Scenario is required.").max(250, "Test Scenario cannot exceed 250 characters."),
  preconditions: z.string().max(500, "Preconditions cannot exceed 500 characters.").optional().default('N/A'),
  dependency: z.string().max(500, "Dependency cannot exceed 500 characters.").optional().default('N/A'),
  steps: z.string().min(1, "At least one step is required.").max(1000, "Steps cannot exceed 1000 characters."),
  inputData: z.string().max(1000, "Input Data cannot exceed 1000 characters.").optional().default('N/A'),
  expectedResults: z.string().min(1, "Expected results are required.").max(500, "Expected results cannot exceed 500 characters."),
  actualResult: z.string().min(1, "Actual Result is required.").max(1000, "Actual results cannot exceed 1000 characters."),
  defectUrlOrAttachment: z.string().max(255, "Defect URL/Attachment reference cannot exceed 255 characters.").optional().refine(val => !val || val.startsWith('http://') || val.startsWith('https://') || val.length === 0 || !val.includes('.'), { message: "Must be a valid URL or a reference text (not a partial domain)."}).default(''),
  status: z.enum(['To Do', 'In Progress', 'Passed', 'Failed', 'Blocked'], { required_error: "Status is required." }),
  comment: z.string().max(1000, "Comment cannot exceed 1000 characters.").optional().default(''),
  verificationDetails: z.string().max(250, "Verification details cannot exceed 250 characters.").optional().default(''), // New schema field
});

type TestCaseFormValues = z.infer<typeof testCaseSchema>;

const customTemplateFormSchema = z.object({
  templateName: z.string().min(1, "Template name is required.").max(100, "Template name cannot exceed 100 characters."),
  templateDescription: z.string().min(1, "Template description is required.").max(250, "Template description cannot exceed 250 characters."),
  module: z.string().max(100).optional(),
  testScenario: z.string().max(250).optional(),
  preconditions: z.string().max(500).optional(),
  dependency: z.string().max(500).optional(),
  steps: z.string().max(1000).optional(),
  inputData: z.string().max(1000).optional(),
  expectedResults: z.string().max(500).optional(),
  actualResult: z.string().max(1000).optional(), // Not typically in templates, but keep for flexibility
  defectUrlOrAttachment: z.string().max(255).optional().refine(val => !val || val.startsWith('http://') || val.startsWith('https://') || val.length === 0 || !val.includes('.'), { message: "Must be a valid URL or a reference text (not a partial domain)."}).optional(),
  status: z.enum(['To Do', 'In Progress', 'Passed', 'Failed', 'Blocked']).optional(),
  comment: z.string().max(1000).optional(),
  verificationDetails: z.string().max(250).optional(), // New schema field for templates
});
type CustomTemplateFormValues = z.infer<typeof customTemplateFormSchema>;

interface CustomTestCaseTemplate extends Partial<TestCaseFormValues> {
  templateId: string;
  templateName: string;
  templateDescription: string;
}

const testCaseTemplates: Array<Partial<TestCaseFormValues> & { templateName: string, templateDescription: string }> = [
  {
    templateName: "User Login Functionality",
    templateDescription: "Standard test cases for user login.",
    module: "Authentication",
    testScenario: "Verify User Login with Valid Credentials",
    preconditions: "User account exists and is active.\nApplication is accessible.",
    dependency: "User database, Authentication service",
    steps: "1. Navigate to the login page.\n2. Enter valid username/email in the respective field.\n3. Enter valid password in the password field.\n4. Click the 'Login' button.",
    inputData: "Username: testuser@example.com\nPassword: Password123!",
    expectedResults: "User is successfully logged in.\nUser is redirected to the dashboard page.\nA welcome message is displayed.",
    status: "To Do",
    comment: "Standard login flow.",
    verificationDetails: "Check console for login success message. Verify dashboard elements.",
  },
  {
    templateName: "Password Reset Flow",
    templateDescription: "Test cases for the password reset functionality.",
    module: "Authentication",
    testScenario: "Verify Password Reset Email Delivery",
    preconditions: "User account exists with a valid email address.\nEmail service is operational.",
    dependency: "User database, Email service",
    steps: "1. Navigate to the 'Forgot Password' page.\n2. Enter the registered email address.\n3. Click the 'Send Reset Link' button.",
    inputData: "Email: testuser@example.com",
    expectedResults: "A success message 'Password reset email sent' is displayed.\nUser receives an email with a password reset link within 5 minutes.",
    status: "To Do",
    verificationDetails: "Check email inbox for reset link. Verify link functionality.",
  },
];

const statusColors: Record<TestCase['status'], string> = {
  'To Do': 'bg-muted hover:bg-muted/80 text-muted-foreground',
  'In Progress': 'bg-accent hover:bg-accent/80 text-accent-foreground',
  Passed: 'bg-green-500 hover:bg-green-600 text-primary-foreground',
  Failed: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
  Blocked: 'bg-purple-500 hover:bg-purple-600 text-primary-foreground',
};

interface ReportGlobalInfo {
    projectName: string;
    clientName: string;
    createdBy: string;
    reportDate: Date;
}
const reportGlobalInfoSchema = z.object({
    projectName: z.string().min(1, "Project Name is required."),
    clientName: z.string().min(1, "Client Name is required."),
    createdBy: z.string().min(1, "Creator name is required."),
    reportDate: z.date({ required_error: "Report date is required."}),
});
type ReportGlobalInfoFormValues = z.infer<typeof reportGlobalInfoSchema>;


export default function TestCaseManagerClient() {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTestCase, setCurrentTestCase] = useState<TestCase | null>(null);
  const [reportData, setReportData] = useState<{globalInfo: ReportGlobalInfo, testCases: TestCase[]} | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const { toast } = useToast();
  const { addToHistory, isItemInHistory } = useHistory();
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [testCaseToDelete, setTestCaseToDelete] = useState<TestCase | null>(null);
  
  const [customTemplates, setCustomTemplates] = useState<CustomTestCaseTemplate[]>([]);
  const [isCreateCustomTemplateModalOpen, setIsCreateCustomTemplateModalOpen] = useState(false);
  const [customTemplateToDelete, setCustomTemplateToDelete] = useState<CustomTestCaseTemplate | null>(null);
  const [showDeleteCustomTemplateConfirm, setShowDeleteCustomTemplateConfirm] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const [isLoadingData, setIsLoadingData] = useState(true);


  const form = useForm<TestCaseFormValues>({
    resolver: zodResolver(testCaseSchema),
    defaultValues: {
      module: '', testScenario: '', preconditions: 'N/A', dependency: 'N/A', steps: '', inputData: 'N/A',
      expectedResults: '', actualResult: '', defectUrlOrAttachment: '', status: 'To Do', comment: '', verificationDetails: '',
    }
  });

  const reportInfoForm = useForm<ReportGlobalInfoFormValues>({
    resolver: zodResolver(reportGlobalInfoSchema),
    defaultValues: { projectName: "QAnalyzer Demo Project", clientName: "Internal Team", createdBy: "QA Lead", reportDate: new Date() }
  });
  
  const customTemplateCreationForm = useForm<CustomTemplateFormValues>({
    resolver: zodResolver(customTemplateFormSchema),
    defaultValues: {
      templateName: '', templateDescription: '', module: '', testScenario: '', preconditions: 'N/A',
      dependency: 'N/A', steps: '', inputData: 'N/A', expectedResults: '',
      status: 'To Do', comment: '', verificationDetails: '',
    }
  });


  const displayedTestCases = useMemo(() => {
    return testCases.filter(tc => !isItemInHistory(tc.id, 'testCase'));
  }, [testCases, isItemInHistory]);


  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingData(true);
      const fetchTestCases = async () => {
        try {
          const tcColRef = collection(db, 'users', user.uid, 'test_cases');
          const q = query(tcColRef, orderBy('lastUpdated', 'desc'), limit(100));
          const querySnapshot = await getDocs(q);
          const fetchedTestCases: TestCase[] = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              ...data,
              lastUpdated: data.lastUpdated instanceof Timestamp ? data.lastUpdated.toDate() : new Date(data.lastUpdated || Date.now()),
              title: data.testScenario || `Test Case ${docSnap.id}`,
            } as TestCase;
          });
          setTestCases(fetchedTestCases);
        } catch (error) {
          console.error("Error fetching test cases from Firestore:", error);
          toast({ title: "Error Loading Test Cases", description: "Could not load test case data.", variant: "destructive" });
        } finally {
          setIsLoadingData(false);
        }
      };

      const fetchCustomTemplates = async () => {
        try {
          const templatesColRef = collection(db, 'users', user.uid, 'custom_test_case_templates');
          const q = query(templatesColRef, orderBy('templateName', 'asc'));
          const querySnapshot = await getDocs(q);
          const fetchedTemplates: CustomTestCaseTemplate[] = querySnapshot.docs.map(docSnap => ({ templateId: docSnap.id, ...docSnap.data() } as CustomTestCaseTemplate));
          setCustomTemplates(fetchedTemplates);
        } catch (error) {
          console.error("Error fetching custom templates from Firestore:", error);
          toast({ title: "Error Loading Templates", description: "Could not load custom templates.", variant: "destructive" });
        }
      };
      
      fetchTestCases();
      fetchCustomTemplates();

    } else if (!authLoading) {
      setTestCases([]);
      setCustomTemplates([]);
      setIsLoadingData(false);
    }
  }, [user, authLoading, toast]);


  useEffect(() => {
    if (currentTestCase && isEditModalOpen) {
      form.reset(currentTestCase);
    } else if (!isEditModalOpen && !isCreateModalOpen) {
      form.reset({
        module: '', testScenario: '', preconditions: 'N/A', dependency: 'N/A', steps: '', inputData: 'N/A',
        expectedResults: '', actualResult: '', defectUrlOrAttachment: '', status: 'To Do', comment: '', verificationDetails: '',
      });
    }
  }, [currentTestCase, isEditModalOpen, isCreateModalOpen, form]);

  const handleCreateTestCase = async (data: TestCaseFormValues) => {
    if (!user) {
        toast({ title: "Authentication Required", description: "Please log in to create test cases.", variant: "destructive" });
        return;
    }
    const newTestCaseData = {
      ...data,
      userId: user.uid,
      lastUpdated: serverTimestamp(), // Use server timestamp for creation
      title: data.testScenario, // Ensure title is set for history
    };

    try {
        const docRef = await addDoc(collection(db, 'users', user.uid, 'test_cases'), newTestCaseData);
        setTestCases(prev => [{ ...newTestCaseData, id: docRef.id, lastUpdated: new Date() } as TestCase, ...prev]);
        setIsCreateModalOpen(false);
        toast({ title: "Test Case Created", description: `"${data.testScenario}" added.` });
    } catch (error) {
        console.error("Error creating test case in Firestore:", error);
        toast({ title: "Error Creating Test Case", description: "Could not save test case to the cloud.", variant: "destructive" });
    }
  };

  const handleEditTestCase = (testCase: TestCase) => {
    setCurrentTestCase(testCase);
    setIsEditModalOpen(true);
  };

  const handleUpdateTestCase = async (data: TestCaseFormValues) => {
    if (!currentTestCase || !user) return;

    const testCaseDocRef = doc(db, 'users', user.uid, 'test_cases', currentTestCase.id);
    const updatedTestCaseData = {
      ...data,
      lastUpdated: serverTimestamp(), // Use server timestamp for updates
      title: data.testScenario, // Ensure title is updated
    };

    try {
        await updateDoc(testCaseDocRef, updatedTestCaseData);
        setTestCases(prev => prev.map(tc => tc.id === currentTestCase.id ? { ...currentTestCase, ...updatedTestCaseData, lastUpdated: new Date() } as TestCase : tc));
        setIsEditModalOpen(false);
        setCurrentTestCase(null);
        toast({ title: "Test Case Updated", description: `"${data.testScenario}" saved.` });
    } catch (error) {
        console.error("Error updating test case in Firestore:", error);
        toast({ title: "Error Updating Test Case", description: "Could not update test case in the cloud.", variant: "destructive" });
    }
  };

  const handleDeleteClick = (testCase: TestCase) => {
    setTestCaseToDelete(testCase);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDeleteTestCase = async () => {
    if (testCaseToDelete && user) {
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'test_cases', testCaseToDelete.id));
            // addToHistory(testCaseToDelete, 'testCase' as HistoryItemType); // History is client-side, consider if needed after Firestore delete
            setTestCases(prev => prev.filter(tc => tc.id !== testCaseToDelete!.id));
            toast({ title: "Test Case Deleted", description: `Test case ${testCaseToDelete.id} removed from Firestore.`});
        } catch (error) {
            console.error("Error deleting test case from Firestore:", error);
            toast({ title: "Delete Failed", description: "Could not delete test case from the cloud.", variant: "destructive" });
        }
    }
    setShowDeleteConfirmDialog(false);
    setTestCaseToDelete(null);
  };
  
  const handleUseTemplate = (template: Partial<TestCaseFormValues>) => {
    form.reset({
        ...form.getValues(), 
        ...template, 
        status: template.status || 'To Do',
    });
    setIsCreateModalOpen(true);
    toast({ title: "Template Applied", description: `Template loaded into form.` });
  };

  const handleOpenCreateCustomTemplateModal = () => {
    customTemplateCreationForm.reset({
      templateName: '', templateDescription: '', module: '', testScenario: '', preconditions: 'N/A',
      dependency: 'N/A', steps: '', inputData: 'N/A', expectedResults: '',
      status: 'To Do', comment: '', verificationDetails: '',
    });
    setIsCreateCustomTemplateModalOpen(true);
  };

  const handleSaveCustomTemplate = async (data: CustomTemplateFormValues) => {
    if (!user) {
        toast({ title: "Authentication Required", description: "Please log in to save templates.", variant: "destructive" });
        return;
    }
    const { templateName, templateDescription, ...templateData } = data;
    const newCustomTemplateData = {
      templateName,
      templateDescription,
      userId: user.uid,
      createdAt: serverTimestamp(),
      ...templateData,
    };

    try {
        const docRef = await addDoc(collection(db, 'users', user.uid, 'custom_test_case_templates'), newCustomTemplateData);
        setCustomTemplates(prev => [{ ...newCustomTemplateData, templateId: docRef.id } as CustomTestCaseTemplate, ...prev]);
        setIsCreateCustomTemplateModalOpen(false);
        toast({ title: "Custom Template Created", description: `Template "${templateName}" saved.` });
    } catch (error) {
        console.error("Error saving custom template to Firestore:", error);
        toast({ title: "Error Saving Template", description: "Could not save custom template.", variant: "destructive" });
    }
  };

  const handleDeleteCustomTemplateClick = (template: CustomTestCaseTemplate) => {
    setCustomTemplateToDelete(template);
    setShowDeleteCustomTemplateConfirm(true);
  };

  const confirmDeleteCustomTemplate = async () => {
    if (customTemplateToDelete && user) {
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'custom_test_case_templates', customTemplateToDelete.templateId));
            setCustomTemplates(prev => prev.filter(t => t.templateId !== customTemplateToDelete!.templateId));
            toast({ title: "Custom Template Deleted", description: `Template "${customTemplateToDelete.templateName}" removed.` });
        } catch (error) {
            console.error("Error deleting custom template from Firestore:", error);
            toast({ title: "Delete Failed", description: "Could not delete custom template.", variant: "destructive" });
        }
    }
    setShowDeleteCustomTemplateConfirm(false);
    setCustomTemplateToDelete(null);
  };


  const onSubmitReportData = (globalInfo: ReportGlobalInfoFormValues) => {
    setIsGeneratingReport(true);
    setTimeout(() => {
      setReportData({globalInfo, testCases: [...displayedTestCases]}); 
      setIsGeneratingReport(false);
      toast({ title: 'Report Data Generated', description: 'Preview is ready. You can now export the report.' });
    }, 500);
  };

  const getExcelPreviewData = (): { headers: string[]; details: {label: string, value: string}[]; testCaseRows: any[] } => {
    if (!reportData || reportData.testCases.length === 0) return { headers: [], details: [], testCaseRows: [] };
    const { globalInfo, testCases: currentTestCases } = reportData;
    const details = [
      { label: "Project Name:", value: globalInfo.projectName },
      { label: "Client Name:", value: globalInfo.clientName },
      { label: "Generated By:", value: globalInfo.createdBy },
      { label: "Report Date:", value: format(globalInfo.reportDate, 'PP p') },
      { label: "Total Test Cases:", value: currentTestCases.length.toString() },
    ];
    const testCaseTableHeaders = ["ID", "Module", "Test Scenario", "Preconditions", "Dependency", "Steps", "Input Data", "Expected Result", "Actual Result", "Defect URL/Attachment", "Status", "Comment", "Verification Details", "Last Updated"];
    const testCaseRowsData = currentTestCases.map(tc => ({
      ID: tc.id, Module: tc.module, "Test Scenario": tc.testScenario, Preconditions: tc.preconditions, Dependency: tc.dependency, Steps: tc.steps,
      "Input Data": tc.inputData, "Expected Result": tc.expectedResults, "Actual Result": tc.actualResult, "Defect URL/Attachment": tc.defectUrlOrAttachment || '-',
      Status: tc.status, Comment: tc.comment || '-', "Verification Details": tc.verificationDetails || '-', "Last Updated": format(tc.lastUpdated instanceof Timestamp ? tc.lastUpdated.toDate() : tc.lastUpdated, 'PPp'),
    }));
    return { headers: testCaseTableHeaders, details, testCaseRows: testCaseRowsData };
  };

  const handleExport = async (formatType: 'excel' | 'pdf') => {
    if (!reportData || reportData.testCases.length === 0) {
      toast({ title: "No data to export", description: "Please generate the report data first.", variant: "destructive" });
      return;
    }
    const { globalInfo } = reportData;

    if (formatType === 'excel') {
      try {
        const { details, headers: testCaseTableHeaders, testCaseRows: testCaseRowsData } = getExcelPreviewData();
        const reportDetailsHeader = [["Test Case Report"], ...details.map(d => [d.label, d.value]), []];
        const excelDataRows = testCaseRowsData.map(row => testCaseTableHeaders.map(header => row[header]));
        const worksheetData = [...reportDetailsHeader, testCaseTableHeaders, ...excelDataRows];
        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        ws['!cols'] = [ 
          { wch: 10 }, { wch: 25 }, { wch: 50 }, { wch: 40 }, { wch: 30 }, { wch: 60 }, { wch: 30 }, { wch: 50 }, { wch: 50 }, { wch: 30 }, 
          { wch: 12 }, { wch: 40 }, { wch: 40 }, { wch: 20 }, // Added Verification Details width
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Test Cases");
        const fileName = `TestCases_Report_${globalInfo.projectName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast({ title: `Exported to Excel`, description: `${fileName} downloaded successfully.` });
      } catch (error) {
        console.error("Error exporting to Excel:", error);
        toast({ title: "Excel Export Failed", description: "An error occurred while generating the Excel file.", variant: "destructive" });
      }
    } else if (formatType === 'pdf') {
        setIsGeneratingReport(true);
        toast({ title: `Export to PDF Initiated`, description: `Generating PDF report...` });
        const reportPreviewElement = document.getElementById('excel-report-preview-container');
        if (!reportPreviewElement) {
            toast({ title: "PDF Export Error", description: "Report preview element not found for PDF generation.", variant: "destructive" });
            setIsGeneratingReport(false); return;
        }
        try {
            const scrollArea = reportPreviewElement.querySelector('.h-\\[400px\\]'); 
            let originalHeight = '';
            if (scrollArea) { originalHeight = (scrollArea as HTMLElement).style.height; (scrollArea as HTMLElement).style.height = 'auto'; }
            const canvas = await html2canvas(reportPreviewElement, { scale: 2, useCORS: true, logging: false });
            if (scrollArea) { (scrollArea as HTMLElement).style.height = originalHeight; }
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width; const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2; const imgY = 15;
            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
            const fileName = `TestCases_Report_${globalInfo.projectName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
            pdf.save(fileName);
            toast({ title: `Exported to PDF`, description: `${fileName} downloaded successfully.` });
        } catch (error) {
            console.error("Error exporting to PDF:", error);
            toast({ title: "PDF Export Failed", description: "An error occurred while generating the PDF file.", variant: "destructive" });
        } finally { setIsGeneratingReport(false); }
    }
  };

  const renderTestCaseFormFields = (currentForm: typeof form | typeof customTemplateCreationForm, isCustomTemplateForm: boolean = false) => (
    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
      {isCustomTemplateForm && (
        <>
          <FormField control={currentForm.control} name="templateName" render={({ field }) => (
            <FormItem><FormLabel>Template Name</FormLabel><FormControl><Input {...field} placeholder="e.g., API Security Checks" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={currentForm.control} name="templateDescription" render={({ field }) => (
            <FormItem><FormLabel>Template Description</FormLabel><FormControl><Textarea {...field} placeholder="Brief description of this template." rows={2} /></FormControl><FormMessage /></FormItem>
          )} />
          <Separator className="my-2"/>
        </>
      )}
      <FormField control={currentForm.control} name="module" render={({ field }) => (
        <FormItem><FormLabel>Module</FormLabel><FormControl><Input {...field} placeholder="e.g., User Authentication" /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={currentForm.control} name="testScenario" render={({ field }) => (
        <FormItem><FormLabel>Test Scenario</FormLabel><FormControl><Textarea {...field} placeholder="e.g., Verify successful login with valid credentials." rows={2} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={currentForm.control} name="preconditions" render={({ field }) => (
        <FormItem><FormLabel>Preconditions</FormLabel><FormControl><Textarea {...field} placeholder="e.g., User account exists. System is online." rows={3} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={currentForm.control} name="dependency" render={({ field }) => (
        <FormItem><FormLabel>Dependency</FormLabel><FormControl><Input {...field} placeholder="e.g., Email Service, Payment Gateway" /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={currentForm.control} name="steps" render={({ field }) => (
        <FormItem><FormLabel>Steps to Reproduce (one per line)</FormLabel><FormControl><Textarea {...field} placeholder="1. Step one\n2. Step two" rows={4} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={currentForm.control} name="inputData" render={({ field }) => (
        <FormItem><FormLabel>Input Data</FormLabel><FormControl><Textarea {...field} placeholder="e.g., Username: test@example.com, Password: ValidPassword123" rows={2} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={currentForm.control} name="expectedResults" render={({ field }) => (
        <FormItem><FormLabel>Expected Results</FormLabel><FormControl><Textarea {...field} placeholder="e.g., User is logged in and redirected to dashboard." rows={2} /></FormControl><FormMessage /></FormItem>
      )} />
      {!isCustomTemplateForm && (
        <FormField control={currentForm.control} name="actualResult" render={({ field }) => (
          <FormItem><FormLabel>Actual Result</FormLabel><FormControl><Textarea {...field} placeholder="e.g., User sees an error 'Invalid credentials'." rows={2} /></FormControl><FormMessage /></FormItem>
        )} />
      )}
       <FormField control={currentForm.control} name="status" render={({ field }) => (
          <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value as TestCase['status'] | undefined} defaultValue={field.value as TestCase['status'] | undefined}>
            <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
            <SelectContent>{['To Do', 'In Progress', 'Passed', 'Failed', 'Blocked'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select><FormMessage /></FormItem>
        )} />
      <FormField control={currentForm.control} name="verificationDetails" render={({ field }) => ( // New Field
        <FormItem><FormLabel>Verification Details/Tools (Optional)</FormLabel><FormControl><Textarea {...field} placeholder="e.g., Verify using WAVE tool; Check console for errors" rows={2} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={currentForm.control} name="defectUrlOrAttachment" render={({ field }) => (
        <FormItem><FormLabel>Defect URL / Attachment Ref (Optional)</FormLabel><FormControl><Input {...field} placeholder="e.g., https://jira.example.com/DEF-123 or screenshot.png" /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={currentForm.control} name="comment" render={({ field }) => (
        <FormItem><FormLabel>Comment (Optional)</FormLabel><FormControl><Textarea {...field} placeholder="Additional notes or observations." rows={2} /></FormControl><FormMessage /></FormItem>
      )} />
    </div>
  );

  if (isLoadingData) {
    return (
        <div className="container mx-auto py-8 flex justify-center items-center h-[calc(100vh-10rem)]">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-primary flex items-center">
                <ClipboardList className="mr-2 h-5 w-5 text-accent"/> Test Case Repository
              </CardTitle>
              <CardDescription>Manage and track your project's test cases.</CardDescription>
            </div>
            <Button onClick={() => { form.reset(); setIsCreateModalOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Test Case
            </Button>
          </CardHeader>
          <CardContent>
            {displayedTestCases.length === 0 ? (
              <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg min-h-[200px] flex flex-col justify-center items-center">
                  <ClipboardList className="mx-auto h-12 w-12 mb-4" />
                  <p>No active test cases. Check History or create new ones.</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-28rem)]">
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
                  {displayedTestCases.map(tc => (
                    <Card key={tc.id} className="flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base font-semibold text-foreground leading-tight" title={tc.testScenario}>{tc.id} - {tc.testScenario}</CardTitle>
                          <Badge className={cn("text-xs", statusColors[tc.status])}>{tc.status}</Badge>
                        </div>
                         <CardDescription className="text-xs pt-1">Module: {tc.module}</CardDescription>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1 flex-grow">
                        <p className="line-clamp-2" title={tc.preconditions}><strong>Preconditions:</strong> <span className="text-muted-foreground">{tc.preconditions}</span></p>
                        <p className="line-clamp-2" title={tc.dependency}><strong>Dependency:</strong> <span className="text-muted-foreground">{tc.dependency}</span></p>
                        <div><strong>Steps:</strong> <pre className="whitespace-pre-wrap font-mono text-muted-foreground text-[11px] bg-muted/50 p-1.5 rounded-sm max-h-20 overflow-y-auto line-clamp-3" title={tc.steps}>{tc.steps}</pre></div>
                        <p className="line-clamp-2" title={tc.inputData}><strong>Input Data:</strong> <span className="text-muted-foreground">{tc.inputData}</span></p>
                        <p className="line-clamp-2" title={tc.expectedResults}><strong>Expected Results:</strong> <span className="text-muted-foreground">{tc.expectedResults}</span></p>
                        <p className="line-clamp-2" title={tc.actualResult}><strong>Actual Result:</strong> <span className="text-muted-foreground">{tc.actualResult}</span></p>
                        {tc.verificationDetails && <p className="line-clamp-2" title={tc.verificationDetails}><strong>Verification:</strong> <span className="text-muted-foreground">{tc.verificationDetails}</span></p>}
                        {tc.defectUrlOrAttachment && <div><strong>Defect/Ref:</strong> <a href={tc.defectUrlOrAttachment.startsWith('http') ? tc.defectUrlOrAttachment : undefined} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate">{tc.defectUrlOrAttachment}</a></div>}
                        {tc.comment && <p className="line-clamp-2" title={tc.comment}><strong>Comment:</strong> <span className="text-muted-foreground">{tc.comment}</span></p>}
                      </CardContent>
                      <CardFooter className="flex justify-between items-center text-xs text-muted-foreground border-t pt-3 mt-auto">
                        <span>Last Updated: {format(tc.lastUpdated instanceof Timestamp ? tc.lastUpdated.toDate() : tc.lastUpdated, 'PPp')}</span>
                        <div className="flex space-x-1">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleEditTestCase(tc)}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleDeleteClick(tc)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-primary flex items-center"><LayoutTemplate className="mr-2 h-5 w-5 text-accent"/>Test Case Templates</CardTitle>
            <CardDescription>Use predefined or custom templates to quickly create common test cases.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-38rem)]">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Predefined Templates</h4>
                {testCaseTemplates.map((template, index) => (
                  <Card key={`predefined-${index}`} className="bg-muted/30">
                    <CardHeader className="pb-2 pt-3 px-3">
                      <CardTitle className="text-sm font-semibold">{template.templateName}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">{template.templateDescription}</CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-2 pb-3 px-3">
                      <Button variant="outline" size="sm" className="w-full" onClick={() => handleUseTemplate(template)}>
                        <FilePlus2 className="mr-2 h-4 w-4"/> Use Template
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                {testCaseTemplates.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No predefined templates available.</p>}

                <Separator className="my-4" />
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Custom Templates</h4>
                {customTemplates.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No custom templates created yet.</p>
                ) : (
                    customTemplates.map((template) => (
                      <Card key={template.templateId} className="bg-muted/30">
                        <CardHeader className="pb-2 pt-3 px-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-grow">
                                <CardTitle className="text-sm font-semibold">{template.templateName}</CardTitle>
                                <CardDescription className="text-xs line-clamp-2">{template.templateDescription}</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCustomTemplateClick(template)}>
                                <X className="h-4 w-4"/>
                            </Button>
                          </div>
                        </CardHeader>
                        <CardFooter className="pt-2 pb-3 px-3">
                          <Button variant="outline" size="sm" className="w-full" onClick={() => handleUseTemplate(template)}>
                            <FilePlus2 className="mr-2 h-4 w-4"/> Use Template
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
           <CardFooter className="border-t pt-4">
             <Button variant="default" className="w-full" onClick={handleOpenCreateCustomTemplateModal}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Custom Template
             </Button>
           </CardFooter>
        </Card>
      </div>

       <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={isCreateModalOpen ? setIsCreateModalOpen : setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[725px]">
          <DialogHeader>
            <DialogTitle>{isEditModalOpen ? `Edit Test Case: ${currentTestCase?.id}` : 'Create New Test Case'}</DialogTitle>
            <DialogDescription>
              {isEditModalOpen ? 'Modify the details of the existing test case.' : 'Fill in the details for the new test case.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(isEditModalOpen ? handleUpdateTestCase : handleCreateTestCase)}>
              {renderTestCaseFormFields(form)}
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit"><Save className="mr-2 h-4 w-4" /> {isEditModalOpen ? 'Save Changes' : 'Create Test Case'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateCustomTemplateModalOpen} onOpenChange={setIsCreateCustomTemplateModalOpen}>
        <DialogContent className="sm:max-w-[725px]">
          <DialogHeader>
            <DialogTitle>Create Custom Test Case Template</DialogTitle>
            <DialogDescription>Define the fields for your reusable test case template.</DialogDescription>
          </DialogHeader>
          <Form {...customTemplateCreationForm}>
            <form onSubmit={customTemplateCreationForm.handleSubmit(handleSaveCustomTemplate)}>
              {renderTestCaseFormFields(customTemplateCreationForm as any, true)} 
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit"><Save className="mr-2 h-4 w-4" /> Save Custom Template</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>


      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContentNested> 
          <AlertDialogHeaderNested>
            <AlertDialogTitleNested>Are you sure?</AlertDialogTitleNested>
            <AlertDialogDescriptionNested>
              This action will permanently delete the test case "{testCaseToDelete?.testScenario}". This cannot be undone.
            </AlertDialogDescriptionNested>
          </AlertDialogHeaderNested>
          <AlertDialogFooterNested>
            <AlertDialogCancel onClick={() => setTestCaseToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTestCase} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Delete Test Case
            </AlertDialogAction>
          </AlertDialogFooterNested>
        </AlertDialogContentNested>
      </AlertDialog>

      <AlertDialog open={showDeleteCustomTemplateConfirm} onOpenChange={setShowDeleteCustomTemplateConfirm}>
        <AlertDialogContentNested>
          <AlertDialogHeaderNested>
            <AlertDialogTitleNested>Confirm Delete Custom Template</AlertDialogTitleNested>
            <AlertDialogDescriptionNested>
              Are you sure you want to delete the custom template "{customTemplateToDelete?.templateName}"? This action cannot be undone.
            </AlertDialogDescriptionNested>
          </AlertDialogHeaderNested>
          <AlertDialogFooterNested>
            <AlertDialogCancel onClick={() => setCustomTemplateToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCustomTemplate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooterNested>
        </AlertDialogContentNested>
      </AlertDialog>

      <Card className="shadow-lg mt-6">
        <CardHeader>
          <CardTitle className="text-primary flex items-center"><ReportIcon className="mr-2 h-5 w-5 text-accent"/>Report Preview &amp; Export</CardTitle>
          <CardDescription>Generate a preview of your test cases and export them.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...reportInfoForm}>
                <form onSubmit={reportInfoForm.handleSubmit(onSubmitReportData)} className="space-y-4 mb-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <FormField control={reportInfoForm.control} name="projectName" render={({ field }) => (
                            <FormItem><FormLabel>Project Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={reportInfoForm.control} name="clientName" render={({ field }) => (
                            <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={reportInfoForm.control} name="createdBy" render={({ field }) => (
                            <FormItem><FormLabel>Generated By</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <Button type="submit" disabled={isGeneratingReport || displayedTestCases.length === 0} className="self-end">
                            {isGeneratingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ReportIcon className="mr-2 h-4 w-4" />}
                            Generate Data
                        </Button>
                    </div>
                </form>
            </Form>
           
           <Tabs defaultValue="excelPreview" className="w-full">
                <TabsList className="grid w-full grid-cols-1"> 
                     <TabsTrigger value="excelPreview"> <TableIcon className="mr-2 h-4 w-4" />Excel Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="excelPreview">
                    <Card className="mt-4">
                        <CardContent className="p-4">
                            {reportData && reportData.testCases.length > 0 ? (
                                <div id="excel-report-preview-container">
                                    <ScrollArea className="h-[400px] border rounded-md p-2">
                                        <div className="space-y-1 mb-4 p-2 text-sm border-b pb-4">
                                            {getExcelPreviewData().details.map((detail, index) => (
                                                <div key={`detail-${index}`} className="flex">
                                                    <span className="font-semibold w-40 shrink-0">{detail.label}</span>
                                                    <span className="ml-2 text-muted-foreground">{detail.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    {getExcelPreviewData().headers.map(header => (
                                                        <TableHead key={header}>{header}</TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {getExcelPreviewData().testCaseRows.map((tcRow, index) => (
                                                    <TableRow key={`row-${index}`}>
                                                        {getExcelPreviewData().headers.map(header => (
                                                            <TableCell key={`${header}-${index}`}>{tcRow[header]}</TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg min-h-[200px] flex flex-col justify-center items-center">
                                    <TableIcon className="mx-auto h-10 w-10 mb-2" />
                                    <p>Click "Generate Data" to see the Excel report preview.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                 </TabsContent>
           </Tabs>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-end gap-3 pt-4 border-t">
             <Button variant="outline" onClick={() => handleExport('excel')} disabled={!reportData || isGeneratingReport} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Export as Excel
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')} disabled={!reportData || isGeneratingReport} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Export as PDF
            </Button>
        </CardFooter>
      </Card>
    </>
  );
}
