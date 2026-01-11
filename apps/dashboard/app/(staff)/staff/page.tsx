"use client"

import * as React from "react"
import { mutate } from "swr"
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
import { Edit, UserX, UserCheck, Plus, Clock, ArrowRight, Info, Eye, X, Save, LogOut, Loader2, Download, Play, Square } from "lucide-react"
import { useEmployees, useMonthlyAttendance, usePayroll, useAdvances, useShifts, useDailyAttendance, useUsers } from "@/lib/hooks"
import { useSales } from "@/lib/hooks/use-sales"
import { api } from "@/lib/api/client"
import type { ShiftType } from "@/lib/api/types"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"

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




// --- Components ---

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

    // Payment Dialog State
    const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false)
    const [paymentDialogData, setPaymentDialogData] = React.useState<{
        employee_id: string;
        employee_name: string;
        gross_wage: number;
        total_advances: number;
        net_payable: number;
    } | null>(null)
    const [paymentNotes, setPaymentNotes] = React.useState('')
    const [paymentDateTime, setPaymentDateTime] = React.useState(new Date().toISOString().slice(0, 16))
    const [paymentPaidBy, setPaymentPaidBy] = React.useState('')
    const [isSubmittingPayment, setIsSubmittingPayment] = React.useState(false)

    // API Hook for users (for paid_by dropdown)
    const { data: usersData } = useUsers()

    // State for Daily Shifts
    const [shiftDate, setShiftDate] = React.useState<string>(new Date().toISOString().split('T')[0])
    const [shiftType, setShiftType] = React.useState<string>("Day")

    // State for Monthly Attendance
    const [selectedMonth, setSelectedMonth] = React.useState<number>(new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear())

    // API Hook for monthly attendance
    const {
        data: monthlyAttendanceData,
        isLoading: isLoadingMonthlyAttendance,
        error: monthlyAttendanceError,
    } = useMonthlyAttendance(selectedYear, selectedMonth)

    // State for Payroll (default to current month)
    const getMonthDateRange = (year: number, month: number) => {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
        return { startDate, endDate }
    }
    const [payrollMonth, setPayrollMonth] = React.useState<number>(new Date().getMonth() + 1)
    const [payrollYear, setPayrollYear] = React.useState<number>(new Date().getFullYear())
    const { startDate: payrollStartDate, endDate: payrollEndDate } = getMonthDateRange(payrollYear, payrollMonth)

    // API Hook for payroll
    const {
        data: payrollData,
        isLoading: isLoadingPayroll,
        error: payrollError,
    } = usePayroll(payrollStartDate, payrollEndDate)

    // API Hook for advance payments (for payroll details modal)
    const {
        data: advancesData,
        isLoading: isLoadingAdvances,
    } = useAdvances(payrollViewingEmp)

    // API Hook for shift history (for payroll details modal)
    const {
        data: shiftsData,
        isLoading: isLoadingShifts,
    } = useShifts(payrollViewingEmp)

    // API Hook for shift management
    const {
        currentShift,
        isLoading: isShiftLoading,
        error: shiftError,
        hasActiveShift,
        startShift,
        endShift,
        clearError,
    } = useSales()

    // Sync shift state from API
    React.useEffect(() => {
        if (currentShift) {
            setShiftType(currentShift.shift_type === 'day' ? 'Day' : 'Night')
            setShiftDate(currentShift.shift_date)
        }
    }, [currentShift])

    // Handle starting a new shift
    const handleStartShift = async () => {
        try {
            const shiftTypeApi: ShiftType = shiftType === 'Day' ? 'day' : 'night'
            await startShift(shiftTypeApi, shiftDate)
        } catch (err: any) {
            alert(`Failed to start shift: ${err.message}`)
        }
    }

    // Handle ending the current shift
    const handleEndShift = async () => {
        console.log('[handleEndShift] called, hasActiveShift:', hasActiveShift, 'currentShift:', currentShift)
        if (!hasActiveShift) {
            console.log('[handleEndShift] No active shift, returning early')
            return
        }

        console.log('[handleEndShift] Calling endShift API...')
        try {
            await endShift()
            console.log('[handleEndShift] Shift closed successfully')
        } catch (err: any) {
            console.error('[handleEndShift] Error:', err)
            alert(`Failed to close shift: ${err.message}`)
        }
    }

    // Default manual time input state
    const getCurrentTime = () => {
        const now = new Date()
        return now.toTimeString().slice(0, 5)
    }
    const [manualTimeInputs, setManualTimeInputs] = React.useState<Record<string, string>>({})
    const [manualTimeOuts, setManualTimeOuts] = React.useState<Record<string, string>>({})

    const [presentEmployees, setPresentEmployees] = React.useState<AttendanceRecord[]>([])

    // Fetch daily attendance
    const { data: apiAttendance, mutate: mutateAttendance } = useDailyAttendance(shiftDate)

    // Sync API attendance to local state
    React.useEffect(() => {
        if (apiAttendance) {
            const mapped = apiAttendance.map(record => ({
                id: record.employee_id,
                timeIn: record.time_in ? record.time_in.slice(0, 5) : "",
                markedAt: new Date(record.created_at),
                timeOut: record.time_out ? record.time_out.slice(0, 5) : undefined,
                markedOutAt: record.time_out ? new Date(record.created_at) : undefined // Approx
            }))
            setPresentEmployees(mapped)
        }
    }, [apiAttendance])

    const [nextShiftEmployees, setNextShiftEmployees] = React.useState<string[]>([])

    // Fetch real employee data from API
    const { data: apiEmployees, error: employeesError, isLoading: employeesLoading } = useEmployees()

    // Map API data to local format, fallback to mock data
    const mappedApiEmployees = React.useMemo((): Employee[] => {
        if (apiEmployees && apiEmployees.length > 0) {
            return apiEmployees.map(emp => ({
                id: emp.id,
                fullName: emp.full_name,
                nameWithInitials: emp.name_with_initials || emp.full_name.split(' ').map((n, i) => i === 0 ? n.charAt(0) + '.' : n).join(' '),
                nic: emp.nic || '',
                address: emp.address || '',
                phone: emp.phone || '',
                role: (emp.role === 'staff' ? 'Staff' : 'Pumper') as EmployeeRole,
                joinedDate: emp.joined_date || '',
                gender: (emp.gender === 'male' ? 'Male' : emp.gender === 'female' ? 'Female' : 'Male') as Gender,
                dob: emp.date_of_birth || '',
                dailyWage: emp.daily_wage,
                status: (emp.is_active ? 'Active' : 'Inactive') as EmployeeStatus,
                advancesTaken: 0 // No API field for this yet
            }))
        }
        // Fallback to mock data for development (only if DISABLE_MOCK_DATA is false)
        if (process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA === 'true') {
            return []
        }
        return EMPLOYEES
    }, [apiEmployees])

    // Data State (Mocking mutation)
    const [employees, setEmployees] = React.useState<Employee[]>(EMPLOYEES)

    // Update employees when API data changes
    React.useEffect(() => {
        if (mappedApiEmployees.length > 0) {
            setEmployees(mappedApiEmployees)
        }
    }, [mappedApiEmployees])

    const handleManualTimeChange = (id: string, value: string) => {
        setManualTimeInputs(prev => ({ ...prev, [id]: value }))
    }
    const handleManualTimeOutChange = (id: string, value: string) => {
        setManualTimeOuts(prev => ({ ...prev, [id]: value }))
    }

    const togglePresent = async (id: string) => {
        const exists = presentEmployees.find(p => p.id === id)

        if (exists) {
            // Remove from local state (unmark)
            setPresentEmployees(prev => prev.filter(p => p.id !== id))
        } else {
            // Mark as present
            const timeIn = manualTimeInputs[id] || getCurrentTime()

            // Update local state immediately for responsiveness
            setPresentEmployees(prev => [...prev, { id, timeIn, markedAt: new Date() }])

            // Only call API if this is a real UUID (not mock data like "E001")
            const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
            if (!isValidUUID) {
                console.log('[togglePresent] Skipping API call for mock employee:', id)
                return
            }

            // Call API to persist
            try {
                await api.employees.markAttendance({
                    attendance_date: shiftDate,
                    shift_id: currentShift?.id || undefined,
                    entries: [{
                        employee_id: id,
                        status: 'present',
                        time_in: timeIn,
                    }]
                })
                console.log('[togglePresent] Marked attendance for', id)
                mutateAttendance() // Refresh list
            } catch (err: any) {
                console.error('[togglePresent] API error:', err)
                // Revert local state on error
                setPresentEmployees(prev => prev.filter(p => p.id !== id))
                const errorMsg = err.detail || err.message || 'Unknown error'
                alert(`Failed to mark attendance: ${errorMsg}`)
            }
        }
    }

    const markShiftEnd = async (id: string) => {
        const timeOut = manualTimeOuts[id] || getCurrentTime()

        // Update local state immediately
        setPresentEmployees(prev => prev.map(p =>
            p.id === id ? { ...p, timeOut, markedOutAt: new Date() } : p
        ))

        // Only call API if this is a real UUID (not mock data)
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        if (!isValidUUID) {
            console.log('[markShiftEnd] Skipping API call for mock employee:', id)
            return
        }

        // Call API to persist time_out
        try {
            await api.employees.markAttendance({
                attendance_date: shiftDate,
                shift_id: currentShift?.id || undefined,
                entries: [{
                    employee_id: id,
                    status: 'present',
                    time_out: timeOut,
                }]
            })
            console.log('[markShiftEnd] Marked time_out for', id)
            mutateAttendance() // Refresh list
        } catch (err: any) {
            console.error('[markShiftEnd] API error:', err)
            // Revert local state on error
            setPresentEmployees(prev => prev.map(p =>
                p.id === id ? { ...p, timeOut: undefined, markedOutAt: undefined } : p
            ))
            const errorMsg = err.detail || err.message || 'Unknown error'
            alert(`Failed to end shift: ${errorMsg}`)
        }
    }






    const activeEmployees = employees.filter(e => e.status === "Active")

    // Form submission state
    const [isSubmitting, setIsSubmitting] = React.useState(false)




    // Form Handling - Wired to API
    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        const employeeData = {
            full_name: formData.get("fullName") as string,
            name_with_initials: formData.get("nameWithInitials") as string || null,
            nic: formData.get("nic") as string || null,
            address: formData.get("address") as string || null,
            phone: formData.get("phone") as string || null,
            role: (formData.get("role") as string)?.toLowerCase() === 'staff' ? 'staff' : 'pumper' as 'staff' | 'pumper',
            joined_date: formData.get("joinedDate") as string || null,
            gender: (formData.get("gender") as string)?.toLowerCase() || null,
            date_of_birth: formData.get("dob") as string || null,
            daily_wage: parseFloat(formData.get("dailyWage") as string) || 1500,
        }

        setIsSubmitting(true)
        try {
            if (editingEmployee) {
                // Update existing employee
                await api.employees.update(editingEmployee.id, employeeData)
                alert("Employee updated successfully")
            } else {
                // Create new employee
                await api.employees.create(employeeData as any)
                alert("Employee added successfully")
            }

            // Refresh employee list from API - trigger SWR revalidation

            // Refresh employee list from API - trigger SWR revalidation
            await mutate('/employees')
            // Also invalidate active employees query if it exists in cache
            mutate('/employees?active_only=true')

            setIsFormOpen(false)
            setEditingEmployee(null)
        } catch (err: any) {
            alert(`Failed to save employee: ${err.message || err.detail || "Unknown error"}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    const openAddForm = () => {
        setEditingEmployee(null)
        setIsFormOpen(true)
    }

    const openEditForm = (emp: Employee) => {
        setEditingEmployee(emp)
        setIsFormOpen(true)
    }

    // Loading state
    if (employeesLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading staff data...</p>
            </div>
        )
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

            {/* Payment Details Dialog */}
            <Modal
                isOpen={paymentDialogOpen}
                onClose={() => setPaymentDialogOpen(false)}
                title="Record Payment"
            >
                {paymentDialogData && (
                    <div className="space-y-6">
                        {/* Employee & Amount Info */}
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Employee</span>
                                <span className="font-semibold">{paymentDialogData.employee_name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Period</span>
                                <span className="text-sm">{payrollStartDate} to {payrollEndDate}</span>
                            </div>
                            <hr className="border-border" />
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Gross Wage</span>
                                <span>LKR {paymentDialogData.gross_wage.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Advances Deducted</span>
                                <span className="text-red-500">-LKR {paymentDialogData.total_advances.toLocaleString()}</span>
                            </div>
                            <hr className="border-border" />
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>Net Amount</span>
                                <span className="text-green-600">LKR {paymentDialogData.net_payable.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Payment Date/Time */}
                        <div className="grid gap-2">
                            <Label htmlFor="paymentDateTime">Payment Date & Time</Label>
                            <Input
                                id="paymentDateTime"
                                type="datetime-local"
                                value={paymentDateTime}
                                onChange={(e) => setPaymentDateTime(e.target.value)}
                            />
                        </div>

                        {/* Paid By */}
                        <div className="grid gap-2">
                            <Label htmlFor="paymentPaidBy">Paid By</Label>
                            <Input
                                id="paymentPaidBy"
                                type="text"
                                placeholder="e.g., Name (Accountant)"
                                value={paymentPaidBy}
                                onChange={(e) => setPaymentPaidBy(e.target.value)}
                            />
                        </div>

                        {/* Notes */}
                        <div className="grid gap-2">
                            <Label htmlFor="paymentNotes">Notes (optional)</Label>
                            <textarea
                                id="paymentNotes"
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                placeholder="e.g., Paid via bank transfer, receipt #123"
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setPaymentDialogOpen(false)}
                                disabled={isSubmittingPayment}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={async () => {
                                    if (!payrollData || !paymentDialogData) return;
                                    setIsSubmittingPayment(true);
                                    try {
                                        await api.employees.recordPayrollPayment({
                                            employee_id: paymentDialogData.employee_id,
                                            period_start: payrollData.start_date,
                                            period_end: payrollData.end_date,
                                            gross_amount: paymentDialogData.gross_wage,
                                            advances_deducted: paymentDialogData.total_advances,
                                            net_amount: paymentDialogData.net_payable,
                                            paid_by: paymentPaidBy || undefined,
                                            notes: paymentNotes || undefined,
                                        });
                                        // Refresh payroll data
                                        mutate(`/employees/payroll?start=${payrollData.start_date}&end=${payrollData.end_date}`);
                                        setPaymentDialogOpen(false);
                                    } catch (err) {
                                        console.error('Failed to record payment:', err);
                                        alert('Failed to record payment. Please try again.');
                                    } finally {
                                        setIsSubmittingPayment(false);
                                    }
                                }}
                                disabled={isSubmittingPayment}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {isSubmittingPayment ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Recording...</>
                                ) : (
                                    'Confirm Payment'
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>



            {/* --- Main Content --- */}

            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Staff Management</h2>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            const currentMonth = new Date().toISOString().slice(0, 7);
                            api.exports.downloadAttendance(currentMonth)
                                .catch(err => alert(`Export failed: ${err.message}`));
                        }}
                    >
                        <Download className="mr-2 h-4 w-4" /> Export Attendance
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            api.exports.downloadEmployees()
                                .catch(err => alert(`Export failed: ${err.message}`));
                        }}
                    >
                        <Download className="mr-2 h-4 w-4" /> Export Employees
                    </Button>
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
                                <div className="flex flex-wrap gap-4 mt-4 p-4 bg-muted/50 rounded-lg border items-end">
                                    <div className="grid w-full max-w-sm items-center gap-1.5">
                                        <Label htmlFor="date">Date</Label>
                                        <Input
                                            type="date"
                                            id="date"
                                            value={shiftDate}
                                            onChange={(e) => setShiftDate(e.target.value)}
                                            className="bg-background"
                                            disabled={hasActiveShift}
                                        />
                                    </div>
                                    <div className="grid w-full max-w-sm items-center gap-1.5">
                                        <Label htmlFor="shift">Shift</Label>
                                        <Select value={shiftType} onValueChange={setShiftType} disabled={hasActiveShift}>
                                            <SelectTrigger id="shift" className="bg-background">
                                                <SelectValue placeholder="Select shift" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Day">Day (7am-7pm)</SelectItem>
                                                <SelectItem value="Night">Night (7pm-7am)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Start/End Shift Button */}
                                    <div className="grid items-center gap-1.5">
                                        <Label className="invisible">Action</Label>
                                        {!hasActiveShift ? (
                                            <Button
                                                onClick={handleStartShift}
                                                disabled={isShiftLoading}
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                {isShiftLoading ? (
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Play className="h-4 w-4 mr-2" />
                                                )}
                                                Start Shift
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={handleEndShift}
                                                disabled={isShiftLoading}
                                                variant="destructive"
                                            >
                                                {isShiftLoading ? (
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Square className="h-4 w-4 mr-2" />
                                                )}
                                                End Shift
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Active Shift Indicator */}
                                {hasActiveShift && currentShift && (
                                    <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2">
                                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-sm font-medium text-green-800">
                                            Active: {currentShift.shift_type === 'day' ? 'Day' : 'Night'} shift on {currentShift.shift_date}
                                        </span>
                                    </div>
                                )}

                                {/* Error Display */}
                                {shiftError && (
                                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center justify-between">
                                        <span className="text-sm text-red-800">{shiftError}</span>
                                        <button onClick={clearError} className="text-red-600 hover:text-red-800 text-sm underline">
                                            Dismiss
                                        </button>
                                    </div>
                                )}
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
                                                                disabled={!hasActiveShift}
                                                                title={!hasActiveShift ? 'Start a shift first' : ''}
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
                                                                disabled={!hasActiveShift}
                                                                title={!hasActiveShift ? 'No active shift' : ''}
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


                    </div>
                </TabsContent>


                {/* --- Tab 2: Monthly Attendance --- */}
                <TabsContent value="attendance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Monthly Attendance</CardTitle>
                                    <CardDescription>
                                        View attendance records from daily shifts
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="att-month" className="text-sm">Month:</Label>
                                        <Select value={String(selectedMonth)} onValueChange={(v: string) => setSelectedMonth(Number(v))}>
                                            <SelectTrigger id="att-month" className="w-[120px]">
                                                <SelectValue placeholder="Month" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                                                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="att-year" className="text-sm">Year:</Label>
                                        <Select value={String(selectedYear)} onValueChange={(v: string) => setSelectedYear(Number(v))}>
                                            <SelectTrigger id="att-year" className="w-[100px]">
                                                <SelectValue placeholder="Year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[2023, 2024, 2025, 2026].map(y => (
                                                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {isLoadingMonthlyAttendance && (
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {monthlyAttendanceError && (
                                <div className="text-red-500 text-sm mb-4">{monthlyAttendanceError}</div>
                            )}
                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[180px] sticky left-0 bg-background z-10">Employee</TableHead>
                                            {DAYS_OF_MONTH.map(day => (
                                                <TableHead key={day} className="text-center min-w-[40px] px-1">{day}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingMonthlyAttendance ? (
                                            <TableRow>
                                                <TableCell colSpan={32} className="text-center py-8">
                                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                                    <p className="text-sm text-muted-foreground mt-2">Loading attendance...</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : monthlyAttendanceData && monthlyAttendanceData.length > 0 ? (
                                            monthlyAttendanceData.map((record) => (
                                                <TableRow key={record.employee_id}>
                                                    <TableCell className="font-medium sticky left-0 bg-background z-10">{record.employee_name}</TableCell>
                                                    {record.attendance.map((dayData, index) => {
                                                        const status = dayData.status
                                                        return (
                                                            <TableCell key={index} className="p-1 text-center">
                                                                {status ? (
                                                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium
                                                                        ${status === 'present' ? 'bg-green-100 text-green-700' :
                                                                            status === 'absent' ? 'bg-red-100 text-red-700' :
                                                                                status === 'half_day' ? 'bg-yellow-100 text-yellow-700' :
                                                                                    'bg-blue-100 text-blue-700'}`}
                                                                        title={status}
                                                                    >
                                                                        {status === 'present' ? 'P' :
                                                                            status === 'absent' ? 'A' :
                                                                                status === 'half_day' ? 'H' : 'O'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground">-</span>
                                                                )}
                                                            </TableCell>
                                                        )
                                                    })}
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={32} className="text-center py-8 text-muted-foreground">
                                                    No attendance records for this month
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-100 text-green-700 font-medium">P</span>
                                    Present
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-red-100 text-red-700 font-medium">A</span>
                                    Absent
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-yellow-100 text-yellow-700 font-medium">H</span>
                                    Half-Day
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-100 text-blue-700 font-medium">O</span>
                                    Overtime
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Shift Count Chart */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Shift Leaderboard</CardTitle>
                                    <CardDescription>
                                        Employees ranked by number of shifts worked
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="chart-month" className="text-sm">Month:</Label>
                                        <Select defaultValue={String(new Date().getMonth() + 1)}>
                                            <SelectTrigger id="chart-month" className="w-[120px]">
                                                <SelectValue placeholder="Month" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                                                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="chart-year" className="text-sm">Year:</Label>
                                        <Select defaultValue={String(new Date().getFullYear())}>
                                            <SelectTrigger id="chart-year" className="w-[100px]">
                                                <SelectValue placeholder="Year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[2023, 2024, 2025].map(y => (
                                                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={(monthlyAttendanceData || []).map(record => ({
                                            name: record.employee_name,
                                            shifts: record.attendance.filter(d => d.status === 'present' || d.status === 'overtime').length +
                                                record.attendance.filter(d => d.status === 'half_day').length * 0.5,
                                            present: record.attendance.filter(d => d.status === 'present').length,
                                            overtime: record.attendance.filter(d => d.status === 'overtime').length,
                                            halfDay: record.attendance.filter(d => d.status === 'half_day').length,
                                        })).sort((a, b) => b.shifts - a.shifts)}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" allowDecimals={false} />
                                        <YAxis dataKey="name" type="category" width={70} fontSize={12} />
                                        <Tooltip
                                            formatter={(value: number, name: string) => [
                                                value,
                                                name === 'present' ? 'Present Days' :
                                                    name === 'overtime' ? 'Overtime Days' :
                                                        name === 'halfDay' ? 'Half Days' : 'Total Shifts'
                                            ]}
                                        />
                                        <Bar dataKey="present" stackId="a" fill="#22c55e" name="present" />
                                        <Bar dataKey="halfDay" stackId="a" fill="#eab308" name="halfDay" />
                                        <Bar dataKey="overtime" stackId="a" fill="#3b82f6" name="overtime" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex gap-4 mt-4 text-xs text-muted-foreground justify-center">
                                <div className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded bg-green-500"></span>
                                    Present
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded bg-yellow-500"></span>
                                    Half-Day
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded bg-blue-500"></span>
                                    Overtime
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- Tab 3: Payroll Summary --- */}
                <TabsContent value="payroll" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Payroll Summary</CardTitle>
                                    <CardDescription>
                                        Calculated wages based on attendance records and advances
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="payroll-month" className="text-sm">Month:</Label>
                                        <Select value={String(payrollMonth)} onValueChange={(v: string) => setPayrollMonth(Number(v))}>
                                            <SelectTrigger id="payroll-month" className="w-[120px]">
                                                <SelectValue placeholder="Month" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                                                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="payroll-year" className="text-sm">Year:</Label>
                                        <Select value={String(payrollYear)} onValueChange={(v: string) => setPayrollYear(Number(v))}>
                                            <SelectTrigger id="payroll-year" className="w-[100px]">
                                                <SelectValue placeholder="Year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[2023, 2024, 2025, 2026].map(y => (
                                                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {isLoadingPayroll && (
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {payrollError && (
                                <div className="text-red-500 text-sm mb-4">{payrollError.message}</div>
                            )}
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead className="text-right">Days Worked</TableHead>
                                        <TableHead className="text-right">Gross Wage</TableHead>
                                        <TableHead className="text-right text-red-500">Advances</TableHead>
                                        <TableHead className="text-right font-bold">Net Payout</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingPayroll ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                                <p className="text-sm text-muted-foreground mt-2">Loading payroll...</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : payrollData && payrollData.employees.length > 0 ? (
                                        payrollData.employees.map((entry) => (
                                            <TableRow key={entry.employee_id}>
                                                <TableCell className="font-medium">
                                                    <div>{entry.employee_name}</div>
                                                    <div className="text-xs text-muted-foreground">{entry.role}</div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div>{Number(entry.total_days_worked).toFixed(1)}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {entry.days_present}P + {entry.days_half}H + {entry.days_overtime}OT
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">{Number(entry.gross_wage).toLocaleString()}</TableCell>
                                                <TableCell className="text-right text-red-500">-{Number(entry.total_advances).toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold">{Number(entry.net_payable).toLocaleString()} LKR</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {entry.is_paid ? (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                                ✓ Paid {entry.paid_at ? new Date(entry.paid_at).toLocaleDateString() : ''}
                                                            </Badge>
                                                        ) : (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-green-600 border-green-300 hover:bg-green-50"
                                                                onClick={() => {
                                                                    setPaymentDialogData({
                                                                        employee_id: entry.employee_id,
                                                                        employee_name: entry.employee_name,
                                                                        gross_wage: Number(entry.gross_wage),
                                                                        total_advances: Number(entry.total_advances),
                                                                        net_payable: Number(entry.net_payable),
                                                                    });
                                                                    setPaymentNotes('');
                                                                    setPaymentDateTime(new Date().toISOString().slice(0, 16));
                                                                    setPaymentDialogOpen(true);
                                                                }}
                                                            >
                                                                Mark Paid
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="sm" onClick={() => setPayrollViewingEmp(entry.employee_id)}>
                                                            <Eye className="h-4 w-4 text-blue-500 mr-2" /> View Details
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No payroll data for this period
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>

                            {/* Totals Summary */}
                            {payrollData && payrollData.employees.length > 0 && (
                                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                                    <h4 className="font-semibold mb-3">Period Summary ({payrollStartDate} to {payrollEndDate})</h4>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Total Gross:</span>
                                            <span className="ml-2 font-medium">{Number(payrollData.total_gross).toLocaleString()} LKR</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Total Advances:</span>
                                            <span className="ml-2 font-medium text-red-500">-{Number(payrollData.total_advances).toLocaleString()} LKR</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Total Net:</span>
                                            <span className="ml-2 font-bold text-green-600">{Number(payrollData.total_net).toLocaleString()} LKR</span>
                                        </div>
                                    </div>
                                </div>
                            )}
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

            {/* --- Payroll Details Modal --- */}
            <Dialog open={!!payrollViewingEmp} onOpenChange={(open) => !open && setPayrollViewingEmp(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Employee Payroll Details</DialogTitle>
                        <DialogDescription>
                            Shift and payment history for {payrollData?.employees.find(e => e.employee_id === payrollViewingEmp)?.employee_name || 'Employee'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Advance History */}
                            <div className="border rounded-md p-4">
                                <h4 className="font-semibold mb-3 flex items-center">
                                    <Download className="w-4 h-4 mr-2 text-red-500" />
                                    Advance History
                                </h4>
                                {isLoadingAdvances ? (
                                    <div className="flex justify-center p-4"><Loader2 className="animate-spin h-4 w-4" /></div>
                                ) : (
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {advancesData?.map((record: any) => (
                                            <div key={record.id} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                                                <span>{record.payment_date}</span>
                                                <span className="font-medium text-red-500">-{Number(record.amount).toLocaleString()}</span>
                                            </div>
                                        ))}
                                        {(!advancesData || advancesData.length === 0) && (
                                            <p className="text-sm text-muted-foreground text-center py-4">No advances found</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Shift History */}
                            <div className="border rounded-md p-4">
                                <h4 className="font-semibold mb-3 flex items-center">
                                    <Clock className="w-4 h-4 mr-2 text-blue-500" />
                                    Recent Shifts
                                </h4>
                                {isLoadingShifts ? (
                                    <div className="flex justify-center p-4"><Loader2 className="animate-spin h-4 w-4" /></div>
                                ) : (
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {shiftsData?.map((shift: any) => (
                                            <div key={shift.id} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                                                <div>
                                                    <span className="font-medium">{shift.attendance_date}</span>
                                                    <span className="text-xs text-muted-foreground ml-2">({shift.status})</span>
                                                </div>
                                                <span className="text-xs capitalize">{shift.shift_type || '-'}</span>
                                            </div>
                                        ))}
                                        {(!shiftsData || shiftsData.length === 0) && (
                                            <p className="text-sm text-muted-foreground text-center py-4">No shifts found</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    )
}
