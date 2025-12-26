"use client";

import React, { useState } from 'react';
import { StationSwitcher } from '@/components/admin/StationSwitcher';
import { StationList, Station } from '@/components/admin/StationList';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';

// Mock Data
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
    const [stations, setStations] = useState<Station[]>(MOCK_STATIONS);
    const [selectedStationId, setSelectedStationId] = useState<string>('');
    const [supportReason, setSupportReason] = useState('');
    const [isConfirmingEnable, setIsConfirmingEnable] = useState(false);

    const selectedStation = stations.find(s => s.id === selectedStationId);

    const handleToggleSupportMode = () => {
        if (!selectedStation) return;

        if (selectedStation.supportMode) {
            // Disable immediately
            updateStationSupportMode(selectedStation.id, false);
            setSupportReason('');
        } else {
            // Require reason
            setIsConfirmingEnable(true);
        }
    };

    const confirmEnableSupport = () => {
        if (!supportReason.trim()) {
            alert("Reason is required to enable Support Edit Mode.");
            return;
        }
        updateStationSupportMode(selectedStationId, true);
        setIsConfirmingEnable(false);
    };

    const updateStationSupportMode = (id: string, active: boolean) => {
        setStations(prev => prev.map(s => s.id === id ? { ...s, supportMode: active } : s));
    };

    const handleSelectStation = (id: string) => {
        setSelectedStationId(id);
        setIsConfirmingEnable(false);
        setSupportReason('');
    }

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

                {/* Audit Log Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-800">System Audit Logs</h2>
                        <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Export CSV</button>
                    </div>
                    <AuditLogViewer logs={MOCK_LOGS} />
                </section>

                {/* All Stations Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-800">Registered Stations</h2>
                        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            + Onboard New Station
                        </button>
                    </div>
                    <StationList stations={stations} onManageStation={handleSelectStation} />
                </section>

            </main>
        </div>
    );
}
