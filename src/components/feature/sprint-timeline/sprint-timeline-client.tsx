// src/components/feature/sprint-timeline/sprint-timeline-client.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { PlusCircle, CalendarRange, ListTodo, Construction, ExternalLink, Pencil, Save, X, User, Trash2 } from 'lucide-react'; // Added Trash2 icon
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
// Removed Image import as SprintCalendarView will be used
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent as AlertDialogContentNested, AlertDialogDescription as AlertDialogDescriptionNested, AlertDialogFooter as AlertDialogFooterNested, AlertDialogHeader as AlertDialogHeaderNested, AlertDialogTitle as AlertDialogTitleNested
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHistory } from '@/contexts/HistoryContext';
import type { HistoryItemType } from '@/types/history';
import { SprintCalendarView } from './sprint-calendar-view'; // Import the new component

// Zod schema for validating sprint edits
const editSprintSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Sprint name cannot be empty."),
    startDate: z.date({ required_error: "Start date is required." }),
    endDate: z.date({ required_error: "End date is required." }),
}).refine((data) => data.endDate >= data.startDate, {
    message: "End date cannot be earlier than start date.",
    path: ["endDate"],
});
export type EditSprintFormValues = z.infer<typeof editSprintSchema>;

// Zod schema for creating new sprints
const newSprintSchema = z.object({
    name: z.string().min(1, "Sprint name cannot be empty."),
    startDate: z.date({ required_error: "Start date is required." }),
    endDate: z.date({ required_error: "End date is required." }),
}).refine((data) => data.endDate >= data.startDate, {
    message: "End date cannot be earlier than start date.",
    path: ["endDate"],
});
type NewSprintFormValues = z.infer<typeof newSprintSchema>;

// Zod schema for adding/editing tasks
const taskSchema = z.object({
    id: z.string().optional(), // Optional for new tasks, required for editing
    title: z.string().min(1, "Task title cannot be empty."),
    description: z.string().optional(),
    status: z.enum(['To Do', 'In Progress', 'Done', 'Blocked']),
    assignee: z.string().optional(),
    jiraLink: z.string().url({ message: "Invalid URL. Please include http:// or https://" }).optional().or(z.literal('')),
});
type TaskFormValues = z.infer<typeof taskSchema>;


// Mock data structures
export interface SprintTask { // Exported for SprintCalendarView
    id: string;
    title: string;
    description: string;
    status: 'To Do' | 'In Progress' | 'Done' | 'Blocked';
    assignee?: string;
    jiraLink?: string;
}

export interface Sprint { // Exported for SprintCalendarView
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    tasks: SprintTask[];
    // Add title for history context compatibility
    title?: string;
}

const mockSprints: Sprint[] = [
    {
        id: 'sprint-1',
        name: 'Sprint Alpha (Q3-W1/W2)',
        title: 'Sprint Alpha (Q3-W1/W2)',
        startDate: new Date(2024, 6, 1),
        endDate: new Date(2024, 6, 14),
        tasks: [
            { id: 't1', title: 'Setup Project Structure', description: 'Initialize repository and basic layout.', status: 'Done', assignee: 'Alice', jiraLink: 'https://your-jira.com/browse/PROJ-101' },
            { id: 't2', title: 'Implement Login Page UI', description: 'Create the login form components.', status: 'In Progress', assignee: 'Bob', jiraLink: 'https://your-jira.com/browse/PROJ-102' },
            { id: 't3', title: 'Define API Endpoints', description: 'Swagger documentation for core APIs.', status: 'Blocked', assignee: 'Charlie' },
            { id: 't6', title: 'Write Unit Tests for Auth', description: 'Cover core authentication logic.', status: 'To Do', assignee: 'Alice'},
        ]
    },
    {
        id: 'sprint-2',
        name: 'Sprint Bravo (Q3-W3/W4)',
        title: 'Sprint Bravo (Q3-W3/W4)',
        startDate: new Date(2024, 6, 15),
        endDate: new Date(2024, 6, 28),
        tasks: [
             { id: 't4', title: 'Integrate Authentication', description: 'Connect login UI to Firebase Auth.', status: 'To Do', assignee: 'Bob', jiraLink: 'https://your-jira.com/browse/PROJ-105' },
             { id: 't5', title: 'Develop Dashboard Widgets', description: 'Create reusable card components.', status: 'To Do', assignee: 'Charlie' },
        ]
    },
];

