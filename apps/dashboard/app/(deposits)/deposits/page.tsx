"use client";

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
import { Upload, FileText, CheckCircle2, Clock } from "lucide-react";

// Mock Data
const MOCK_DEPOSITS = [
    { id: "DEP-883", date: "2024-10-14", bank: "Sampath Bank", method: "CDM", amount: 150000, ref: "REF882199", status: "Verified" },
    { id: "DEP-882", date: "2024-10-13", bank: "Commercial Bank", method: "Slip", amount: 245000, ref: "SLP7721", status: "Verified" },
    { id: "DEP-881", date: "2024-10-13", bank: "BOC", method: "CDM", amount: 80000, ref: "REF881002", status: "Pending" },
    { id: "DEP-880", date: "2024-10-12", bank: "Sampath Bank", method: "Online", amount: 50000, ref: "TXN99281", status: "Verified" },
    { id: "DEP-879", date: "2024-10-11", bank: "Peoples Bank", method: "Slip", amount: 120000, ref: "SLP3321", status: "Verified" },
];

export default function DepositsPage() {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-background min-h-screen">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Deposits & Settlements</h1>
                <p className="text-muted-foreground">Record cash deposits and track settlement history.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Settlement Form - Takes up 1 column on large screens */}
                <div className="lg:col-span-1">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>New Deposit Entry</CardTitle>
                            <CardDescription>Record a bank deposit from shift cash.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bank">Bank Account</Label>
                                    <Select>
                                        <SelectTrigger id="bank">
                                            <SelectValue placeholder="Select Bank" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sampath">Sampath Bank - 1002</SelectItem>
                                            <SelectItem value="combank">Commercial Bank - 8821</SelectItem>
                                            <SelectItem value="boc">BOC - 9921</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="method">Deposit Method</Label>
                                    <Select>
                                        <SelectTrigger id="method">
                                            <SelectValue placeholder="Select Method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cdm">Cash Deposit Machine (CDM)</SelectItem>
                                            <SelectItem value="slip">Bank Slip / Counter</SelectItem>
                                            <SelectItem value="online">Online Transfer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="amount">Amount (LKR)</Label>
                                    <Input id="amount" type="number" placeholder="0.00" className="font-mono" />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="ref">Reference Number</Label>
                                    <Input id="ref" placeholder="Enter Slip/CDM Ref" />
                                </div>

                                <div className="space-y-2">
                                    <Label>Proof of Deposit</Label>
                                    <div className="border border-dashed rounded-md p-6 flex flex-col items-center justify-center text-center space-y-2 hover:bg-muted/50 transition-colors cursor-pointer">
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                        <div className="text-xs text-muted-foreground">
                                            <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                                            <br />photo of slip or receipt
                                        </div>
                                    </div>
                                </div>

                                <Button className="w-full mt-4" size="lg">Submit Entry</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* History Table - Takes up 2 columns on large screens */}
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Recent Deposits</CardTitle>
                            <CardDescription>History of recorded settlements and their verification status.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Bank Info</TableHead>
                                        <TableHead>Reference</TableHead>
                                        <TableHead className="text-right">Amount (LKR)</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {MOCK_DEPOSITS.map((deposit) => (
                                        <TableRow key={deposit.id}>
                                            <TableCell className="whitespace-nowrap font-medium text-sm text-muted-foreground">
                                                {deposit.date}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{deposit.bank}</span>
                                                    <span className="text-xs text-muted-foreground">{deposit.method}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{deposit.ref}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                {deposit.amount.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end">
                                                    <Badge
                                                        variant="outline"
                                                        className={`flex items-center gap-1 ${deposit.status === "Verified" ? "border-green-500 text-green-600 bg-green-50" : "border-amber-500 text-amber-600 bg-amber-50"}`}
                                                    >
                                                        {deposit.status === 'Verified' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                                        {deposit.status}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
