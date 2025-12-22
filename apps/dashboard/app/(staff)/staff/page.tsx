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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit, UserX, UserCheck, Plus, Clock, ArrowRight, Info, Eye, X, Save, LogOut } from "lucide-react"

// --- Mock Data ---

type EmployeeRole = "Staff" | "Pumper"
type EmployeeStatus = "Active" | "Inactive"
type Gender = "Male" | "Female"

interface Employee {
    id: string
    fullName: string
    nameWithInitials: string
    nic: string
    address: string
    phone: string
    role: EmployeeRole
    joinedDate: string // YYYY-MM-DD
    gender: Gender
    dob: string // YYYY-MM-DD
    dailyWage: number
    status: EmployeeStatus
    advancesTaken: number
}

const EMPLOYEES: Employee[] = [
    {
        id: "E001",
        fullName: "Kamal Perera",
        nameWithInitials: "K. Perera",
        nic: "851234567V",
        address: "No 12, Temple Rd, Colombo",
        phone: "0771234567",
        role: "Pumper",
        joinedDate: "2023-01-15",
        gender: "Male",
        dob: "1985-05-20",
        dailyWage: 1500,
        status: "Active",
        advancesTaken: 2000
    },
    {
        id: "E002",
        fullName: "Sunil Silva",
        nameWithInitials: "S. Silva",
        nic: "901234567V",
        address: "45/A, Beach Rd, Negombo",
        phone: "0719876543",
        role: "Pumper",
        joinedDate: "2023-03-10",
        gender: "Male",
        dob: "1990-08-12",
        dailyWage: 1500,
        status: "Active",
        advancesTaken: 0
    },
    {
        id: "E003",
        fullName: "Nimali Fernando",
        nameWithInitials: "N. Fernando",
        nic: "925678123V",
        address: "89, Main St, Gampaha",
        phone: "0765551234",
        role: "Staff",
        joinedDate: "2022-11-01",
        gender: "Female",
        dob: "1992-12-05",
        dailyWage: 2500,
        status: "Active",
        advancesTaken: 5000
    },
    {
        id: "E004",
        fullName: "Jayantha Bandara",
        nameWithInitials: "J. Bandara",
        nic: "781234567V",
        address: "12, Hill St, Kandy",
        phone: "0771112222",
        role: "Pumper",
        joinedDate: "2021-05-20",
        gender: "Male",
        dob: "1978-04-15",
        dailyWage: 1500,
        status: "Inactive",
        advancesTaken: 0
    },
    {
        id: "E005",
        fullName: "Chathura De Silva",
        nameWithInitials: "C. De Silva",
        nic: "951234567V",
        address: "33, Lake View, Kurunegala",
        phone: "0759998888",
        role: "Staff",
        joinedDate: "2023-06-01",
        gender: "Male",
        dob: "1995-02-28",
        dailyWage: 2200,
        status: "Active",
        advancesTaken: 1000
    },
]

// Attendance Status Types
type AttendanceStatus = "Present" | "Absent" | "Half-Day" | "Overtime"

// Mock Attendance for a month (1-31)
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1)

// Helper to generate randomish attendance
const getMockAttendance = (empId: string) => {
    // Just deterministic mock based on ID char
    const code = empId.charCodeAt(3)
    return DAYS_OF_MONTH.map((day, i) => {
        if ((code + i) % 7 === 0) return "Absent"
        if ((code + i) % 5 === 0) return "Half-Day"
        if ((code + i) % 6 === 0) return "Overtime"
        return "Present"
    }) as AttendanceStatus[]
}

const ATTENDANCE_DATA = EMPLOYEES.filter(e => e.status === "Active").map(e => ({
    employeeId: e.id,
    employeeName: e.nameWithInitials,
    attendance: getMockAttendance(e.id)
}))


// --- Mock Payroll Details Data ---

interface AdvanceRecord {
    id: string
    date: string
    time: string
    amount: number
}

