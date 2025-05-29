import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Save, Download, Upload, Copy, Trash2, Lock, Unlock,
  GitBranch, Clock, CheckCircle, AlertCircle, Search,
  Filter, MoreVertical, X, ChevronDown, Archive, Eye, EyeOff,
  Check, Edit2
} from 'lucide-react';

// ============= TypeScript Interfaces =============
export interface Project {
  id: string;
  name: string;
  description: string;
  propertyType: 'office' | 'retail' | 'multifamily' | 'mixed-use' | 'industrial' | 'hospitality';
  address: string;
  createdAt: Date;
  modifiedAt: Date;
  createdBy: string;
  tags: string[];
  scenarios: string[]; // Array of scenario IDs
  activeScenarioId?: string;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  currency: string;
  units: 'imperial' | 'metric';
  fiscalYearStart: number;
  defaultAssumptions: {
    inflationRate: number;
    discountRate: number;
    taxRate: number;
  };
}

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
  metadata: ScenarioMetadata;
}

export interface ScenarioMetadata {
  assumptions?: string;
  notes?: string;
  attachments?: Attachment[];
  changeLog?: ChangeLogEntry[];
  approvals?: Approval[];
}

export interface ChangeLogEntry {
  timestamp: Date;
  user: string;
  field: string;
  oldValue: any;
  newValue: any;
  reason?: string;
}

export interface Approval {
  id: string;
  approver: string;
  status: 'pending' | 'approved' | 'rejected';
  date?: Date;
  comments?: string;
}

export interface ScenarioData {
  // Property Information
  propertyInfo: {
    name: string;
    address: string;
    propertyType: string;
    grossArea: number;
    netRentableArea: number;
    units?: number;
    parkingSpaces?: number;
    yearBuilt?: number;
  };
  
  // Acquisition
  acquisition: {
    purchasePrice: number;
    closingCosts: number;
    dueDiligence: number;
    brokerFees: number;
    renovationCosts: number;
    acquisitionDate: Date;
  };
  
  // Financing
  financing: {
    loans: Loan[];
    equityRequirement: number;
    preferredReturn?: number;
  };
  
  // Revenue
  revenue: {
    rental: RentalIncome[];
    other: OtherIncome[];
    escalations: Escalation[];
  };
  
  // Expenses
  expenses: {
    operating: OperatingExpense[];
    capital: CapitalExpense[];
  };
  
  // Exit Strategy
  exit: {
    holdPeriod: number;
    exitCapRate: number;
    sellingCosts: number;
    terminal: {
      method: 'capRate' | 'multiple' | 'custom';
      value: number;
    };
  };
}

export interface Loan {
  id: string;
  name: string;
  amount: number;
  interestRate: number;
  term: number;
  amortization: number;
  type: 'fixed' | 'variable' | 'construction' | 'bridge';
  startDate: Date;
  prepaymentPenalty?: number;
}

export interface RentalIncome {
  id: string;
  unit: string;
  tenant?: string;
  area: number;
  monthlyRent: number;
  escalation: number;
  leaseStart: Date;
  leaseEnd: Date;
  vacancyRate: number;
}

export interface OtherIncome {
  id: string;
  name: string;
  type: 'parking' | 'laundry' | 'billboard' | 'cell-tower' | 'other';
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'annual';
  escalation: number;
}

export interface Escalation {
  id: string;
  name: string;
  rate: number;
  frequency: number;
  compounding: boolean;
}

export interface OperatingExpense {
  id: string;
  category: string;
  description: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'annual';
  escalation: number;
  recoverable: boolean;
  recoveryRate?: number;
}

export interface CapitalExpense {
  id: string;
  description: string;
  amount: number;
  year: number;
  category: 'maintenance' | 'improvement' | 'replacement';
}

export interface CalculationResults {
  irr: number;
  leveragedIRR: number;
  npv: number;
  cashOnCash: number;
  equityMultiple: number;
  capRate: number;
  yieldOnCost: number;
  dscr: number[];
  cashFlows: CashFlow[];
  sensitivityAnalysis?: SensitivityResult[];
}

export interface CashFlow {
  year: number;
  revenue: number;
  expenses: number;
  noi: number;
  debtService: number;
  cashFlow: number;
  cumulativeCashFlow: number;
}

export interface SensitivityResult {
  variable: string;
  baseCase: number;
  results: { change: number; irr: number; npv: number }[];
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

// ============= IndexedDB Database Class =============
class ScenarioDatabase {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'RealEstateProFormaV2';
  private readonly DB_VERSION = 1;
  private readonly SCENARIOS_STORE = 'scenarios';
  private readonly PROJECTS_STORE = 'projects';

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
        
