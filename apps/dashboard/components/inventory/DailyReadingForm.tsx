"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export function DailyReadingForm() {
    const [tank, setTank] = useState("");

    // Mock calculation for demo purposes
    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // In a real app, this would lookup a calibration chart
        const height = parseFloat(e.target.value);
        // dummy logic
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Daily Tank Reading</CardTitle>
                <CardDescription>Record the dip height to calculate current volume.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="tank">Select Tank</Label>
                    <Select value={tank} onValueChange={setTank}>
                        <SelectTrigger id="tank">
                            <SelectValue placeholder="Choose a tank" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="t1">Tank 1 (Diesel)</SelectItem>
                            <SelectItem value="t2">Tank 2 (Petrol 92)</SelectItem>
                            <SelectItem value="t3">Tank 3 (Petrol 95)</SelectItem>
                            <SelectItem value="t4">Tank 4 (Super Diesel)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="height">Dip Height (cm)</Label>
                        <Input id="height" type="number" placeholder="e.g. 150.5" onChange={handleHeightChange} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="volume">Volume (L)</Label>
                        <Input id="volume" type="number" placeholder="Auto-calculated" readOnly className="bg-muted" />
                    </div>
                </div>

                <div className="pt-2">
                    <Button className="w-full">Save Reading</Button>
                </div>
            </CardContent>
        </Card>
    );
}
