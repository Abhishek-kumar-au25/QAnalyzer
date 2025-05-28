// src/components/feature/defect-cases/defect-case-manager-client.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, differenceInDays, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { PlusCircle, ListChecks, AlertCircle, Construction, Edit2, Trash2, Save, Bug, FileUp, Image as ImageIconLucide, AlertTriangle, Loader2, FileText as ReportIcon, TableIcon, Download, BarChart3, TrendingUp, Layers, InfoCircle, Tool } from 'lucide-react'; // Added Tool icon
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, AlertDialog, AlertDialogContent as AlertDialogContentNested, AlertDialogHeader as AlertDialogHeaderNested, AlertDialogTitle as AlertDialogTitleNested, AlertDialogDescription as AlertDialogDescriptionNested, AlertDialogFooter as AlertDialogFooterNested, AlertDialogCancel, AlertDialogAction } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useHistory } from '@/contexts/HistoryContext';
import type { HistoryItemType } from '@/types/history';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// Recharts components for analytics
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'; // Renamed BarChart to RechartsBarChart
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { db } from '@/lib/firebase/firebase.config';
import { collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc, Timestamp, serverTimestamp, where, getCountFromServer, writeBatch, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Define DefectCase interface and schema
export interface DefectCase {
  id: string;
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed' | 'Reopened';
  reporter: string;
  assignee?: string;
  stepsToReproduce: string;
  environment?: string;
  actualResults: string;
  expectedResults: string;
  dateReported: Date | Timestamp;
  dateResolved?: Date | Timestamp | null;
  dateClosed?: Date | Timestamp | null;
  module: string;
  attachments?: { name: string, url: string, type: 'image' | 'file' }[];
  comment?: string;
  toolUsed?: string; // New field for tool used
}

const defectCaseSchema = z.object({
  title: z.string().min(1, "Title is required.").max(150, "Title cannot exceed 150 characters."),
  description: z.string().min(1, "Description is required.").max(1000, "Description cannot exceed 1000 characters."),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low'], { required_error: "Severity is required." }),
  priority: z.enum(['High', 'Medium', 'Low'], { required_error: "Priority is required." }),
  status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed', 'Reopened'], { required_error: "Status is required." }),
  reporter: z.string().min(1, "Reporter name is required.").max(100, "Reporter name cannot exceed 100 characters."),
  assignee: z.string().max(100, "Assignee name cannot exceed 100 characters.").optional().default(''),
  stepsToReproduce: z.string().min(1, "Steps to reproduce are required.").max(1000, "Steps cannot exceed 1000 characters."),
  environment: z.string().max(200, "Environment details cannot exceed 200 characters.").optional().default(''),
  actualResults: z.string().min(1, "Actual results are required.").max(500, "Actual results cannot exceed 500 characters."),
  expectedResults: z.string().min(1, "Expected results are required.").max(500, "Expected results cannot exceed 500 characters."),
  dateReported: z.date({ required_error: "Date reported is required." }),
  dateResolved: z.date().nullable().optional(),
  dateClosed: z.date().nullable().optional(),
  module: z.string().min(1, "Module is required.").max(100, "Module cannot exceed 100 characters."),
  defectUrlOrAttachment: z.string().max(255, "Defect URL/Attachment reference cannot exceed 255 characters.").optional().refine(val => !val || val.startsWith('http://') || val.startsWith('https://') || val.length === 0 || !val.includes('.'), { message: "Must be a valid URL or a reference text (not a partial domain)."}).default(''),
  comment: z.string().max(1000, "Comment cannot exceed 1000 characters.").optional().default(''),
  toolUsed: z.string().max(100, "Tool name cannot exceed 100 characters.").optional().default(''), // New schema field
});

type DefectCaseFormValues = z.infer<typeof defectCaseSchema>;

const severityColors: Record<DefectCase['severity'], string> = {
  Critical: 'bg-red-700 hover:bg-red-800 text-white',
  High: 'bg-red-500 hover:bg-red-600 text-white',
  Medium: 'bg-yellow-500 hover:bg-yellow-600 text-black',
  Low: 'bg-blue-500 hover:bg-blue-600 text-white',
};

const priorityColors: Record<DefectCase['priority'], string> = {
  High: 'border-red-500 text-red-500',
  Medium: 'border-yellow-500 text-yellow-600',
  Low: 'border-blue-500 text-blue-500',
};

const statusColorsDefect: Record<DefectCase['status'], string> = {
  Open: 'bg-red-200 text-red-800',
  'In Progress': 'bg-blue-200 text-blue-800',
  Resolved: 'bg-green-200 text-green-800',
  Closed: 'bg-gray-400 text-gray-800',
  Reopened: 'bg-orange-300 text-orange-900',
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

export default function DefectCaseManagerClient() {
  const [defects, setDefects] = useState<DefectCase[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentDefect, setCurrentDefect] = useState<DefectCase | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [defectReportData, setDefectReportData] = useState<{globalInfo: ReportGlobalInfo, defects: DefectCase[]} | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const { toast } = useToast();
  const { addToHistory, isItemInHistory } = useHistory();
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [defectToDelete, setDefectToDelete] = useState<DefectCase | null>(null);
  const { user, loading: authLoading } = useAuth();
  const [isLoadingData, setIsLoadingData] = useState(true);

  const form = useForm<DefectCaseFormValues>({
    resolver: zodResolver(defectCaseSchema),
    defaultValues: {
      title: '', description: '', severity: 'Medium', priority: 'Medium', status: 'Open', module: '',
      reporter: '', assignee: '', stepsToReproduce: '', environment: '',
      actualResults: '', expectedResults: '', dateReported: new Date(), defectUrlOrAttachment: '', comment: '',
      toolUsed: '', dateResolved: null, dateClosed: null,
    }
  });

  const defectReportInfoForm = useForm<ReportGlobalInfoFormValues>({
    resolver: zodResolver(reportGlobalInfoSchema),
    defaultValues: {
        projectName: "QAnalyzer Defect Report",
        clientName: "Internal QA",
        createdBy: "System",
        reportDate: new Date(),
    }
  });

  const displayedDefects = useMemo(() => {
    return defects.filter(defect => !isItemInHistory(defect.id, 'defectCase'));
  }, [defects, isItemInHistory]);


  useEffect(() => {
    if (user && !authLoading) {
        setIsLoadingData(true);
        const fetchDefects = async () => {
            try {
                const defectsColRef = collection(db, 'users', user.uid, 'defect_cases');
                const q = query(defectsColRef, orderBy('dateReported', 'desc'), limit(50));
                const querySnapshot = await getDocs(q);
                const fetchedDefects: DefectCase[] = querySnapshot.docs.map(docSnap => {
                    const data = docSnap.data();
                    return {
                        id: docSnap.id,
                        ...data,
                        dateReported: data.dateReported instanceof Timestamp ? data.dateReported.toDate() : new Date(data.dateReported),
                        dateResolved: data.dateResolved instanceof Timestamp ? data.dateResolved.toDate() : (data.dateResolved ? new Date(data.dateResolved) : null),
                        dateClosed: data.dateClosed instanceof Timestamp ? data.dateClosed.toDate() : (data.dateClosed ? new Date(data.dateClosed) : null),
                        title: data.title || `Defect ${docSnap.id}`,
                    } as DefectCase;
                });
                setDefects(fetchedDefects);
            } catch (error) {
                console.error("Error fetching defects from Firestore:", error);
                toast({ title: "Error Loading Defects", description: "Could not load defect data from the cloud.", variant: "destructive" });
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchDefects();
    } else if (!authLoading) {
        setDefects([]);
        setIsLoadingData(false);
    }
  }, [user, authLoading, toast]);


  const defectsByStatus = useMemo(() => {
    const counts = displayedDefects.reduce((acc, defect) => {
      acc[defect.status] = (acc[defect.status] || 0) + 1;
      return acc;
    }, {} as Record<DefectCase['status'], number>);
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [displayedDefects]);

  const defectsBySeverity = useMemo(() => {
    const counts = displayedDefects.reduce((acc, defect) => {
      acc[defect.severity] = (acc[defect.severity] || 0) + 1;
      return acc;
    }, {} as Record<DefectCase['severity'], number>);
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [displayedDefects]);

   const defectsByPriority = useMemo(() => {
    const counts = displayedDefects.reduce((acc, defect) => {
      acc[defect.priority] = (acc[defect.priority] || 0) + 1;
      return acc;
    }, {} as Record<DefectCase['priority'], number>);
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [displayedDefects]);

  const resolutionTimeData = useMemo(() => {
    return displayedDefects
      .filter(d => (d.status === 'Resolved' || d.status === 'Closed') && d.dateResolved && d.dateReported)
      .map(d => ({
        month: format((d.dateReported as Date), 'yyyy-MM'),
        resolutionTime: differenceInDays((d.dateResolved as Date), (d.dateReported as Date)),
      }))
      .reduce((acc, curr) => {
        const existing = acc.find(item => item.month === curr.month);
        if (existing) {
          existing.totalTime += curr.resolutionTime;
          existing.count += 1;
        } else {
          acc.push({ month: curr.month, totalTime: curr.resolutionTime, count: 1 });
        }
        return acc;
      }, [] as { month: string; totalTime: number; count: number }[])
      .map(item => ({
        month: item.month,
        avgResolutionTime: item.count > 0 ? item.totalTime / item.count : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [displayedDefects]);

  const defectsByModule = useMemo(() => {
    const counts = displayedDefects.reduce((acc, defect) => {
      const moduleName = defect.module || 'Uncategorized';
      acc[moduleName] = (acc[moduleName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, count], index) => ({
       name,
       count,
       fill: `hsl(${(index * 40) % 360}, 70%, 60%)` // More distinct colors
    }));
  }, [displayedDefects]);


  const chartConfigBase = {
    count: { label: "Count", color: "hsl(var(--chart-1))" },
    avgResolutionTime: { label: "Avg. Resolution (Days)", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;


  useEffect(() => {
    if (currentDefect && isEditModalOpen) {
      form.reset({
        ...currentDefect,
        dateReported: currentDefect.dateReported instanceof Timestamp ? currentDefect.dateReported.toDate() : new Date(currentDefect.dateReported),
        dateResolved: currentDefect.dateResolved ? (currentDefect.dateResolved instanceof Timestamp ? currentDefect.dateResolved.toDate() : new Date(currentDefect.dateResolved)) : null,
        dateClosed: currentDefect.dateClosed ? (currentDefect.dateClosed instanceof Timestamp ? currentDefect.dateClosed.toDate() : new Date(currentDefect.dateClosed)) : null,
      });
      setSelectedFiles([]);
    } else if (!isEditModalOpen && !isCreateModalOpen) {
      form.reset({
        title: '', description: '', severity: 'Medium', priority: 'Medium', status: 'Open', module: '',
        reporter: '', assignee: '', stepsToReproduce: '', environment: '',
        actualResults: '', expectedResults: '', dateReported: new Date(), defectUrlOrAttachment: '', comment: '', toolUsed: '',
        dateResolved: null, dateClosed: null,
      });
      setSelectedFiles([]);
    }
  }, [currentDefect, isEditModalOpen, isCreateModalOpen, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const handleCreateDefect = async (data: DefectCaseFormValues) => {
    if (!user) {
        toast({ title: "Authentication Required", description: "Please log in to create defects.", variant: "destructive" });
        return;
    }
    // TODO: Implement file upload to Firebase Storage if needed
    const newAttachments = selectedFiles.map(file => ({
      name: file.name,
      url: `https://placehold.co/100x50.png?text=${encodeURIComponent(file.name.substring(0,10))}`, // Placeholder
      type: file.type.startsWith('image/') ? 'image' : 'file' as 'image' | 'file',
    }));

    let dateResolved = data.dateResolved ? Timestamp.fromDate(data.dateResolved) : null;
    let dateClosed = data.dateClosed ? Timestamp.fromDate(data.dateClosed) : null;

    if (data.status === 'Resolved' && !dateResolved) dateResolved = Timestamp.now();
    if (data.status === 'Closed') {
        dateClosed = Timestamp.now();
        if (!dateResolved) dateResolved = dateClosed;
    }

    const newDefectData = {
      ...data,
      userId: user.uid,
      title: data.title, // Added for history consistency
      dateReported: Timestamp.fromDate(data.dateReported),
      dateResolved,
      dateClosed,
      attachments: newAttachments, // Actual URLs from storage should be used
    };

    try {
        const docRef = await addDoc(collection(db, 'users', user.uid, 'defect_cases'), newDefectData);
        setDefects(prev => [{ ...newDefectData, id: docRef.id, dateReported: (newDefectData.dateReported as Timestamp).toDate(), dateResolved: newDefectData.dateResolved ? (newDefectData.dateResolved as Timestamp).toDate() : null, dateClosed: newDefectData.dateClosed ? (newDefectData.dateClosed as Timestamp).toDate() : null } as DefectCase, ...prev]);
        setIsCreateModalOpen(false);
        toast({ title: "Defect Logged", description: `"${data.title}" created.` });
    } catch (error) {
        console.error("Error creating defect in Firestore:", error);
        toast({ title: "Error Logging Defect", description: "Could not save defect to the cloud.", variant: "destructive" });
    }
  };

  const handleEditDefect = (defect: DefectCase) => {
    setCurrentDefect(defect);
    setIsEditModalOpen(true);
  };

  const handleUpdateDefect = async (data: DefectCaseFormValues) => {
    if (!currentDefect || !user) return;
    // TODO: Handle updates to attachments (upload new, remove old from storage)
    const updatedAttachments = selectedFiles.length > 0
      ? selectedFiles.map(file => ({ name: file.name, url: `https://placehold.co/100x50.png?text=UPDATED_${encodeURIComponent(file.name.substring(0,5))}`, type: file.type.startsWith('image/') ? 'image' : 'file' as 'image' | 'file' }))
      : currentDefect.attachments;

    let dateResolved = data.dateResolved ? Timestamp.fromDate(data.dateResolved) : (currentDefect.dateResolved ? Timestamp.fromDate(currentDefect.dateResolved as Date) : null);
    let dateClosed = data.dateClosed ? Timestamp.fromDate(data.dateClosed) : (currentDefect.dateClosed ? Timestamp.fromDate(currentDefect.dateClosed as Date) : null);

    if (data.status === 'Resolved' && !dateResolved) dateResolved = Timestamp.now();
    if (data.status === 'Closed') {
        dateClosed = Timestamp.now();
        if (!dateResolved) dateResolved = dateClosed;
    }
    if (data.status !== 'Resolved' && data.status !== 'Closed') {
        dateResolved = null;
        dateClosed = null;
    }

    const defectDocRef = doc(db, 'users', user.uid, 'defect_cases', currentDefect.id);
    const updatedDefectData = {
      ...data,
      title: data.title, // For history
      attachments: updatedAttachments,
      dateReported: Timestamp.fromDate(data.dateReported),
      dateResolved,
      dateClosed,
    };

    try {
        await updateDoc(defectDocRef, updatedDefectData);
        setDefects(prev => prev.map(d => d.id === currentDefect.id ? { ...currentDefect, ...updatedDefectData, dateReported: (updatedDefectData.dateReported as Timestamp).toDate(), dateResolved: updatedDefectData.dateResolved ? (updatedDefectData.dateResolved as Timestamp).toDate() : null, dateClosed: updatedDefectData.dateClosed ? (updatedDefectData.dateClosed as Timestamp).toDate() : null } as DefectCase : d));
        setIsEditModalOpen(false);
        setCurrentDefect(null);
        toast({ title: "Defect Updated", description: `"${data.title}" saved.` });
    } catch (error) {
         console.error("Error updating defect in Firestore:", error);
        toast({ title: "Error Updating Defect", description: "Could not update defect in the cloud.", variant: "destructive" });
    }
  };

  const handleDeleteClick = (defect: DefectCase) => {
    setDefectToDelete(defect);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDeleteDefect = async () => {
    if (defectToDelete && user) {
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'defect_cases', defectToDelete.id));
            // The addToHistory function will be called if you want to keep it in a separate "history" (which isn't Firestore backed yet)
            // addToHistory({ ...defectToDelete, title: defectToDelete.title || defectToDelete.id }, 'defectCase' as HistoryItemType);
             setDefects(prev => prev.filter(d => d.id !== defectToDelete!.id));
            toast({ title: "Defect Deleted", description: `Defect ${defectToDelete.id} removed from Firestore.`});
        } catch (error) {
            console.error("Error deleting defect from Firestore:", error);
            toast({ title: "Delete Failed", description: "Could not delete defect from the cloud.", variant: "destructive" });
        }
    }
    setShowDeleteConfirmDialog(false);
    setDefectToDelete(null);
  };

  const onSubmitDefectReportData = (globalInfo: ReportGlobalInfoFormValues) => {
    setIsGeneratingReport(true);
    setTimeout(() => {
      setDefectReportData({globalInfo, defects: [...displayedDefects]});
      setIsGeneratingReport(false);
      toast({
        title: 'Defect Report Data Generated',
        description: 'Preview is ready. You can now export the defect report.',
      });
    }, 500);
  };

  const getDefectExcelPreviewData = (): { headers: string[]; details: {label: string, value: string}[]; defectRows: any[] } => {
    if (!defectReportData || defectReportData.defects.length === 0) return { headers: [], details: [], defectRows: [] };

    const { globalInfo, defects: currentDefects } = defectReportData;

    const details = [
      { label: "Project Name:", value: globalInfo.projectName },
      { label: "Client Name:", value: globalInfo.clientName },
      { label: "Generated By:", value: globalInfo.createdBy },
      { label: "Report Date:", value: format(globalInfo.reportDate, 'PP p') },
      { label: "Total Defects:", value: currentDefects.length.toString() },
    ];

    const defectTableHeaders = ["ID", "Title", "Description", "Severity", "Priority", "Status", "Reporter", "Assignee", "Module", "Tool Used", "Steps to Reproduce", "Environment", "Actual Results", "Expected Results", "Date Reported", "Date Resolved", "Date Closed", "Attachments", "Comment"];

    const defectRowsData = currentDefects.map(d => ({
      ID: d.id,
      Title: d.title,
      Description: d.description,
      Severity: d.severity,
      Priority: d.priority,
      Status: d.status,
      Reporter: d.reporter,
      Assignee: d.assignee || '-',
      Module: d.module,
      "Tool Used": d.toolUsed || '-', // Added tool used
      "Steps to Reproduce": d.stepsToReproduce,
      Environment: d.environment || '-',
      "Actual Results": d.actualResults,
      "Expected Results": d.expectedResults,
      "Date Reported": d.dateReported instanceof Timestamp ? format(d.dateReported.toDate(), 'PPp') : format(d.dateReported, 'PPp'),
      "Date Resolved": d.dateResolved ? (d.dateResolved instanceof Timestamp ? format(d.dateResolved.toDate(), 'PPp') : format(d.dateResolved, 'PPp')) : '-',
      "Date Closed": d.dateClosed ? (d.dateClosed instanceof Timestamp ? format(d.dateClosed.toDate(), 'PPp') : format(d.dateClosed, 'PPp')) : '-',
      Attachments: d.attachments?.map(att => att.name).join(', ') || '-',
      Comment: d.comment || '-',
    }));

    return { headers: defectTableHeaders, details, defectRows: defectRowsData };
  };

  const handleExportDefects = async (formatType: 'excel' | 'pdf') => {
    if (!defectReportData || defectReportData.defects.length === 0) {
      toast({ title: "No data to export", description: "Please generate the defect report data first.", variant: "destructive" });
      return;
    }
    const { globalInfo } = defectReportData;

    if (formatType === 'excel') {
      try {
        const { details, headers: defectTableHeaders, defectRows: defectRowsData } = getDefectExcelPreviewData();

        const reportDetailsHeader = [
          ["Defect Report"],
          ...details.map(d => [d.label, d.value]),
          [],
        ];

        const excelDataRows = defectRowsData.map(row => defectTableHeaders.map(header => row[header]));

        const worksheetData = [...reportDetailsHeader, defectTableHeaders, ...excelDataRows];
        const ws = XLSX.utils.aoa_to_sheet(worksheetData);

        ws['!cols'] = [
          { wch: 10 }, { wch: 40 }, { wch: 60 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, // Added Tool Used width
          { wch: 60 }, { wch: 30 }, { wch: 50 }, { wch: 50 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 40 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Defect Report");

        const fileName = `Defect_Report_${globalInfo.projectName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
        XLSX.writeFile(wb, fileName);

        toast({
          title: `Exported to Excel`,
          description: `${fileName} downloaded successfully.`,
        });

      } catch (error) {
        console.error("Error exporting defects to Excel:", error);
        toast({
          title: "Excel Export Failed",
          description: "An error occurred while generating the Excel file for defects.",
          variant: "destructive",
        });
      }
    } else if (formatType === 'pdf') {
      setIsGeneratingReport(true);
      toast({
          title: `Export Defect Report to PDF Initiated`,
          description: `Generating PDF report...`,
      });

      const reportPreviewElement = document.getElementById('defect-excel-report-preview-container');

      if (!reportPreviewElement) {
          toast({ title: "PDF Export Error", description: "Defect report preview element not found for PDF generation.", variant: "destructive" });
          setIsGeneratingReport(false);
          return;
      }
      try {
          const scrollArea = reportPreviewElement.querySelector('.h-\\[400px\\]');
          let originalHeight = '';
          if (scrollArea) {
              originalHeight = (scrollArea as HTMLElement).style.height;
              (scrollArea as HTMLElement).style.height = 'auto';
          }

          const canvas = await html2canvas(reportPreviewElement, { scale: 2, useCORS: true, logging: false });

          if (scrollArea) {
               (scrollArea as HTMLElement).style.height = originalHeight;
          }

          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
          const imgX = (pdfWidth - imgWidth * ratio) / 2;
          const imgY = 15;

          pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

          const fileName = `Defect_Report_${globalInfo.projectName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
          pdf.save(fileName);

          toast({ title: `Exported Defect Report to PDF`, description: `${fileName} downloaded successfully.` });
      } catch (error) {
          console.error("Error exporting defects to PDF:", error);
          toast({ title: "PDF Export Failed", description: "An error occurred while generating the PDF file for defects.", variant: "destructive" });
      } finally {
          setIsGeneratingReport(false);
      }
    }
  };


  const renderDefectFormFields = () => (
    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
      <FormField control={form.control} name="title" render={({ field }) => (
        <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} placeholder="e.g., Login button unresponsive" /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="description" render={({ field }) => (
        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} placeholder="Detailed description of the issue." rows={3} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="severity" render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel>Severity</FormLabel>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value}
              className="flex flex-wrap gap-x-4 gap-y-2"
            >
              {(['Critical', 'High', 'Medium', 'Low'] as const).map((sVal) => (
                <FormItem key={sVal} className="flex items-center space-x-2">
                  <FormControl>
                    <RadioGroupItem value={sVal} id={`severity-${sVal}`} />
                  </FormControl>
                  <Label htmlFor={`severity-${sVal}`} className={cn("font-normal py-1 px-2 rounded-md text-xs", severityColors[sVal])}>
                    {sVal}
                  </Label>
                </FormItem>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
       <FormField control={form.control} name="module" render={({ field }) => (
        <FormItem><FormLabel>Module</FormLabel><FormControl><Input {...field} placeholder="e.g., Authentication, Reporting" /></FormControl><FormMessage /></FormItem>
      )} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField control={form.control} name="priority" render={({ field }) => (
          <FormItem><FormLabel>Priority</FormLabel><Select onValueChange={field.onChange} value={field.value}>
            <FormControl><SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger></FormControl>
            <SelectContent>{['High', 'Medium', 'Low'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}>
            <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
            <SelectContent>{['Open', 'In Progress', 'Resolved', 'Closed', 'Reopened'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select><FormMessage /></FormItem>
        )} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="reporter" render={({ field }) => (
          <FormItem><FormLabel>Reporter</FormLabel><FormControl><Input {...field} placeholder="e.g., QA Team" /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="assignee" render={({ field }) => (
          <FormItem><FormLabel>Assignee (Optional)</FormLabel><FormControl><Input {...field} placeholder="e.g., Dev Lead" /></FormControl><FormMessage /></FormItem>
        )} />
      </div>
      <FormField control={form.control} name="dateReported" render={({ field }) => (
        <FormItem className="flex flex-col"><FormLabel>Date Reported</FormLabel>
          <DatePicker date={field.value} setDate={field.onChange} />
        <FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="stepsToReproduce" render={({ field }) => (
        <FormItem><FormLabel>Steps to Reproduce (one per line)</FormLabel><FormControl><Textarea {...field} placeholder="1. Step one...\n2. Step two..." rows={4} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="actualResults" render={({ field }) => (
        <FormItem><FormLabel>Actual Results</FormLabel><FormControl><Textarea {...field} placeholder="What actually happened." rows={2} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="expectedResults" render={({ field }) => (
        <FormItem><FormLabel>Expected Results</FormLabel><FormControl><Textarea {...field} placeholder="What should have happened." rows={2} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="environment" render={({ field }) => (
        <FormItem><FormLabel>Environment (Optional)</FormLabel><FormControl><Input {...field} placeholder="e.g., Chrome v125, Windows 11" /></FormControl><FormMessage /></FormItem>
      )} />
       <FormField control={form.control} name="toolUsed" render={({ field }) => ( // Tool Used field
        <FormItem><FormLabel>Tool Used (Optional)</FormLabel><FormControl><Input {...field} placeholder="e.g., axe DevTools, Lighthouse, WAVE" /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="defectUrlOrAttachment" render={({ field }) => (
        <FormItem><FormLabel>Defect URL / Attachment Ref (Optional)</FormLabel><FormControl><Input {...field} placeholder="e.g., JIRA-123, Lighthouse report URL, link to screenshot" /></FormControl><FormMessage /></FormItem>
      )} />
       <FormField control={form.control} name="comment" render={({ field }) => (
        <FormItem><FormLabel>Comment (Optional)</FormLabel><FormControl><Textarea {...field} placeholder="Additional notes." rows={2} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormItem>
        <FormLabel>Attachments (Optional)</FormLabel>
        <FormControl>
          <Input type="file" multiple onChange={handleFileChange} />
        </FormControl>
        {selectedFiles.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            Selected: {selectedFiles.map(f => f.name).join(', ')}
          </div>
        )}
        {currentDefect?.attachments && currentDefect.attachments.length > 0 && selectedFiles.length === 0 && (
             <div className="mt-2 text-xs text-muted-foreground">
                 Current: {currentDefect.attachments.map(att => att.name).join(', ')}
             </div>
        )}
      </FormItem>
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
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-primary flex items-center">
              <Bug className="mr-2 h-5 w-5 text-destructive" /> Defect Tracking
            </CardTitle>
            <CardDescription>Log, manage, and track software defects.</CardDescription>
          </div>
          <Button onClick={() => { form.reset(); setSelectedFiles([]); setIsCreateModalOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Log New Defect
          </Button>
        </CardHeader>
        <CardContent>
          {displayedDefects.length === 0 ? (
            <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg min-h-[200px] flex flex-col justify-center items-center">
                <Bug className="mx-auto h-12 w-12 mb-4" />
                <p>No active defects. Check History or log a new one.</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-30rem)]">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {displayedDefects.map(defect => (
                  <Card key={defect.id} className="flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-base font-semibold text-foreground leading-tight break-words flex-grow min-w-0 mr-2" title={defect.title}>{defect.id} - {defect.title}</CardTitle>
                        <div className="flex space-x-1 flex-shrink-0 flex-wrap gap-1">
                            <Badge className={cn("text-xs", severityColors[defect.severity])}>{defect.severity}</Badge>
                            <Badge variant="outline" className={cn("text-xs", priorityColors[defect.priority])}>{defect.priority}</Badge>
                            <Badge className={cn("text-xs", statusColorsDefect[defect.status])}>{defect.status}</Badge>
                        </div>
                      </div>
                       <CardDescription className="text-xs pt-1 line-clamp-2" title={defect.description}>{defect.description}</CardDescription>
                       <CardDescription className="text-xs pt-1">Module: <span className="font-medium">{defect.module}</span></CardDescription>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1 flex-grow">
                        <div><strong>Reporter:</strong> <span className="text-muted-foreground">{defect.reporter}</span></div>
                        {defect.assignee && <div><strong>Assignee:</strong> <span className="text-muted-foreground">{defect.assignee}</span></div>}
                        {defect.toolUsed && <div><strong>Tool Used:</strong> <span className="text-muted-foreground">{defect.toolUsed}</span></div>} {/* Display Tool Used */}
                        <div><strong>Date Reported:</strong> <span className="text-muted-foreground">{format(defect.dateReported instanceof Timestamp ? defect.dateReported.toDate() : defect.dateReported, 'PP')}</span></div>
                        {defect.dateResolved && <div><strong>Date Resolved:</strong> <span className="text-muted-foreground">{format(defect.dateResolved instanceof Timestamp ? defect.dateResolved.toDate() : defect.dateResolved, 'PP')}</span></div>}
                        {defect.dateClosed && <div><strong>Date Closed:</strong> <span className="text-muted-foreground">{format(defect.dateClosed instanceof Timestamp ? defect.dateClosed.toDate() : defect.dateClosed, 'PP')}</span></div>}

                        <div><strong>Steps:</strong> <pre className="whitespace-pre-wrap font-mono text-muted-foreground text-[11px] bg-muted/50 p-1.5 rounded-sm max-h-20 overflow-y-auto line-clamp-3" title={defect.stepsToReproduce}>{defect.stepsToReproduce}</pre></div>
                        {defect.attachments && defect.attachments.length > 0 && (
                            <div>
                                <strong>Attachments:</strong>
                                <div className="flex flex-wrap gap-2 mt-1">
                                {defect.attachments.map((att, idx) => (
                                    att.type === 'image' ? (
                                        <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" title={att.name}>
                                            <Image src={att.url} alt={att.name} width={40} height={40} className="rounded border object-cover" data-ai-hint="error screenshot" />
                                        </a>
                                    ) : (
                                        <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs" title={att.name}>
                                            <FileUp className="inline h-3 w-3 mr-1" />{att.name.substring(0,15) + (att.name.length > 15 ? '...' : '')}
                                        </a>
                                    )
                                ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-end items-center text-xs text-muted-foreground border-t pt-3 mt-auto gap-1 flex-wrap">
                       <div className="flex space-x-1">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleEditDefect(defect)}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleDeleteClick(defect)}><Trash2 className="h-3.5 w-3.5" /></Button>
                       </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={isCreateModalOpen ? setIsCreateModalOpen : setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{isEditModalOpen ? `Edit Defect: ${currentDefect?.id}` : 'Log New Defect'}</DialogTitle>
            <DialogDescription>
              {isEditModalOpen ? 'Modify the details of the existing defect.' : 'Fill in the details for the new defect.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(isEditModalOpen ? handleUpdateDefect : handleCreateDefect)}>
              {renderDefectFormFields()}
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit"><Save className="mr-2 h-4 w-4" /> {isEditModalOpen ? 'Save Changes' : 'Log Defect'}</Button>
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
              This action will permanently delete the defect "{defectToDelete?.title}". This cannot be undone.
            </AlertDialogDescriptionNested>
          </AlertDialogHeaderNested>
          <AlertDialogFooterNested>
            <AlertDialogCancel onClick={() => setDefectToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDefect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Delete Defect
            </AlertDialogAction>
          </AlertDialogFooterNested>
        </AlertDialogContentNested>
      </AlertDialog>

      <Card className="shadow-lg mt-6">
        <CardHeader>
          <CardTitle className="text-primary flex items-center"><ReportIcon className="mr-2 h-5 w-5 text-accent"/>Defect Report Preview &amp; Export</CardTitle>
          <CardDescription>Generate a preview of your defects and export them.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...defectReportInfoForm}>
                <form onSubmit={defectReportInfoForm.handleSubmit(onSubmitDefectReportData)} className="space-y-4 mb-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <FormField control={defectReportInfoForm.control} name="projectName" render={({ field }) => (
                            <FormItem><FormLabel>Project Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={defectReportInfoForm.control} name="clientName" render={({ field }) => (
                            <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={defectReportInfoForm.control} name="createdBy" render={({ field }) => (
                            <FormItem><FormLabel>Generated By</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <Button type="submit" disabled={isGeneratingReport || displayedDefects.length === 0} className="self-end">
                            {isGeneratingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ReportIcon className="mr-2 h-4 w-4" />}
                            Generate Report Data
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
                            {defectReportData && defectReportData.defects.length > 0 ? (
                                <div id="defect-excel-report-preview-container">
                                    <ScrollArea className="h-[400px] border rounded-md p-2">
                                        <div className="space-y-1 mb-4 p-2 text-sm border-b pb-4">
                                            {getDefectExcelPreviewData().details.map((detail, index) => (
                                                <div key={`detail-${index}`} className="flex">
                                                    <span className="font-semibold w-40 shrink-0">{detail.label}</span>
                                                    <span className="ml-2 text-muted-foreground">{detail.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    {getDefectExcelPreviewData().headers.map(header => (
                                                        <TableHead key={header}>{header}</TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {getDefectExcelPreviewData().defectRows.map((defectRow, index) => (
                                                    <TableRow key={`row-${index}`}>
                                                        {getDefectExcelPreviewData().headers.map(header => (
                                                            <TableCell key={`${header}-${index}`}>{defectRow[header]}</TableCell>
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
                                    <p>Click "Generate Report Data" to see the Excel preview.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                 </TabsContent>
           </Tabs>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-end gap-3 pt-4 border-t">
             <Button variant="outline" onClick={() => handleExportDefects('excel')} disabled={!defectReportData || isGeneratingReport} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Export Defects as Excel
            </Button>
            <Button variant="outline" onClick={() => handleExportDefects('pdf')} disabled={!defectReportData || isGeneratingReport} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Export Defects as PDF
            </Button>
        </CardFooter>
      </Card>

      <Card className="shadow-lg mt-6">
        <CardHeader>
          <CardTitle className="text-primary flex items-center"><BarChart3 className="mr-2 h-5 w-5 text-accent"/>Defect Analytics</CardTitle>
          <CardDescription>
            Analyze defect trends, resolution times, and distributions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Active Defects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayedDefects.length}</div>
              </CardContent>
            </Card>
             <Card className="md:col-span-1">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Defects by Status</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] pl-0">
                     {defectsByStatus.length > 0 ? (
                        <ChartContainer config={chartConfigBase} className="w-full h-full">
                            <ResponsiveContainer>
                                <RechartsBarChart data={defectsByStatus} layout="vertical" margin={{ left: 10, right:10, top:5, bottom:5 }}>
                                    <CartesianGrid horizontal={false} />
                                    <XAxis type="number" dataKey="count" allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                    <Bar dataKey="count" fill="var(--color-count)" radius={4} barSize={20} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                     ) : (<p className="text-xs text-muted-foreground text-center pt-10">No data for status chart.</p>)}
                </CardContent>
            </Card>
            <Card className="md:col-span-1">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Defects by Severity</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] pl-0">
                    {defectsBySeverity.length > 0 ? (
                        <ChartContainer config={chartConfigBase} className="w-full h-full">
                            <ResponsiveContainer>
                                <RechartsBarChart data={defectsBySeverity} layout="vertical" margin={{ left: 10, right:10, top:5, bottom:5 }}>
                                    <CartesianGrid horizontal={false} />
                                    <XAxis type="number" dataKey="count" allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                    <Bar dataKey="count" fill="var(--color-count)" radius={4} barSize={20} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    ) : (<p className="text-xs text-muted-foreground text-center pt-10">No data for severity chart.</p>)}
                </CardContent>
            </Card>
             <Card className="md:col-span-1">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Defects by Priority</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] pl-0">
                     {defectsByPriority.length > 0 ? (
                        <ChartContainer config={chartConfigBase} className="w-full h-full">
                            <ResponsiveContainer>
                                <RechartsBarChart data={defectsByPriority} layout="vertical" margin={{ left: 10, right:10, top:5, bottom:5 }}>
                                    <CartesianGrid horizontal={false} />
                                    <XAxis type="number" dataKey="count" allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                    <Bar dataKey="count" fill="var(--color-count)" radius={4} barSize={20} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                     ) : (<p className="text-xs text-muted-foreground text-center pt-10">No data for priority chart.</p>)}
                </CardContent>
            </Card>
            <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center"><TrendingUp className="mr-2 h-4 w-4"/>Resolution Time Trends</CardTitle>
                    <CardDescription className="text-xs">Average days to resolve defects (by reported month).</CardDescription>
                </CardHeader>
                <CardContent className="h-[200px] pl-0">
                    {resolutionTimeData.length > 0 ? (
                         <ChartContainer config={chartConfigBase} className="w-full h-full">
                            <ResponsiveContainer>
                                <LineChart data={resolutionTimeData} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                                    <XAxis dataKey="month" />
                                    <YAxis dataKey="avgResolutionTime" allowDecimals={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Line type="monotone" dataKey="avgResolutionTime" stroke="var(--color-avgResolutionTime)" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                         </ChartContainer>
                    ) : (<p className="text-xs text-muted-foreground text-center pt-10">Not enough data for resolution time trends.</p>)}
                </CardContent>
            </Card>
            <Card className="md:col-span-3">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center"><Layers className="mr-2 h-4 w-4"/>Defect Density by Module</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center"> {/* Increased height for Pie chart legend */}
                     {defectsByModule.length > 0 ? (
                        <ChartContainer config={chartConfigBase} className="w-full h-full">
                            <ResponsiveContainer>
                                <PieChart>
                                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                                    <Pie data={defectsByModule} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                                        {defectsByModule.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <ChartLegend content={<ChartLegendContent nameKey="name" />} className="-translate-y-2 flex-wrap gap-1 [&>*]:basis-1/3 [&>*]:justify-center text-xs"/>
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                     ) : (<p className="text-xs text-muted-foreground text-center">No data for module density chart.</p>)}
                </CardContent>
            </Card>
          </div>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">Analytics based on currently active defects.</p>
        </CardFooter>
      </Card>
    </>
  );
}
