"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const SelectContext = React.createContext<{ value: string; onValueChange: (v: string) => void; open: boolean; setOpen: (open: boolean) => void } | null>(null)

const Select = ({ value: controlledValue, onValueChange, defaultValue, children }: any) => {
    const [value, setValue] = React.useState(defaultValue || "")
    const [open, setOpen] = React.useState(false)

    const currentValue = controlledValue !== undefined ? controlledValue : value
    const handleChange = (newValue: string) => {
        if (onValueChange) onValueChange(newValue)
        setValue(newValue)
        setOpen(false)
    }

    return (
        <SelectContext.Provider value={{ value: currentValue, onValueChange: handleChange, open, setOpen }}>
            <div className="relative relative-select-container">{children}</div>
        </SelectContext.Provider>
    )
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    return (
        <button
            ref={ref}
            type="button"
            className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            onClick={() => context?.setOpen(!context.open)}
            {...props}
        >
            {children}
        </button>
    )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string; children?: React.ReactNode }>(({ className, placeholder, children, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    return (
        <span ref={ref} className={cn("block truncate", className)} {...props}>
            {context?.value ? (children || context.value) : placeholder}
        </span>
    )
})
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context?.open) return null
    return (
        <div
            ref={ref}
            className={cn(
                "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80 w-full mt-1",
                className
            )}
            {...props}
        >
            <div className="p-1 max-h-[var(--radix-select-content-available-height)] w-full overflow-y-auto w-full min-w-[var(--radix-select-trigger-width)]">
                {children}
            </div>
        </div>
    )
})
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>(({ className, children, value, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    const isSelected = context?.value === value
    return (
        <div
            ref={ref}
            className={cn(
                "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                isSelected && "bg-accent text-accent-foreground",
                className
            )}
            onClick={(e) => {
                e.stopPropagation();
                context?.onValueChange(value);
            }}
            {...props}
        >
            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                {isSelected && <span>✓</span>}
            </span>
            <span className="truncate">{children}</span>
        </div>
    )
})
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
