import React from 'react';

interface Station {
    id: string;
    name: string;
}

interface StationSwitcherProps {
    stations: Station[];
    selectedStationId: string;
    onSelectStation: (id: string) => void;
}

export function StationSwitcher({ stations, selectedStationId, onSelectStation }: StationSwitcherProps) {
    return (
        <div className="flex items-center gap-4">
            <label htmlFor="station-select" className="text-sm font-medium text-slate-400">Select Station:</label>
            <select
                id="station-select"
                value={selectedStationId}
                onChange={(e) => onSelectStation(e.target.value)}
                className="block w-64 rounded-md border-slate-300 bg-white text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            >
                <option value="">-- Select a Station --</option>
                {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                        {station.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
