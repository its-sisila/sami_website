"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useEmployees, useNozzles, useCurrentShift } from "@/lib/hooks/use-api";
import { api } from "@/lib/api/client";
import { mutate } from "swr";
import { toast } from "sonner";

// Reason options for regulatory returns
const REASONS = [
    { id: "phi_quality", label: "PHI Quality Check" },
    { id: "meter_calibration", label: "Meter Calibration Test" },
    { id: "regulatory_inspection", label: "Regulatory Inspection" },
    { id: "dispenser_test", label: "Dispenser Test" },
    { id: "tank_inspection", label: "Tank Inspection Sample" },
    { id: "customer_complaint", label: "Customer Complaint Investigation" },
    { id: "monthly_sample", label: "Monthly Quality Sample" },
    { id: "other", label: "Other" },
];

export function RegulatoryReturnForm() {
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [time, setTime] = useState(() => {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    });
    const [nozzleId, setNozzleId] = useState("");
    const [reason, setReason] = useState("");
    const [quantity, setQuantity] = useState("");
    const [notes, setNotes] = useState("");
    const [staffResponsible, setStaffResponsible] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch API data
    const { data: employees, isLoading: loadingEmployees } = useEmployees();
    const { data: nozzles, isLoading: loadingNozzles } = useNozzles();
    const { data: currentShift } = useCurrentShift();

    const handleSubmit = async () => {
        if (!nozzleId || !quantity || !reason || !staffResponsible) {
            toast.warning("Please fill in all required fields");
            return;
        }

        const selectedNozzle = nozzles?.find(n => n.id === nozzleId);
        if (!selectedNozzle) {
            toast.error("Invalid nozzle selected");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.regulatoryReturns.create({
                tank_id: selectedNozzle.tank_id,
                shift_id: currentShift?.id || null,
                staff_id: staffResponsible,
                liters_returned: parseFloat(quantity),
                reason: reason,
                return_date: date,
                // notes are not part of schemas? wait, let me check.
                // RegulatoryReturnCreate schema: tank_id, shift_id, staff_id, liters_returned, reason, return_date.
                // It does NOT have 'notes'. 'reason' is the only text field.
                // But the form has "Notes / Details".
                // I should append notes to reason or ignore it?
                // existing model has `reason: str | None`.
                // I'll append notes to reason if provided.
            });

            // Reset form
            setNozzleId("");
            setReason("");
            setQuantity("");
            setNotes("");
            setStaffResponsible("");

            // Refresh history
            mutate('/orders/returns');
            toast.success("Regulatory return recorded");

            // Optional: Show success message/toast
        } catch (error: any) {
            console.error("Failed to create return:", error);
            toast.error(`Failed to create return: ${error.message || "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper to format reason with notes
    const getFormattedReason = () => {
        let r = REASONS.find(opt => opt.id === reason)?.label || reason;
        if (notes) {
            r += ` - ${notes}`;
        }
        return r;
    };

    // Override handleSubmit to use formatted reason
    const handleSubmitWithNotes = async () => {
        if (!nozzleId || !quantity || !reason || !staffResponsible) {
            toast.warning("Please fill in all required fields");
            return;
        }

        const selectedNozzle = nozzles?.find(n => n.id === nozzleId);
        if (!selectedNozzle) {
            toast.error("Invalid nozzle selected");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.regulatoryReturns.create({
                tank_id: selectedNozzle.tank_id,
                shift_id: currentShift?.id || null,
                staff_id: staffResponsible,
                liters_returned: parseFloat(quantity),
                reason: reason === "other" ? notes : (notes ? `${REASONS.find(r => r.id === reason)?.label} - ${notes}` : REASONS.find(r => r.id === reason)?.label),
                return_date: date,
            });

            setNozzleId("");
            setReason("");
            setQuantity("");
            setNotes("");
            setStaffResponsible("");
            mutate('/orders/returns');
            toast.success("Regulatory return recorded");
        } catch (error: any) {
            console.error("Failed to create return:", error);
            toast.error(`Failed to create return: ${error.message || "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingEmployees || loadingNozzles) {
        return (
            <Card className="border-orange-200">
                <CardContent className="py-8 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-orange-200">
            <CardHeader className="pb-4">
                <CardTitle className="text-orange-700">Regulatory Return</CardTitle>
                <CardDescription>Log fuel poured back into the tank (e.g. after inspection test).</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Row 1: Date, Time, Quantity */}
                    <div className="grid gap-2">
                        <Label htmlFor="return-date">Date</Label>
                        <Input
                            id="return-date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="return-time">Time</Label>
                        <Input
                            id="return-time"
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="return-liters">Quantity (L)</Label>
                        <Input
                            id="return-liters"
                            type="number"
                            placeholder="e.g. 20"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                        />
                    </div>

                    {/* Row 2: Nozzle, Reason, Staff */}
                    <div className="grid gap-2">
                        <Label htmlFor="nozzle-id">Nozzle ID</Label>
                        <Select value={nozzleId} onValueChange={setNozzleId}>
                            <SelectTrigger id="nozzle-id">
                                <SelectValue placeholder="Select nozzle" />
                            </SelectTrigger>
                            <SelectContent>
                                {nozzles?.map((n) => (
                                    <SelectItem key={n.id} value={n.id}>
                                        {n.nozzle_name || n.nozzle_code || 'Unknown'} {n.product_name ? `(${n.product_name})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="return-reason">Reason</Label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger id="return-reason">
                                <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                                {REASONS.map((r) => (
                                    <SelectItem key={r.id} value={r.id}>
                                        {r.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="staff-responsible">Staff Responsible</Label>
                        <Select value={staffResponsible} onValueChange={setStaffResponsible}>
                            <SelectTrigger id="staff-responsible">
                                <SelectValue placeholder="Select staff" />
                            </SelectTrigger>
                            <SelectContent>
                                {employees?.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name_with_initials || s.full_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Row 3: Notes (spans 2 columns) and Button */}
                    <div className="grid gap-2 md:col-span-2">
                        <Label htmlFor="notes">Notes / Details</Label>
                        <Textarea
                            id="notes"
                            placeholder="Enter any additional details..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                        />
                    </div>
                    <div className="grid gap-2 content-end">
                        <Button
                            className="w-full border-orange-200 hover:bg-orange-50 text-orange-700"
                            variant="outline"
                            onClick={handleSubmitWithNotes}
                            disabled={isSubmitting}
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Record Return
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
