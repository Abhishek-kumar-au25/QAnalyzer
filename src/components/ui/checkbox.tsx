
"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox" // Corrected import
import { Check, Minus } from "lucide-react" // Import Minus for indeterminate state

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: React.ReactNode;
  labelClassName?: string;
  // Add indeterminate state support
  indeterminate?: boolean;
}


const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, label, labelClassName, id, indeterminate, checked, ...props }, ref) => {
  const generatedId = React.useId();
  const checkboxId = id || generatedId;

  const checkbox = (
     <CheckboxPrimitive.Root
      ref={ref}
      id={checkboxId}
      checked={indeterminate ? "indeterminate" : checked} // Handle indeterminate state
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center text-current")}
      >
        {indeterminate ? <Minus className="h-4 w-4" /> : <Check className="h-4 w-4" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );

  if (label) {
    return (
      <div className="flex items-center space-x-2">
        {checkbox}
        <Label
          htmlFor={checkboxId}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
             props.disabled && "cursor-not-allowed opacity-70",
             labelClassName
          )}
        >
          {label}
        </Label>
      </div>
    );
  }

  return checkbox;
})
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }

