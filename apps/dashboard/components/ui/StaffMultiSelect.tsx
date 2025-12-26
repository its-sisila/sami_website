"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface StaffMember {
    id: string;
    name: string;
}

interface StaffMultiSelectProps {
    staff: StaffMember[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
}

export function StaffMultiSelect({
    staff,
    selected,
    onChange,
    placeholder = "Select staff...",
}: StaffMultiSelectProps) {
    const [open, setOpen] = React.useState(false);

    const toggleStaff = (staffId: string) => {
        if (selected.includes(staffId)) {
            onChange(selected.filter((id) => id !== staffId));
        } else {
            onChange([...selected, staffId]);
        }
    };

    const removeStaff = (staffId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selected.filter((id) => id !== staffId));
    };

    const selectedStaff = staff.filter((s) => selected.includes(s.id));

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto min-h-10"
                >
                    <div className="flex flex-wrap gap-1">
                        {selectedStaff.length > 0 ? (
                            selectedStaff.map((s) => (
                                <Badge
                                    key={s.id}
                                    variant="secondary"
                                    className="mr-1 mb-1"
                                >
                                    {s.name}
                                    <button
                                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={(e) => removeStaff(s.id, e)}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))
                        ) : (
                            <span className="text-muted-foreground">{placeholder}</span>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <div className="max-h-64 overflow-auto">
                    {staff.map((s) => (
                        <div
                            key={s.id}
                            className={cn(
                                "flex items-center px-3 py-2 cursor-pointer hover:bg-accent",
                                selected.includes(s.id) && "bg-accent"
                            )}
                            onClick={() => toggleStaff(s.id)}
                        >
                            <div
                                className={cn(
                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                    selected.includes(s.id)
                                        ? "bg-primary text-primary-foreground"
                                        : "opacity-50"
                                )}
                            >
                                {selected.includes(s.id) && <Check className="h-3 w-3" />}
                            </div>
                            <span>{s.name}</span>
                        </div>
                    ))}
                    {staff.length === 0 && (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            No staff members found.
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
