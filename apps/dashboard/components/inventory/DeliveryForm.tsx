"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function DeliveryForm() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Record Delivery</CardTitle>
                <CardDescription>Log a new fuel delivery from a supplier.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="supplier">Supplier / Source</Label>
                        <Select>
                            <SelectTrigger id="supplier">
                                <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cypetco">Cypetco</SelectItem>
                                <SelectItem value="ioc">IOC</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="product">Product</Label>
                        <Select>
                            <SelectTrigger id="product">
                                <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="diesel">Auto Diesel</SelectItem>
                                <SelectItem value="petrol92">Petrol 92</SelectItem>
                                <SelectItem value="petrol95">Petrol 95</SelectItem>
                                <SelectItem value="superdiesel">Super Diesel</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="target-tank">Target Tank</Label>
                        <Select>
                            <SelectTrigger id="target-tank">
                                <SelectValue placeholder="Select tank" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="t1">Tank 1</SelectItem>
                                <SelectItem value="t2">Tank 2</SelectItem>
                                <SelectItem value="t3">Tank 3</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="liters">Quantity (Liters)</Label>
                        <Input id="liters" type="number" placeholder="6600" />
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="invoice">Invoice / Ref No</Label>
                    <Input id="invoice" placeholder="Optional reference number" />
                </div>

                <div className="pt-2">
                    <Button className="w-full" variant="secondary">Log Delivery</Button>
                </div>
            </CardContent>
        </Card>
    );
}