const taskStatusOptions: SprintTask['status'][] = ['To Do', 'In Progress', 'Done', 'Blocked'];

const statusMap: Record<SprintTask['status'], { color: string, label: string }> = {
    'To Do': { color: 'bg-gray-200 text-gray-800', label: 'To Do' },
    'In Progress': { color: 'bg-blue-200 text-blue-800', label: 'In Progress' },
    'Done': { color: 'bg-green-200 text-green-800', label: 'Done' },
    'Blocked': { color: 'bg-red-200 text-red-800', label: 'Blocked' },
};

export default function SprintTimelineClient() {
    const [sprints, setSprints] = useState<Sprint[]>(mockSprints.map(s => ({...s, title: s.name})));
    const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(sprints[0] || null);
    const [isEditSprintModalOpen, setIsEditSprintModalOpen] = useState(false);
    const [sprintToEdit, setSprintToEdit] = useState<Sprint | null>(null);
    const [isCreateSprintModalOpen, setIsCreateSprintModalOpen] = useState(false);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false); // State for Edit Task Modal
    const [taskToEdit, setTaskToEdit] = useState<SprintTask | null>(null); // State for task being edited
    const { toast } = useToast();
    const { addToHistory, isItemInHistory } = useHistory();
    const [showDeleteSprintConfirmDialog, setShowDeleteSprintConfirmDialog] = useState(false);
    const [sprintToDelete, setSprintToDelete] = useState<Sprint | null>(null);
    const [showDeleteTaskConfirmDialog, setShowDeleteTaskConfirmDialog] = useState(false); // For task deletion
    const [taskToDelete, setTaskToDelete] = useState<{sprintId: string, taskId: string, taskTitle: string} | null>(null); // For task deletion


    const editSprintForm = useForm<EditSprintFormValues>({
        resolver: zodResolver(editSprintSchema),
    });

    const newSprintForm = useForm<NewSprintFormValues>({
        resolver: zodResolver(newSprintSchema),
        defaultValues: {
            name: '',
            startDate: new Date(),
            endDate: new Date(new Date().setDate(new Date().getDate() + 14)), // Default 2 weeks
        }
    });

    const taskForm = useForm<TaskFormValues>({ // Unified form for add/edit task
        resolver: zodResolver(taskSchema),
        defaultValues: {
            title: '',
            description: '',
            status: 'To Do',
            assignee: '',
            jiraLink: '',
        }
    });

    const displayedSprints = useMemo(() => {
      return sprints.filter(sprint => !isItemInHistory(sprint.id, 'sprint'));
    }, [sprints, isItemInHistory]);

    useEffect(() => {
        if (!selectedSprint && displayedSprints.length > 0) {
            setSelectedSprint(displayedSprints[0]);
        } else if (selectedSprint && !displayedSprints.find(s => s.id === selectedSprint.id)) {
            setSelectedSprint(displayedSprints[0] || null);
        }
    }, [displayedSprints, selectedSprint]);


    useEffect(() => {
        if (sprintToEdit) {
            editSprintForm.reset({
                id: sprintToEdit.id,
                name: sprintToEdit.name,
                startDate: sprintToEdit.startDate,
                endDate: sprintToEdit.endDate,
            });
        } else {
            editSprintForm.reset({
                id: '',
                name: '',
                startDate: new Date(),
                endDate: new Date(),
            });
        }
    }, [sprintToEdit, editSprintForm]);

    useEffect(() => { // For populating edit task form
        if (taskToEdit && isEditTaskModalOpen) {
            taskForm.reset({
                id: taskToEdit.id,
                title: taskToEdit.title,
                description: taskToEdit.description || '',
                status: taskToEdit.status,
                assignee: taskToEdit.assignee || '',
                jiraLink: taskToEdit.jiraLink || '',
            });
        } else {
             taskForm.reset({
                title: '', description: '', status: 'To Do', assignee: '', jiraLink: '', id: undefined
            });
        }
    }, [taskToEdit, isEditTaskModalOpen, taskForm]);

    const handleOpenCreateSprintModal = () => {
        newSprintForm.reset({
            name: '',
            startDate: new Date(),
            endDate: new Date(new Date().setDate(new Date().getDate() + 14)),
        });
        setIsCreateSprintModalOpen(true);
    };

    const handleSaveNewSprint = (data: NewSprintFormValues) => {
        const newSprint: Sprint = {
            id: `sprint-${Date.now()}`,
            ...data,
            tasks: [],
            title: data.name,
        };
        setSprints(prev => [...prev, newSprint]);
        setSelectedSprint(newSprint);
        setIsCreateSprintModalOpen(false);
        toast({ title: "Sprint Created", description: `Sprint "${newSprint.name}" added successfully.` });
    };

    const handleOpenAddTaskModal = () => {
        if (!selectedSprint) return;
        taskForm.reset({ // Use unified taskForm
            title: '', description: '', status: 'To Do', assignee: '', jiraLink: '', id: undefined
        });
        setIsAddTaskModalOpen(true);
    };

    const handleSaveNewTask = (data: TaskFormValues) => {
        if (!selectedSprint) return;
        const newTask: SprintTask = {
            id: `task-${Date.now()}`,
            title: data.title,
            description: data.description || '',
            status: data.status,
            assignee: data.assignee || undefined,
            jiraLink: data.jiraLink || undefined,
        };
        const updatedSprints = sprints.map(s =>
            s.id === selectedSprint.id
                ? { ...s, tasks: [...s.tasks, newTask] }
                : s
        );
        setSprints(updatedSprints);
        setSelectedSprint(prev => prev ? { ...prev, tasks: [...prev.tasks, newTask] } : null);
        setIsAddTaskModalOpen(false);
        toast({ title: "Task Added", description: `Task "${newTask.title}" added to sprint "${selectedSprint.name}".` });
    };

    const handleEditTaskClick = (task: SprintTask) => {
        if (!selectedSprint) return;
        setTaskToEdit(task);
        setIsEditTaskModalOpen(true);
    };

    const handleSaveTaskEdit = (data: TaskFormValues) => {
        if (!selectedSprint || !taskToEdit) return;
        const updatedTask: SprintTask = {
            ...taskToEdit,
            title: data.title,
            description: data.description || '',
            status: data.status,
            assignee: data.assignee || undefined,
            jiraLink: data.jiraLink || undefined,
        };
        const updatedSprints = sprints.map(s =>
            s.id === selectedSprint.id
                ? { ...s, tasks: s.tasks.map(t => t.id === updatedTask.id ? updatedTask : t) }
                : s
        );
        setSprints(updatedSprints);
        setSelectedSprint(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t) } : null);
        setIsEditTaskModalOpen(false);
        setTaskToEdit(null);
        toast({ title: "Task Updated", description: `Task "${updatedTask.title}" details saved.` });
    };

    const handleDeleteTaskClick = (sprintId: string, taskId: string, taskTitle: string) => {
        setTaskToDelete({ sprintId, taskId, taskTitle });
        setShowDeleteTaskConfirmDialog(true);
    };

    const confirmDeleteTask = () => {
        if (!taskToDelete) return;
        const { sprintId, taskId, taskTitle } = taskToDelete;
        setSprints(prevSprints =>
            prevSprints.map(s =>
                s.id === sprintId ? { ...s, tasks: s.tasks.filter(t => t.id !== taskId) } : s
            )
        );
        if (selectedSprint?.id === sprintId) {
            setSelectedSprint(prev => prev ? { ...prev, tasks: prev.tasks.filter(t => t.id !== taskId) } : null);
        }
        toast({ title: "Task Deleted", description: `Task "${taskTitle}" removed.` });
        setShowDeleteTaskConfirmDialog(false);
        setTaskToDelete(null);
    };


    const handleEditSprintClick = (sprint: Sprint) => {
        setSprintToEdit(sprint);
        setIsEditSprintModalOpen(true);
    };

     const handleSaveSprintEdit = (data: EditSprintFormValues) => {
        setSprints(prevSprints =>
            prevSprints.map(s =>
                s.id === data.id
                    ? { ...s, name: data.name, title: data.name, startDate: data.startDate, endDate: data.endDate }
                    : s
            )
        );
        if (selectedSprint?.id === data.id) {
            setSelectedSprint(prev => prev ? { ...prev, name: data.name, title: data.name, startDate: data.startDate, endDate: data.endDate } : null);
        }
        setIsEditSprintModalOpen(false);
        setSprintToEdit(null);
        toast({ title: "Sprint Updated", description: `Sprint "${data.name}" details saved.` });
    };

    const handleDeleteSprintClick = (sprint: Sprint) => {
        setSprintToDelete(sprint);
        setShowDeleteSprintConfirmDialog(true);
    };

    const confirmDeleteSprint = () => {
        if (sprintToDelete) {
            addToHistory({...sprintToDelete, title: sprintToDelete.name }, 'sprint' as HistoryItemType);
            toast({ title: "Sprint Moved to History", description: `Sprint "${sprintToDelete.name}" moved to history.` });
        }
        setShowDeleteSprintConfirmDialog(false);
        setSprintToDelete(null);
    };

    const getStatusBadge = (status: SprintTask['status']) => {
        const config = statusMap[status] || { color: 'bg-gray-500 text-white', label: status || 'N/A' };
        return (
            <Badge className={`text-xs font-medium ${config.color} border-transparent`}>
                {config.label}
            </Badge>
        );
    };

    const renderTaskFormFields = (formInstance: typeof taskForm) => ( // Accept form instance
        <div className="grid gap-4 py-4">
            <FormField
                control={formInstance.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Task Title</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Design new logo" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={formInstance.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Provide more details about the task..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={formInstance.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Status</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {taskStatusOptions.map(status => (
                                        <SelectItem key={status} value={status}>{status}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={formInstance.control}
                    name="assignee"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Assignee (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Alice" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <FormField
                control={formInstance.control}
                name="jiraLink"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Jira Link (Optional)</FormLabel>
                        <FormControl>
                            <Input type="url" placeholder="https://your-jira.com/browse/TASK-123" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );


    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-primary flex items-center"><CalendarRange className="mr-2 h-5 w-5 text-accent"/> Sprints</CardTitle>
                        <CardDescription>Manage your project sprints.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px] mb-4 pr-3">
                            <div className="space-y-3">
                                {displayedSprints.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-4">No active sprints. Check History or create a new one.</p>
                                ) : (
                                    displayedSprints.map((sprint) => (
                                        <div key={sprint.id} className="flex items-center gap-2">
                                            <Button
                                                variant={selectedSprint?.id === sprint.id ? "secondary" : "ghost"}
                                                className="w-full justify-between items-center text-left h-auto py-2 flex-grow"
                                                onClick={() => setSelectedSprint(sprint)}
                                            >
                                                <div>
                                                    <p className="font-semibold">{sprint.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {format(sprint.startDate, 'PP')} - {format(sprint.endDate, 'PP')}
                                                    </p>
                                                </div>
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSprintClick(sprint)} className="text-destructive hover:bg-destructive/10 h-9 w-9" title="Delete Sprint">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleOpenCreateSprintModal} className="w-full">
                            <PlusCircle className="mr-2 h-4 w-4" /> Create New Sprint
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="md:col-span-2 shadow-lg">
                    <CardHeader>
                        {selectedSprint ? (
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-primary flex items-center"><ListTodo className="mr-2 h-5 w-5 text-accent"/> {selectedSprint.name} - Tasks</CardTitle>
                                    <CardDescription>
                                        {format(selectedSprint.startDate, 'PP')} to {format(selectedSprint.endDate, 'PP')}
                                    </CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => handleEditSprintClick(selectedSprint)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit Sprint
                                </Button>
                            </div>
                        ) : (
                            <>
                                <CardTitle className="text-primary flex items-center"><ListTodo className="mr-2 h-5 w-5 text-accent"/> Select a Sprint</CardTitle>
                                <CardDescription>Choose a sprint from the left panel to view its tasks.</CardDescription>
                            </>
                        )}
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px] pr-3">
                            {selectedSprint ? (
                                selectedSprint.tasks.length === 0 ? (
                                    <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg">
                                        <p>No tasks added to this sprint yet.</p>
                                    </div>
                                ) : (
                                <div className="space-y-3">
                                    {selectedSprint.tasks.map((task) => (
                                        <Card key={task.id} className="bg-background border hover:shadow-md transition-shadow">
                                            <CardContent className="p-3">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="flex-grow">
                                                        <p className="font-medium text-sm text-foreground">{task.title}</p>
                                                        {task.description && <p className="text-xs text-muted-foreground mt-1">{task.description}</p>}
                                                        {task.jiraLink && (
                                                            <a
                                                                href={task.jiraLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                                            >
                                                                <ExternalLink className="h-3 w-3" /> Jira Task
                                                            </a>
                                                        )}
                                                    </div>
                                                    <div className="text-right space-y-1 flex-shrink-0 min-w-[100px]"> {/* Adjusted min-width */}
                                                        {getStatusBadge(task.status)}
                                                        {task.assignee && (
                                                             <Badge variant="outline" className="text-xs font-normal flex items-center gap-1">
                                                                <User className="h-3 w-3"/> {task.assignee}
                                                             </Badge>
                                                         )}
                                                         <div className="flex justify-end gap-1 mt-1">
                                                            <Button variant="ghost" size="icon" onClick={() => handleEditTaskClick(task)} className="h-7 w-7 text-muted-foreground hover:text-primary" title="Edit Task">
                                                                <Pencil className="h-3.5 w-3.5"/>
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTaskClick(selectedSprint.id, task.id, task.title)} className="h-7 w-7 text-muted-foreground hover:text-destructive" title="Delete Task">
                                                                <Trash2 className="h-3.5 w-3.5"/>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )
                            ) : (
                                <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg">
                                    <Construction className="h-12 w-12 mb-4"/>
                                    <p>Select a sprint to view details.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                    <CardFooter>
                        {selectedSprint && (
                            <Button onClick={handleOpenAddTaskModal} className="w-full" disabled={!selectedSprint}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Task to Sprint
                            </Button>
                        )}
                    </CardFooter>
                </Card>

                <Card className="md:col-span-3 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-primary flex items-center"><CalendarRange className="mr-2 h-5 w-5 text-accent"/> Sprint Timeline Visualization</CardTitle>
                        <CardDescription>Visual overview of the selected sprint and its tasks on a calendar.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center text-center py-6">
                        {selectedSprint ? (
                            <SprintCalendarView selectedSprint={selectedSprint} />
                        ) : (
                            <>
                                <Construction className="h-16 w-16 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">Select a sprint to view its timeline visualization.</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Sprint Modal */}
            <Dialog open={isEditSprintModalOpen} onOpenChange={setIsEditSprintModalOpen}>
                 <DialogContent>
                     <DialogHeader>
                         <DialogTitle>Edit Sprint: {sprintToEdit?.name}</DialogTitle>
                         <DialogDescription>Modify the details for this sprint.</DialogDescription>
                     </DialogHeader>
                     <Form {...editSprintForm}>
                        <form onSubmit={editSprintForm.handleSubmit(handleSaveSprintEdit)}>
                            <div className="grid gap-4 py-4">
                                <input type="hidden" {...editSprintForm.register('id')} />
                                <FormField
                                    control={editSprintForm.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editSprintForm.control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Start Date</FormLabel>
                                            <FormControl>
                                                <DatePicker date={field.value} setDate={field.onChange} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={editSprintForm.control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>End Date</FormLabel>
                                            <FormControl>
                                                <DatePicker date={field.value} setDate={field.onChange} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">Cancel</Button>
                                </DialogClose>
                                <Button type="submit"><Save className="mr-2 h-4 w-4"/> Save Changes</Button>
                            </DialogFooter>
                        </form>
                     </Form>
                 </DialogContent>
            </Dialog>

             {/* Create Sprint Modal */}
            <Dialog open={isCreateSprintModalOpen} onOpenChange={setIsCreateSprintModalOpen}>
                 <DialogContent>
                     <DialogHeader>
                         <DialogTitle>Create New Sprint</DialogTitle>
                         <DialogDescription>Define the name and duration for the new sprint.</DialogDescription>
                     </DialogHeader>
                     <Form {...newSprintForm}>
                        <form onSubmit={newSprintForm.handleSubmit(handleSaveNewSprint)}>
                            <div className="grid gap-4 py-4">
                                <FormField
                                    control={newSprintForm.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Sprint Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., Sprint Gamma (Q3-W7/W8)" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={newSprintForm.control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Start Date</FormLabel>
                                            <FormControl>
                                                <DatePicker date={field.value} setDate={field.onChange} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={newSprintForm.control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>End Date</FormLabel>
                                            <FormControl>
                                                <DatePicker date={field.value} setDate={field.onChange} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">Cancel</Button>
                                </DialogClose>
                                <Button type="submit"><PlusCircle className="mr-2 h-4 w-4"/> Create Sprint</Button>
                            </DialogFooter>
                        </form>
                     </Form>
                 </DialogContent>
            </Dialog>

             {/* Add/Edit Task Modal (Unified) */}
             <Dialog open={isAddTaskModalOpen || isEditTaskModalOpen} onOpenChange={isAddTaskModalOpen ? setIsAddTaskModalOpen : setIsEditTaskModalOpen}>
                 <DialogContent className="sm:max-w-[525px]">
                     <DialogHeader>
                         <DialogTitle>{isEditTaskModalOpen ? 'Edit Task' : `Add New Task to ${selectedSprint?.name}`}</DialogTitle>
                         <DialogDescription>{isEditTaskModalOpen ? 'Modify the details of this task.' : 'Fill in the details for the new task.'}</DialogDescription>
                     </DialogHeader>
                     <Form {...taskForm}>
                        <form onSubmit={taskForm.handleSubmit(isEditTaskModalOpen ? handleSaveTaskEdit : handleSaveNewTask)}>
                           {renderTaskFormFields(taskForm)}
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">Cancel</Button>
                                </DialogClose>
                                <Button type="submit">
                                    {isEditTaskModalOpen ? <Save className="mr-2 h-4 w-4"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                                    {isEditTaskModalOpen ? 'Save Task Changes' : 'Add Task'}
                                </Button>
                            </DialogFooter>
                        </form>
                     </Form>
                 </DialogContent>
            </Dialog>

            {/* Delete Sprint Confirmation Dialog */}
            <AlertDialog open={showDeleteSprintConfirmDialog} onOpenChange={setShowDeleteSprintConfirmDialog}>
                <AlertDialogContentNested>
                    <AlertDialogHeaderNested>
                        <AlertDialogTitleNested>Confirm Delete Sprint</AlertDialogTitleNested>
                        <AlertDialogDescriptionNested>
                            Are you sure you want to delete the sprint "{sprintToDelete?.name}"? This action will move it to history.
                        </AlertDialogDescriptionNested>
                    </AlertDialogHeaderNested>
                    <AlertDialogFooterNested>
                        <AlertDialogCancel onClick={() => setSprintToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteSprint} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete Sprint
                        </AlertDialogAction>
                    </AlertDialogFooterNested>
                </AlertDialogContentNested>
            </AlertDialog>

            {/* Delete Task Confirmation Dialog */}
             <AlertDialog open={showDeleteTaskConfirmDialog} onOpenChange={setShowDeleteTaskConfirmDialog}>
                <AlertDialogContentNested>
                    <AlertDialogHeaderNested>
                        <AlertDialogTitleNested>Confirm Delete Task</AlertDialogTitleNested>
                        <AlertDialogDescriptionNested>
                            Are you sure you want to delete the task "{taskToDelete?.taskTitle}"? This action cannot be undone directly from here.
                        </AlertDialogDescriptionNested>
                    </AlertDialogHeaderNested>
                    <AlertDialogFooterNested>
                        <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete Task
                        </AlertDialogAction>
                    </AlertDialogFooterNested>
                </AlertDialogContentNested>
            </AlertDialog>
        </>
    );
}
