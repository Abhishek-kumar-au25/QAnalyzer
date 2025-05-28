
'use client';

import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, getDaysInMonth, getDate, differenceInDays, parse, isValid } from 'date-fns';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, Rectangle, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ReportFormValues, TaskFormValues } from './gantt-report-generator-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react'; // Import icons for status
import { cn } from '@/lib/utils';

interface SimplifiedGanttViewProps {
  reportData: ReportFormValues | null;
}

interface GanttTask {
  member: string;
  taskDesc: string;
  day: number; 
  taskIndex: number; 
  taskValue: number; 
  sprint?: string;
  module?: string;
  status?: 'Pass' | 'Fail';
  originalTask: TaskFormValues; // Store original task for richer tooltips
}

const generateColor = (index: number) => {
    const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
    return colors[index % colors.length];
}

export function SimplifiedGanttView({ reportData }: SimplifiedGanttViewProps) {

  const { chartData, daysInMonth, members, monthStartDate } = useMemo(() => {
    if (!reportData || !reportData.teamMembers || reportData.teamMembers.length === 0) {
      return { chartData: [], daysInMonth: 0, members: [], monthStartDate: new Date() };
    }

    let parsedMonth = parse(reportData.month, 'MMMM yyyy', new Date());
    if (!isValid(parsedMonth)) {
        parsedMonth = parse(reportData.month, 'yyyy-MM', new Date());
        if (!isValid(parsedMonth)) {
            parsedMonth = new Date(); 
        }
    }
    const monthStart = startOfMonth(parsedMonth);
    const numDays = getDaysInMonth(monthStart);
    const memberNames = reportData.teamMembers.map(m => m.name);

    const processedData: GanttTask[] = [];
    reportData.teamMembers.forEach((member) => {
        member.tasks.forEach((task, taskIndex) => {
            if (isValid(task.date) && format(task.date, 'yyyy-MM') === format(monthStart, 'yyyy-MM')) {
                processedData.push({
                    member: member.name,
                    taskDesc: task.description,
                    day: getDate(task.date),
                    taskIndex: taskIndex, 
                    taskValue: 1, 
                    sprint: task.sprint,
                    module: task.module,
                    status: task.status,
                    originalTask: task, // Keep original task
                });
            }
        });
    });

    return { chartData: processedData, daysInMonth: numDays, members: memberNames, monthStartDate: monthStart };
  }, [reportData]);


  const chartConfig = useMemo(() => {
     const config: ChartConfig = {};
     members.forEach((member, index) => {
       config[member] = {
         label: member,
         color: generateColor(index),
       };
     });
     return config;
   }, [members]);


  if (!reportData || chartData.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg h-[300px] flex flex-col justify-center items-center">
        <p>No task data available for the selected month to display Gantt chart.</p>
      </div>
    );
  }

  const dayTicks = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <ChartContainer config={chartConfig} className="h-[400px] w-full">
        <ResponsiveContainer>
            <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                barCategoryGap={5}
            >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis
                    type="number"
                    dataKey="day"
                    domain={[1, daysInMonth]}
                    ticks={dayTicks}
                    tickFormatter={(tick) => tick.toString()}
                    label={{ value: `Days of ${format(monthStartDate, 'MMMM yyyy')}`, position: 'insideBottom', offset: -5 }}
                    height={40}
                />
                <YAxis
                    dataKey="member"
                    type="category"
                    width={100}
                    tickLine={false}
                    axisLine={false}
                />
                 <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as GanttTask;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
                           <div className="grid grid-cols-1 gap-1.5">
                              <p className="font-semibold">{data.member} - Day {data.day}</p>
                              <p className="text-muted-foreground">{data.taskDesc}</p>
                              {data.sprint && <p>Sprint: {data.sprint}</p>}
                              {data.module && <p>Module: {data.module}</p>}
                              {data.originalTask.hours !== undefined && <p>Hours: {data.originalTask.hours}</p>}
                              {data.status && (
                                <div className="flex items-center">
                                    <span className="mr-1">Status:</span>
                                    {data.status === 'Pass' ? 
                                        <CheckCircle className="h-3.5 w-3.5 text-green-600 mr-1" /> : 
                                        <XCircle className="h-3.5 w-3.5 text-red-600 mr-1" />}
                                    <span className={cn(data.status === 'Pass' ? "text-green-600" : "text-red-600")}>
                                        {data.status}
                                    </span>
                                </div>
                              )}
                           </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                 {members.map((member, index) => (
                    <Bar
                        key={member}
                        dataKey="taskValue"
                        fill={generateColor(index)}
                        stackId="a" 
                        radius={2}
                        barSize={15}
                        data={chartData.filter(d => d.member === member)}
                        name={member} 
                    />
                 ))}
            </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  );
}
