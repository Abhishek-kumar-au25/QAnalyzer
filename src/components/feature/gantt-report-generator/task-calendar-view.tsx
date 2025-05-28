
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import type { ReportFormValues, TaskFormValues } from './gantt-report-generator-client';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, parse, isValid, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle } from 'lucide-react'; // Import icons for status

interface TaskCalendarViewProps {
    reportData: ReportFormValues | null;
}

interface DayTask {
    member: string;
    task: TaskFormValues;
}

interface TasksByDate {
    [dateKey: string]: DayTask[];
}

export function TaskCalendarView({ reportData }: TaskCalendarViewProps) {
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [tasksByDate, setTasksByDate] = useState<TasksByDate>({});

    useEffect(() => {
        if (reportData?.month) {
            const parsedDate = parse(reportData.month, 'MMMM yyyy', new Date());
            if (isValid(parsedDate)) {
                setCurrentMonth(parsedDate);
            } else {
                const parsedInputDate = parse(reportData.month, 'yyyy-MM', new Date());
                 if (isValid(parsedInputDate)) {
                     setCurrentMonth(parsedInputDate);
                 } else {
                     setCurrentMonth(new Date());
                 }
            }
        } else {
             setCurrentMonth(new Date());
        }
    }, [reportData?.month]);

    useEffect(() => {
        if (reportData?.teamMembers) {
            const groupedTasks: TasksByDate = {};
            reportData.teamMembers.forEach(member => {
                member.tasks.forEach(task => {
                     if (isValid(task.date)) {
                        const dateKey = format(task.date, 'yyyy-MM-dd');
                        if (!groupedTasks[dateKey]) {
                            groupedTasks[dateKey] = [];
                        }
                        groupedTasks[dateKey].push({ member: member.name, task });
                     }
                });
            });
            setTasksByDate(groupedTasks);
        } else {
            setTasksByDate({});
        }
    }, [reportData]);


    const DayContent = (dayProps: { date: Date; displayMonth: Date }) => {
        const dateKey = format(dayProps.date, 'yyyy-MM-dd');
        const dayTasks = tasksByDate[dateKey] || [];
        const isCurrentMonth = isSameMonth(dayProps.date, dayProps.displayMonth);

        return (
            <Popover>
                <PopoverTrigger asChild disabled={dayTasks.length === 0 || !isCurrentMonth} className={cn(!isCurrentMonth && "pointer-events-none")}>
                   <div className={cn(
                       "relative h-full w-full flex items-center justify-center",
                       dayTasks.length > 0 && isCurrentMonth && "bg-accent/10 rounded-md cursor-pointer hover:bg-accent/20",
                       !isCurrentMonth && "text-muted-foreground opacity-50"
                    )}>
                        <span>{format(dayProps.date, 'd')}</span>
                        {dayTasks.length > 0 && isCurrentMonth && (
                             <div className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-primary" />
                        )}
                    </div>
                </PopoverTrigger>
                {dayTasks.length > 0 && isCurrentMonth && (
                    <PopoverContent className="w-80 max-h-80 overflow-y-auto">
                        <div className="space-y-3">
                            <h4 className="font-medium leading-none">{format(dayProps.date, 'PPP')}</h4>
                            <ScrollArea className="max-h-60 pr-3">
                                <div className="space-y-2">
                                    {dayTasks.map((item, index) => (
                                        <div key={index} className="text-sm border-b pb-2 last:border-b-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <Badge variant="secondary">{item.member}</Badge>
                                                {item.task.hours && (
                                                    <Badge variant="outline">{item.task.hours} hr</Badge>
                                                )}
                                            </div>
                                            <p className="text-muted-foreground font-semibold">{item.task.description}</p>
                                            {item.task.sprint && <p className="text-xs text-muted-foreground">Sprint: {item.task.sprint}</p>}
                                            {item.task.module && <p className="text-xs text-muted-foreground">Module: {item.task.module}</p>}
                                            {item.task.status && (
                                                <div className="flex items-center text-xs mt-1">
                                                    <span className="text-muted-foreground mr-1">Status:</span>
                                                    {item.task.status === 'Pass' ? 
                                                        <CheckCircle className="h-3.5 w-3.5 text-green-600 mr-1" /> : 
                                                        <XCircle className="h-3.5 w-3.5 text-red-600 mr-1" />}
                                                    <span className={cn(item.task.status === 'Pass' ? "text-green-600" : "text-red-600")}>
                                                        {item.task.status}
                                                    </span>
                                                </div>
                                            )}
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
        <Calendar
            mode="single"
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            selected={undefined}
            className="p-0 rounded-md border"
            components={{
                DayContent: DayContent,
            }}
            classNames={{
                day: "h-12 w-12 rounded-md",
                 day_outside: "text-muted-foreground opacity-50",
                 head_cell: "w-12",
            }}
        />
    );
}
