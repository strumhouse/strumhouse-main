import React, { useState, useEffect, useRef, useCallback } from 'react';
import { performanceMonitor } from '../../utils/performance';

interface DebugInfo {
  userExists: boolean;
  userId?: string;
  loading: boolean;
  hasLoaded: boolean;
  profileExists: boolean;
  bookingsCount: number;
}

interface DebugPanelProps {
  isVisible?: boolean;
  debugInfo?: DebugInfo;
}

const DebugPanel: React.FC<DebugPanelProps> = React.memo(({ isVisible = false, debugInfo }) => {
  const [isOpen, setIsOpen] = useState(isVisible);
  const [warnings, setWarnings] = useState<string[]>([]);
  const renderCountRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Increment render count only when component actually re-renders
  renderCountRef.current += 1;

  const updateWarnings = useCallback(() => {
    setWarnings(performanceMonitor.getWarnings());
  }, []);

  useEffect(() => {
    // Only set up interval if panel is open
    if (isOpen) {
      intervalRef.current = setInterval(updateWarnings, 2000); // Reduced frequency
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [isOpen, updateWarnings]);

  // Clear interval when component unmounts
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleClearWarnings = useCallback(() => {
    performanceMonitor.clearWarnings();
    setWarnings([]);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg z-50"
        title="Debug Panel"
      >
        🐛
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="text-gray-300">
          <span className="font-medium">Render Count:</span> {renderCountRef.current}
        </div>
        
        <div className="text-gray-300">
          <span className="font-medium">Warnings:</span> {warnings.length}
        </div>

        {debugInfo && (
          <div className="border-t border-gray-700 pt-2 mt-2">
            <div className="text-yellow-400 font-medium mb-1">Dashboard State:</div>
            <div className="text-xs space-y-1">
              <div className="text-gray-300">
                <span className="font-medium">User:</span> {debugInfo.userExists ? 'Yes' : 'No'}
              </div>
              <div className="text-gray-300">
                <span className="font-medium">User ID:</span> {debugInfo.userId ? debugInfo.userId.slice(0, 8) + '...' : 'None'}
              </div>
              <div className="text-gray-300">
                <span className="font-medium">Loading:</span> {debugInfo.loading ? 'Yes' : 'No'}
              </div>
              <div className="text-gray-300">
                <span className="font-medium">Has Loaded:</span> {debugInfo.hasLoaded ? 'Yes' : 'No'}
              </div>
              <div className="text-gray-300">
                <span className="font-medium">Profile:</span> {debugInfo.profileExists ? 'Yes' : 'No'}
              </div>
              <div className="text-gray-300">
                <span className="font-medium">Bookings:</span> {debugInfo.bookingsCount}
              </div>
            </div>
          </div>
        )}
        
        {warnings.length > 0 && (
          <div className="max-h-32 overflow-y-auto">
            <div className="text-yellow-400 font-medium mb-1">Recent Warnings:</div>
            {warnings.slice(-3).map((warning, index) => (
              <div key={index} className="text-yellow-300 text-xs mb-1">
                {warning}
              </div>
            ))}
          </div>
        )}
        
        <button
          onClick={handleClearWarnings}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded text-xs"
        >
          Clear Warnings
        </button>
      </div>
    </div>
  );
});

DebugPanel.displayName = 'DebugPanel';

export default DebugPanel; 