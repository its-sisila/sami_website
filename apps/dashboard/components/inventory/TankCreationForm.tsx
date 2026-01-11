"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Loader2, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { useProducts } from "@/lib/hooks";
import type { TankCreate } from "@/lib/api/types";
import { toast } from "sonner";

interface TankCreationFormProps {
    onTankCreated?: () => void;
}

const TANK_COLORS = [
    { id: "blue", name: "Blue", class: "bg-blue-500" },
    { id: "yellow", name: "Yellow", class: "bg-yellow-500" },
    { id: "red", name: "Red", class: "bg-red-500" },
    { id: "white", name: "White", class: "bg-gray-200 border border-gray-400" },
];

const TANK_TYPES = [
    { id: "3000G", name: "3000 Gallon", capacity: 13638.27 },
    { id: "5000G", name: "5000 Gallon", capacity: 22730.45 },
];

export function TankCreationForm({ onTankCreated }: TankCreationFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [productId, setProductId] = useState("");
    const [tankType, setTankType] = useState("");
    const [color, setColor] = useState("");
    const [customCapacity, setCustomCapacity] = useState("");

    // Fetch products from API with reduced refetching
    const { data: products, isLoading: productsLoading } = useProducts({
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
    });

    // Get capacity from selected type or custom
    const capacity = tankType
        ? TANK_TYPES.find(t => t.id === tankType)?.capacity || parseFloat(customCapacity) || 0
        : parseFloat(customCapacity) || 0;

    const handleCreate = async () => {
        if (!name || !productId || !capacity) {
            toast.warning("Please fill in all required fields.");
            return;
        }

        setIsCreating(true);
        try {
            const data: TankCreate = {
                name,
                product_id: productId,
                tank_type: tankType || null,
                capacity_liters: capacity,
                color: color || null,
            };

            await api.inventory.createTank(data);
            toast.success("Tank created successfully!");

            // Reset form
            setName("");
            setProductId("");
            setTankType("");
            setColor("");
            setCustomCapacity("");
            setIsOpen(false);

            // Notify parent to refresh
            onTankCreated?.();
        } catch (err: any) {
            toast.error(`Failed to create tank: ${err.message || err.detail || "Unknown error"}`);
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(true)}
                className="gap-2"
            >
                <PlusCircle className="h-4 w-4" />
                Add Tank
            </Button>
        );
    }

    return (
        <Card className="border-2 border-primary/20 animate-in fade-in slide-in-from-top-4">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Create New Tank</CardTitle>
                        <CardDescription>Add a new storage tank to your station.</CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(false)}
                        className="h-8 w-8"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                        <Label htmlFor="tank-name">Tank Name *</Label>
                        <Input
                            id="tank-name"
                            placeholder="e.g. LAD-5"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="product">Fuel Product *</Label>
                        <Select value={productId} onValueChange={setProductId}>
                            <SelectTrigger id="product">
                                <SelectValue placeholder={productsLoading ? "Loading..." : "Select product"} />
                            </SelectTrigger>
                            <SelectContent>
                                {productsLoading ? (
                                    <div className="p-2 text-sm text-muted-foreground">Loading products...</div>
                                ) : products && products.length > 0 ? (
                                    products.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name} ({p.code})
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-sm text-muted-foreground">No products available</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tank-type">Tank Type</Label>
                        <Select value={tankType} onValueChange={setTankType}>
                            <SelectTrigger id="tank-type">
                                <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent>
                                {TANK_TYPES.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {t.name} ({t.capacity.toLocaleString()} L)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="color">Color</Label>
                        <Select value={color} onValueChange={setColor}>
                            <SelectTrigger id="color">
                                <SelectValue placeholder="Select color" />
                            </SelectTrigger>
                            <SelectContent>
                                {TANK_COLORS.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        <div className="flex items-center gap-2">
                                            <div className={`h-3 w-3 rounded-full ${c.class}`} />
                                            {c.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                </div>

                {/* Action Buttons - separate row */}
                <div className="flex gap-2 mt-4">
                    <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        disabled={isCreating}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={isCreating || productsLoading}>
                        {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {isCreating ? "Creating..." : "Create Tank"}
                    </Button>
                </div>

                {capacity > 0 && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                        <span className="text-muted-foreground">Capacity: </span>
                        <span className="font-medium">{capacity.toLocaleString()} liters</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