interface ShiftLog {
    id: string
    date: string
    shift: "Day" | "Night"
    status: AttendanceStatus
    hours: number
}

// Generate deterministic mock logs
const getMockAdvanceHistory = (empId: string, totalAmount: number): AdvanceRecord[] => {
    if (totalAmount === 0) return []
    // Split total into random chunks
    const count = Math.ceil(totalAmount / 1000)
    const records: AdvanceRecord[] = []
    let remaining = totalAmount
    for (let i = 0; i < count; i++) {
        const amount = i === count - 1 ? remaining : 1000
        remaining -= amount
        records.push({
            id: `ADV-${empId}-${i}`,
            date: new Date(new Date().setDate(new Date().getDate() - (i * 3 + 1))).toISOString().split('T')[0],
            time: "10:30 AM",
            amount
        })
    }
    return records
}

const getMockShiftHistory = (empId: string, attendance: AttendanceStatus[]): ShiftLog[] => {
    const today = new Date()
    return attendance.map((status, i) => {
        const date = new Date(today)
        date.setDate(today.getDate() - (6 - i)) // Back from Sunday? Or simplistic relative
        return {
            id: `SH-${empId}-${i}`,
            date: date.toISOString().split('T')[0],
            shift: (i % 2 === 0 ? "Day" : "Night") as "Day" | "Night",
            status: status,
            hours: status === "Present" ? 12 : status === "Half-Day" ? 6 : status === "Overtime" ? 14 : 0
        }
    }).filter(s => s.status !== "Absent")
}

// --- Components ---

function StatusBadge({ status }: { status: EmployeeStatus }) {
    return (
        <Badge variant={status === "Active" ? "default" : "secondary"} className={status === "Active" ? "bg-green-600 hover:bg-green-700" : "bg-muted text-muted-foreground"}>
            {status}
        </Badge>
    )
}

interface AttendanceRecord {
    id: string
    timeIn: string // Manual User Input
    markedAt: Date   // System Timestamp
    timeOut?: string // Manual User Input
    markedOutAt?: Date // System Timestamp
}

