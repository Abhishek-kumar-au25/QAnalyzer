// src/components/feature/sprint-timeline/sprint-calendar-view.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import type { Sprint, SprintTask } from './sprint-timeline-client';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from '@/components/ui/badge';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, User, ListTodo } from 'lucide-react';

interface SprintCalendarViewProps {
    selectedSprint: Sprint | null;
}

const statusMap: Record<SprintTask['status'], { color: string, label: string }> = {
    'To Do': { color: 'bg-gray-200 text-gray-800', label: 'To Do' },
    'In Progress': { color: 'bg-blue-200 text-blue-800', label: 'In Progress' },
    'Done': { color: 'bg-green-200 text-green-800', label: 'Done' },
    'Blocked': { color: 'bg-red-200 text-red-800', label: 'Blocked' },
};

const getStatusBadge = (status: SprintTask['status']) => {
    const config = statusMap[status] || { color: 'bg-gray-500 text-white', label: status || 'N/A' };
    return (
        <Badge className={`text-xs font-medium ${config.color} border-transparent`}>
            {config.label}
        </Badge>
    );
};


export function SprintCalendarView({ selectedSprint }: SprintCalendarViewProps) {
    const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(new Date());

    useEffect(() => {
        if (selectedSprint) {
            setCurrentCalendarMonth(selectedSprint.startDate);
        } else {
            setCurrentCalendarMonth(new Date());
        }
    }, [selectedSprint]);

    if (!selectedSprint) {
        return (
            <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg h-[300px] flex flex-col justify-center items-center">
                <p>Select a sprint to view its timeline on the calendar.</p>
            </div>
        );
    }

    const sprintInterval = {
        start: startOfDay(selectedSprint.startDate),
        end: endOfDay(selectedSprint.endDate),
    };

    const DayContent = (dayProps: { date: Date; displayMonth: Date }) => {
        const dateKey = format(dayProps.date, 'yyyy-MM-dd');
        const isDayInSprint = isWithinInterval(dayProps.date, sprintInterval);
        const tasksForThisDay = selectedSprint.tasks; // For simplicity, all tasks are shown if day is in sprint

        return (
            <Popover>
                <PopoverTrigger asChild disabled={!isDayInSprint || tasksForThisDay.length === 0}>
                   <div className={cn(
                       "relative h-full w-full flex items-center justify-center rounded-md",
                       isDayInSprint && "bg-primary/10", // Highlight days within sprint
                       tasksForThisDay.length > 0 && isDayInSprint && "cursor-pointer hover:bg-primary/20"
                    )}>
                        <span>{format(dayProps.date, 'd')}</span>
                        {tasksForThisDay.length > 0 && isDayInSprint && (
                             <div className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-primary" />
                        )}
                    </div>
                </PopoverTrigger>
                {tasksForThisDay.length > 0 && isDayInSprint && (
                    <PopoverContent className="w-96 max-h-96">
                        <div className="space-y-3">
                            <h4 className="font-medium leading-none flex items-center">
                                <ListTodo className="mr-2 h-4 w-4 text-accent"/>
                                Tasks for Sprint on {format(dayProps.date, 'PPP')}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                Displaying all tasks for "{selectedSprint.name}" active on this day.
                            </p>
                            <ScrollArea className="max-h-60 pr-3">
                                <div className="space-y-2">
                                    {tasksForThisDay.map((task) => (
                                        <div key={task.id} className="text-sm border-b pb-2 last:border-b-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="font-semibold text-foreground">{task.title}</p>
                                                {getStatusBadge(task.status)}
                                            </div>
                                            {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                                            <div className="flex justify-between items-center mt-1">
                                                {task.assignee && (
                                                     <Badge variant="outline" className="text-xs font-normal flex items-center gap-1">
                                                        <User className="h-3 w-3"/> {task.assignee}
                                                     </Badge>
                                                 )}
                                                {task.jiraLink && (
                                                    <a
                                                        href={task.jiraLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                    >
                                                        <ExternalLink className="h-3 w-3" /> Jira
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </PopoverContent>
                )}
            </Popover>
        );
    };

    return (
        <div className="w-full max-w-xl mx-auto"> {/* Container for better centering and responsiveness */}
            <Calendar
                mode="single"
                month={currentCalendarMonth}
                onMonthChange={setCurrentCalendarMonth}
                selected={undefined} // No single day is "selected" in this view mode
                className="p-0 rounded-md border shadow-md"
                components={{ DayContent }}
                modifiers={{
                    sprintRange: { from: sprintInterval.start, to: sprintInterval.end },
                }}
                modifiersClassNames={{
                    sprintRange: 'bg-accent/20 text-accent-foreground font-semibold rounded-none', // Keep cells square
                }}
                classNames={{
                    month: "space-y-4 p-3", // Add padding to month for better spacing
                    table: "w-full border-collapse",
                    head_row: "flex justify-around",
                    head_cell: "w-12 h-10 flex items-center justify-center text-muted-foreground rounded-md font-normal text-[0.8rem]",
                    row: "flex w-full mt-2 justify-around",
                    cell: "w-12 h-12 text-center text-sm p-0 relative focus-within:relative focus-within:z-20", // Fixed size for cells
                    day: cn(
                        "h-12 w-12 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-muted/50 transition-colors" // Ensure day button fills cell and has hover
                    ),
                    day_today: "bg-primary/20 text-primary-foreground ring-1 ring-primary",
                    day_outside: "text-muted-foreground opacity-30 pointer-events-none", // Dim and disable outside days
                    day_disabled: "text-muted-foreground opacity-50 pointer-events-none",
                }}
            />
            <div className="mt-4 text-center text-xs text-muted-foreground">
                 Days within the sprint "{selectedSprint.name}" are highlighted. Click on a highlighted day to see tasks.
            </div>
        </div>
    );
}
