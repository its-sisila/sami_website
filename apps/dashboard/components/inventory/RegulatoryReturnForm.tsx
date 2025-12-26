"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Nozzle IDs - each pump has multiple nozzles
const NOZZLES = [
    { id: "N1-AD", name: "Nozzle 1 - Auto Diesel (Pump 1)" },
    { id: "N2-AD", name: "Nozzle 2 - Auto Diesel (Pump 1)" },
    { id: "N3-AD", name: "Nozzle 3 - Auto Diesel (Pump 2)" },
    { id: "N4-AD", name: "Nozzle 4 - Auto Diesel (Pump 2)" },
    { id: "N5-P92", name: "Nozzle 5 - Petrol 92 (Pump 3)" },
    { id: "N6-P92", name: "Nozzle 6 - Petrol 92 (Pump 3)" },
    { id: "N7-P95", name: "Nozzle 7 - Petrol 95 (Pump 4)" },
    { id: "N8-SD", name: "Nozzle 8 - Super Diesel (Pump 4)" },
];

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

// Staff list
const STAFF = [
    { id: "kumara", name: "Kumara" },
    { id: "saman", name: "Saman" },
    { id: "nimal", name: "Nimal" },
    { id: "sunil", name: "Sunil" },
    { id: "kamal", name: "Kamal" },
];

export function RegulatoryReturnForm() {
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [time, setTime] = useState(() => {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    });
    const [nozzle, setNozzle] = useState("");
    const [reason, setReason] = useState("");
    const [quantity, setQuantity] = useState("");
    const [notes, setNotes] = useState("");
    const [staffResponsible, setStaffResponsible] = useState("");

    const handleSubmit = () => {
        // In a real app, this would submit to the backend
        console.log({
            date,
            time,
            nozzle,
            reason,
            quantity,
            notes,
            staffResponsible,
        });
        // Reset form
        setNozzle("");
        setReason("");
        setQuantity("");
        setNotes("");
        setStaffResponsible("");
    };

    return (
        <Card className="border-orange-200 dark:border-orange-900">
            <CardHeader className="pb-4">
                <CardTitle className="text-orange-700 dark:text-orange-500">Regulatory Return</CardTitle>
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
                        <Select value={nozzle} onValueChange={setNozzle}>
                            <SelectTrigger id="nozzle-id">
                                <SelectValue placeholder="Select nozzle" />
                            </SelectTrigger>
                            <SelectContent>
                                {NOZZLES.map((n) => (
                                    <SelectItem key={n.id} value={n.id}>
                                        {n.name}
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
                                {STAFF.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name}
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
                            className="w-full border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-700 dark:text-orange-500"
                            variant="outline"
                            onClick={handleSubmit}
                        >
                            Record Return
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

