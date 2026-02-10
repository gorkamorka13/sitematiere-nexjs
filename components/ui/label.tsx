import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label" // Usually label is radix but I didn't install it.
// I will use standard label for now to avoid install if possible, OR check if label was installed?
// Package.json didn't show radix-ui/react-label.
// So I will make a simple HTML label wrapper.

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
))
Label.displayName = "Label"

export { Label }
