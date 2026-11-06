import React from 'react';
import {
  ShieldCheck,
  Clock,
  User,
  Activity,
  Calendar,
  Lock,
} from 'lucide-react';
import { AuditLog } from '../../types';
import { formatDate, formatTime } from '../../lib/utils';
import { attendanceService } from '../../services/attendanceService';

export const AuditTrailView: React.FC = () => {
  const auditLogs = attendanceService.getAuditLogs();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="border-b border-[#E8E2D3] pb-4">
        <h1 className="text-xl font-bold text-[#192B16] flex items-center">
          <ShieldCheck className="w-5 h-5 text-[#B29261] mr-2" />
          System Security & Audit Trail
        </h1>
        <p className="text-xs text-stone-600 mt-1">
          Immutable audit record of check-in events, checkout timestamps, correction approvals, and role updates.
        </p>
      </div>

      <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs">
        {auditLogs.length === 0 ? (
          <div className="text-center py-12 text-stone-400 text-xs">
            <Lock className="w-8 h-8 mx-auto mb-2 text-[#B29261]/40" />
            <p>Audit logging active. System records attendance mutations and administrative actions automatically.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl border border-[#E8E2D3] bg-[#F7F4EC]/50 flex items-start justify-between text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] font-bold bg-[#192B16] text-[#FEFCF7] px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                    <span className="font-bold text-[#192B16]">{log.actorEmail}</span>
                  </div>
                  <div className="text-stone-600 font-mono text-[11px]">
                    Target: <span className="font-semibold text-stone-800">{log.targetId}</span>
                  </div>
                  {log.metadata && (
                    <div className="text-[10px] text-stone-500 font-mono bg-white p-1.5 rounded border border-[#E8E2D3]">
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}
                </div>

                <div className="text-right text-[11px] text-stone-400 font-mono shrink-0 ml-4">
                  <span>{formatDate(log.timestamp)}</span>
                  <span className="block">{formatTime(log.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
