"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { StationSwitcher } from '@/components/admin/StationSwitcher';
import { StationList, Station } from '@/components/admin/StationList';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { api } from '@/lib/api/client';
import { useStations, useAuditLog, useSupportAccess, useCurrentUser } from '@/lib/hooks';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';
import { Loader2, ArrowRightCircle, Shield } from 'lucide-react';
import { User } from '@/lib/api/types';

// Mock Data Fallback
const MOCK_STATIONS: Station[] = [
    { id: 'st_001', name: 'Downtown Fuel & Go', owner: 'john.doe@example.com', status: 'Active', supportMode: false },
    { id: 'st_002', name: 'Highway Rest Stop', owner: 'alice.smith@example.com', status: 'Active', supportMode: true },
    { id: 'st_003', name: 'Northside Service', owner: 'bob.wilson@example.com', status: 'Suspended', supportMode: false },
    { id: 'st_004', name: 'East End Pump', owner: 'sarah.jones@example.com', status: 'Setup', supportMode: false },
];

const MOCK_LOGS = [
    { id: 'log_1', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), actor: 'admin@sami.app', action: 'VIEW_DASHBOARD', details: 'Viewed station Downtown Fuel & Go' },
    { id: 'log_2', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), actor: 'admin@sami.app', action: 'ENABLE_SUPPORT', details: 'Enabled support mode for Highway Rest Stop. Reason: Billing update assistance.' },
    { id: 'log_3', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), actor: 'system', action: 'ALERT_GENERATED', details: 'Low disk space warning on db-cluster-1' },
    { id: 'log_4', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), actor: 'john.doe@example.com', action: 'LOGIN_ATTEMPT', details: 'Successful login from 192.168.1.1' },
];

