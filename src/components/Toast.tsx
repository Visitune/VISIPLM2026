
import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000); // Disparait après 5s
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
      success: 'bg-teal-600 text-white border-teal-700',
      error: 'bg-red-600 text-white border-red-700',
      warning: 'bg-amber-500 text-white border-amber-600',
      info: 'bg-blue-600 text-white border-blue-700'
  };

  const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
  };

  return (
    <div className={`fixed bottom-6 right-6 ${styles[type]} px-6 py-4 rounded-lg shadow-xl z-[9999] flex items-center gap-4 max-w-md border animate-bounce-in`}>
      <span className="text-xl">{icons[type]}</span>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-auto text-white/70 hover:text-white font-bold text-lg">×</button>
    </div>
  );
};