        // Create scenarios store
        if (!db.objectStoreNames.contains(this.SCENARIOS_STORE)) {
          const scenarioStore = db.createObjectStore(this.SCENARIOS_STORE, { keyPath: 'id' });
          scenarioStore.createIndex('projectId', 'projectId', { unique: false });
          scenarioStore.createIndex('createdAt', 'createdAt', { unique: false });
          scenarioStore.createIndex('modifiedAt', 'modifiedAt', { unique: false });
          scenarioStore.createIndex('archived', 'archived', { unique: false });
          scenarioStore.createIndex('locked', 'locked', { unique: false });
        }
        
        // Create projects store
        if (!db.objectStoreNames.contains(this.PROJECTS_STORE)) {
          const projectStore = db.createObjectStore(this.PROJECTS_STORE, { keyPath: 'id' });
          projectStore.createIndex('createdAt', 'createdAt', { unique: false });
          projectStore.createIndex('propertyType', 'propertyType', { unique: false });
        }
      };
    });
  }

  // Project operations
  async saveProject(project: Project): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.PROJECTS_STORE], 'readwrite');
      const store = transaction.objectStore(this.PROJECTS_STORE);
      const request = store.put(project);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getProject(id: string): Promise<Project | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.PROJECTS_STORE], 'readonly');
      const store = transaction.objectStore(this.PROJECTS_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllProjects(): Promise<Project[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.PROJECTS_STORE], 'readonly');
      const store = transaction.objectStore(this.PROJECTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Scenario operations
  async saveScenario(scenario: Scenario): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.SCENARIOS_STORE], 'readwrite');
      const store = transaction.objectStore(this.SCENARIOS_STORE);
      const request = store.put(scenario);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getScenario(id: string): Promise<Scenario | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.SCENARIOS_STORE], 'readonly');
      const store = transaction.objectStore(this.SCENARIOS_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getProjectScenarios(projectId: string): Promise<Scenario[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.SCENARIOS_STORE], 'readonly');
      const store = transaction.objectStore(this.SCENARIOS_STORE);
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteScenario(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.SCENARIOS_STORE], 'readwrite');
      const store = transaction.objectStore(this.SCENARIOS_STORE);
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
      const transaction = this.db!.transaction([this.SCENARIOS_STORE], 'readonly');
      const store = transaction.objectStore(this.SCENARIOS_STORE);
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

