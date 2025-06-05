import React from 'react';

export interface UnitType {
  id: string;
  name: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  units: number;
  monthlyRent: number;
}

interface UnitMatrixProps {
  unitTypes: UnitType[];
  onChange: (unitTypes: UnitType[]) => void;
  className?: string;
}

export const UnitMatrix: React.FC<UnitMatrixProps> = ({ unitTypes, onChange, className = '' }) => {
  const addUnitType = () => {
    const newUnit: UnitType = {
      id: Date.now().toString(),
      name: `${unitTypes.length + 1}BR Unit`,
      bedrooms: 1,
      bathrooms: 1,
      squareFootage: 800,
      units: 10,
      monthlyRent: 1200
    };
    onChange([...unitTypes, newUnit]);
  };

  const updateUnitType = (id: string, field: keyof UnitType, value: string | number) => {
    onChange(unitTypes.map(unit => 
      unit.id === id ? { ...unit, [field]: value } : unit
    ));
  };

  const removeUnitType = (id: string) => {
    onChange(unitTypes.filter(unit => unit.id !== id));
  };

  const totalUnits = unitTypes.reduce((sum, unit) => sum + unit.units, 0);
  const totalSF = unitTypes.reduce((sum, unit) => sum + (unit.units * unit.squareFootage), 0);
  const avgSize = totalUnits > 0 ? Math.round(totalSF / totalUnits) : 0;
  const weightedAvgRent = totalUnits > 0 
    ? unitTypes.reduce((sum, unit) => sum + (unit.units * unit.monthlyRent), 0) / totalUnits 
    : 0;

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">Unit Mix Matrix</h4>
        <button
          onClick={addUnitType}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          + Add Unit Type
        </button>
      </div>

      {unitTypes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No unit types defined yet.</p>
          <p className="text-sm mt-2">Click "Add Unit Type" to get started.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Type
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bed/Bath
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size (SF)
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    # Units
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monthly Rent
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total SF
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {unitTypes.map((unit) => (
                  <tr key={unit.id}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="text"
                        value={unit.name}
                        onChange={(e) => updateUnitType(unit.id, 'name', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex gap-1">
                        <input
                          type="number"
                          value={unit.bedrooms}
                          onChange={(e) => updateUnitType(unit.id, 'bedrooms', Number(e.target.value))}
                          className="w-12 px-1 py-1 border border-gray-300 rounded text-sm text-center"
                          min="0"
                          max="5"
                        />
                        <span className="py-1">/</span>
                        <input
                          type="number"
                          value={unit.bathrooms}
                          onChange={(e) => updateUnitType(unit.id, 'bathrooms', Number(e.target.value))}
                          className="w-12 px-1 py-1 border border-gray-300 rounded text-sm text-center"
                          min="0"
                          max="5"
                          step="0.5"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="number"
                        value={unit.squareFootage}
                        onChange={(e) => updateUnitType(unit.id, 'squareFootage', Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        min="0"
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="number"
                        value={unit.units}
                        onChange={(e) => updateUnitType(unit.id, 'units', Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        min="0"
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-gray-500 mr-1">$</span>
                        <input
                          type="number"
                          value={unit.monthlyRent}
                          onChange={(e) => updateUnitType(unit.id, 'monthlyRent', Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                      {(unit.units * unit.squareFootage).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button
                        onClick={() => removeUnitType(unit.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Units:</span>
                <span className="ml-2 font-medium">{totalUnits}</span>
              </div>
              <div>
                <span className="text-gray-600">Total SF:</span>
                <span className="ml-2 font-medium">{totalSF.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-600">Avg Unit Size:</span>
                <span className="ml-2 font-medium">{avgSize.toLocaleString()} SF</span>
              </div>
              <div>
                <span className="text-gray-600">Avg Monthly Rent:</span>
                <span className="ml-2 font-medium">${Math.round(weightedAvgRent).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};