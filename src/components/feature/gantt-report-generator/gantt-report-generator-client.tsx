
'use client';

import { useState, useEffect, type ChangeEvent, useRef } from 'react';
import { useForm, useFieldArray, Controller, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse, isValid } from 'date-fns';
import * as XLSX from 'xlsx'; // Import xlsx library
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription, useFormField } from '@/components/ui/form';
import { DatePicker } from '@/components/ui/date-picker';
import { PlusCircle, Trash2, Download, FileText, CalendarIcon, Loader2, UserPlus, SquarePlus, Mail, Construction, ShieldCheck, Accessibility, Pencil, ClipboardList, Gauge, TableIcon, CheckCircle, XCircle, Image as ImageIcon, ALargeSmall, UploadCloud, X as XIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskCalendarView } from './task-calendar-view';
import { SimplifiedGanttView } from './simplified-gantt-view';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import Image from 'next/image';

// Define Zod schemas
const taskSchema = z.object({
  date: z.date({ required_error: "Task date is required." }),
  description: z.string().min(1, "Task description cannot be empty."),
  hours: z.number().min(0.1, "Hours must be at least 0.1").max(24, "Hours cannot exceed 24").optional(),
  sprint: z.string().min(1, "Sprint is required."),
  module: z.string().min(1, "Module is required."),
  status: z.enum(['Pass', 'Fail'], { required_error: "Status is required." }),
});

const memberSchema = z.object({
  name: z.string().min(1, "Member name cannot be empty."),
  tasks: z.array(taskSchema).min(1, "Each member must have at least one task."),
});

const reportSchema = z.object({
  month: z.string().min(1, "Month is required (e.g., July 2024)."),
  projectName: z.string().min(1, "Project name is required."),
  clientName: z.string().min(1, "Client name is required."),
  projectNameFontSize: z.number().min(8).max(72).optional(),
  createdBy: z.string().min(1, "Creator name is required."),
  submissionDate: z.date({ required_error: "Submission date is required." }),
  teamMembers: z.array(memberSchema).min(1, "At least one team member is required."),
});

export type TaskFormValues = z.infer<typeof taskSchema>;
export type MemberFormValues = z.infer<typeof memberSchema>;
export type ReportFormValues = z.infer<typeof reportSchema> & { logoPreviewUrl?: string | null };

// Define a type for the items in the details array for preview
type ReportDetailItem = 
  | { type: 'logo'; value: React.ReactNode; label?: undefined } 
  | { type: 'projectName'; value: React.ReactNode; label?: undefined } 
  | { type: 'detail'; label: string; value: string | React.ReactNode };


const defaultFontSizeOptions = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];

