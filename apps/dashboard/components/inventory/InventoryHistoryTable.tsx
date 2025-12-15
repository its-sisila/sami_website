"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const MOCK_HISTORY = [
    { id: 1, date: "2023-10-25", tank: "Tank 1 (Diesel)", reading: "19,500 L", delivery: "-", sales: "1,200 L", diff: "-5 L", status: "ok" },
    { id: 2, date: "2023-10-25", tank: "Tank 2 (Petrol 92)", reading: "8,200 L", delivery: "6,600 L", sales: "2,100 L", diff: "+2 L", status: "ok" },
    { id: 3, date: "2023-10-24", tank: "Tank 1 (Diesel)", reading: "20,705 L", delivery: "-", sales: "1,100 L", diff: "-12 L", status: "warning" },
    { id: 4, date: "2023-10-24", tank: "Tank 2 (Petrol 92)", reading: "3,700 L", delivery: "-", sales: "1,850 L", diff: "-2 L", status: "ok" },
    { id: 5, date: "2023-10-23", tank: "Tank 4 (Super Diesel)", reading: "4,500 L", delivery: "-", sales: "300 L", diff: "0 L", status: "ok" },
];

export function InventoryHistoryTable() {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Tank</TableHead>
                        <TableHead className="text-right">Reading (Vol)</TableHead>
                        <TableHead className="text-right">Delivery</TableHead>
                        <TableHead className="text-right">Est. Sales</TableHead>
                        <TableHead className="text-right">Diff</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {MOCK_HISTORY.map((row) => (
                        <TableRow key={row.id}>
                            <TableCell className="font-medium">{row.date}</TableCell>
                            <TableCell>{row.tank}</TableCell>
                            <TableCell className="text-right">{row.reading}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">{row.delivery}</TableCell>
                            <TableCell className="text-right">{row.sales}</TableCell>
                            <TableCell className={`text-right ${row.status === 'warning' ? 'text-red-500 font-bold' : ''}`}>
                                {row.diff}
                            </TableCell>
                            <TableCell className="text-center">
                                {row.status === 'warning' ? (
                                    <Badge variant="destructive">Chk</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">OK</Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
