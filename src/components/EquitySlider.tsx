import React from 'react';

interface EquitySliderProps {
  lpEquity: number;
  gpEquity: number;
  onEquityChange: (lpEquity: number, gpEquity: number) => void;
  totalEquity: number;
}

export const EquitySlider: React.FC<EquitySliderProps> = ({
  lpEquity,
  gpEquity,
  onEquityChange,
  totalEquity
}) => {
  const handleSliderChange = (value: number) => {
    // Ensure the value is between 0 and 100
    const newLpEquity = Math.max(0, Math.min(100, value));
    const newGpEquity = 100 - newLpEquity;
    onEquityChange(newLpEquity, newGpEquity);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const lpAmount = (totalEquity * lpEquity) / 100;
  const gpAmount = (totalEquity * gpEquity) / 100;

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Equity Split Adjustment</h3>
      
      {/* Slider Container */}
      <div className="relative mb-6">
        {/* Background Track */}
        <div className="relative h-12 bg-white rounded-lg shadow-inner overflow-hidden">
          {/* LP Section */}
          <div 
            className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${lpEquity}%` }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm">
              LP: {lpEquity.toFixed(1)}%
            </div>
          </div>
          
          {/* GP Section */}
          <div 
            className="absolute right-0 top-0 h-full bg-green-500 transition-all duration-300"
            style={{ width: `${gpEquity}%` }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm">
              GP: {gpEquity.toFixed(1)}%
            </div>
          </div>
          
          {/* Slider Handle */}
          <div 
            className="absolute top-0 h-full w-1 bg-gray-800 cursor-ew-resize"
            style={{ left: `${lpEquity}%`, transform: 'translateX(-50%)' }}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg border-2 border-gray-800"></div>
          </div>
        </div>
        
        {/* Invisible Range Input */}
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={lpEquity}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
          style={{ zIndex: 10 }}
        />
      </div>
      
      {/* Labels */}
      <div className="flex justify-between text-xs text-gray-600 mb-4">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
      
      {/* Amount Display */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-600">Limited Partner (LP)</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(lpAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{lpEquity.toFixed(1)}%</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-600">General Partner (GP)</p>
              <p className="text-lg font-bold text-green-700">{formatCurrency(gpAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{gpEquity.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Total Equity Display */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Total Equity Required</span>
          <span className="text-lg font-bold text-gray-900">{formatCurrency(totalEquity)}</span>
        </div>
      </div>
    </div>
  );
};

export default EquitySlider;