// Simple Modal Component
function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
    if (!isOpen) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl border p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default function StaffPage() {
    // UI State
    const [isFormOpen, setIsFormOpen] = React.useState(false)
    const [editingEmployee, setEditingEmployee] = React.useState<Employee | null>(null)
    const [viewingEmployee, setViewingEmployee] = React.useState<Employee | null>(null)
    const [payrollViewingEmp, setPayrollViewingEmp] = React.useState<string | null>(null) // ID of employee viewing payroll

    // State for Daily Shifts
    const [shiftDate, setShiftDate] = React.useState<string>(new Date().toISOString().split('T')[0])
    const [shiftType, setShiftType] = React.useState<string>("Day")

    // Default manual time input state
    const getCurrentTime = () => {
        const now = new Date()
        return now.toTimeString().slice(0, 5)
    }
    const [manualTimeInputs, setManualTimeInputs] = React.useState<Record<string, string>>({})
    const [manualTimeOuts, setManualTimeOuts] = React.useState<Record<string, string>>({})

    const [presentEmployees, setPresentEmployees] = React.useState<AttendanceRecord[]>([
        { id: "E002", timeIn: "07:15", markedAt: new Date(new Date().setHours(7, 16)) },
        { id: "E005", timeIn: "07:00", markedAt: new Date(new Date().setHours(7, 5)) }
    ])

    const [nextShiftEmployees, setNextShiftEmployees] = React.useState<string[]>([])

    // Data State (Mocking mutation)
    const [employees, setEmployees] = React.useState<Employee[]>(EMPLOYEES)

    const handleManualTimeChange = (id: string, value: string) => {
        setManualTimeInputs(prev => ({ ...prev, [id]: value }))
    }
    const handleManualTimeOutChange = (id: string, value: string) => {
        setManualTimeOuts(prev => ({ ...prev, [id]: value }))
    }

    const togglePresent = (id: string) => {
        setPresentEmployees(prev => {
            const exists = prev.find(p => p.id === id)
            if (exists) {
                // If checking out (removing), we might want to prevent accidental removal, but keeping it simple as "Mark Out" logic is separate now maybe?
                // Actually existing logic was toggle. Let's keep toggle for Mark In/Cancel.
                return prev.filter(p => p.id !== id)
            } else {
                const timeIn = manualTimeInputs[id] || getCurrentTime()
                return [...prev, { id, timeIn, markedAt: new Date() }]
            }
        })
    }

    const markShiftEnd = (id: string) => {
        setPresentEmployees(prev => {
            return prev.map(p => {
                if (p.id === id) {
                    const timeOut = manualTimeOuts[id] || getCurrentTime()
                    return { ...p, timeOut, markedOutAt: new Date() }
                }
                return p
            })
        })
    }

    const toggleNextShift = (id: string) => {
        setNextShiftEmployees(prev =>
            prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
        )
    }

    const activeEmployees = employees.filter(e => e.status === "Active")

    // Form Handling (Mock)
    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        const newEmployeeData = {
            fullName: formData.get("fullName") as string,
            nameWithInitials: formData.get("nameWithInitials") as string,
            nic: formData.get("nic") as string,
            address: formData.get("address") as string,
            phone: formData.get("phone") as string,
            role: formData.get("role") as EmployeeRole,
            joinedDate: formData.get("joinedDate") as string,
            gender: formData.get("gender") as Gender,
            dob: formData.get("dob") as string,
            // Assuming default if not present or handling number conversion carefully
            dailyWage: 1500,
            status: "Active" as EmployeeStatus,
            advancesTaken: 0
        }

        if (editingEmployee) {
            setEmployees(prev => prev.map(emp =>
                emp.id === editingEmployee.id
                    ? { ...emp, ...newEmployeeData, id: emp.id, dailyWage: emp.dailyWage, status: emp.status, advancesTaken: emp.advancesTaken } // Preserve some fields for valid mock update
                    : emp
            ))
            alert("Employee updated (Mock)")
        } else {
            const newId = `E00${employees.length + 1}`
            // @ts-ignore
            setEmployees(prev => [...prev, { id: newId, ...newEmployeeData }])
            alert("Employee added (Mock)")
        }

        setIsFormOpen(false)
        setEditingEmployee(null)
    }

    const openAddForm = () => {
        setEditingEmployee(null)
        setIsFormOpen(true)
    }

    const openEditForm = (emp: Employee) => {
        setEditingEmployee(emp)
        setIsFormOpen(true)
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 bg-background min-h-screen relative">

            {/* --- Modals --- */}

            {/* Add/Edit Employee Modal */}
            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingEmployee ? "Edit Employee" : "Add New Employee"}>
                <form onSubmit={handleFormSubmit} className="grid gap-4 py-4" key={editingEmployee ? editingEmployee.id : 'new'}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="nic">NIC Number</Label>
                            <Input id="nic" name="nic" placeholder="e.g. 123456789V" defaultValue={editingEmployee?.nic} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="dob">Date of Birth</Label>
                            <Input id="dob" name="dob" type="date" defaultValue={editingEmployee?.dob} required />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input id="fullName" name="fullName" placeholder="Full legal name" defaultValue={editingEmployee?.fullName} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="initialsName">Name with Initials</Label>
                            <Input id="initialsName" name="nameWithInitials" placeholder="e.g. A. B. Perera" defaultValue={editingEmployee?.nameWithInitials} required />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="gender">Gender</Label>
                            <Select name="gender" defaultValue={editingEmployee?.gender || "Male"}>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="mobile">Phone Number</Label>
                            <Input id="mobile" name="phone" placeholder="077xxxxxxx" defaultValue={editingEmployee?.phone} required />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" name="address" placeholder="Permanent Residence" defaultValue={editingEmployee?.address} required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="role">Job Role</Label>
                            <Select name="role" defaultValue={editingEmployee?.role || "Pumper"}>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Staff">Staff</SelectItem>
                                    <SelectItem value="Pumper">Pumper</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="joined">Date Joined</Label>
                            <Input id="joined" name="joinedDate" type="date" defaultValue={editingEmployee?.joinedDate} required />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                        <Button type="submit"><Save className="w-4 h-4 mr-2" /> {editingEmployee ? "Update Employee" : "Save Employee"}</Button>
                    </div>
                </form>
            </Modal>

            {/* View Employee Modal */}
            <Modal isOpen={!!viewingEmployee} onClose={() => setViewingEmployee(null)} title="Employee Details">
                {viewingEmployee && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 pb-4 border-b">
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                                {viewingEmployee.nameWithInitials.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold">{viewingEmployee.nameWithInitials}</h3>
                                <p className="text-muted-foreground">{viewingEmployee.role} • Joined {viewingEmployee.joinedDate}</p>
                            </div>
                            <div className="ml-auto">
                                <StatusBadge status={viewingEmployee.status} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                            <div>
                                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Full Name</Label>
                                <p className="font-medium mt-1">{viewingEmployee.fullName}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs uppercase tracking-wide">NIC Number</Label>
                                <p className="font-medium mt-1">{viewingEmployee.nic}</p>
                            </div>

                            <div>
                                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Mobile Number</Label>
                                <p className="font-medium mt-1">{viewingEmployee.phone}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Gender</Label>
                                <p className="font-medium mt-1">{viewingEmployee.gender}</p>
                            </div>

                            <div className="col-span-2">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Address</Label>
                                <p className="font-medium mt-1">{viewingEmployee.address}</p>
                            </div>

                            <div>
                                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Date of Birth</Label>
                                <p className="font-medium mt-1">{viewingEmployee.dob}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Daily Wage</Label>
                                <p className="font-medium mt-1">{viewingEmployee.dailyWage.toLocaleString()} LKR</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t flex justify-end">
                            <Button variant="outline" onClick={() => setViewingEmployee(null)}>Close</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Payroll Details Modal */}
            <Modal isOpen={!!payrollViewingEmp} onClose={() => setPayrollViewingEmp(null)} title="Payroll Breakdown">
                {payrollViewingEmp && (() => {
                    const emp = employees.find(e => e.id === payrollViewingEmp)!
                    const attendanceRecord = ATTENDANCE_DATA.find(r => r.employeeId === emp.id)!

                    const advances = getMockAdvanceHistory(emp.id, emp.advancesTaken)
                    const shifts = getMockShiftHistory(emp.id, attendanceRecord.attendance)

                    return (
                        <div className="space-y-8">
                            <div>
                                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Advance Payments</h4>
                                {advances.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Time</TableHead>
                                                <TableHead className="text-right">Amount (LKR)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {advances.map(record => (
                                                <TableRow key={record.id}>
                                                    <TableCell>{record.date}</TableCell>
                                                    <TableCell>{record.time}</TableCell>
                                                    <TableCell className="text-right font-medium text-red-500">-{record.amount}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <p className="text-sm text-center py-4 text-muted-foreground border rounded-md">No advance payments taken this period.</p>
                                )}
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Work History (Current Period)</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Shift</TableHead>
                                            <TableHead>Duration</TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {shifts.map(log => (
                                            <TableRow key={log.id}>
                                                <TableCell>{log.date}</TableCell>
                                                <TableCell>{log.shift}</TableCell>
                                                <TableCell>{log.hours} Hrs</TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium 
                                                        ${log.status === 'Present' ? 'bg-green-100 text-green-700' :
                                                            log.status === 'Overtime' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {log.status}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )
                })()}
            </Modal>


            {/* --- Main Content --- */}

            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Staff Management</h2>
                <div className="flex items-center space-x-2">
                    <Button onClick={openAddForm}>
                        <Plus className="mr-2 h-4 w-4" /> Add Employee
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="shifts" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="shifts" id="tab-shifts">Daily Shifts</TabsTrigger>
                    <TabsTrigger value="attendance" id="tab-attendance">Monthly Attendance</TabsTrigger>
                    <TabsTrigger value="payroll" id="tab-payroll">Payroll Summary</TabsTrigger>
                    <TabsTrigger value="roster" id="tab-roster">Employee Roster</TabsTrigger>
                </TabsList>



                {/* --- Tab NEW: Daily Shifts --- */}
                <TabsContent value="shifts" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-3">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Current Shift Check-in</CardTitle>
                                    <Badge variant="outline" className="ml-2">{activeEmployees.filter(e => presentEmployees.some(p => p.id === e.id && !p.timeOut)).length} On Shift</Badge>
                                </div>
                                <CardDescription>
                                    Who is working right now?
                                </CardDescription>

                                {/* Shift Configuration */}
                                <div className="flex gap-4 mt-4 p-4 bg-muted/50 rounded-lg border">
                                    <div className="grid w-full max-w-sm items-center gap-1.5">
                                        <Label htmlFor="date">Date</Label>
                                        <Input
                                            type="date"
                                            id="date"
                                            value={shiftDate}
                                            onChange={(e) => setShiftDate(e.target.value)}
                                            className="bg-background"
                                        />
                                    </div>
                                    <div className="grid w-full max-w-sm items-center gap-1.5">
                                        <Label htmlFor="shift">Shift</Label>
                                        <Select value={shiftType} onValueChange={setShiftType}>
                                            <SelectTrigger id="shift" className="bg-background">
                                                <SelectValue placeholder="Select shift" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Day">Day (7am-7pm)</SelectItem>
                                                <SelectItem value="Night">Night (7pm-7am)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {activeEmployees.map(emp => {
                                        const record = presentEmployees.find(p => p.id === emp.id)
                                        const isPresent = !!record
                                        const isShiftEnded = record?.timeOut
                                        const userTimeInput = manualTimeInputs[emp.id] || ""
                                        const userTimeOutInput = manualTimeOuts[emp.id] || ""

                                        return (
                                            <div key={emp.id} className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-2 h-2 rounded-full ${isPresent ? (isShiftEnded ? "bg-gray-400" : "bg-green-500") : "bg-gray-300"}`} />
                                                        <div>
                                                            <p className="font-medium text-sm">{emp.nameWithInitials}</p>
                                                            <p className="text-xs text-muted-foreground">{emp.role}</p>
                                                        </div>
                                                    </div>

                                                    {/* If NOT present, show manual time input */}
                                                    {!isPresent && (
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="time"
                                                                className="h-8 w-[130px] bg-background"
                                                                value={userTimeInput}
                                                                onChange={(e) => handleManualTimeChange(emp.id, e.target.value)}
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => togglePresent(emp.id)}
                                                            >
                                                                Mark Present
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {/* If Present & Running, show End Shift option */}
                                                    {isPresent && !isShiftEnded && (
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="time"
                                                                className="h-8 w-[130px] bg-background text-red-600"
                                                                value={userTimeOutInput}
                                                                onChange={(e) => handleManualTimeOutChange(emp.id, e.target.value)}
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => markShiftEnd(emp.id)}
                                                            >
                                                                End Shift
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {/* If Shift Ended */}
                                                    {isShiftEnded && (
                                                        <Badge variant="secondary">Shift Ended</Badge>
                                                    )}
                                                </div>

                                                {/* Audit Info Display */}
                                                {isPresent && (
                                                    <div className="flex flex-col gap-1 text-xs bg-muted/50 p-2 rounded border border-dashed">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3 text-blue-600" />
                                                                <span className="font-medium text-blue-700">In: {record.timeIn}</span>
                                                            </div>
                                                            <div
                                                                className="flex items-center gap-1 text-muted-foreground cursor-help"
                                                                title="System Log Time (In)"
                                                            >
                                                                <Info className="w-3 h-3" />
                                                                <span>Log: {record.markedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        </div>
                                                        {isShiftEnded && (
                                                            <div className="flex items-center justify-between border-t border-dashed pt-1 mt-1">
                                                                <div className="flex items-center gap-1">
                                                                    <LogOut className="w-3 h-3 text-orange-600" />
                                                                    <span className="font-medium text-orange-700">Out: {record.timeOut}</span>
                                                                </div>
                                                                <div
                                                                    className="flex items-center gap-1 text-muted-foreground cursor-help"
                                                                    title="System Log Time (Out)"
                                                                >
                                                                    <Info className="w-3 h-3" />
                                                                    <span>Log: {record.markedOutAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="col-span-1 flex items-center justify-center">
                            <ArrowRight className="h-8 w-8 text-muted-foreground hidden lg:block" />
                        </div>

                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>Next Shift Schedule</CardTitle>
                                <CardDescription>
                                    Assign staff for the upcoming shift.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {activeEmployees.map(emp => {
                                        const isScheduled = nextShiftEmployees.includes(emp.id)
                                        return (
                                            <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center space-x-3">
                                                    <Clock className={`w-4 h-4 ${isScheduled ? "text-blue-500" : "text-gray-300"}`} />
                                                    <div>
                                                        <p className="font-medium text-sm">{emp.nameWithInitials}</p>
                                                        <p className="text-xs text-muted-foreground">{emp.role} • {emp.phone}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant={isScheduled ? "default" : "outline"}
                                                    onClick={() => toggleNextShift(emp.id)}
                                                    className={isScheduled ? "bg-blue-600 hover:bg-blue-700" : ""}
                                                >
                                                    {isScheduled ? "Scheduled" : "Assign"}
                                                </Button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>


                {/* --- Tab 2: Monthly Attendance --- */}
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
                                            {DAYS_OF_MONTH.map(day => (
                                                <TableHead key={day} className="text-center min-w-[50px]">{day}</TableHead>
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
                                                                <SelectItem value="Present">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                                                        Present
                                                                    </span>
                                                                </SelectItem>
                                                                <SelectItem value="Absent">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                                                        Absent
                                                                    </span>
                                                                </SelectItem>
                                                                <SelectItem value="Half-Day">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                                                                        Half-Day
                                                                    </span>
                                                                </SelectItem>
                                                                <SelectItem value="Overtime">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                                                        Overtime
                                                                    </span>
                                                                </SelectItem>
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
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ATTENDANCE_DATA.map((record) => {
                                        const emp = employees.find(e => e.id === record.employeeId)!

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
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => setPayrollViewingEmp(emp.id)}>
                                                        <Eye className="h-4 w-4 text-blue-500 mr-2" /> View Details
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- Tab 4: Employee Roster --- */}
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
                                        <TableHead>Name (Initials)</TableHead>
                                        <TableHead>NIC / Phone</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employees.map((employee) => (
                                        <TableRow key={employee.id}>
                                            <TableCell className="font-medium">
                                                <div>{employee.nameWithInitials}</div>
                                                <div className="text-xs text-muted-foreground md:hidden">{employee.phone}</div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <div className="text-sm">{employee.nic}</div>
                                                <div className="text-xs text-muted-foreground">{employee.phone}</div>
                                            </TableCell>
                                            <TableCell>{employee.role}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={employee.status} />
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="ghost" size="sm" onClick={() => setViewingEmployee(employee)}>
                                                    <Eye className="h-4 w-4 text-blue-500 mr-2" /> View Details
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => openEditForm(employee)}>
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
            </Tabs>
        </div>
    )
}
