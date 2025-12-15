"use client"

import * as React from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, UserX, UserCheck, Plus } from "lucide-react"

// --- Mock Data ---

type EmployeeRole = "Staff" | "Pumper"
type EmployeeStatus = "Active" | "Inactive"

interface Employee {
    id: string
    name: string
    role: EmployeeRole
    dailyWage: number
    status: EmployeeStatus
    advancesTaken: number
}

const EMPLOYEES: Employee[] = [
    { id: "E001", name: "Kamal Perera", role: "Pumper", dailyWage: 1500, status: "Active", advancesTaken: 2000 },
    { id: "E002", name: "Sunil Silva", role: "Pumper", dailyWage: 1500, status: "Active", advancesTaken: 0 },
    { id: "E003", name: "Nimali Fernando", role: "Staff", dailyWage: 2500, status: "Active", advancesTaken: 5000 },
    { id: "E004", name: "Jayantha Bandara", role: "Pumper", dailyWage: 1500, status: "Inactive", advancesTaken: 0 },
    { id: "E005", name: "Chathura De Silva", role: "Staff", dailyWage: 2200, status: "Active", advancesTaken: 1000 },
]

// Attendance Status Types
type AttendanceStatus = "Present" | "Absent" | "Half-Day" | "Overtime"

// Mock Attendance for a week (Mon-Sun)
const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

// Helper to generate randomish attendance
const getMockAttendance = (empId: string) => {
    // Just deterministic mock based on ID char
    const code = empId.charCodeAt(3)
    return DAYS_OF_WEEK.map((day, i) => {
        if ((code + i) % 7 === 0) return "Absent"
        if ((code + i) % 5 === 0) return "Half-Day"
        if ((code + i) % 6 === 0) return "Overtime"
        return "Present"
    }) as AttendanceStatus[]
}

const ATTENDANCE_DATA = EMPLOYEES.filter(e => e.status === "Active").map(e => ({
    employeeId: e.id,
    employeeName: e.name,
    attendance: getMockAttendance(e.id)
}))


// --- Components ---

function StatusBadge({ status }: { status: EmployeeStatus }) {
    return (
        <Badge variant={status === "Active" ? "default" : "secondary"} className={status === "Active" ? "bg-green-600 hover:bg-green-700" : "bg-muted text-muted-foreground"}>
            {status}
        </Badge>
    )
}

export default function StaffPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6 bg-background min-h-screen">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Staff Management</h2>
                <div className="flex items-center space-x-2">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Add Employee
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="roster" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="roster" id="tab-roster">Employee Roster</TabsTrigger>
                    <TabsTrigger value="attendance" id="tab-attendance">Weekly Attendance</TabsTrigger>
                    <TabsTrigger value="payroll" id="tab-payroll">Payroll Summary</TabsTrigger>
                </TabsList>

                {/* --- Tab 1: Employee Roster --- */}
                <TabsContent value="roster" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Employees</CardTitle>
                            <CardDescription>
                                Manage your staff and pumpers.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Daily Wage (LKR)</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {EMPLOYEES.map((employee) => (
                                        <TableRow key={employee.id}>
                                            <TableCell className="font-medium">{employee.name}</TableCell>
                                            <TableCell>{employee.role}</TableCell>
                                            <TableCell>{employee.dailyWage.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={employee.status} />
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="ghost" size="sm">
                                                    <Edit className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                                {employee.status === 'Active' ? (
                                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                                                        <UserX className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button variant="ghost" size="sm" className="text-green-500 hover:text-green-700">
                                                        <UserCheck className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- Tab 2: Weekly Attendance --- */}
                <TabsContent value="attendance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Attendance Grid</CardTitle>
                            <CardDescription>
                                Mark attendance for active employees.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[200px]">Employee</TableHead>
                                            {DAYS_OF_WEEK.map(day => (
                                                <TableHead key={day} className="text-center">{day}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ATTENDANCE_DATA.map((record) => (
                                            <TableRow key={record.employeeId}>
                                                <TableCell className="font-medium">{record.employeeName}</TableCell>
                                                {record.attendance.map((status, index) => (
                                                    <TableCell key={index} className="p-2">
                                                        <Select defaultValue={status}>
                                                            <SelectTrigger className="h-8 w-full min-w-[90px]">
                                                                <SelectValue placeholder="Status" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Present"><span className="text-green-600">Present</span></SelectItem>
                                                                <SelectItem value="Absent"><span className="text-red-600">Absent</span></SelectItem>
                                                                <SelectItem value="Half-Day"><span className="text-yellow-600">Half-Day</span></SelectItem>
                                                                <SelectItem value="Overtime"><span className="text-blue-600">Overtime</span></SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- Tab 3: Payroll Summary --- */}
                <TabsContent value="payroll" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Payroll (Estimated)</CardTitle>
                            <CardDescription>
                                Calculated wages based on current attendance records and advances.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead className="text-right">Total Shifts</TableHead>
                                        <TableHead className="text-right">Gross Wage</TableHead>
                                        <TableHead className="text-right text-red-500">Advances</TableHead>
                                        <TableHead className="text-right font-bold">Net Payout</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ATTENDANCE_DATA.map((record) => {
                                        const emp = EMPLOYEES.find(e => e.id === record.employeeId)!

                                        const shifts = record.attendance.filter(s => s === "Present" || s === "Overtime").length + (record.attendance.filter(s => s === "Half-Day").length * 0.5)
                                        const otShifts = record.attendance.filter(s => s === "Overtime").length
                                        const bonus = otShifts * 500

                                        const gross = (shifts * emp.dailyWage) + bonus
                                        const net = gross - emp.advancesTaken

                                        return (
                                            <TableRow key={record.employeeId}>
                                                <TableCell className="font-medium">
                                                    <div>{record.employeeName}</div>
                                                    <div className="text-xs text-muted-foreground">{emp.role}</div>
                                                </TableCell>
                                                <TableCell className="text-right">{shifts}</TableCell>
                                                <TableCell className="text-right">{gross.toLocaleString()}</TableCell>
                                                <TableCell className="text-right text-red-500">-{emp.advancesTaken.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold">{net.toLocaleString()} LKR</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
