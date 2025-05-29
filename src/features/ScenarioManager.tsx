import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Save, Download, Upload, Copy, Trash2, Lock, Unlock,
  GitBranch, Clock, CheckCircle, AlertCircle, Search,
  Filter, MoreVertical, X, ChevronDown, Archive
} from 'lucide-react';

// ============= Type Definitions =============
export interface Scenario {
  id: string;
  projectId: string;
  name: string;
  description: string;
  version: number;
  createdAt: Date;
  modifiedAt: Date;
  createdBy: string;
  locked: boolean;
  archived: boolean;
  tags: string[];
  parentScenarioId?: string;
  data: ScenarioData;
  results?: CalculationResults;
  metadata: {
    assumptions?: string;
    notes?: string;
    attachments?: Attachment[];
  };
}

export interface ScenarioData {
  // Property Information
  propertyInfo: {
    name: string;
    address: string;
    propertyType: string;
    size: number;
    units?: number;
  };
  
  // Financial Inputs
  acquisition: {
    purchasePrice: number;
    closingCosts: number;
    dueDiligence: number;
  };
  
  financing: {
    loanAmount: number;
    interestRate: number;
    loanTerm: number;
    amortization: number;
  };
  
  revenue: {
    monthlyRent: number;
    otherIncome: number;
    vacancyRate: number;
    annualGrowth: number;
  };
  
  expenses: {
    operating: number;
    management: number;
    reserves: number;
    annualGrowth: number;
  };
  
  // Custom fields for different property types
  customFields?: Record<string, any>;
}

