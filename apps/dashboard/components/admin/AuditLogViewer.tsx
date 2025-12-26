import React from 'react';

interface AuditLog {
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    details: string;
}

interface AuditLogViewerProps {
    logs: AuditLog[];
}

export function AuditLogViewer({ logs }: AuditLogViewerProps) {
    return (
        <div className="bg-slate-900 text-slate-300 font-mono text-sm p-4 rounded-lg shadow-inner h-64 overflow-y-auto">
            <div className="mb-2 text-slate-500 border-b border-slate-700 pb-1">System Audit Log Stream...</div>
            <div className="space-y-1">
                {logs.map((log) => (
                    <div key={log.id} className="flex gap-4">
                        <span className="text-slate-500 shrink-0 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className="text-amber-500 shrink-0 w-32 truncate" title={log.actor}>{log.actor}</span>
                        <span className="text-cyan-400 shrink-0 w-48 truncate" title={log.action}>{log.action}</span>
                        <span className="text-slate-300 truncate">{log.details}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
