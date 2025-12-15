"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search } from "lucide-react";

// Mock Data
const MOCK_ORDERS = [
    { id: "ORD-001", supplier: "Badulla", product: "Auto Diesel", liters: 13200, status: "Delivered", date: "2024-10-10" },
    { id: "ORD-002", supplier: "Kolonnawa", product: "Petrol 92", liters: 6600, status: "Pending", date: "2024-10-12" },
    { id: "ORD-003", supplier: "Kolonnawa", product: "Super Diesel", liters: 6600, status: "Pending", date: "2024-10-13" },
    { id: "ORD-004", supplier: "Badulla", product: "Auto Diesel", liters: 13200, status: "Delivered", date: "2024-10-05" },
    { id: "ORD-005", supplier: "Kolonnawa", product: "Petrol 95", liters: 6600, status: "Delivered", date: "2024-10-01" },
];

export default function OrdersPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto bg-background min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Fuel Orders</h1>
                    <p className="text-muted-foreground">Manage and track fuel orders from suppliers.</p>
                </div>
                <Button onClick={() => setIsFormOpen(!isFormOpen)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {isFormOpen ? "Cancel Order" : "New Order"}
                </Button>
            </div>

            {isFormOpen && (
                <Card className="border-2 border-primary/20 animate-in fade-in slide-in-from-top-4">
                    <CardHeader>
                        <CardTitle>Create New Order</CardTitle>
                        <CardDescription>Enter details for the new fuel consignment.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="supplier">Supplier</Label>
                                <Select>
                                    <SelectTrigger id="supplier">
                                        <SelectValue placeholder="Select Supplier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="badulla">Badulla</SelectItem>
                                        <SelectItem value="kolonnawa">Kolonnawa</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="product">Product</Label>
                                <Select>
                                    <SelectTrigger id="product">
                                        <SelectValue placeholder="Select Product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="diesel">Auto Diesel</SelectItem>
                                        <SelectItem value="petrol92">Petrol 92</SelectItem>
                                        <SelectItem value="superdiesel">Super Diesel</SelectItem>
                                        <SelectItem value="petrol95">Petrol 95</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="liters">Quantity (Liters)</Label>
                                <Input id="liters" type="number" placeholder="e.g. 6600" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="date">Expected Date</Label>
                                <Input id="date" type="date" />
                            </div>
                            <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-2 mt-4">
                                <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">Submit Order</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Order History</CardTitle>
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-8" placeholder="Search orders..." />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Quantity (L)</TableHead>
                                <TableHead>Expected / Delivered</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {MOCK_ORDERS.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium">{order.id}</TableCell>
                                    <TableCell>{order.supplier}</TableCell>
                                    <TableCell>{order.product}</TableCell>
                                    <TableCell className="text-right">{order.liters.toLocaleString()}</TableCell>
                                    <TableCell>{order.date}</TableCell>
                                    <TableCell>
                                        <Badge variant={order.status === "Delivered" ? "default" : "secondary"} className={order.status === "Delivered" ? "bg-green-600 hover:bg-green-700" : "bg-amber-500 hover:bg-amber-600 text-white"}>
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
