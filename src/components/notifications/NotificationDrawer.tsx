import React from 'react';
import {
  Bell,
  X,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { NotificationItem } from '../../types';
import { formatTime, formatDate } from '../../lib/utils';
import { adminService } from '../../services/adminService';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onRefresh: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onRefresh,
}) => {
  if (!isOpen) return null;

  const handleMarkRead = (id: string) => {
    adminService.markNotificationRead(id);
    onRefresh();
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'warning':
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FEFCF7] shadow-2xl border-l border-[#E8E2D3] flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-[#E8E2D3] flex items-center justify-between bg-[#F7F4EC]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#192B16] flex items-center justify-center">
                <Mail className="w-4 h-4 text-[#B29261]" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#192B16]">Transactional Notifications</h3>
                <p className="text-[11px] text-stone-500">
                  Email & platform notifications dispatch log
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-xs">
                No notifications logged yet.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleMarkRead(item.id)}
                  className={`p-3.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    item.read
                      ? 'bg-white border-stone-200 opacity-70'
                      : 'bg-[#F7EFE1]/40 border-[#B29261]/40 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      {getIcon(item.type)}
                      <span className="font-bold text-[#192B16]">{item.title}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {formatTime(item.sentAt)}
                    </span>
                  </div>

                  <p className="text-stone-700 leading-relaxed">{item.message}</p>

                  <div className="mt-2 pt-2 border-t border-[#E8E2D3]/60 flex items-center justify-between text-[10px] text-stone-500">
                    <span>To: {item.recipientEmail}</span>
                    {!item.read && <span className="font-semibold text-[#B29261]">Mark as read</span>}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#E8E2D3] bg-[#F7F4EC] text-center text-[11px] text-stone-500">
            Automated transactional mailers powered by Teara dispatch engine.
          </div>
        </div>
      </div>
    </div>
  );
};
