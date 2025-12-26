"use client";

import { useState, useMemo } from "react";
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
import { PlusCircle } from "lucide-react";

// Product types
const PRODUCTS = [
    { id: "auto_diesel", name: "Auto Diesel" },
    { id: "petrol_92", name: "Petrol 92" },
    { id: "petrol_95", name: "Petrol 95" },
    { id: "super_diesel", name: "Super Diesel" },
];

// Suppliers
const SUPPLIERS = [
    { id: "badulla", name: "Badulla" },
    { id: "kolonnawa", name: "Kolonnawa" },
];

// Status options
const STATUSES = [
    { id: "pending", name: "Pending" },
    { id: "delivered", name: "Delivered" },
    { id: "received", name: "Received" },
];

// Tanks for unloading
const TANKS = [
    { id: "LSD-1", name: "LSD-1 (Super Diesel)" },
    { id: "LP95-1", name: "LP95-1 (Petrol 95)" },
    { id: "LAD-1", name: "LAD-1 (Auto Diesel)" },
    { id: "LAD-2", name: "LAD-2 (Auto Diesel)" },
    { id: "LAD-3", name: "LAD-3 (Auto Diesel)" },
    { id: "LAD-4", name: "LAD-4 (Auto Diesel)" },
    { id: "LP92-1", name: "LP92-1 (Petrol 92)" },
    { id: "LP92-2", name: "LP92-2 (Petrol 92)" },
];

// Map product to compatible tanks
const PRODUCT_TANK_MAP: Record<string, string[]> = {
    "auto_diesel": ["LAD-1", "LAD-2", "LAD-3", "LAD-4"],
    "petrol_92": ["LP92-1", "LP92-2"],
    "petrol_95": ["LP95-1"],
    "super_diesel": ["LSD-1"],
};

// Generate mock orders for the past 60 days
function generateMockOrders() {
    const orders: Array<{
        id: string;
        supplier: string;
        supplierId: string;
        product: string;
        productId: string;
        liters: number;
        status: string;
        statusId: string;
        placedAt: string;
        date: string;
        receivedAt: string | null;
        unloadedTo: string | null;
    }> = [];

    const today = new Date();
    let orderId = 1;

    for (let daysAgo = 0; daysAgo < 60; daysAgo++) {
        const date = new Date(today);
        date.setDate(date.getDate() - daysAgo);

        // Pseudo-random based on date
        const seed = date.getTime();
        const random = (offset: number) => {
            const x = Math.sin(seed + offset) * 10000;
            return x - Math.floor(x);
        };

        // 40% chance of order per day
        if (random(0) < 0.4) {
            const numOrders = random(1) < 0.7 ? 1 : 2;

            for (let i = 0; i < numOrders; i++) {
                const supplier = SUPPLIERS[Math.floor(random(2 + i) * SUPPLIERS.length)];
                const product = PRODUCTS[Math.floor(random(3 + i) * PRODUCTS.length)];
                const liters = [6600, 13200, 19800][Math.floor(random(4 + i) * 3)];

                // Older orders are more likely to be delivered/received
                let status: { id: string; name: string };
                if (daysAgo > 5) {
                    status = random(5 + i) < 0.5 ? STATUSES[1] : STATUSES[2]; // Delivered or Received
                } else if (daysAgo > 2) {
                    status = random(5 + i) < 0.3 ? STATUSES[0] : STATUSES[1]; // Pending or Delivered
                } else {
                    status = STATUSES[0]; // Pending
                }

                const placedHour = 8 + Math.floor(random(6 + i) * 10);
                const placedMinute = Math.floor(random(7 + i) * 60);
                const placedDate = new Date(date);
                placedDate.setHours(placedHour, placedMinute);

                const expectedDate = new Date(date);
                expectedDate.setDate(expectedDate.getDate() + 1 + Math.floor(random(8 + i) * 2));

                let receivedAt: string | null = null;
                let unloadedTo: string | null = null;
                if (status.id !== "pending") {
                    const receivedDate = new Date(expectedDate);
                    receivedDate.setHours(8 + Math.floor(random(9 + i) * 8), Math.floor(random(10 + i) * 60));
                    receivedAt = receivedDate.toISOString();
                    // Assign a compatible tank based on product
                    const compatibleTanks = PRODUCT_TANK_MAP[product.id] || [];
                    if (compatibleTanks.length > 0) {
                        unloadedTo = compatibleTanks[Math.floor(random(11 + i) * compatibleTanks.length)];
                    }
                }

                orders.push({
                    id: `ORD-${orderId.toString().padStart(3, "0")}`,
                    supplier: supplier.name,
                    supplierId: supplier.id,
                    product: product.name,
                    productId: product.id,
                    liters,
                    status: status.name,
                    statusId: status.id,
                    placedAt: placedDate.toISOString(),
                    date: expectedDate.toISOString().split("T")[0],
                    receivedAt,
                    unloadedTo,
                });
                orderId++;
            }
        }
    }

    return orders.sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
}

const INITIAL_ORDERS = generateMockOrders();

