"use client";

import React, { useState, useEffect } from "react";
import { useProducts, useCurrentUser, useActiveEmployees, useUsers } from "@/lib/hooks";
import { api } from "@/lib/api/client";
import { supabase } from "@/lib/supabase";
import { FuelProduct, UserRole, Employee, User, InviteCreate } from "@/lib/api/types";
import { Loader2, Settings as SettingsIcon, Save, AlertTriangle, Check, DollarSign, Users as UsersIcon, Bell, UserPlus, Trash2, UserCircle, Lock, Eye, EyeOff } from "lucide-react";
import { useAlertSettings, DEFAULT_LATE_THRESHOLD_MINUTES, DEFAULT_EARLY_THRESHOLD_MINUTES } from "@/lib/contexts/alert-settings";

// Allowed roles for settings management
const ALLOWED_ROLES: UserRole[] = ['system_admin', 'owner', 'manager'];

// Settings tabs
type SettingsTab = 'products' | 'wages' | 'alerts' | 'users' | 'account';

interface EditingPrice {
    productId: string;
    newPrice: string;
}

interface EditingWage {
    employeeId: string;
    dailyWage: string;
    overtimeBonus: string;
}

export default function SettingsPage() {
    const { data: currentUser, isLoading: userLoading, error: userError } = useCurrentUser();
    const { data: products, isLoading: productsLoading, mutate: refreshProducts } = useProducts();
    const { data: employees, isLoading: employeesLoading, mutate: refreshEmployees } = useActiveEmployees();
    const { data: stationUsers, isLoading: usersLoading, mutate: refreshUsers } = useUsers();

    const [activeTab, setActiveTab] = useState<SettingsTab>('products');
    const [editingPrice, setEditingPrice] = useState<EditingPrice | null>(null);
    const [editingWage, setEditingWage] = useState<EditingWage | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    // User invite form state
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteFullName, setInviteFullName] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>('accountant');

    // Alert settings from context
    const { settings: alertSettings, updateSettings: updateAlertSettings } = useAlertSettings();
    const [lateThreshold, setLateThreshold] = useState<string>('');
    const [earlyThreshold, setEarlyThreshold] = useState<string>('');

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    // Initialize local state from context on mount
    useEffect(() => {
        setLateThreshold(alertSettings.lateArrivalThreshold.toString());
        setEarlyThreshold(alertSettings.earlyDepartureThreshold.toString());
    }, [alertSettings]);

    // Clear success/error messages after 3 seconds
    useEffect(() => {
        if (saveSuccess) {
            const timer = setTimeout(() => setSaveSuccess(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [saveSuccess]);

    useEffect(() => {
        if (saveError) {
            const timer = setTimeout(() => setSaveError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [saveError]);

    // Check if user has permission
    const hasPermission = currentUser?.role && ALLOWED_ROLES.includes(currentUser.role);

    // Handle starting to edit a product price
    const handleEditPrice = (product: FuelProduct) => {
        setEditingPrice({
            productId: product.id,
            newPrice: product.price_per_liter.toString(),
        });
        setEditingWage(null);
        setSaveSuccess(null);
        setSaveError(null);
    };

    // Handle starting to edit an employee's wage
    const handleEditWage = (employee: Employee) => {
        setEditingWage({
            employeeId: employee.id,
            dailyWage: Number(employee.daily_wage).toString(),
            overtimeBonus: Number(employee.overtime_bonus).toString(),
        });
        setEditingPrice(null);
        setSaveSuccess(null);
        setSaveError(null);
    };

    // Handle canceling edit
    const handleCancelEdit = () => {
        setEditingPrice(null);
        setEditingWage(null);
    };

    // Handle saving product price
    const handleSavePrice = async (product: FuelProduct) => {
        if (!editingPrice) return;

        const newPrice = parseFloat(editingPrice.newPrice);
        if (isNaN(newPrice) || newPrice <= 0) {
            setSaveError("Please enter a valid price greater than 0");
            return;
        }

        setIsSaving(true);
        setSaveError(null);

        try {
            await api.inventory.updateProduct(product.id, {
                code: product.code,
                name: product.name,
                price_per_liter: newPrice,
            });

            await refreshProducts();
            setEditingPrice(null);
            setSaveSuccess(`${product.name} price updated to LKR ${newPrice.toFixed(2)}`);
        } catch (err: any) {
            setSaveError(`Failed to update price: ${err.message || err.detail || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle saving employee wage
    const handleSaveWage = async (employee: Employee) => {
        if (!editingWage) return;

        const dailyWage = parseFloat(editingWage.dailyWage);
        const overtimeBonus = parseFloat(editingWage.overtimeBonus);

        if (isNaN(dailyWage) || dailyWage < 0) {
            setSaveError("Please enter a valid daily wage (>= 0)");
            return;
        }

        if (isNaN(overtimeBonus) || overtimeBonus < 0) {
            setSaveError("Please enter a valid overtime bonus (>= 0)");
            return;
        }

        setIsSaving(true);
        setSaveError(null);

        try {
            await api.employees.update(employee.id, {
                daily_wage: dailyWage,
                overtime_bonus: overtimeBonus,
            });

            await refreshEmployees();
            setEditingWage(null);
            setSaveSuccess(`${employee.full_name}'s wages updated successfully`);
        } catch (err: any) {
            setSaveError(`Failed to update wages: ${err.message || err.detail || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle inviting a new user
    const handleInviteUser = async () => {
        if (!inviteEmail.trim()) {
            setSaveError('Please enter an email address');
            return;
        }

        setIsSaving(true);
        setSaveError(null);

        try {
            await api.users.invite({
                email: inviteEmail.trim(),
                full_name: inviteFullName.trim() || undefined,
                role: inviteRole,
            });

            await refreshUsers();
            setShowInviteForm(false);
            setInviteEmail('');
            setInviteFullName('');
            setInviteRole('accountant');
            setSaveSuccess(`Invitation sent to ${inviteEmail}`);
        } catch (err: any) {
            setSaveError(`Failed to invite user: ${err.message || err.detail || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle removing a user
    const handleRemoveUser = async (user: User) => {
        if (!confirm(`Are you sure you want to remove ${user.full_name || user.email} from this station?`)) {
            return;
        }

        setIsSaving(true);
        setSaveError(null);

        try {
            await api.users.remove(user.id);
            await refreshUsers();
            setSaveSuccess(`${user.full_name || user.email} has been removed`);
        } catch (err: any) {
            setSaveError(`Failed to remove user: ${err.message || err.detail || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle password change
    const handleChangePassword = async () => {
        if (!newPassword.trim()) {
            setSaveError('Please enter a new password');
            return;
        }

        if (newPassword.length < 6) {
            setSaveError('Password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setSaveError('Passwords do not match');
            return;
        }

        setIsSaving(true);
        setSaveError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) {
                throw error;
            }

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setSaveSuccess('Password changed successfully');
        } catch (err: any) {
            setSaveError(`Failed to change password: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Loading state
    if (userLoading || productsLoading || employeesLoading || usersLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex items-center gap-3 text-slate-600">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Loading settings...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (userError) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-slate-900 mb-2">Failed to load user</h2>
                    <p className="text-slate-600 text-sm">Please try refreshing the page or contact support.</p>
                </div>
            </div>
        );
    }

    // Access denied
    if (!hasPermission) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
                <div className="bg-white rounded-xl border border-amber-200 p-8 max-w-md text-center shadow-sm">
                    <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-slate-900 mb-2">Access Denied</h2>
                    <p className="text-slate-600 text-sm mb-4">
                        You don't have permission to access Settings.
                    </p>
                    <p className="text-xs text-slate-500">
                        Only <strong>Owner</strong>, <strong>Manager</strong>, and <strong>System Admin</strong> can modify settings.
                    </p>
                    {currentUser?.role && (
                        <p className="mt-4 text-xs text-slate-400">
                            Your role: <span className="font-medium capitalize">{currentUser.role.replace('_', ' ')}</span>
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Page Header */}
            <header className="bg-white border-b border-slate-200 px-8 py-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900 p-2 rounded-lg">
                            <SettingsIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                            <p className="text-sm text-slate-500">Manage product prices and employee wages</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto p-8">
                {/* Tab Navigation */}
                <div className="flex gap-1 mb-6 border-b border-slate-200">
                    <button
                        onClick={() => { setActiveTab('products'); handleCancelEdit(); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'products'
                            ? 'border-green-600 text-green-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <DollarSign className="h-4 w-4" />
                        Product Prices
                    </button>
                    <button
                        onClick={() => { setActiveTab('wages'); handleCancelEdit(); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'wages'
                            ? 'border-green-600 text-green-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <UsersIcon className="h-4 w-4" />
                        Employee Wages
                    </button>
                    <button
                        onClick={() => { setActiveTab('alerts'); handleCancelEdit(); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'alerts'
                            ? 'border-green-600 text-green-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Bell className="h-4 w-4" />
                        Alerts
                    </button>
                    <button
                        onClick={() => { setActiveTab('users'); handleCancelEdit(); setShowInviteForm(false); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'users'
                            ? 'border-green-600 text-green-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <UserPlus className="h-4 w-4" />
                        Users
                    </button>
                    <button
                        onClick={() => { setActiveTab('account'); handleCancelEdit(); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'account'
                            ? 'border-green-600 text-green-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <UserCircle className="h-4 w-4" />
                        Account
                    </button>
                </div>

                {/* Success/Error Messages */}
                {saveSuccess && (
                    <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4 animate-in fade-in duration-300">
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-green-800 text-sm">{saveSuccess}</span>
                    </div>
                )}

                {saveError && (
                    <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4 animate-in fade-in duration-300">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                        <span className="text-red-800 text-sm">{saveError}</span>
                    </div>
                )}

                {/* Product Prices Tab */}
                {activeTab === 'products' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-slate-600" />
                                <h2 className="text-lg font-semibold text-slate-900">Product Prices</h2>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                                Update fuel prices below. Changes take effect for new sales immediately.
                            </p>
                        </div>

                        {products && products.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {products.map((product) => {
                                    const isEditing = editingPrice?.productId === product.id;

                                    return (
                                        <div
                                            key={product.id}
                                            className={`px-6 py-4 flex items-center justify-between transition-colors ${isEditing ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="bg-slate-100 rounded-lg px-3 py-1.5">
                                                    <span className="text-sm font-mono font-medium text-slate-700">
                                                        {product.code}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{product.name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        Current: LKR {Number(product.price_per_liter).toFixed(2)} / liter
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {isEditing ? (
                                                    <>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-slate-600">LKR</span>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={editingPrice.newPrice}
                                                                onChange={(e) =>
                                                                    setEditingPrice({
                                                                        ...editingPrice,
                                                                        newPrice: e.target.value,
                                                                    })
                                                                }
                                                                className="w-28 px-3 py-1.5 border border-indigo-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            disabled={isSaving}
                                                            className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleSavePrice(product)}
                                                            disabled={isSaving}
                                                            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {isSaving ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Save className="h-4 w-4" />
                                                            )}
                                                            Save
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => handleEditPrice(product)}
                                                        className="px-4 py-1.5 text-sm font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                                                    >
                                                        Edit Price
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="px-6 py-12 text-center text-slate-500">
                                <p>No fuel products found.</p>
                                <p className="text-sm mt-1">Products can be added in the Admin Panel.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Employee Wages Tab */}
                {activeTab === 'wages' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-2">
                                <UsersIcon className="h-5 w-5 text-slate-600" />
                                <h2 className="text-lg font-semibold text-slate-900">Employee Wages</h2>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                                Update daily wages and overtime bonuses for employees.
                            </p>
                        </div>

                        {employees && employees.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {employees.map((employee) => {
                                    const isEditing = editingWage?.employeeId === employee.id;

                                    return (
                                        <div
                                            key={employee.id}
                                            className={`px-6 py-4 flex items-center justify-between transition-colors ${isEditing ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="bg-slate-100 rounded-full w-10 h-10 flex items-center justify-center">
                                                    <span className="text-sm font-medium text-slate-700">
                                                        {employee.full_name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{employee.full_name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {employee.role === 'pumper' ? 'Pumper' : 'Staff'} • Daily: LKR {Number(employee.daily_wage).toFixed(2)} • OT: LKR {Number(employee.overtime_bonus).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {isEditing ? (
                                                    <>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-slate-600 whitespace-nowrap">Daily</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    value={editingWage.dailyWage}
                                                                    onChange={(e) =>
                                                                        setEditingWage({
                                                                            ...editingWage,
                                                                            dailyWage: e.target.value,
                                                                        })
                                                                    }
                                                                    className="w-24 px-2 py-1.5 border border-indigo-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                                    autoFocus
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-slate-600 whitespace-nowrap">OT</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    value={editingWage.overtimeBonus}
                                                                    onChange={(e) =>
                                                                        setEditingWage({
                                                                            ...editingWage,
                                                                            overtimeBonus: e.target.value,
                                                                        })
                                                                    }
                                                                    className="w-24 px-2 py-1.5 border border-indigo-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                                />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            disabled={isSaving}
                                                            className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleSaveWage(employee)}
                                                            disabled={isSaving}
                                                            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {isSaving ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Save className="h-4 w-4" />
                                                            )}
                                                            Save
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => handleEditWage(employee)}
                                                        className="px-4 py-1.5 text-sm font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                                                    >
                                                        Edit Wages
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="px-6 py-12 text-center text-slate-500">
                                <p>No active employees found.</p>
                                <p className="text-sm mt-1">Employees can be added in the Staff page.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Alerts Tab */}
                {activeTab === 'alerts' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-slate-600" />
                                <h2 className="text-lg font-semibold text-slate-900">Alert Thresholds</h2>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                                Configure when late arrival and early departure alerts should trigger.
                            </p>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Late Arrival Threshold */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-900 mb-1">
                                        Late Arrival Threshold
                                    </label>
                                    <p className="text-xs text-slate-500">
                                        Staff arriving this many minutes after shift start (7AM for Day, 7PM for Night) will trigger a late arrival alert.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={lateThreshold}
                                        onChange={(e) => setLateThreshold(e.target.value)}
                                        className="w-20 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                    <span className="text-sm text-slate-600">minutes</span>
                                </div>
                            </div>

                            {/* Early Departure Threshold */}
                            <div className="flex items-start justify-between gap-4 pt-4 border-t border-slate-100">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-900 mb-1">
                                        Early Departure Threshold
                                    </label>
                                    <p className="text-xs text-slate-500">
                                        Staff leaving this many minutes before shift end (7PM for Day, 7AM for Night) will trigger an early departure alert.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max="120"
                                        value={earlyThreshold}
                                        onChange={(e) => setEarlyThreshold(e.target.value)}
                                        className="w-20 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                    <span className="text-sm text-slate-600">minutes</span>
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                                <p className="text-xs text-slate-500">
                                    Default: {DEFAULT_LATE_THRESHOLD_MINUTES} min late, {DEFAULT_EARLY_THRESHOLD_MINUTES} min early
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            setLateThreshold(DEFAULT_LATE_THRESHOLD_MINUTES.toString());
                                            setEarlyThreshold(DEFAULT_EARLY_THRESHOLD_MINUTES.toString());
                                            updateAlertSettings({
                                                lateArrivalThreshold: DEFAULT_LATE_THRESHOLD_MINUTES,
                                                earlyDepartureThreshold: DEFAULT_EARLY_THRESHOLD_MINUTES,
                                            });
                                            setSaveSuccess('Alert thresholds reset to defaults');
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                                    >
                                        Reset to Defaults
                                    </button>
                                    <button
                                        onClick={() => {
                                            const late = parseInt(lateThreshold, 10);
                                            const early = parseInt(earlyThreshold, 10);
                                            if (isNaN(late) || late < 1) {
                                                setSaveError('Please enter a valid late arrival threshold (>= 1 minute)');
                                                return;
                                            }
                                            if (isNaN(early) || early < 1) {
                                                setSaveError('Please enter a valid early departure threshold (>= 1 minute)');
                                                return;
                                            }
                                            updateAlertSettings({
                                                lateArrivalThreshold: late,
                                                earlyDepartureThreshold: early,
                                            });
                                            setSaveSuccess(`Alert thresholds updated: ${late} min late, ${early} min early`);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700"
                                    >
                                        <Save className="h-4 w-4" />
                                        Save Thresholds
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <UserPlus className="h-5 w-5 text-slate-600" />
                                    <h2 className="text-lg font-semibold text-slate-900">Station Users</h2>
                                </div>
                                <p className="text-sm text-slate-500 mt-1">
                                    Manage users who can access this station.
                                </p>
                            </div>
                            {!showInviteForm && (
                                <button
                                    onClick={() => setShowInviteForm(true)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    Invite User
                                </button>
                            )}
                        </div>

                        {/* Invite Form */}
                        {showInviteForm && (
                            <div className="px-6 py-4 bg-green-50 border-b border-green-200">
                                <h3 className="text-sm font-semibold text-slate-900 mb-3">Invite New User</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="user@example.com"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                                        <input
                                            type="text"
                                            value={inviteFullName}
                                            onChange={(e) => setInviteFullName(e.target.value)}
                                            placeholder="John Doe"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                                        <select
                                            value={inviteRole}
                                            onChange={(e) => setInviteRole(e.target.value as UserRole)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        >
                                            <option value="accountant">Accountant</option>
                                            <option value="manager">Manager</option>
                                            <option value="supervisor">Supervisor</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={handleInviteUser}
                                        disabled={isSaving}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                        Send Invitation
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowInviteForm(false);
                                            setInviteEmail('');
                                            setInviteFullName('');
                                            setInviteRole('accountant');
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* User List */}
                        {stationUsers && stationUsers.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {stationUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="bg-slate-100 rounded-full w-10 h-10 flex items-center justify-center">
                                                <span className="text-sm font-medium text-slate-700">
                                                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{user.full_name || 'No name'}</p>
                                                <p className="text-xs text-slate-500">
                                                    {user.email} • <span className="capitalize">{user.role.replace('_', ' ')}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {user.id !== currentUser?.user_id && user.role !== 'owner' && (
                                                <button
                                                    onClick={() => handleRemoveUser(user)}
                                                    disabled={isSaving}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                                    title="Remove user"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="px-6 py-12 text-center text-slate-500">
                                <p>No users found for this station.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Account Tab */}
                {activeTab === 'account' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-2">
                                <UserCircle className="h-5 w-5 text-slate-600" />
                                <h2 className="text-lg font-semibold text-slate-900">Account Settings</h2>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                                Manage your account credentials.
                            </p>
                        </div>

                        <div className="p-6">
                            {/* Current User Info */}
                            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center">
                                        <span className="text-lg font-semibold text-green-700">
                                            {(currentUser?.full_name || currentUser?.email || 'U').charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">{currentUser?.full_name || 'No name set'}</p>
                                        <p className="text-sm text-slate-500">{currentUser?.email}</p>
                                        <p className="text-xs text-slate-400 capitalize">{currentUser?.role?.replace('_', ' ')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Password Change Section */}
                            <div className="border border-slate-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Lock className="h-5 w-5 text-slate-600" />
                                    <h3 className="font-semibold text-slate-900">Change Password</h3>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                        <div className="relative">
                                            <input
                                                type={showNewPassword ? 'text' : 'password'}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Enter new password"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter new password"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>

                                    <button
                                        onClick={handleChangePassword}
                                        disabled={isSaving || !newPassword || !confirmPassword}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Update Password
                                    </button>

                                    <p className="text-xs text-slate-500">
                                        Password must be at least 6 characters long.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* User Info */}
                <div className="mt-6 text-center text-xs text-slate-400">
                    Logged in as <span className="font-medium">{currentUser?.email}</span> ({currentUser?.role?.replace('_', ' ')})
                </div>
            </main>
        </div>
    );
}
