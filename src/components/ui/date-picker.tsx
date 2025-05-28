
"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps extends React.ComponentPropsWithoutRef<"button"> { // Allow passing button props
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    // className is already part of React.ComponentPropsWithoutRef<"button">
}

// Use React.forwardRef to accept and forward the ref
export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
    ({ date, setDate, className, ...props }, ref) => {
        return (
            <Popover>
            <PopoverTrigger asChild>
                {/* Pass the forwarded ref and any other props to the Button */}
                <Button
                ref={ref}
                variant={"outline"}
                className={cn(
                    "w-full justify-start text-left font-normal", // Changed width to full
                    !date && "text-muted-foreground",
                    className
                )}
                {...props} // Spread remaining props (like id, aria-describedby from FormControl)
                >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                />
            </PopoverContent>
            </Popover>
        )
    }
)
DatePicker.displayName = "DatePicker"


    