export default function AdminPage() {
    // Fetch stations from API
    const { data: apiStations, isLoading: stationsLoading } = useStations();

    // Fetch audit log from API
    const { data: apiAuditLog, isLoading: logsLoading } = useAuditLog(undefined, 100);

    const [selectedStationId, setSelectedStationId] = useState<string>('');
    const [supportReason, setSupportReason] = useState('');
    const [isConfirmingEnable, setIsConfirmingEnable] = useState(false);
    const [isToggling, setIsToggling] = useState(false);

    // Station Configuration State
    const [configTab, setConfigTab] = useState<'details' | 'products' | 'tanks' | 'nozzles' | 'pumps' | 'users'>('details');
    const [products, setProducts] = useState<{ id: string; code: string; name: string; price_per_liter: number }[]>([]);
    const [tanks, setTanks] = useState<{ id: string; name: string; product_id: string; product_name?: string; tank_type?: string; capacity_liters: number }[]>([]);
    const [nozzles, setNozzles] = useState<any[]>([]);
    const [pumps, setPumps] = useState<{ id: string; name: string; location?: string; is_active: boolean }[]>([]);
    const [isLoadingConfig, setIsLoadingConfig] = useState(false);

    // Add forms state
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [showAddTank, setShowAddTank] = useState(false);
    const [showAddNozzle, setShowAddNozzle] = useState(false);
    const [showAddPump, setShowAddPump] = useState(false);
    const [showAddUser, setShowAddUser] = useState(false);

    // Edit state
    const [editingProduct, setEditingProduct] = useState<string | null>(null);
    const [editingTank, setEditingTank] = useState<string | null>(null);
    const [editingNozzle, setEditingNozzle] = useState<string | null>(null);
    const [editingPump, setEditingPump] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<string | null>(null);

    const [newProduct, setNewProduct] = useState({ code: '', name: '', price_per_liter: '' });
    const [newTank, setNewTank] = useState({ name: '', product_id: '', tank_type: '', capacity_liters: '', color: '' });
    const [newNozzle, setNewNozzle] = useState({ nozzle_id: '', nozzle_name: '', tank_id: '', product_id: '', pump_id: '' });
    const [newPump, setNewPump] = useState({ name: '', location: '' });
    const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'supervisor' as 'manager' | 'accountant' | 'supervisor' });
    const [passwordResetUser, setPasswordResetUser] = useState<{ id: string; name: string } | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Onboard Station Modal state
    const [showOnboardModal, setShowOnboardModal] = useState(false);
    const [newStation, setNewStation] = useState({ name: '', owner_email: '', address: '', phone: '' });
    const [isOnboarding, setIsOnboarding] = useState(false);

    // Confirm dialog state
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'nozzle' | 'tank' | 'product' | 'pump' | 'user' | null; id: string; name: string }>({ type: null, id: '', name: '' });

    // Station Details Editing State
    const [stationDetails, setStationDetails] = useState({ name: '', address: '', phone: '', email: '', status: 'active' as 'setup' | 'active' | 'suspended' | 'archived' });
    const [isSavingDetails, setIsSavingDetails] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Invite Owner State
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteFullName, setInviteFullName] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteSuccess, setInviteSuccess] = useState('');

    // Owner Credential Management State
    const [stationUsers, setStationUsers] = useState<User[]>([]);
    const [ownerUser, setOwnerUser] = useState<User | null>(null);
    const [resetPassword, setResetPassword] = useState('');
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [resetPasswordSuccess, setResetPasswordSuccess] = useState('');

    // Access Dashboard State
    const router = useRouter();
    const { data: currentUser, isLoading: userLoading } = useCurrentUser();
    const [isAssigningMyStation, setIsAssigningMyStation] = useState(false);

    // Fetch support access for selected station ALWAYS at top level
    const { data: supportAccess, mutate: mutateSupportAccess } = useSupportAccess(selectedStationId || null);

    // Map API stations to component format, fallback to mock data
    const stations: Station[] = useMemo(() => {
        if (apiStations && apiStations.length > 0) {
            return apiStations.map(s => ({
                id: s.id,
                name: s.name,
                owner: s.owner_email || 'Unknown',
                status: s.is_active ? 'Active' : 'Suspended' as const,
                supportMode: false, // Will be updated via useSupportAccess
            }));
        }
        // Fallback to mock data (only if DISABLE_MOCK_DATA is false)
        if (process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA === 'true') {
            return [];
        }
        return MOCK_STATIONS;
    }, [apiStations]);

    // Map API audit logs to component format
    const logs = useMemo(() => {
        if (apiAuditLog && apiAuditLog.length > 0) {
            return apiAuditLog.map(log => ({
                id: log.id,
                timestamp: log.created_at,
                actor: log.actor_id || 'system',
                action: log.action,
                details: log.details ? JSON.stringify(log.details) : '',
            }));
        }
        // Fallback to mock data (only if DISABLE_MOCK_DATA is false)
        if (process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA === 'true') {
            return [];
        }
        return MOCK_LOGS;
    }, [apiAuditLog]);

    // Get selected station with support mode from API
    const selectedStation = useMemo(() => {
        const station = stations.find(s => s.id === selectedStationId);
        if (station && supportAccess) {
            return { ...station, supportMode: supportAccess.enabled };
        }
        return station;
    }, [stations, selectedStationId, supportAccess]);
        if (!selectedStationId) {
            setProducts([]);
            setTanks([]);
            setNozzles([]);
            setPumps([]);
            return;
        }

        const fetchConfigData = async () => {
            setIsLoadingConfig(true);
            try {
                const [productsData, tanksData, nozzlesData, usersData, pumpsData] = await Promise.all([
                    api.inventory.getProducts(selectedStationId),
                    api.inventory.getTanks(undefined, selectedStationId),
                    api.inventory.getNozzles(selectedStationId),
                    api.users.getAll(selectedStationId),
                    api.inventory.getPumps(selectedStationId),
                ]);
                setProducts(productsData.map(p => ({ id: p.id, code: p.code, name: p.name, price_per_liter: p.price_per_liter })));
                setTanks(tanksData.map(t => ({ id: t.id, name: t.name, product_id: t.product_id, product_name: t.product_name ?? undefined, tank_type: t.tank_type ?? undefined, capacity_liters: t.capacity_liters })));
                setNozzles(nozzlesData.map(n => ({
                    id: n.id,
                    nozzle_code: n.nozzle_code,
                    nozzle_name: n.nozzle_name || 'Unnamed',
                    tank_id: n.tank_id,
                    pump_id: n.pump_id,
                    product_id: n.product_id,
                    pump_name: n.pump_name ?? undefined,
                    product_name: n.product_name ?? undefined,
                    is_active: n.is_active,
                } as any)));
                setPumps(pumpsData);
                setStationUsers(usersData);
                const owner = usersData.find(u => u.role === 'owner') || null;
                setOwnerUser(owner);
                // Reset password form state when switching stations
                setResetPassword('');
                setResetPasswordSuccess('');
            } catch (err) {
                console.error('Failed to fetch config data:', err);
            } finally {
                setIsLoadingConfig(false);
            }
        };

        fetchConfigData();
    // System Admin Access Control
    useEffect(() => {
        if (!userLoading && currentUser && currentUser.role !== 'system_admin') {
            router.push('/dashboard');
        }
    }, [currentUser, userLoading, router]);

    // Show loading while checking permissions
    if (userLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    // Show access denied if not system_admin
    if (!currentUser || currentUser.role !== 'system_admin') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Shield className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
                    <p className="text-slate-600 mb-4">You do not have permission to access the Admin Panel.</p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const handleToggleSupportMode = async () => {
        if (!selectedStation) return;

        if (selectedStation.supportMode) {
            // Disable immediately
            setIsToggling(true);
            try {
                await api.admin.toggleSupportAccess(selectedStationId, {
                    enabled: false,
                    reason: 'Disabled by admin',
                });
                mutateSupportAccess();
                mutate(`/admin/audit-log?limit=100`);
                setSupportReason('');
            } catch (err: any) {
                alert(`Failed to disable support mode: ${err.message || err.detail}`);
            } finally {
                setIsToggling(false);
            }
        } else {
            // Require reason
            setIsConfirmingEnable(true);
        }
    };

    const confirmEnableSupport = async () => {
        if (!supportReason.trim()) {
            alert("Reason is required to enable Support Edit Mode.");
            return;
        }

        setIsToggling(true);
        try {
            await api.admin.toggleSupportAccess(selectedStationId, {
                enabled: true,
                reason: supportReason,
                expires_in_hours: 24,
            });
            mutateSupportAccess();
            mutate(`/admin/audit-log?limit=100`);
            setIsConfirmingEnable(false);
            setSupportReason('');
        } catch (err: any) {
            alert(`Failed to enable support mode: ${err.message || err.detail}`);
        } finally {
            setIsToggling(false);
        }
    };

    const handleSelectStation = (id: string) => {
        setSelectedStationId(id);
        setIsConfirmingEnable(false);
        setSupportReason('');
        // Load station details for editing
        const station = stations.find(s => s.id === id);
        if (station) {
            setStationDetails({
                name: station.name || '',
                address: '',
                phone: '',
                email: station.owner || '',
                status: (station.status?.toLowerCase() || 'active') as 'setup' | 'active' | 'suspended' | 'archived',
            });
        }
    }

    // Onboard new station handler
    const handleOnboardStation = async () => {
        if (!newStation.name.trim() || !newStation.owner_email.trim()) {
            alert('Station name and owner email are required.');
            return;
        }

        setIsOnboarding(true);
        try {
            await api.admin.createStation({
                name: newStation.name,
                owner_email: newStation.owner_email,
                address: newStation.address || undefined,
                phone: newStation.phone || undefined,
            });
            // Refresh stations list
            mutate('/admin/stations');
            // Clear selected station and config data to prevent stale data from showing
            setSelectedStationId('');
            setProducts([]);
            setTanks([]);
            setNozzles([]);
            setPumps([]);
            setStationUsers([]);
            setOwnerUser(null);
            // Reset form and close modal
            setNewStation({ name: '', owner_email: '', address: '', phone: '' });
            setShowOnboardModal(false);
            alert('Station onboarded successfully!');
        } catch (err: any) {
            alert(`Failed to onboard station: ${err.message || err.detail || 'Unknown error'}`);
        } finally {
            setIsOnboarding(false);
        }
    };

    // Refresh config data
    const refreshConfigData = async () => {
        if (!selectedStationId) return;
        setIsLoadingConfig(true);
        try {
            const [productsData, tanksData, nozzlesData, pumpsData] = await Promise.all([
                api.inventory.getProducts(selectedStationId),
                api.inventory.getTanks(undefined, selectedStationId),
                api.inventory.getNozzles(selectedStationId),
                api.inventory.getPumps(selectedStationId),
            ]);
            setProducts(productsData.map(p => ({ id: p.id, code: p.code, name: p.name, price_per_liter: p.price_per_liter })));
            setTanks(tanksData.map(t => ({ id: t.id, name: t.name, product_id: t.product_id, product_name: t.product_name ?? undefined, tank_type: t.tank_type ?? undefined, capacity_liters: t.capacity_liters })));
            setNozzles(nozzlesData.map(n => ({
                id: n.id,
                nozzle_code: n.nozzle_code,
                nozzle_name: n.nozzle_name || 'Unnamed',
                tank_id: n.tank_id,
                pump_id: n.pump_id,
                product_id: n.product_id,
                pump_name: n.pump_name ?? undefined,
                product_name: n.product_name ?? undefined,
                is_active: n.is_active,
            } as any)));
            setPumps(pumpsData);
        } catch (err) {
            console.error('Failed to refresh config data:', err);
        } finally {
            setIsLoadingConfig(false);
        }
    };

    // Add Product Handler
    const handleAddProduct = async () => {
        if (!newProduct.code || !newProduct.name || !newProduct.price_per_liter) {
            alert('Please fill in all product fields');
            return;
        }
        setIsSaving(true);
        try {
            if (editingProduct) {
                await api.inventory.updateProduct(editingProduct, {
                    code: newProduct.code,
                    name: newProduct.name,
                    price_per_liter: parseFloat(newProduct.price_per_liter),
                }, selectedStationId);
                setEditingProduct(null);
            } else {
                await api.inventory.createProduct({
                    code: newProduct.code,
                    name: newProduct.name,
                    price_per_liter: parseFloat(newProduct.price_per_liter),
                }, selectedStationId);
            }
            await refreshConfigData();
            setNewProduct({ code: '', name: '', price_per_liter: '' });
            setShowAddProduct(false);
        } catch (err: any) {
            alert(`Failed to save product: ${err.message || err.detail}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Add Tank Handler
    const handleAddTank = async () => {
        if (!newTank.name || !newTank.product_id || !newTank.capacity_liters) {
            alert('Please fill in Tank Name, Product, and Capacity');
            return;
        }
        setIsSaving(true);
        try {
            if (editingTank) {
                await api.inventory.updateTank(editingTank, {
                    name: newTank.name,
                    product_id: newTank.product_id,
                    tank_type: newTank.tank_type || undefined,
                    capacity_liters: parseFloat(newTank.capacity_liters),
                    color: newTank.color || undefined,
                }, selectedStationId);
                setEditingTank(null);
            } else {
                await api.inventory.createTank({
                    name: newTank.name,
                    product_id: newTank.product_id,
                    tank_type: newTank.tank_type || undefined,
                    capacity_liters: parseFloat(newTank.capacity_liters),
                    color: newTank.color || undefined,
                }, selectedStationId);
            }
            await refreshConfigData();
            setNewTank({ name: '', product_id: '', tank_type: '', capacity_liters: '', color: '' });
            setShowAddTank(false);
        } catch (err: any) {
            alert(`Failed to save tank: ${err.message || err.detail}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Add Nozzle Handler
    const handleAddNozzle = async () => {
        if (!newNozzle.nozzle_name || !newNozzle.tank_id || !newNozzle.product_id || !newNozzle.pump_id) {
            alert('Name, Tank, Product, and Pump are required');
            return;
        }

        setIsSaving(true);
        try {
            if (editingNozzle) {
                await api.inventory.updateNozzle(editingNozzle, {
                    nozzle_code: newNozzle.nozzle_id, // Map frontend 'nozzle_id' to backend 'nozzle_code'
                    nozzle_name: newNozzle.nozzle_name,
                    tank_id: newNozzle.tank_id,
                    product_id: newNozzle.product_id,
                    pump_id: newNozzle.pump_id,
                } as any, selectedStationId);
                setEditingNozzle(null);
            } else {
                await api.inventory.createNozzle({
                    nozzle_code: newNozzle.nozzle_id || `N-${newNozzle.nozzle_name}`,
                    nozzle_name: newNozzle.nozzle_name,
                    tank_id: newNozzle.tank_id,
                    product_id: newNozzle.product_id,
                    pump_id: newNozzle.pump_id,
                } as any, selectedStationId);
            }
            await refreshConfigData();
            setNewNozzle({ nozzle_id: '', nozzle_name: '', tank_id: '', product_id: '', pump_id: '' });
            setShowAddNozzle(false);
        } catch (err: any) {
            alert(`Failed to save nozzle: ${err.message || err.detail}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Add Pump Handler
    const handleAddPump = async () => {
        if (!newPump.name) {
            alert('Pump Name is required');
            return;
        }
        setIsSaving(true);
        try {
            if (editingPump) {
                await api.inventory.updatePump(editingPump, newPump, selectedStationId);
                setEditingPump(null);
            } else {
                await api.inventory.createPump(newPump, selectedStationId);
            }
            await refreshConfigData();
            setNewPump({ name: '', location: '' });
            setShowAddPump(false);
        } catch (err: any) {
            alert(`Failed to save pump: ${err.message || err.detail}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Edit handlers
    const handleEditProduct = (p: any) => {
        setNewProduct({ code: p.code, name: p.name, price_per_liter: String(p.price_per_liter) });
        setEditingProduct(p.id);
        setShowAddProduct(true);
    };

    const handleEditTank = (t: any) => {
        setNewTank({
            name: t.name,
            product_id: t.product_id,
            tank_type: t.tank_type || '',
            capacity_liters: String(t.capacity_liters),
            color: t.color || ''
        });
        setEditingTank(t.id);
        setShowAddTank(true);
    };

    const handleEditNozzle = (n: any) => {
        setNewNozzle({
            nozzle_id: n.nozzle_code || '', // Populate code
            nozzle_name: n.nozzle_name,
            tank_id: n.tank_id,
            product_id: n.product_id,
            pump_id: n.pump_id
        });
        setEditingNozzle(n.id); // Use UUID for editing reference
        setShowAddNozzle(true);
    };

    const handleEditPump = (p: any) => {
        setNewPump({ name: p.name, location: p.location || '' });
        setEditingPump(p.id);
        setShowAddPump(true);
    };

    // Delete handlers
    const handleDeleteProduct = (productId: string, productName: string) => {
        setDeleteConfirm({ type: 'product', id: productId, name: productName });
    };

    const handleDeleteTank = (tankId: string, tankName: string) => {
        setDeleteConfirm({ type: 'tank', id: tankId, name: tankName });
    };

    const handleDeleteNozzle = (nozzleId: string, nozzleName: string) => {
        setDeleteConfirm({ type: 'nozzle', id: nozzleId, name: nozzleName });
    };

    const handleDeletePump = (pumpId: string, pumpName: string) => {
        setDeleteConfirm({ type: 'pump', id: pumpId, name: pumpName });
    };

    // User Management Handlers
    const handleInviteUser = async () => {
        if (!newUser.email || !newUser.full_name) {
            alert('Email and Full Name are required');
            return;
        }
        setIsSaving(true);
        try {
            await api.users.invite({
                email: newUser.email,
                full_name: newUser.full_name,
                role: newUser.role,
                station_id: selectedStationId,
            });
            await refreshConfigData();
            setNewUser({ email: '', full_name: '', role: 'supervisor' });
            setShowAddUser(false);
            alert('User invited successfully');
        } catch (err: any) {
            alert(`Failed to invite user: ${err.message || err.detail}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteUser = (userId: string, userName: string) => {
        setDeleteConfirm({ type: 'user' as any, id: userId, name: userName });
    };

    const handleResetPasswordShow = (userId: string, userName: string) => {
        setPasswordResetUser({ id: userId, name: userName });
        setNewPassword('');
    };

    const handleResetPasswordSubmit = async () => {
        if (!passwordResetUser || !newPassword) {
            alert('Password is required');
            return;
        }
        if (newPassword.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }
        setIsSaving(true);
        try {
            await api.users.updatePassword(passwordResetUser.id, newPassword);
            setPasswordResetUser(null);
            setNewPassword('');
            alert('Password reset successfully');
        } catch (err: any) {
            alert(`Failed to reset password: ${err.message || err.detail}`);
        } finally {
            setIsSaving(false);
        }
    };


    const executeDelete = async () => {
        const { type, id } = deleteConfirm;
        setDeleteConfirm({ type: null, id: '', name: '' });

        try {
            if (type === 'nozzle') {
                console.log('Calling API to delete nozzle...');
                await api.inventory.deleteNozzle(id, selectedStationId);
                console.log('Delete successful, refreshing data...');
            } else if (type === 'tank') {
                await api.inventory.deleteTank(id, selectedStationId);
            } else if (type === 'product') {
                await api.inventory.deleteProduct(id, selectedStationId);
            } else if (type === 'pump') {
                await api.inventory.deletePump(id, selectedStationId);
            } else if (type === 'user') {
                await api.users.remove(id);
            }
            await refreshConfigData();
        } catch (err: any) {
            console.error('Delete failed:', err);
            alert(`Failed to delete ${type}: ${err.message || err.detail}`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Admin Header */}
            <header className="bg-slate-900 border-b-4 border-red-600 text-white px-8 py-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-red-600 rounded flex items-center justify-center font-bold text-xl">SA</div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">System Administration</h1>
                        <p className="text-xs text-red-400 font-mono">AUTHORIZED PERSONNEL ONLY</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <StationSwitcher
                        stations={stations}
                        selectedStationId={selectedStationId}
                        onSelectStation={handleSelectStation}
                    />
                    {selectedStationId && (
                        <button
                            onClick={() => setSelectedStationId('')}
                            className="text-sm text-slate-400 hover:text-white underline"
                        >
                            Clear Selection
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">

                {/* Support Edit Mode Control Panel */}
                {selectedStation && (
                    <div className={`rounded-xl border-2 p-6 shadow-sm transition-all ${selectedStation.supportMode ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                    Support Access Control
                                    {selectedStation.supportMode && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            ACTIVE
                                        </span>
                                    )}
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    Grant temporary write access to {selectedStation.name} data.
                                    <br />
                                    <span className="font-medium text-slate-700">Warning: All actions are audit logged.</span>
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-3">
                                {isConfirmingEnable ? (
                                    <div className="flex flex-col gap-2 items-end animate-in fade-in zoom-in duration-200">
                                        <input
                                            type="text"
                                            placeholder="Reason for access (Ticket #)..."
                                            className="block w-64 rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                                            value={supportReason}
                                            onChange={(e) => setSupportReason(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIsConfirmingEnable(false)}
                                                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={confirmEnableSupport}
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                            >
                                                Confirm & Enable
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleToggleSupportMode}
                                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${selectedStation.supportMode ? 'bg-red-600' : 'bg-slate-200'}`}
                                        role="switch"
                                        aria-checked={selectedStation.supportMode}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${selectedStation.supportMode ? 'translate-x-5' : 'translate-x-0'}`}
                                        />
                                    </button>
                                )}

                                {selectedStation.supportMode && !isConfirmingEnable && (
                                    <div className="text-xs text-red-600 font-mono animate-pulse">
                                        Session Active: 12:04
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Station Configuration Section */}
                {selectedStation && (
                    <div className="rounded-xl border bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Station Configuration: {selectedStation.name}
                            </h2>
                            {isLoadingConfig && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 mb-6 border-b">
                            <button
                                onClick={() => setConfigTab('details')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${configTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                Station Details
                            </button>
                            {(['products', 'tanks', 'nozzles', 'pumps'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setConfigTab(tab)}
                                    className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${configTab === tab
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {tab} ({tab === 'products' ? products.length : tab === 'tanks' ? tanks.length : tab === 'nozzles' ? nozzles.length : pumps.length})
                                </button>
                            ))}
                            <button
                                onClick={() => setConfigTab('users')}
                                className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${configTab === 'users'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Users ({stationUsers.length})
                            </button>
                        </div>

                        {/* Station Details Tab */}
                        {configTab === 'details' && (
                            <div className="space-y-6">
                                {/* System Admin Actions */}
                                {currentUser?.role === 'system_admin' && (
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-medium text-indigo-900">System Access</h3>
                                            <p className="text-xs text-indigo-700 mt-1">
                                                Assign yourself to this station to access its dashboard and sales data.
                                            </p>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (!confirm('This will assign you to this station and redirect to the dashboard. Continue?')) return;
                                                setIsAssigningMyStation(true);
                                                try {
                                                    await api.users.assignStation(currentUser.user_id, selectedStation.id, 'owner');
                                                    router.push('/dashboard');
                                                } catch (err: any) {
                                                    alert('Failed to assign station: ' + (err.message || 'Unknown error'));
                                                    setIsAssigningMyStation(false);
                                                }
                                            }}
                                            disabled={isAssigningMyStation}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {isAssigningMyStation ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <ArrowRightCircle className="h-4 w-4" />
                                            )}
                                            Access Dashboard
                                        </button>
                                    </div>
                                )}

                                <p className="text-sm text-slate-500">Edit station information and contact details</p>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Station Name</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            value={stationDetails.name}
                                            onChange={(e) => setStationDetails(s => ({ ...s, name: e.target.value }))}
                                            placeholder="Station name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            value={stationDetails.email}
                                            onChange={(e) => setStationDetails(s => ({ ...s, email: e.target.value }))}
                                            placeholder="station@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                                        <input
                                            type="tel"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            value={stationDetails.phone}
                                            onChange={(e) => setStationDetails(s => ({ ...s, phone: e.target.value }))}
                                            placeholder="+94 XX XXX XXXX"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            value={stationDetails.address}
                                            onChange={(e) => setStationDetails(s => ({ ...s, address: e.target.value }))}
                                            placeholder="Street address, City"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                        <select
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            value={stationDetails.status}
                                            onChange={(e) => setStationDetails(s => ({ ...s, status: e.target.value as any }))}
                                        >
                                            <option value="setup">Setup</option>
                                            <option value="active">Active</option>
                                            <option value="suspended">Suspended</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 border-t flex justify-end gap-3">
                                    <button
                                        onClick={() => {
                                            if (selectedStation) {
                                                setStationDetails({
                                                    name: selectedStation.name || '',
                                                    address: '',
                                                    phone: '',
                                                    email: selectedStation.owner || '',
                                                    status: (selectedStation.status?.toLowerCase() || 'active') as any,
                                                });
                                            }
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!stationDetails.name.trim()) {
                                                alert('Station name is required');
                                                return;
                                            }
                                            setIsSavingDetails(true);
                                            setSaveSuccess(false);
                                            try {
                                                await api.admin.updateStation(selectedStationId, {
                                                    name: stationDetails.name,
                                                    address: stationDetails.address || undefined,
                                                    phone: stationDetails.phone || undefined,
                                                    email: stationDetails.email || undefined,
                                                    status: stationDetails.status,
                                                });
                                                mutate('/admin/stations');
                                                setSaveSuccess(true);
                                                setTimeout(() => setSaveSuccess(false), 3000);
                                            } catch (err: any) {
                                                alert(`Failed to save: ${err.message || err.detail || 'Unknown error'}`);
                                            } finally {
                                                setIsSavingDetails(false);
                                            }
                                        }}
                                        disabled={isSavingDetails}
                                        className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {isSavingDetails ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    {saveSuccess && (
                                        <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                                            ✓ Saved!
                                        </span>
                                    )}
                                </div>

                                {/* Owner Management Section */}
                                {ownerUser ? (
                                    <div className="pt-6 border-t">
                                        <h3 className="text-md font-semibold text-slate-800 mb-4">Owner Credentials</h3>
                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 uppercase">Owner Name</label>
                                                    <div className="text-sm font-medium text-slate-900">{ownerUser.full_name || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 uppercase">Owner Email</label>
                                                    <div className="text-sm font-medium text-slate-900">{ownerUser.email}</div>
                                                </div>
                                            </div>

                                            <div className="border-t border-slate-200 pt-4 mt-2">
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Reset Password</label>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="text"
                                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                        value={resetPassword}
                                                        onChange={(e) => setResetPassword(e.target.value)}
                                                        placeholder="Enter new password"
                                                    />
                                                    <button
                                                        onClick={async () => {
                                                            if (!resetPassword.trim()) {
                                                                alert('Password is required');
                                                                return;
                                                            }
                                                            setIsResettingPassword(true);
                                                            setResetPasswordSuccess('');
                                                            try {
                                                                await api.users.updatePassword(ownerUser.id, resetPassword);
                                                                setResetPasswordSuccess('Password updated successfully');
                                                                setResetPassword('');
                                                                setTimeout(() => setResetPasswordSuccess(''), 5000);
                                                            } catch (err: any) {
                                                                alert(`Failed to reset password: ${err.message || err.detail || 'Unknown error'}`);
                                                            } finally {
                                                                setIsResettingPassword(false);
                                                            }
                                                        }}
                                                        disabled={isResettingPassword}
                                                        className="px-4 py-2 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                                                    >
                                                        {isResettingPassword ? 'Updating...' : 'Update Password'}
                                                    </button>
                                                </div>
                                                {resetPasswordSuccess && (
                                                    <div className="mt-2 text-green-600 text-sm font-medium">
                                                        ✓ {resetPasswordSuccess}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pt-6 border-t">
                                        <h3 className="text-md font-semibold text-slate-800 mb-4">Invite Owner</h3>
                                        <p className="text-sm text-slate-500 mb-4">Create a new owner account for this station</p>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                                                <input
                                                    type="email"
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                    value={inviteEmail}
                                                    onChange={(e) => setInviteEmail(e.target.value)}
                                                    placeholder="owner@example.com"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                    value={inviteFullName}
                                                    onChange={(e) => setInviteFullName(e.target.value)}
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={async () => {
                                                    if (!inviteEmail.trim()) {
                                                        alert('Email is required');
                                                        return;
                                                    }
                                                    setIsInviting(true);
                                                    setInviteSuccess('');
                                                    try {
                                                        await api.admin.inviteUser({
                                                            email: inviteEmail,
                                                            full_name: inviteFullName || undefined,
                                                            role: 'owner',
                                                            station_id: selectedStationId,
                                                        });
                                                        setInviteSuccess(`Owner created for ${inviteEmail}!`);
                                                        setInviteEmail('');
                                                        setInviteFullName('');
                                                        // Refresh users list to show the new owner immediately
                                                        const users = await api.users.getAll(selectedStationId);
                                                        setStationUsers(users);
                                                        setOwnerUser(users.find(u => u.role === 'owner') || null);

                                                        setTimeout(() => setInviteSuccess(''), 5000);
                                                    } catch (err: any) {
                                                        alert(`Failed to invite: ${err.message || err.detail || 'Unknown error'}`);
                                                    } finally {
                                                        setIsInviting(false);
                                                    }
                                                }}
                                                disabled={isInviting}
                                                className="px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                            >
                                                {isInviting ? 'Creating...' : 'Create Owner'}
                                            </button>
                                            {inviteSuccess && (
                                                <span className="text-green-600 text-sm font-medium">
                                                    ✓ {inviteSuccess}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Products Tab */}
                        {configTab === 'products' && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-sm text-slate-500">Fuel products available at this station</p>
                                    <button
                                        onClick={() => setShowAddProduct(!showAddProduct)}
                                        className="px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                    >
                                        {showAddProduct ? 'Cancel' : '+ Add Product'}
                                    </button>
                                </div>
                                {showAddProduct && (
                                    <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-3">
                                        <div className="grid grid-cols-3 gap-3">
                                            <input
                                                type="text"
                                                placeholder="Code (e.g., LAD)"
                                                className="px-3 py-2 border rounded-md text-sm"
                                                value={newProduct.code}
                                                onChange={(e) => setNewProduct(p => ({ ...p, code: e.target.value }))}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Name (e.g., Auto Diesel)"
                                                className="px-3 py-2 border rounded-md text-sm"
                                                value={newProduct.name}
                                                onChange={(e) => setNewProduct(p => ({ ...p, name: e.target.value }))}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Price per Liter"
                                                className="px-3 py-2 border rounded-md text-sm"
                                                value={newProduct.price_per_liter}
                                                onChange={(e) => setNewProduct(p => ({ ...p, price_per_liter: e.target.value }))}
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            {editingProduct && (
                                                <button
                                                    onClick={() => {
                                                        setEditingProduct(null);
                                                        setNewProduct({ code: '', name: '', price_per_liter: '' });
                                                        setShowAddProduct(false);
                                                    }}
                                                    className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            <button
                                                onClick={handleAddProduct}
                                                disabled={isSaving}
                                                className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                {isSaving ? 'Saving...' : (editingProduct ? 'Update Product' : 'Save Product')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600">Code</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600">Name</th>
                                            <th className="px-4 py-2 text-right font-medium text-slate-600">Price/L (LKR)</th>
                                            <th className="px-4 py-2 text-center font-medium text-slate-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {products.map((p) => (
                                            <tr key={p.id}>
                                                <td className="px-4 py-3 font-medium">{p.code}</td>
                                                <td className="px-4 py-3">{p.name}</td>
                                                <td className="px-4 py-3 text-right">{Number(p.price_per_liter || 0).toFixed(2)}</td>
                                                <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEditProduct(p)}
                                                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteProduct(p.id, p.name)}
                                                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {products.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No products configured</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Tanks Tab */}
                        {configTab === 'tanks' && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-sm text-slate-500">Storage tanks at this station</p>
                                    <button
                                        onClick={() => setShowAddTank(!showAddTank)}
                                        className="px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                    >
                                        {showAddTank ? 'Cancel' : '+ Add Tank'}
                                    </button>
                                </div>
                                {showAddTank && (
                                    <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-3">
                                        <div className="grid grid-cols-4 gap-3">
                                            <input
                                                type="text"
                                                placeholder="Tank Name (e.g., LAD-1)"
                                                className="px-3 py-2 border rounded-md text-sm"
                                                value={newTank.name}
                                                onChange={(e) => setNewTank(t => ({ ...t, name: e.target.value }))}
                                            />
                                            <select
                                                className="px-3 py-2 border rounded-md text-sm"
                                                value={newTank.product_id}
                                                onChange={(e) => setNewTank(t => ({ ...t, product_id: e.target.value }))}
                                            >
                                                <option value="">Select Product</option>
                                                {products.map((p) => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                placeholder="Type (e.g., 5000G)"
                                                className="px-3 py-2 border rounded-md text-sm"
                                                value={newTank.tank_type}
                                                onChange={(e) => setNewTank(t => ({ ...t, tank_type: e.target.value }))}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Capacity (Liters)"
                                                className="px-3 py-2 border rounded-md text-sm"
                                                value={newTank.capacity_liters}
                                                onChange={(e) => setNewTank(t => ({ ...t, capacity_liters: e.target.value }))}
                                            />
                                        </div>

                                        <div className="flex justify-end gap-2">
                                            {editingTank && (
                                                <button
                                                    onClick={() => {
                                                        setEditingTank(null);
                                                        setNewTank({ name: '', product_id: '', tank_type: '', capacity_liters: '', color: '' });
                                                        setShowAddTank(false);
                                                    }}
                                                    className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            <button
                                                onClick={handleAddTank}
                                                disabled={isSaving}
                                                className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                {isSaving ? 'Saving...' : (editingTank ? 'Update Tank' : 'Save Tank')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600">Name</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600">Product</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600">Type</th>
                                            <th className="px-4 py-2 text-right font-medium text-slate-600">Capacity (L)</th>
                                            <th className="px-4 py-2 text-center font-medium text-slate-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {tanks.map((t) => (
                                            <tr key={t.id}>
                                                <td className="px-4 py-3 font-medium">{t.name}</td>
                                                <td className="px-4 py-3">{t.product_name || '-'}</td>
                                                <td className="px-4 py-3">{t.tank_type || '-'}</td>
                                                <td className="px-4 py-3 text-right">{t.capacity_liters.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                                                    <button onClick={() => handleEditTank(t)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Edit</button>
                                                    <button onClick={() => handleDeleteTank(t.id, t.name)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {tanks.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No tanks configured</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Nozzles Tab */}
                        {configTab === 'nozzles' && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-sm text-slate-500">Nozzles for meter readings (these appear in the Sales page)</p>
                                    <button
                                        onClick={() => setShowAddNozzle(!showAddNozzle)}
                                        className="px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                    >
                                        {showAddNozzle ? 'Cancel' : '+ Add Nozzle'}
                                    </button>
                                </div>
                                {showAddNozzle && (
                                    <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-3">
                                        <div className="grid grid-cols-3 gap-3">
                                            <input
                                                type="text"
                                                placeholder="Nozzle ID (e.g. N-1)"
                                                className="px-3 py-2 border rounded-md text-sm"
                                                value={newNozzle.nozzle_id}
                                                onChange={(e) => setNewNozzle(n => ({ ...n, nozzle_id: e.target.value }))}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Nozzle Name"
                                                className="px-3 py-2 border rounded-md text-sm"
                                                value={newNozzle.nozzle_name}
                                                onChange={(e) => setNewNozzle(n => ({ ...n, nozzle_name: e.target.value }))}
                                            />
                                            <select
                                                className="px-3 py-2 border rounded-md text-sm"
                                                value={newNozzle.tank_id}
                                                onChange={(e) => setNewNozzle(n => ({ ...n, tank_id: e.target.value }))}
                                            >
                                                <option value="">Select Tank</option>
                                                {tanks.map((t) => (
                                                    <option key={t.id} value={t.id}>{t.name} ({t.product_name || 'Unknown'})</option>
                                                ))}
                                            </select>
                                            <div className="flex gap-2">
                                                <select
                                                    className="px-3 py-2 border rounded-md text-sm flex-1"
                                                    value={newNozzle.product_id}
                                                    onChange={(e) => setNewNozzle(n => ({ ...n, product_id: e.target.value }))}
                                                >
                                                    <option value="">Select Product</option>
                                                    {products.map((p) => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                                {newNozzle.product_id && (
                                                    <div className="px-3 py-2 bg-slate-100 border rounded-md text-sm text-slate-600 whitespace-nowrap">
                                                        {products.find(p => p.id === newNozzle.product_id)?.price_per_liter} / L
                                                    </div>
                                                )}
                                            </div>
                                            <select
                                                className="px-3 py-2 border rounded-md text-sm"
                                                value={newNozzle.pump_id}
                                                onChange={(e) => setNewNozzle(n => ({ ...n, pump_id: e.target.value }))}
                                            >
                                                <option value="">Select Pump</option>
                                                {pumps.map((p) => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex justify-end gap-2">
                                            {editingNozzle && (
                                                <button
                                                    onClick={() => {
                                                        setEditingNozzle(null);
                                                        setNewNozzle({ nozzle_id: '', nozzle_name: '', tank_id: '', product_id: '', pump_id: '' });
                                                        setShowAddNozzle(false);
                                                    }}
                                                    className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            <button
                                                onClick={handleAddNozzle}
                                                disabled={isSaving}
                                                className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                {isSaving ? 'Saving...' : (editingNozzle ? 'Update Nozzle' : 'Save Nozzle')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600">Nozzle Code</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600">Nozzle Name</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600">Tank</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600">Product</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600">Pump</th>
                                            <th className="px-4 py-2 text-center font-medium text-slate-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {nozzles.map((n) => (
                                            <tr key={n.id}>
                                                <td className="px-4 py-3">{n.nozzle_code}</td>
                                                <td className="px-4 py-3">{n.nozzle_name}</td>
                                                <td className="px-4 py-3">{tanks.find(t => t.id === n.tank_id)?.name || '-'}</td>
                                                <td className="px-4 py-3">{n.product_name || '-'}</td>
                                                <td className="px-4 py-3">{n.pump_name || '-'}</td>
                                                <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                                                    <button onClick={() => handleEditNozzle(n)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Edit</button>
                                                    <button onClick={() => handleDeleteNozzle(n.id, n.nozzle_name)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {nozzles.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No nozzles configured. Add nozzles here.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pumps Tab */}
                        {configTab === 'pumps' && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-sm text-slate-500">Pumps at this station</p>
                                    <button
                                        onClick={() => setShowAddPump(!showAddPump)}
                                        className="px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                    >
                                        {showAddPump ? 'Cancel' : '+ Add Pump'}
                                    </button>
                                </div>
                                {showAddPump && (
                                    <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <input
                                                type="text"
                                                placeholder="Pump Name"
                                                className="px-3 py-2 border rounded-md text-sm"
                                                value={newPump.name}
                                                onChange={(e) => setNewPump(p => ({ ...p, name: e.target.value }))}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Location / Island (optional)"
                                                className="px-3 py-2 border rounded-md text-sm"
                                                value={newPump.location}
                                                onChange={(e) => setNewPump(p => ({ ...p, location: e.target.value }))}
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            {editingPump && (
                                                <button
                                                    onClick={() => {
                                                        setEditingPump(null);
                                                        setNewPump({ name: '', location: '' });
                                                        setShowAddPump(false);
                                                    }}
                                                    className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            <button
                                                onClick={handleAddPump}
                                                disabled={isSaving}
                                                className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                {isSaving ? 'Saving...' : (editingPump ? 'Update Pump' : 'Save Pump')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600">Name</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600">Location</th>
                                            <th className="px-4 py-2 text-center font-medium text-slate-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {pumps.map((p) => (
                                            <tr key={p.id}>
                                                <td className="px-4 py-3 font-medium">{p.name}</td>
                                                <td className="px-4 py-3 text-slate-500">{p.location || '-'}</td>
                                                <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                                                    <button onClick={() => handleEditPump(p)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Edit</button>
                                                    <button onClick={() => handleDeletePump(p.id, p.name)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {pumps.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">No pumps configured</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Users Tab */}
                        {configTab === 'users' && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-sm text-slate-500">Manage users with access to this station</p>
                                    <button
                                        onClick={() => setShowAddUser(!showAddUser)}
                                        className="px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                    >
                                        {showAddUser ? 'Cancel' : '+ Invite User'}
                                    </button>
                                </div>
                                {showAddUser && (
                                    <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-3">
                                        <div className="grid grid-cols-3 gap-3">
                                            <input
                                                type="email"
                                                placeholder="Email"
                                                className="px-3 py-2 border rounded-md text-sm"
                                                value={newUser.email}
                                                onChange={(e) => setNewUser(u => ({ ...u, email: e.target.value }))}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Full Name"
                                                className="px-3 py-2 border rounded-md text-sm"
                                                value={newUser.full_name}
                                                onChange={(e) => setNewUser(u => ({ ...u, full_name: e.target.value }))}
                                            />
                                            <select
                                                className="px-3 py-2 border rounded-md text-sm"
                                                value={newUser.role}
                                                onChange={(e) => setNewUser(u => ({ ...u, role: e.target.value as any }))}
                                            >
                                                <option value="supervisor">Supervisor</option>
                                                <option value="accountant">Accountant</option>
                                                <option value="manager">Manager</option>
                                            </select>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={handleInviteUser}
                                                disabled={isSaving}
                                                className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                {isSaving ? 'Inviting...' : 'Send Invite'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600">Email</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600">Full Name</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-600">Role</th>
                                            <th className="px-4 py-2 text-center font-medium text-slate-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {stationUsers.map((user) => (
                                            <tr key={user.id}>
                                                <td className="px-4 py-3 font-medium">{user.email}</td>
                                                <td className="px-4 py-3">{user.full_name || '-'}</td>
                                                <td className="px-4 py-3 capitalize">{user.role}</td>
                                                <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleResetPasswordShow(user.id, user.full_name || user.email)}
                                                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                                    >
                                                        Reset Password
                                                    </button>
                                                    {user.role !== 'owner' && (
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                                                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {stationUsers.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No users assigned to this station</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Password Reset Modal */}
                {passwordResetUser && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                Reset Password for {passwordResetUser.name}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                    <input
                                        type="password"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password (min 8 characters)"
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => {
                                            setPasswordResetUser(null);
                                            setNewPassword('');
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleResetPasswordSubmit}
                                        disabled={isSaving}
                                        className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {isSaving ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Audit Log Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-800">System Audit Logs</h2>
                        <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Export CSV</button>
                    </div>
                    <AuditLogViewer logs={logs} />
                </section>

                {/* All Stations Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-800">Registered Stations</h2>
                        <button
                            onClick={() => setShowOnboardModal(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            + Onboard New Station
                        </button>
                    </div>
                    <StationList stations={stations} onManageStation={handleSelectStation} />
                </section>

            </main >

            {/* Onboard Station Modal */}
            {
                showOnboardModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                            <div className="bg-indigo-600 px-6 py-4">
                                <h3 className="text-lg font-semibold text-white">Onboard New Station</h3>
                                <p className="text-sm text-indigo-200">Create a new station and send owner invite</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Station Name *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Central Fuel Station"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        value={newStation.name}
                                        onChange={(e) => setNewStation(s => ({ ...s, name: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Owner Email *</label>
                                    <input
                                        type="email"
                                        placeholder="owner@example.com"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        value={newStation.owner_email}
                                        onChange={(e) => setNewStation(s => ({ ...s, owner_email: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                    <input
                                        type="text"
                                        placeholder="Street address"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        value={newStation.address}
                                        onChange={(e) => setNewStation(s => ({ ...s, address: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        placeholder="+94 XX XXX XXXX"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        value={newStation.phone}
                                        onChange={(e) => setNewStation(s => ({ ...s, phone: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowOnboardModal(false);
                                        setNewStation({ name: '', owner_email: '', address: '', phone: '' });
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleOnboardStation}
                                    disabled={isOnboarding}
                                    className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isOnboarding ? 'Creating...' : 'Create Station'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.type !== null}
                title={`Delete ${deleteConfirm.type === 'nozzle' ? 'Nozzle' : deleteConfirm.type === 'tank' ? 'Tank' : 'Product'}?`}
                message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                onConfirm={executeDelete}
                onCancel={() => setDeleteConfirm({ type: null, id: '', name: '' })}
            />
        </div >
    );
}