export default function GanttReportGeneratorClient() {
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportFormValues | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      month: format(new Date(), 'yyyy-MM'),
      clientName: '',
      projectName: '',
      projectNameFontSize: 16,
      createdBy: '',
      submissionDate: new Date(),
      teamMembers: [{ name: '', tasks: [{ date: new Date(), description: '', hours: undefined, sprint: '', module: '', status: undefined }] }],
    },
  });

   useEffect(() => {
        const currentValues = form.getValues();
        form.reset({
            ...currentValues,
             month: currentValues.month || format(new Date(), 'yyyy-MM'),
             projectName: currentValues.projectName || '',
             submissionDate: currentValues.submissionDate || new Date(),
             projectNameFontSize: currentValues.projectNameFontSize || 16,
             teamMembers: currentValues.teamMembers?.length > 0 ? currentValues.teamMembers : [{ name: '', tasks: [{ date: new Date(), description: '', hours: undefined, sprint: '', module: '', status: undefined }] }],
        });
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);


  const { fields: memberFields, append: appendMember, remove: removeMember } = useFieldArray({
    control: form.control,
    name: 'teamMembers',
  });

  const useTasksArray = (memberIndex: number) => {
    return useFieldArray({
      control: form.control,
      name: `teamMembers.${memberIndex}.tasks`,
    });
  };

  useEffect(() => {
    setIsClient(true);
    return () => {
        if (logoPreviewUrl) {
            URL.revokeObjectURL(logoPreviewUrl);
        }
    };
  }, [logoPreviewUrl]);

  const handleLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            toast({ title: "Invalid File Type", description: "Please upload an image file (PNG, JPG, GIF, etc.).", variant: "destructive" });
            setLogoFile(null);
            setLogoPreviewUrl(null);
            if (logoInputRef.current) logoInputRef.current.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ title: "File Too Large", description: "Maximum logo size is 5MB.", variant: "destructive" });
            setLogoFile(null);
            setLogoPreviewUrl(null);
            if (logoInputRef.current) logoInputRef.current.value = '';
            return;
        }

        setLogoFile(file);
        if (logoPreviewUrl) {
            URL.revokeObjectURL(logoPreviewUrl);
        }
        setLogoPreviewUrl(URL.createObjectURL(file));
        toast({ title: "Logo Selected", description: file.name });
    } else {
        setLogoFile(null);
        setLogoPreviewUrl(null);
    }
  };

  const clearLogo = () => {
    setLogoFile(null);
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoPreviewUrl(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
    toast({ title: "Logo Cleared" });
  };


  const onSubmit = (data: ReportFormValues) => {
    setIsLoading(true);
    console.log("Report Data Submitted:", data);

    let displayMonth = data.month;
    try {
        const parsedDate = parse(data.month, 'yyyy-MM', new Date());
        if (isValid(parsedDate)) {
            displayMonth = format(parsedDate, 'MMMM yyyy');
        }
    } catch (e) {
        console.warn("Could not parse month input for display format:", data.month);
    }

    setReportData({ ...data, month: displayMonth, logoPreviewUrl: logoPreviewUrl });
    setIsLoading(false);
    toast({
      title: 'Report Data Captured',
      description: 'Data is ready for preview and export.',
    });
  };

   const handleExport = (formatType: 'excel' | 'pdf') => {
     if (!reportData) {
        toast({ title: "No data to export", description: "Please generate the data first using the button below.", variant: "destructive" });
        return;
    }

    if (formatType === 'excel') {
        try {
            const reportDetailsHeader = [
                ["Report Month:", reportData.month],
                ["Project Name:", reportData.projectName],
                ["Client Name:", reportData.clientName],
                ...(reportData.logoPreviewUrl ? [["Logo Uploaded:", "Yes (preview in app)"]] : []), 
                ["Created By:", reportData.createdBy],
                ["Submission Date:", format(reportData.submissionDate, 'yyyy-MM-dd')],
                [], 
            ];

            const taskDataHeader = ["Sr. no", "Date", "Description", "Team Member", "Sprint", "Module", "Status", "Hours"];


            let srNo = 1;
            const taskDataRows = reportData.teamMembers.flatMap(member =>
                member.tasks.sort((a, b) => a.date.getTime() - b.date.getTime()).map(task => ({
                    member: member.name,
                    date: task.date,
                    description: task.description,
                    sprint: task.sprint || '',
                    module: task.module || '',
                    status: task.status || '',
                    hours: task.hours
                }))
            )
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) 
            .map(task => [ 
                srNo++,
                format(task.date, 'yyyy-MM-dd'),
                task.description,
                task.member,
                task.sprint,
                task.module,
                task.status,
                task.hours !== undefined ? task.hours : ''
            ]);

            const worksheetData = [...reportDetailsHeader, taskDataHeader, ...taskDataRows];

            const ws = XLSX.utils.aoa_to_sheet(worksheetData);

            ws['!cols'] = [
                 { wch: 6 },  
                 { wch: 12 }, 
                 { wch: 50 }, 
                 { wch: 20 }, 
                 { wch: 20 }, 
                 { wch: 20 }, 
                 { wch: 10 }, 
                 { wch: 8 }  
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Project Report");

            const fileName = `ProjectReport_${reportData.projectName.replace(/ /g, '_')}_${reportData.month.replace(/ /g, '_')}.xlsx`;
            XLSX.writeFile(wb, fileName);

            toast({
                title: `Exported to Excel`,
                description: `${fileName} downloaded successfully.`,
            });

        } catch (error) {
            console.error("Error exporting to Excel:", error);
            toast({
                title: "Excel Export Failed",
                description: "An error occurred while generating the Excel file.",
                variant: "destructive",
            });
        }
    } else if (formatType === 'pdf') {
        toast({
            title: `Export to PDF Initiated`,
            description: `Generating PDF report... (Functionality Under Development)`,
            variant: 'default',
        });
        console.log(`Exporting data as ${formatType}:`, reportData);
    }
  };

  const getExcelPreviewData = () => {
    if (!reportData) return { headers: [], details: [], tasks: [] };

    const details: ReportDetailItem[] = [];
    
    let projectNameElement: React.ReactNode = (
        <span style={{ fontSize: `${reportData.projectNameFontSize || 16}pt`, fontWeight: 'bold' }}>
            {reportData.projectName}
        </span>
    );

    if (reportData.logoPreviewUrl) {
        projectNameElement = (
            <div className="flex items-center space-x-2"> 
                <Image 
                    src={reportData.logoPreviewUrl} 
                    alt="Project Logo" 
                    width={40} 
                    height={40} 
                    className="object-contain"
                    data-ai-hint="company logo" 
                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} 
                />
                {projectNameElement}
            </div>
        );
    }
    details.push({
        type: 'projectName', 
        value: projectNameElement
    });


    details.push(
        { type: 'detail', label: "Report Month:", value: reportData.month },
        { type: 'detail', label: "Project Name:", value: reportData.projectName },
        { type: 'detail', label: "Client Name:", value: reportData.clientName },
        { type: 'detail', label: "Created By:", value: reportData.createdBy },
        { type: 'detail', label: "Submission Date:", value: format(reportData.submissionDate, 'yyyy-MM-dd') }
    );

    const taskHeaders = ["Sr. no", "Date", "Description", "Team Member", "Sprint", "Module", "Status", "Hours"];
    let srNo = 1;
    const taskData = reportData.teamMembers.flatMap(member =>
        member.tasks.sort((a, b) => a.date.getTime() - b.date.getTime()).map(task => ({
            srNo: srNo++, 
            date: format(task.date, 'yyyy-MM-dd'),
            description: task.description,
            member: member.name,
            sprint: task.sprint || '-',
            module: task.module || '-',
            status: task.status || '-',
            hours: task.hours !== undefined ? task.hours.toString() : '-',
        }))
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    
    taskData.forEach((task, index) => {
        task.srNo = index + 1;
    });

    return { headers: taskHeaders, details, tasks: taskData };
  };


  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading Report Generator...</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary">Report Header Details</CardTitle>
            <CardDescription>Provide the general information for the report.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report Month</FormLabel>
                  <FormControl>
                    <Input type="month" {...field} />
                  </FormControl>
                   <FormDescription>Select the month and year for this report.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Project Alpha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Client Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel className="flex items-center"><ImageIcon className="mr-2 h-4 w-4 text-muted-foreground"/> Logo (Optional)</FormLabel>
              <div className="flex items-center gap-2">
                <Input
                    ref={logoInputRef}
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="flex-grow"
                />
                {logoPreviewUrl && (
                    <Button type="button" variant="ghost" size="icon" onClick={clearLogo} title="Remove logo">
                        <XIcon className="h-4 w-4 text-destructive"/>
                    </Button>
                )}
              </div>
              <FormDescription>Upload a project/client logo (max 5MB).</FormDescription>
              {logoPreviewUrl && (
                <div className="mt-2 border rounded-md p-2 inline-block bg-muted w-[40px] h-[40px] flex items-center justify-center">
                    <Image src={logoPreviewUrl} alt="Logo Preview" width={40} height={40} className="object-contain" data-ai-hint="company logo preview"/>
                </div>
              )}
            </FormItem>

            <FormField
                control={form.control}
                name="projectNameFontSize"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center"><ALargeSmall className="mr-2 h-4 w-4 text-muted-foreground"/>Project Name Font Size (Optional)</FormLabel>
                        <FormControl>
                             <Input
                                type="number"
                                placeholder="16"
                                {...field}
                                value={field.value ?? ''}
                                onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                                min="8"
                                max="72"
                             />
                        </FormControl>
                        <FormDescription>Font size for project name in preview (8-72pt).</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="createdBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Created By</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="submissionDate"
              render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel>Submission Date</FormLabel>
                   <FormControl>
                     <DatePicker
                        date={field.value}
                        setDate={field.onChange}
                        disabled={(field.disabled ?? false) || false} 
                        aria-describedby={useFormField().formDescriptionId}
                        aria-invalid={!!useFormField().error}
                        id={useFormField().formItemId}
                        ref={field.ref}
                     />
                   </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Separator />

        <Card className="shadow-lg">
            <CardHeader>
                 <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-primary">Team Members & Tasks</CardTitle>
                        <CardDescription>Add team members and log their daily tasks, sprints, modules, and status.</CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendMember({ name: '', tasks: [{ date: new Date(), description: '', hours: undefined, sprint: '', module: '', status: undefined }] })}>
                        <UserPlus className="mr-2 h-4 w-4" /> Add Member
                    </Button>
                 </div>
            </CardHeader>
            <CardContent>
                 <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-6">
                        {memberFields.map((member, memberIndex) => (
                        <Card key={member.id} className="border border-dashed p-4 bg-muted/20">
                            <div className="flex justify-between items-center mb-4">
                            <FormField
                                control={form.control}
                                name={`teamMembers.${memberIndex}.name`}
                                render={({ field }) => (
                                <FormItem className="flex-grow mr-4">
                                    <FormLabel>Member Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder={`Team Member ${memberIndex + 1}`} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeMember(memberIndex)}
                                disabled={memberFields.length <= 1}
                                className="mt-6 text-destructive hover:bg-destructive/10"
                                aria-label="Remove Member"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            </div>
                            <TasksSection memberIndex={memberIndex} useTasksArray={useTasksArray} />
                        </Card>
                        ))}
                         {form.formState.errors.teamMembers?.root?.message && (
                                <p className="text-sm font-medium text-destructive">{form.formState.errors.teamMembers.root.message}</p>
                         )}
                         {form.formState.errors.teamMembers && !form.formState.errors.teamMembers?.root?.message && Array.isArray(form.formState.errors.teamMembers) && form.formState.errors.teamMembers.some(m => m?.tasks?.root?.message) && (
                             <p className="text-sm font-medium text-destructive">Please ensure each member has at least one task.</p>
                         )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>

        <Separator />

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary">Report Preview & Export</CardTitle>
             <CardDescription>Review the structured data, visualize tasks on a calendar, and export the report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <Tabs defaultValue="excel" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                     <TabsTrigger value="excel"> <TableIcon className="mr-2 h-4 w-4" />Excel Preview</TabsTrigger>
                     <TabsTrigger value="calendar"> <CalendarIcon className="mr-2 h-4 w-4" />Calendar View</TabsTrigger>
                     <TabsTrigger value="data"> <FileText className="mr-2 h-4 w-4" />Data Preview (JSON)</TabsTrigger>
                     <TabsTrigger value="gantt"> <Gauge className="mr-2 h-4 w-4" />Gantt Chart</TabsTrigger>
                </TabsList>

                 <TabsContent value="excel">
                    <Card className="mt-4">
                        <CardContent className="p-4">
                            {reportData ? (
                                <ScrollArea className="h-[400px] border rounded-md p-2">
                                    <div className="flex items-center justify-center space-x-3 mb-4 p-2 border-b">
                                        {getExcelPreviewData().details.filter(d => d.type === 'projectName').map((detail, index) => (
                                            <div key={`projectHeader-${index}`}>{detail.value}</div>
                                        ))}
                                    </div>

                                    <div className="space-y-2 mb-4 p-2">
                                        {getExcelPreviewData().details.filter(d => d.type === 'detail').map((detail, index) => (
                                            <div key={`detail-${index}`} className="flex text-sm items-center">
                                                <span className="font-semibold w-36 shrink-0">{detail.label}</span>
                                                <span className="ml-2">{detail.value}</span>
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
                                            {getExcelPreviewData().tasks.map((task, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{task.srNo}</TableCell>
                                                    <TableCell>{task.date}</TableCell>
                                                    <TableCell>{task.description}</TableCell>
                                                    <TableCell>{task.member}</TableCell>
                                                    <TableCell>{task.sprint}</TableCell>
                                                    <TableCell>{task.module}</TableCell>
                                                    <TableCell>
                                                        {task.status === 'Pass' && <CheckCircle className="h-4 w-4 text-green-600" />}
                                                        {task.status === 'Fail' && <XCircle className="h-4 w-4 text-red-600" />}
                                                        {task.status !== 'Pass' && task.status !== 'Fail' && task.status}
                                                    </TableCell>
                                                    <TableCell>{task.hours}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            ) : (
                                <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg min-h-[200px] flex flex-col justify-center items-center">
                                    <TableIcon className="mx-auto h-10 w-10 mb-2" />
                                    <p>Submit the form to generate the Excel preview.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                 </TabsContent>

                 <TabsContent value="calendar">
                     <Card className="mt-4">
                         <CardContent className="p-4">
                             {reportData ? (
                                 <TaskCalendarView reportData={reportData} />
                              ) : (
                                 <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg min-h-[200px] flex flex-col justify-center items-center">
                                     <CalendarIcon className="mx-auto h-10 w-10 mb-2" />
                                     <p>Submit the form to generate the calendar view.</p>
                                 </div>
                              )}
                         </CardContent>
                     </Card>
                 </TabsContent>

                <TabsContent value="data">
                    <Card className="mt-4">
                        <CardContent className="p-4">
                         {reportData ? (
                            <ScrollArea className="h-[400px] border rounded-md p-4 bg-muted/50">
                                <pre className="text-xs">{JSON.stringify(reportData, (key, value) => {
                                    if ((key === 'date' || key === 'submissionDate') && value) {
                                        try {
                                            const dateValue = typeof value === 'string' ? parse(value, 'yyyy-MM-dd', new Date()) : value;
                                            if (isValid(dateValue)) {
                                                return format(dateValue, 'yyyy-MM-dd');
                                            }
                                        } catch { return value; }
                                    }
                                     if (key === 'month') { return value; }
                                    return value;
                                    }, 2)}
                                </pre>
                            </ScrollArea>
                          ) : (
                            <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg min-h-[200px] flex flex-col justify-center items-center">
                                <FileText className="mx-auto h-10 w-10 mb-2" />
                                <p>Submit the form to generate the report data preview.</p>
                            </div>
                           )}
                        </CardContent>
                    </Card>
                 </TabsContent>

                 <TabsContent value="gantt">
                     <Card className="mt-4">
                         <CardContent className="p-4">
                            {reportData ? (
                                <SimplifiedGanttView reportData={reportData} />
                             ) : (
                                <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg h-[300px] flex flex-col justify-center items-center">
                                    <Construction className="mx-auto h-10 w-10 mb-2" />
                                    <p>Submit the form to generate the Gantt chart view.</p>
                                </div>
                             )}
                         </CardContent>
                     </Card>
                 </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-end gap-4">
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto order-last sm:order-first self-end">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {reportData ? 'Update Data / Regenerate Preview' : 'Generate Data'}
            </Button>
             <Button type="button" variant="outline" onClick={() => handleExport('excel')} disabled={!reportData || isLoading} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Export as Excel
            </Button>
            <Button type="button" variant="outline" onClick={() => handleExport('pdf')} disabled={true || !reportData || isLoading} title="PDF Export (Coming Soon)" className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Export as PDF (TBD)
            </Button>
             <Button type="button" variant="outline" disabled={true} title="Mail Report (Coming Soon)" className="w-full sm:w-auto">
              <Mail className="mr-2 h-4 w-4" /> Mail Report (TBD)
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

interface TasksSectionProps {
  memberIndex: number;
  useTasksArray: (index: number) => ReturnType<typeof useFieldArray<ReportFormValues, `teamMembers.${number}.tasks`>>;
}

function TasksSection({ memberIndex, useTasksArray }: TasksSectionProps) {
  const { fields: taskFields, append: appendTask, remove: removeTask } = useTasksArray(memberIndex);
  const { control, formState: { errors } } = useFormContext<ReportFormValues>();

  const memberTasksErrors = errors.teamMembers?.[memberIndex]?.tasks;

  return (
    <div className="space-y-4 pl-4 border-l-2 border-primary/50 ml-2">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-foreground">Daily Tasks</h4>
         <Button type="button" variant="secondary" size="sm" onClick={() => appendTask({ date: new Date(), description: '', hours: undefined, sprint: '', module: '', status: undefined })}>
            <SquarePlus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>
      {taskFields.map((task, taskIndex) => (
        <div key={task.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start border-b pb-4 last:border-b-0">
          <FormField
            control={control}
            name={`teamMembers.${memberIndex}.tasks.${taskIndex}.date`}
            render={({ field }) => (
              <FormItem className="flex flex-col w-full">
                <FormLabel>Date</FormLabel>
                <FormControl>
                   <DatePicker
                       date={field.value}
                       setDate={field.onChange}
                       disabled={(field.disabled ?? false) || false}
                       aria-describedby={useFormField().formDescriptionId}
                       aria-invalid={!!useFormField().error}
                       id={useFormField().formItemId}
                       ref={field.ref}
                   />
                </FormControl>
                 <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`teamMembers.${memberIndex}.tasks.${taskIndex}.description`}
            render={({ field }) => (
              <FormItem className="lg:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe the task performed..." {...field} className="min-h-[40px]"/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`teamMembers.${memberIndex}.tasks.${taskIndex}.hours`}
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Hours (Opt.)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="24"
                    placeholder="e.g., 8"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={control}
            name={`teamMembers.${memberIndex}.tasks.${taskIndex}.sprint`}
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Sprint</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Sprint 24.07" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={control}
            name={`teamMembers.${memberIndex}.tasks.${taskIndex}.module`}
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Module</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Authentication" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`teamMembers.${memberIndex}.tasks.${taskIndex}.status`}
            render={({ field }) => (
              <FormItem className="w-full space-y-2">
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex space-x-4"
                  >
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <RadioGroupItem value="Pass" id={`status-pass-${memberIndex}-${taskIndex}`} />
                      </FormControl>
                      <FormLabel htmlFor={`status-pass-${memberIndex}-${taskIndex}`} className={cn("font-normal", field.value === "Pass" && "text-green-600")}>
                        Pass
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <RadioGroupItem value="Fail" id={`status-fail-${memberIndex}-${taskIndex}`} />
                      </FormControl>
                      <FormLabel htmlFor={`status-fail-${memberIndex}-${taskIndex}`} className={cn("font-normal", field.value === "Fail" && "text-red-600")}>
                        Fail
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end items-center lg:col-span-3">
             <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeTask(taskIndex)}
                disabled={taskFields.length <= 1}
                className="text-destructive hover:bg-destructive/10 self-center"
                aria-label="Remove Task"
              >
                <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

       {typeof memberTasksErrors === 'object' && memberTasksErrors && 'root' in memberTasksErrors && memberTasksErrors.root?.message && (
            <p className="text-sm font-medium text-destructive">{memberTasksErrors.root.message}</p>
       )}
        {typeof memberTasksErrors === 'object' && memberTasksErrors && 'message' in memberTasksErrors && typeof memberTasksErrors.message === 'string' && (
            <p className="text-sm font-medium text-destructive">{memberTasksErrors.message}</p>
        )}
    </div>
  );
}