export function FuelOrdersManager() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [orders, setOrders] = useState(INITIAL_ORDERS);
    const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);
    const [receivedDate, setReceivedDate] = useState("");
    const [receivingTank, setReceivingTank] = useState("");
    const [customOrderId, setCustomOrderId] = useState("");

    // Filter states
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split("T")[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
    const [filterProduct, setFilterProduct] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterSupplier, setFilterSupplier] = useState("all");

    // Filtered orders
    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            const orderDate = order.placedAt.split("T")[0];
            const dateMatch = orderDate >= startDate && orderDate <= endDate;
            const productMatch = filterProduct === "all" || order.productId === filterProduct;
            const statusMatch = filterStatus === "all" || order.statusId === filterStatus;
            const supplierMatch = filterSupplier === "all" || order.supplierId === filterSupplier;
            return dateMatch && productMatch && statusMatch && supplierMatch;
        });
    }, [orders, startDate, endDate, filterProduct, filterStatus, filterSupplier]);

    const initiateReceiveOrder = (id: string) => {
        setReceivingOrderId(id);
        // Default to current time formatted for datetime-local
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setReceivedDate(now.toISOString().slice(0, 16));
        setReceivingTank("");
        setCustomOrderId(id);
    };

    const confirmReceiveOrder = () => {
        if (!receivingOrderId) return;

        setOrders(orders.map(order =>
            order.id === receivingOrderId
                ? { ...order, status: "Received", statusId: "received", receivedAt: receivedDate, unloadedTo: receivingTank || null, id: customOrderId || order.id }
                : order
        ));
        setReceivingOrderId(null);
        setReceivedDate("");
        setReceivingTank("");
        setCustomOrderId("");
    };

    // Calculate totals for pending orders only
    const pendingOrders = useMemo(() => {
        return filteredOrders.filter(order => order.statusId === "pending");
    }, [filteredOrders]);

    const pendingLiters = useMemo(() => {
        return pendingOrders.reduce((sum, order) => sum + order.liters, 0);
    }, [pendingOrders]);

    return (
        <div className="space-y-6">
            {/* Modal Overlay for Receiving Order */}
            {receivingOrderId && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md animate-in zoom-in-95 duration-200">
                        <CardHeader>
                            <CardTitle>Confirm Order Receipt</CardTitle>
                            <CardDescription>
                                Please confirm details and enter the actual date/time.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="customOrderId">Order ID / Docket No</Label>
                                <Input
                                    id="customOrderId"
                                    value={customOrderId}
                                    onChange={(e) => setCustomOrderId(e.target.value)}
                                    placeholder="Enter Order ID"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="receivedDate">Received Date & Time</Label>
                                <Input
                                    id="receivedDate"
                                    type="datetime-local"
                                    value={receivedDate}
                                    onChange={(e) => setReceivedDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="receivingTank">Unloaded To Tank</Label>
                                <Select value={receivingTank} onValueChange={setReceivingTank}>
                                    <SelectTrigger id="receivingTank">
                                        <SelectValue placeholder="Select Tank" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LSD-1">LSD-1 (Super Diesel)</SelectItem>
                                        <SelectItem value="LP95-1">LP95-1 (Petrol 95)</SelectItem>
                                        <SelectItem value="LAD-1">LAD-1 (Auto Diesel)</SelectItem>
                                        <SelectItem value="LAD-2">LAD-2 (Auto Diesel)</SelectItem>
                                        <SelectItem value="LAD-3">LAD-3 (Auto Diesel)</SelectItem>
                                        <SelectItem value="LAD-4">LAD-4 (Auto Diesel)</SelectItem>
                                        <SelectItem value="LP92-1">LP92-1 (Petrol 92)</SelectItem>
                                        <SelectItem value="LP92-2">LP92-2 (Petrol 92)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setReceivingOrderId(null)}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={confirmReceiveOrder}>
                                    Confirm Receipt
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-lg font-semibold">Fuel Orders</h3>
                    <p className="text-sm text-muted-foreground">Manage and track fuel orders from suppliers.</p>
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
                                        {SUPPLIERS.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
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
                                        {PRODUCTS.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="liters">Quantity (Liters)</Label>
                                <Input id="liters" type="number" placeholder="e.g. 6600" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="placedAt">Order Placed At</Label>
                                <Input id="placedAt" type="datetime-local" />
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
                <CardHeader className="pb-4">
                    <CardTitle>Order History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                        <div className="grid gap-2">
                            <span className="text-sm text-muted-foreground">From</span>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="text-sm"
                            />
                        </div>
                        <div className="grid gap-2">
                            <span className="text-sm text-muted-foreground">To</span>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="text-sm"
                            />
                        </div>
                        <div className="grid gap-2">
                            <span className="text-sm text-muted-foreground">Product</span>
                            <Select value={filterProduct} onValueChange={setFilterProduct}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Products" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Products</SelectItem>
                                    {PRODUCTS.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <span className="text-sm text-muted-foreground">Supplier</span>
                            <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Suppliers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Suppliers</SelectItem>
                                    {SUPPLIERS.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    {STATUSES.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-4 justify-end">
                            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                                Pending: {pendingLiters.toLocaleString()} L
                            </Badge>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                                {pendingOrders.length} pending
                            </span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-md border max-h-[400px] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background">
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Placed At</TableHead>
                                    <TableHead className="text-right">Qty (L)</TableHead>
                                    <TableHead>Expected / Received</TableHead>
                                    <TableHead>Time Received</TableHead>
                                    <TableHead>Unloaded To</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                                            No orders found for the selected filters
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">{order.id}</TableCell>
                                            <TableCell>{order.supplier}</TableCell>
                                            <TableCell>{order.product}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(order.placedAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">{order.liters.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span>{order.date}</span>
                                                    {order.receivedAt && (
                                                        <span className="text-xs text-green-600">
                                                            Rec: {new Date(order.receivedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {order.receivedAt
                                                    ? new Date(order.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : "-"
                                                }
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {order.unloadedTo || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={order.statusId === "pending" ? "secondary" : "default"}
                                                    className={
                                                        order.statusId === "pending"
                                                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                                                            : "bg-green-600 hover:bg-green-700"
                                                    }
                                                >
                                                    {order.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {order.statusId === "pending" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                                        onClick={() => initiateReceiveOrder(order.id)}
                                                    >
                                                        Mark Received
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

