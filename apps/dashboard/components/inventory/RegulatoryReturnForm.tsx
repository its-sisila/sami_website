"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function RegulatoryReturnForm() {
    return (
        <Card className="border-orange-200 dark:border-orange-900">
            <CardHeader>
                <CardTitle className="text-orange-700 dark:text-orange-500">Regulatory Return</CardTitle>
                <CardDescription>Log fuel poured back into the tank (e.g. after inspection test).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="return-tank">Tank</Label>
                    <Select>
                        <SelectTrigger id="return-tank">
                            <SelectValue placeholder="Select tank" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="t1">Tank 1 (Diesel)</SelectItem>
                            <SelectItem value="t2">Tank 2 (Petrol 92)</SelectItem>
                            <SelectItem value="t3">Tank 3 (Petrol 95)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="return-liters">Quantity Returned (L)</Label>
                    <Input id="return-liters" type="number" placeholder="e.g. 20" />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="reason">Reason / Notes</Label>
                    <Textarea id="reason" placeholder="e.g. PHI Quality Check Sample Return" />
                </div>

                <div className="pt-2">
                    <Button className="w-full border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-700 dark:text-orange-500" variant="outline">
                        Record Return
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
