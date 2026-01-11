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
import { PlusCircle, Loader2, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api/client";
import { useTanks, useProducts, useFuelOrders } from "@/lib/hooks";
import type { FuelOrder, FuelOrderCreate } from "@/lib/api/types";
import { mutate } from "swr";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Suppliers - could be moved to database later
const SUPPLIERS = [
    { id: "badulla", name: "Badulla" },
    { id: "kolonnawa", name: "Kolonnawa" },
];

interface FuelOrdersManagerProps {
    onDeliveryComplete?: () => void;
}

export function FuelOrdersManager({ onDeliveryComplete }: FuelOrdersManagerProps = {}) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch real data from API
    const { data: orders, isLoading: ordersLoading, error: ordersError, mutate: mutateOrders } = useFuelOrders();
    const { data: products, isLoading: productsLoading } = useProducts();
    const { data: tanks, isLoading: tanksLoading } = useTanks();

    // Form state for new order
    const [newProductId, setNewProductId] = useState("");
    const [newSupplier, setNewSupplier] = useState("");
    const [newLiters, setNewLiters] = useState("");
    const [newExpectedDate, setNewExpectedDate] = useState("");
    const [newNotes, setNewNotes] = useState("");

    // Delivery Dialog State
    const [deliveryOrder, setDeliveryOrder] = useState<FuelOrder | null>(null);
    const [deliveryTankId, setDeliveryTankId] = useState("");
    const [deliveryLiters, setDeliveryLiters] = useState("");
    const [deliverySlip, setDeliverySlip] = useState("");
    const [deliveryVehicle, setDeliveryVehicle] = useState("");
    const [deliveryDriver, setDeliveryDriver] = useState("");
    const [deliveryNotes, setDeliveryNotes] = useState("");
    const [isDelivering, setIsDelivering] = useState(false);

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
        if (!orders) return [];
        return orders.filter((order) => {
            const orderDate = order.placed_at.split("T")[0];
            const dateMatch = orderDate >= startDate && orderDate <= endDate;
            const productMatch = filterProduct === "all" || order.product_id === filterProduct;
            const statusMatch = filterStatus === "all" || order.status === filterStatus;
            const supplierMatch = filterSupplier === "all" || order.supplier.toLowerCase() === filterSupplier;
            return dateMatch && productMatch && statusMatch && supplierMatch;
        });
    }, [orders, startDate, endDate, filterProduct, filterStatus, filterSupplier]);

    // Get product name by ID
    const getProductName = (productId: string) => {
        const product = products?.find(p => p.id === productId);
        return product?.name || "Unknown Product";
    };

    // Create new order
    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProductId || !newSupplier || !newLiters) {
            toast.warning("Please fill in all required fields");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.orders.create({
                product_id: newProductId,
                supplier: newSupplier,
                liters_ordered: parseFloat(newLiters),
                expected_date: newExpectedDate || null,
                notes: newNotes || null,
            });
            // Reset form and refresh
            setNewProductId("");
            setNewSupplier("");
            setNewLiters("");
            setNewExpectedDate("");
            setNewNotes("");
            setIsFormOpen(false);
            mutateOrders();
            toast.success("Fuel order created successfully");
        } catch (err: any) {
            toast.error(`Failed to create order: ${err.message || "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Open delivery dialog
    const handleOpenDelivery = (order: FuelOrder) => {
        setDeliveryOrder(order);
        setDeliveryLiters(order.liters_ordered.toString());
        setDeliveryTankId("");
        setDeliverySlip("");
        setDeliveryVehicle("");
        setDeliveryDriver("");
        setDeliveryNotes("");
    };

    const handleConfirmDelivery = async () => {
        if (!deliveryOrder || !deliveryTankId || !deliveryLiters) {
            toast.warning("Please select a tank and enter received liters.");
            return;
        }

        setIsDelivering(true);
        try {
            // 1. Create Delivery Record
            await api.orders.createDelivery({
                order_id: deliveryOrder.id,
                tank_id: deliveryTankId,
                liters_received: parseFloat(deliveryLiters),
                delivery_date: new Date().toISOString().split('T')[0],
                delivery_time: new Date().toTimeString().slice(0, 5),
                delivery_slip_number: deliverySlip || null,
                vehicle_number: deliveryVehicle || null,
                driver_name: deliveryDriver || null,
                notes: deliveryNotes || null,
            });

            // 2. Update Order Status
            await api.orders.update(deliveryOrder.id, {
                status: "delivered",
                received_at: new Date().toISOString()
            });

            toast.success("Delivery recorded successfully!");
            setDeliveryOrder(null);
            mutateOrders();
            // Notify parent to refresh tank levels and inventory summary
            onDeliveryComplete?.();
        } catch (err: any) {
            toast.error(`Failed to record delivery: ${err.message || "Unknown error"}`);
        } finally {
            setIsDelivering(false);
        }
    }

    // Cancel order
    const handleCancelOrder = async (orderId: string) => {
        if (!confirm("Are you sure you want to cancel this order?")) return;
        try {
            await api.orders.cancel(orderId);
            mutateOrders();
            toast.success("Order cancelled");
        } catch (err: any) {
            toast.error(`Failed to cancel order: ${err.message || "Unknown error"}`);
        }
    };

    // Mark payment made
    const handleMarkPaid = async (orderId: string) => {
        try {
            await api.orders.markPaid(orderId);
            mutateOrders();
            toast.success("Payment marked");
        } catch (err: any) {
            toast.error(`Failed to mark paid: ${err.message || "Unknown error"}`);
        }
    };

    // Calculate summary stats
    const pendingOrders = useMemo(() => {
        return filteredOrders.filter(order => order.status === "pending");
    }, [filteredOrders]);

    const pendingLiters = useMemo(() => {
        return pendingOrders.reduce((sum, order) => sum + Number(order.liters_ordered), 0);
    }, [pendingOrders]);

    const deliveredOrders = useMemo(() => {
        return filteredOrders.filter(order => order.status === "delivered");
    }, [filteredOrders]);

    const deliveredLiters = useMemo(() => {
        return deliveredOrders.reduce((sum, order) => sum + Number(order.liters_ordered), 0);
    }, [deliveredOrders]);

    // Status badge styling
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
            case "delivered":
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Delivered</Badge>;
            case "cancelled":
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Loading state
    if (ordersLoading || productsLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading orders...</span>
            </div>
        );
    }

    // Error state
    if (ordersError) {
        return (
            <div className="text-center py-12 text-red-500">
                Failed to load orders: {ordersError.message}
            </div>
        );
    }

    // Filter tanks compatible with selected order
    const compatibleTanks = tanks?.filter(t =>
        deliveryOrder && t.product_id === deliveryOrder.product_id
    ) || [];

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{filteredOrders.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-yellow-600">{pendingOrders.length}</p>
                        <p className="text-sm text-muted-foreground">{pendingLiters.toLocaleString()} L</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-green-600">{deliveredOrders.length}</p>
                        <p className="text-sm text-muted-foreground">{deliveredLiters.toLocaleString()} L</p>
                    </CardContent>
                </Card>
            </div>

            {/* New Order Form */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Fuel Orders</CardTitle>
                            <CardDescription>Manage fuel orders and deliveries</CardDescription>
                        </div>
                        <Button onClick={() => setIsFormOpen(!isFormOpen)} variant="outline">
                            <PlusCircle className="h-4 w-4 mr-2" />
                            New Order
                        </Button>
                    </div>
                </CardHeader>

                {isFormOpen && (
                    <CardContent className="border-t pt-4">
                        <form onSubmit={handleCreateOrder} className="grid gap-4 md:grid-cols-6">
                            <div className="space-y-2">
                                <Label>Product *</Label>
                                <Select value={newProductId} onValueChange={setNewProductId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products?.map((product) => (
                                            <SelectItem key={product.id} value={product.id}>
                                                {product.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Supplier *</Label>
                                <Select value={newSupplier} onValueChange={setNewSupplier}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select supplier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SUPPLIERS.map((supplier) => (
                                            <SelectItem key={supplier.id} value={supplier.name}>
                                                {supplier.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Liters *</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 10000"
                                    value={newLiters}
                                    onChange={(e) => setNewLiters(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Expected Date</Label>
                                <Input
                                    type="date"
                                    value={newExpectedDate}
                                    onChange={(e) => setNewExpectedDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Input
                                    placeholder="Optional notes"
                                    value={newNotes}
                                    onChange={(e) => setNewNotes(e.target.value)}
                                />
                            </div>
                            <div className="flex items-end">
                                <Button type="submit" disabled={isSubmitting} className="w-full">
                                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Place Order
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                )}
            </Card>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-5">
                        <div className="space-y-2">
                            <Label>From Date</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>To Date</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Product</Label>
                            <Select value={filterProduct} onValueChange={setFilterProduct}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Products</SelectItem>
                                    {products?.map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                            {product.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Supplier</Label>
                            <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Suppliers</SelectItem>
                                    {SUPPLIERS.map((supplier) => (
                                        <SelectItem key={supplier.id} value={supplier.id}>
                                            {supplier.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
                <CardContent className="pt-6">
                    <div className="rounded-md border max-h-[500px] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background">
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead className="text-right">Liters</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead>Expected</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                            No orders found for the selected filters
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">
                                                {new Date(order.placed_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>{getProductName(order.product_id)}</TableCell>
                                            <TableCell>{order.supplier}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                {order.liters_ordered.toLocaleString()}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                                            <TableCell>
                                                {order.payment_made ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700">Paid</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-gray-50 text-gray-500">Unpaid</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {order.expected_date ? new Date(order.expected_date).toLocaleDateString() : "-"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {order.status === "pending" && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleOpenDelivery(order)}
                                                                title="Mark Delivered"
                                                            >
                                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleCancelOrder(order.id)}
                                                                title="Cancel Order"
                                                            >
                                                                <XCircle className="h-4 w-4 text-red-600" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {!order.payment_made && order.status !== "cancelled" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleMarkPaid(order.id)}
                                                            title="Mark Paid"
                                                        >
                                                            <Badge variant="outline" className="text-xs">Mark Paid</Badge>
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                        Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
                    </div>
                </CardContent>
            </Card>

            {/* Receive Delivery Dialog */}
            <Dialog open={!!deliveryOrder} onOpenChange={(open) => !open && setDeliveryOrder(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Receive Delivery</DialogTitle>
                        <DialogDescription>
                            Record details for Order #{deliveryOrder?.order_number || deliveryOrder?.id.slice(0, 8)}
                        </DialogDescription>
                    </DialogHeader>
                    {deliveryOrder && (
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Fuel Product</Label>
                                <Input disabled value={getProductName(deliveryOrder.product_id)} />
                            </div>

                            <div className="grid gap-2">
                                <Label>Received Into Tank *</Label>
                                <Select value={deliveryTankId} onValueChange={setDeliveryTankId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select tank" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {compatibleTanks.length > 0 ? (
                                            compatibleTanks.map((tank) => (
                                                <SelectItem key={tank.id} value={tank.id}>
                                                    {tank.name} ({tank.tank_type})
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <div className="p-2 text-sm text-muted-foreground">No compatible tanks found</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Ordered Vol</Label>
                                    <Input disabled value={deliveryOrder.liters_ordered} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Received Vol *</Label>
                                    <Input
                                        type="number"
                                        value={deliveryLiters}
                                        onChange={(e) => setDeliveryLiters(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Delivery Slip Number</Label>
                                <Input
                                    placeholder="e.g. SL-12345"
                                    value={deliverySlip}
                                    onChange={(e) => setDeliverySlip(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Vehicle No</Label>
                                    <Input
                                        placeholder="e.g. WP-1234"
                                        value={deliveryVehicle}
                                        onChange={(e) => setDeliveryVehicle(e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Driver Name</Label>
                                    <Input
                                        placeholder="Optional"
                                        value={deliveryDriver}
                                        onChange={(e) => setDeliveryDriver(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Notes</Label>
                                <Textarea
                                    placeholder="Any comments..."
                                    value={deliveryNotes}
                                    onChange={(e) => setDeliveryNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeliveryOrder(null)} disabled={isDelivering}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmDelivery} disabled={isDelivering || !deliveryTankId}>
                            {isDelivering && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Confirm Delivery
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