export interface CalculationResults {
  irr: number;
  npv: number;
  cashOnCash: number;
  equityMultiple: number;
  capRate: number;
  dscr: number;
  breakeven: number;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

interface ScenarioComparison {
  scenarios: Scenario[];
  differences: {
    field: string;
    values: (string | number)[];
    variance: number;
  }[];
}

// ============= IndexedDB Setup =============
class ScenarioDatabase {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'RealEstateProForma';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'scenarios';

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('projectId', 'projectId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('modifiedAt', 'modifiedAt', { unique: false });
          store.createIndex('archived', 'archived', { unique: false });
        }
      };
    });
  }

  async saveScenario(scenario: Scenario): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(scenario);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getScenario(id: string): Promise<Scenario | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getProjectScenarios(projectId: string): Promise<Scenario[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteScenario(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async searchScenarios(query: string, projectId?: string): Promise<Scenario[]> {
    if (!this.db) await this.init();
    
    const scenarios = projectId 
      ? await this.getProjectScenarios(projectId)
      : await this.getAllScenarios();
    
    const lowerQuery = query.toLowerCase();
    return scenarios.filter(s => 
      s.name.toLowerCase().includes(lowerQuery) ||
      s.description.toLowerCase().includes(lowerQuery) ||
      s.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  private async getAllScenarios(): Promise<Scenario[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
}

// ============= Utility Functions =============
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// ============= Components =============

// Scenario Card Component
const ScenarioCard: React.FC<{
  scenario: Scenario;
  isActive: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onArchive: () => void;
}> = ({ scenario, isActive, onSelect, onDuplicate, onDelete, onToggleLock, onArchive }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
        isActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      } ${scenario.archived ? 'opacity-60' : ''}`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900">{scenario.name}</h4>
            {scenario.locked && <Lock size={14} className="text-gray-500" />}
            {scenario.archived && <Archive size={14} className="text-gray-500" />}
          </div>
          <p className="text-xs text-gray-500">v{scenario.version}</p>
        </div>
        
        {/* Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <MoreVertical size={16} />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
              >
                <Copy size={14} /> Duplicate
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
              >
                {scenario.locked ? <Unlock size={14} /> : <Lock size={14} />}
                {scenario.locked ? 'Unlock' : 'Lock'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
              >
                <Archive size={14} /> {scenario.archived ? 'Unarchive' : 'Archive'}
              </button>
              <hr className="my-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {scenario.description && (
        <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
      )}

      {/* Metrics */}
      {scenario.results && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <p className="text-xs text-gray-500">IRR</p>
            <p className="font-semibold">{scenario.results.irr.toFixed(1)}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Cash/Cash</p>
            <p className="font-semibold">{scenario.results.cashOnCash.toFixed(1)}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Multiple</p>
            <p className="font-semibold">{scenario.results.equityMultiple.toFixed(2)}x</p>
          </div>
        </div>
      )}

      {/* Tags */}
      {scenario.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {scenario.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Modified {formatDate(new Date(scenario.modifiedAt))}</span>
        {scenario.parentScenarioId && (
          <span className="flex items-center gap-1">
            <GitBranch size={12} /> Variation
          </span>
        )}
      </div>
    </div>
  );
};

// Version History Component
const VersionHistory: React.FC<{
  scenario: Scenario;
  onRestore: (version: number) => void;
}> = ({ scenario, onRestore }) => {
  // Mock version history - in real app, this would be stored in DB
  const versions = [
    { version: scenario.version, date: scenario.modifiedAt, author: scenario.createdBy },
    { version: scenario.version - 1, date: new Date(Date.now() - 86400000), author: scenario.createdBy },
    { version: scenario.version - 2, date: new Date(Date.now() - 172800000), author: scenario.createdBy },
  ].filter(v => v.version > 0);

  return (
    <div className="space-y-2">
      {versions.map((v, idx) => (
        <div
          key={v.version}
          className="flex items-center justify-between p-3 bg-gray-50 rounded"
        >
          <div>
            <p className="font-medium">Version {v.version}</p>
            <p className="text-sm text-gray-600">
              {formatDate(new Date(v.date))} by {v.author}
            </p>
          </div>
          {idx > 0 && (
            <button
              onClick={() => onRestore(v.version)}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
            >
              Restore
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

// Comparison View Component
const ComparisonView: React.FC<{
  scenarios: Scenario[];
  onClose: () => void;
}> = ({ scenarios, onClose }) => {
  const differences = useMemo(() => {
    if (scenarios.length < 2) return [];

    const fields = [
      { path: 'data.acquisition.purchasePrice', label: 'Purchase Price', format: 'currency' },
      { path: 'data.financing.loanAmount', label: 'Loan Amount', format: 'currency' },
      { path: 'data.financing.interestRate', label: 'Interest Rate', format: 'percent' },
      { path: 'data.revenue.monthlyRent', label: 'Monthly Rent', format: 'currency' },
      { path: 'data.expenses.operating', label: 'Operating Expenses', format: 'currency' },
    ];

    return fields.map(field => {
      const values = scenarios.map(s => {
        const value = field.path.split('.').reduce((obj, key) => obj?.[key], s as any);
        return value || 0;
      });
      
      const min = Math.min(...values);
      const max = Math.max(...values);
      const variance = max - min;
      
      return {
        field: field.label,
        values,
        variance,
        format: field.format
      };
    });
  }, [scenarios]);

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'percent':
        return `${value.toFixed(2)}%`;
      default:
        return value.toString();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Scenario Comparison</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Metric</th>
                  {scenarios.map(s => (
                    <th key={s.id} className="text-right py-2 px-4">
                      {s.name}
                    </th>
                  ))}
                  <th className="text-right py-2 px-4">Variance</th>
                </tr>
              </thead>
              <tbody>
                {differences.map((diff, idx) => {
                  const maxValue = Math.max(...diff.values);
                  return (
                    <tr key={idx} className="border-b">
                      <td className="py-2 px-4">{diff.field}</td>
                      {diff.values.map((value, vidx) => (
                        <td
                          key={vidx}
                          className={`text-right py-2 px-4 ${
                            value === maxValue ? 'font-semibold text-green-600' : ''
                          }`}
                        >
                          {formatValue(value, (differences[idx] as any).format)}
                        </td>
                      ))}
                      <td className="text-right py-2 px-4 text-gray-600">
                        {formatValue(diff.variance, (differences[idx] as any).format)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Results Comparison */}
          {scenarios[0].results && (
            <div className="mt-6">
              <h3 className="font-semibold mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['irr', 'npv', 'cashOnCash', 'equityMultiple'].map(metric => {
                  const values = scenarios.map(s => s.results?.[metric as keyof CalculationResults] || 0);
                  const best = Math.max(...values);
                  
                  return (
                    <div key={metric} className="bg-gray-50 p-4 rounded">
                      <p className="text-sm text-gray-600 mb-2">
                        {metric === 'irr' ? 'IRR' :
                         metric === 'npv' ? 'NPV' :
                         metric === 'cashOnCash' ? 'Cash-on-Cash' :
                         'Equity Multiple'}
                      </p>
                      {scenarios.map((s, idx) => (
                        <div key={s.id} className="flex justify-between items-center mb-1">
                          <span className="text-xs">{s.name}:</span>
                          <span className={`text-sm font-medium ${
                            values[idx] === best ? 'text-green-600' : ''
                          }`}>
                            {metric === 'npv' ? `$${values[idx].toLocaleString()}` :
                             metric === 'equityMultiple' ? `${values[idx].toFixed(2)}x` :
                             `${values[idx].toFixed(1)}%`}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main ScenarioManager Component
export const ScenarioManager: React.FC<{
  projectId: string;
  currentScenario?: Scenario;
  onScenarioChange: (scenario: Scenario) => void;
  onScenarioUpdate: (scenario: Scenario) => void;
}> = ({ projectId, currentScenario, onScenarioChange, onScenarioUpdate }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [db] = useState(() => new ScenarioDatabase());

  // Load scenarios from IndexedDB
  useEffect(() => {
    loadScenarios();
  }, [projectId]);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      await db.init();
      const projectScenarios = await db.getProjectScenarios(projectId);
      setScenarios(projectScenarios);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save scenario to IndexedDB
  const saveScenario = async (scenario: Scenario) => {
    try {
      await db.saveScenario(scenario);
      await loadScenarios();
      onScenarioUpdate(scenario);
    } catch (error) {
      console.error('Failed to save scenario:', error);
    }
  };

  // Create new scenario
  const createScenario = async (baseOn?: Scenario) => {
    const newScenario: Scenario = {
      id: generateId(),
      projectId,
      name: `Scenario ${scenarios.length + 1}`,
      description: '',
      version: 1,
      createdAt: new Date(),
      modifiedAt: new Date(),
      createdBy: 'Current User',
      locked: false,
      archived: false,
      tags: [],
      parentScenarioId: baseOn?.id,
      data: baseOn ? { ...baseOn.data } : getDefaultScenarioData(),
      metadata: {}
    };

    await saveScenario(newScenario);
    onScenarioChange(newScenario);
  };

  // Duplicate scenario
  const duplicateScenario = async (scenario: Scenario) => {
    const duplicate: Scenario = {
      ...scenario,
      id: generateId(),
      name: `${scenario.name} (Copy)`,
      version: 1,
      createdAt: new Date(),
      modifiedAt: new Date(),
      parentScenarioId: scenario.id,
      locked: false
    };

    await saveScenario(duplicate);
  };

  // Delete scenario
  const deleteScenario = async (id: string) => {
    if (scenarios.length <= 1) {
      alert('Cannot delete the last scenario');
      return;
    }

    if (confirm('Are you sure you want to delete this scenario?')) {
      await db.deleteScenario(id);
      await loadScenarios();
      
      if (currentScenario?.id === id) {
        const remaining = scenarios.filter(s => s.id !== id);
        if (remaining.length > 0) {
          onScenarioChange(remaining[0]);
        }
      }
    }
  };

  // Toggle scenario lock
  const toggleLock = async (scenario: Scenario) => {
    const updated = { ...scenario, locked: !scenario.locked };
    await saveScenario(updated);
  };

  // Archive scenario
  const archiveScenario = async (scenario: Scenario) => {
    const updated = { ...scenario, archived: !scenario.archived };
    await saveScenario(updated);
  };

  // Export scenario
  const exportScenario = (scenario: Scenario) => {
    const dataStr = JSON.stringify(scenario, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${scenario.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Import scenario
  const importScenario = async (file: File) => {
    try {
      const text = await file.text();
      const imported = JSON.parse(text) as Scenario;
      
      const newScenario: Scenario = {
        ...imported,
        id: generateId(),
        projectId,
        createdAt: new Date(),
        modifiedAt: new Date(),
        version: 1
      };
      
      await saveScenario(newScenario);
    } catch (error) {
      alert('Failed to import scenario. Please check the file format.');
    }
  };

  // Filter scenarios
  const filteredScenarios = useMemo(() => {
    let filtered = scenarios;
    
    if (!showArchived) {
      filtered = filtered.filter(s => !s.archived);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return filtered.sort((a, b) => 
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    );
  }, [scenarios, showArchived, searchQuery]);

  // Toggle comparison selection
  const toggleComparisonSelection = (scenarioId: string) => {
    if (selectedForComparison.includes(scenarioId)) {
      setSelectedForComparison(selectedForComparison.filter(id => id !== scenarioId));
    } else if (selectedForComparison.length < 4) {
      setSelectedForComparison([...selectedForComparison, scenarioId]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading scenarios...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Scenario Manager</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage and compare different scenarios for your analysis
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createScenario(currentScenario)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
            >
              <Copy size={16} />
              New Scenario
            </button>
            <label className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-2 cursor-pointer">
              <Upload size={16} />
              Import
              <input
                type="file"
                accept=".json"
                onChange={(e) => e.target.files?.[0] && importScenario(e.target.files[0])}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search scenarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-2 rounded flex items-center gap-2 ${
              showArchived ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Archive size={16} />
            {showArchived ? 'Hide' : 'Show'} Archived
          </button>
          {selectedForComparison.length >= 2 && (
            <button
              onClick={() => setShowComparison(true)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
            >
              <GitBranch size={16} />
              Compare ({selectedForComparison.length})
            </button>
          )}
        </div>
      </div>

      {/* Scenarios Grid */}
      <div className="p-6">
        {filteredScenarios.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? 'No scenarios match your search' : 'No scenarios yet. Create your first scenario to get started.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScenarios.map(scenario => (
              <div key={scenario.id} className="relative">
                {selectedForComparison.length > 0 && (
                  <input
                    type="checkbox"
                    checked={selectedForComparison.includes(scenario.id)}
                    onChange={() => toggleComparisonSelection(scenario.id)}
                    className="absolute top-2 left-2 z-10"
                  />
                )}
                <ScenarioCard
                  scenario={scenario}
                  isActive={currentScenario?.id === scenario.id}
                  onSelect={() => onScenarioChange(scenario)}
                  onDuplicate={() => duplicateScenario(scenario)}
                  onDelete={() => deleteScenario(scenario.id)}
                  onToggleLock={() => toggleLock(scenario)}
                  onArchive={() => archiveScenario(scenario)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comparison View */}
      {showComparison && selectedForComparison.length >= 2 && (
        <ComparisonView
          scenarios={scenarios.filter(s => selectedForComparison.includes(s.id))}
          onClose={() => {
            setShowComparison(false);
            setSelectedForComparison([]);
          }}
        />
      )}

      {/* Version History Modal */}
      {showVersionHistory && currentScenario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Version History</h3>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <VersionHistory
              scenario={currentScenario}
              onRestore={(version) => {
                console.log('Restore to version:', version);
                setShowVersionHistory(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Quick Actions Bar */}
      {currentScenario && (
        <div className="px-6 py-3 bg-gray-50 border-t flex justify-between items-center">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock size={14} />
              Last saved {formatDate(new Date(currentScenario.modifiedAt))}
            </span>
            <span>Version {currentScenario.version}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowVersionHistory(true)}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              History
            </button>
            <button
              onClick={() => exportScenario(currentScenario)}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center gap-1"
            >
              <Download size={14} /> Export
            </button>
            <button
              onClick={() => saveScenario({ ...currentScenario, version: currentScenario.version + 1 })}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
            >
              <Save size={14} /> Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get default scenario data
function getDefaultScenarioData(): ScenarioData {
  return {
    propertyInfo: {
      name: '',
      address: '',
      propertyType: 'multifamily',
      size: 0,
      units: 0
    },
    acquisition: {
      purchasePrice: 0,
      closingCosts: 0,
      dueDiligence: 0
    },
    financing: {
      loanAmount: 0,
      interestRate: 5.5,
      loanTerm: 30,
      amortization: 30
    },
    revenue: {
      monthlyRent: 0,
      otherIncome: 0,
      vacancyRate: 5,
      annualGrowth: 3
    },
    expenses: {
      operating: 0,
      management: 0,
      reserves: 0,
      annualGrowth: 3
    }
  };
}

export default ScenarioManager;