import React from 'react';

export interface Station {
    id: string;
    name: string;
    owner: string;
    status: 'Active' | 'Suspended' | 'Setup';
    supportMode: boolean;
}

interface StationListProps {
    stations: Station[];
    onManageStation: (stationId: string) => void;
}

export function StationList({ stations, onManageStation }: StationListProps) {
    return (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-slate-300">
                <thead className="bg-slate-50">
                    <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Station Name</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Owner</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Status</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Support Mode</th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Manage</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                    {stations.map((station) => (
                        <tr key={station.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">{station.name}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{station.owner}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${station.status === 'Active' ? 'bg-green-100 text-green-800' :
                                        station.status === 'Suspended' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {station.status}
                                </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                                {station.supportMode ? (
                                    <span className="text-red-600 font-bold flex items-center gap-1">
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                        Active
                                    </span>
                                ) : (
                                    <span className="text-slate-400">Inactive</span>
                                )}
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                <button
                                    onClick={() => onManageStation(station.id)}
                                    className="text-indigo-600 hover:text-indigo-900"
                                >
                                    Manage<span className="sr-only">, {station.name}</span>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