const formatCurrency = (value: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(2)}%`;
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
  onExport: () => void;
  onUpdateName?: (newName: string) => void;
}> = ({ scenario, isActive, onSelect, onDuplicate, onDelete, onToggleLock, onArchive, onExport, onUpdateName }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(scenario.name);

  const handleSaveName = () => {
    if (editName.trim() && editName !== scenario.name && onUpdateName) {
      onUpdateName(editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(scenario.name);
    setIsEditing(false);
  };

  return (
    <div
      className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
        isActive
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm'
      } ${scenario.archived ? 'opacity-60' : ''}`}
      onClick={onSelect}
    >
      {/* Status Icons */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {scenario.locked && (
          <div className="p-1 bg-gray-100 rounded" title="Locked">
            <Lock size={14} className="text-gray-600" />
          </div>
        )}
        {scenario.archived && (
          <div className="p-1 bg-gray-100 rounded" title="Archived">
            <Archive size={14} className="text-gray-600" />
          </div>
        )}
        {scenario.parentScenarioId && (
          <div className="p-1 bg-blue-100 rounded" title="Variation">
            <GitBranch size={14} className="text-blue-600" />
          </div>
        )}
      </div>

      {/* Header */}
      <div className="pr-12">
        {isEditing ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              className="font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <button
              onClick={handleSaveName}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
              title="Save"
            >
              <Check size={16} />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              title="Cancel"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <h4 className="font-semibold text-gray-900">{scenario.name}</h4>
            {!scenario.locked && onUpdateName && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-opacity"
                title="Edit name"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-1">
          v{scenario.version} • {formatDate(new Date(scenario.modifiedAt))}
        </p>
      </div>

      {/* Description */}
      {scenario.description && (
        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{scenario.description}</p>
      )}

      {/* Metrics */}
      {scenario.results && (
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
          <div className="text-center">
            <p className="text-xs text-gray-500">IRR</p>
            <p className="font-semibold text-sm">{formatPercent(scenario.results.irr)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">NPV</p>
            <p className="font-semibold text-sm">{formatCurrency(scenario.results.npv)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Multiple</p>
            <p className="font-semibold text-sm">{scenario.results.equityMultiple.toFixed(2)}x</p>
          </div>
        </div>
      )}

      {/* Tags */}
      {scenario.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {scenario.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
          {scenario.tags.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{scenario.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Menu Button */}
      <div className="absolute bottom-4 right-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <MoreVertical size={16} />
        </button>
        
        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 bottom-8 w-48 bg-white rounded-lg shadow-lg border z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              <Copy size={14} /> Duplicate
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleLock();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
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
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              <Archive size={14} /> {scenario.archived ? 'Unarchive' : 'Archive'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExport();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              <Download size={14} /> Export
            </button>
            <hr className="my-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2 text-sm"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Comparison View Component
const ComparisonView: React.FC<{
  scenarios: Scenario[];
  onClose: () => void;
}> = ({ scenarios, onClose }) => {
  const metrics = useMemo(() => {
    if (scenarios.length < 2) return [];

    const fields = [
      { path: 'data.acquisition.purchasePrice', label: 'Purchase Price', format: 'currency' },
      { path: 'data.financing.loans[0].amount', label: 'Loan Amount', format: 'currency' },
      { path: 'data.financing.loans[0].interestRate', label: 'Interest Rate', format: 'percent' },
      { path: 'results.irr', label: 'IRR', format: 'percent' },
      { path: 'results.npv', label: 'NPV', format: 'currency' },
      { path: 'results.equityMultiple', label: 'Equity Multiple', format: 'multiple' },
      { path: 'results.capRate', label: 'Cap Rate', format: 'percent' },
    ];

    return fields.map(field => {
      const values = scenarios.map(s => {
        const keys = field.path.split('.');
        let value: any = s;
        for (const key of keys) {
          if (key.includes('[')) {
            const [arrayKey, index] = key.replace(']', '').split('[');
            value = value?.[arrayKey]?.[parseInt(index)];
          } else {
            value = value?.[key];
          }
        }
        return value || 0;
      });
      
      return {
        field: field.label,
        values,
        format: field.format
      };
    });
  }, [scenarios]);

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percent':
        return formatPercent(value);
      case 'multiple':
        return `${value.toFixed(2)}x`;
      default:
        return value.toString();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Scenario Comparison</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Metric</th>
                  {scenarios.map(s => (
                    <th key={s.id} className="text-right py-3 px-4 font-medium">
                      <div>
                        <div>{s.name}</div>
                        <div className="text-xs font-normal text-gray-500">v{s.version}</div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric, idx) => {
                  const maxValue = Math.max(...metric.values);
                  const minValue = Math.min(...metric.values);
                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{metric.field}</td>
                      {metric.values.map((value, vidx) => (
                        <td
                          key={vidx}
                          className={`text-right py-3 px-4 ${
                            value === maxValue && maxValue !== minValue
                              ? 'font-semibold text-green-600' 
                              : value === minValue && maxValue !== minValue
                              ? 'text-red-600'
                              : ''
                          }`}
                        >
                          {formatValue(value, metric.format)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main ScenarioManager Component
export const ScenarioManager: React.FC<{
  project: Project;
  currentScenario?: Scenario;
  onScenarioChange: (scenario: Scenario) => void;
  onScenarioUpdate: (scenario: Scenario) => void;
  className?: string;
}> = ({ project, currentScenario, onScenarioChange, onScenarioUpdate, className = '' }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [db] = useState(() => new ScenarioDatabase());

  // Load scenarios
  useEffect(() => {
    loadScenarios();
  }, [project.id]);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      await db.init();
      const projectScenarios = await db.getProjectScenarios(project.id);
      setScenarios(projectScenarios);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save scenario
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
      projectId: project.id,
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
      data: baseOn ? JSON.parse(JSON.stringify(baseOn.data)) : getDefaultScenarioData(),
      metadata: {
        changeLog: [{
          timestamp: new Date(),
          user: 'Current User',
          field: 'scenario',
          oldValue: null,
          newValue: 'created',
          reason: baseOn ? `Duplicated from ${baseOn.name}` : 'New scenario'
        }]
      }
    };

    await saveScenario(newScenario);
    onScenarioChange(newScenario);
  };

  // Duplicate scenario
  const duplicateScenario = async (scenario: Scenario) => {
    await createScenario(scenario);
  };

  // Delete scenario
  const deleteScenario = async (id: string) => {
    if (scenarios.length <= 1) {
      alert('Cannot delete the last scenario');
      return;
    }

    if (confirm('Are you sure you want to delete this scenario? This action cannot be undone.')) {
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

  // Toggle lock
  const toggleLock = async (scenario: Scenario) => {
    const updated = { 
      ...scenario, 
      locked: !scenario.locked,
      modifiedAt: new Date(),
      metadata: {
        ...scenario.metadata,
        changeLog: [
          ...(scenario.metadata.changeLog || []),
          {
            timestamp: new Date(),
            user: 'Current User',
            field: 'locked',
            oldValue: scenario.locked,
            newValue: !scenario.locked
          }
        ]
      }
    };
    await saveScenario(updated);
  };

  // Archive scenario
  const archiveScenario = async (scenario: Scenario) => {
    const updated = { 
      ...scenario, 
      archived: !scenario.archived,
      modifiedAt: new Date()
    };
    await saveScenario(updated);
  };

  // Update scenario name
  const updateScenarioName = async (scenario: Scenario, newName: string) => {
    const updated = {
      ...scenario,
      name: newName,
      modifiedAt: new Date(),
      metadata: {
        ...scenario.metadata,
        changeLog: [
          ...(scenario.metadata.changeLog || []),
          {
            timestamp: new Date(),
            user: 'Current User',
            field: 'name',
            oldValue: scenario.name,
            newValue: newName,
            reason: 'Name updated'
          }
        ]
      }
    };
    await saveScenario(updated);
  };

  // Export scenario
  const exportScenario = (scenario: Scenario) => {
    const exportData = {
      ...scenario,
      exportDate: new Date(),
      projectInfo: {
        name: project.name,
        propertyType: project.propertyType
      }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const fileName = `${scenario.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
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
        projectId: project.id,
        createdAt: new Date(),
        modifiedAt: new Date(),
        version: 1,
        parentScenarioId: undefined,
        metadata: {
          ...imported.metadata,
          changeLog: [
            ...(imported.metadata.changeLog || []),
            {
              timestamp: new Date(),
              user: 'Current User',
              field: 'scenario',
              oldValue: null,
              newValue: 'imported',
              reason: `Imported from ${file.name}`
            }
          ]
        }
      };
      
      await saveScenario(newScenario);
      setShowImport(false);
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

  // Toggle comparison
  const toggleComparisonSelection = (scenarioId: string) => {
    if (selectedForComparison.includes(scenarioId)) {
      setSelectedForComparison(selectedForComparison.filter(id => id !== scenarioId));
    } else if (selectedForComparison.length < 4) {
      setSelectedForComparison([...selectedForComparison, scenarioId]);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-gray-500">Loading scenarios...</div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Scenario Manager</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage and compare different scenarios for {project.name}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createScenario()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <Copy size={16} />
              New Scenario
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors"
            >
              <Upload size={16} />
              Import
            </button>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              showArchived 
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showArchived ? <Eye size={16} /> : <EyeOff size={16} />}
            {showArchived ? 'Hide' : 'Show'} Archived
          </button>
          {selectedForComparison.length >= 2 && (
            <button
              onClick={() => setShowComparison(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
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
            {searchQuery 
              ? 'No scenarios match your search' 
              : 'No scenarios yet. Create your first scenario to get started.'}
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
                    onClick={(e) => e.stopPropagation()}
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
                  onExport={() => exportScenario(scenario)}
                  onUpdateName={(newName) => updateScenarioName(scenario, newName)}
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

      {/* Import Dialog */}
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Import Scenario</h3>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                <label className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700">Choose a file</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => e.target.files?.[0] && importScenario(e.target.files[0])}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-2">or drag and drop</p>
                <p className="text-xs text-gray-400 mt-2">JSON files only</p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowImport(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
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
      grossArea: 0,
      netRentableArea: 0,
      units: 0,
      parkingSpaces: 0
    },
    acquisition: {
      purchasePrice: 0,
      closingCosts: 0,
      dueDiligence: 0,
      brokerFees: 0,
      renovationCosts: 0,
      acquisitionDate: new Date()
    },
    financing: {
      loans: [],
      equityRequirement: 0,
      preferredReturn: 8
    },
    revenue: {
      rental: [],
      other: [],
      escalations: []
    },
    expenses: {
      operating: [],
      capital: []
    },
    exit: {
      holdPeriod: 5,
      exitCapRate: 5.5,
      sellingCosts: 2,
      terminal: {
        method: 'capRate',
        value: 5.5
      }
    }
  };
}

export default ScenarioManager;