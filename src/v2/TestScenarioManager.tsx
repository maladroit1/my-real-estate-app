import React, { useState, useEffect } from 'react';
import { ScenarioManager, Project, Scenario } from './features/ScenarioManager';
import { Building2, Home, ShoppingBag, Briefcase, Factory, Hotel } from 'lucide-react';

// Mock data generator
const generateMockProject = (): Project => {
  return {
    id: 'project-001',
    name: 'Downtown Mixed-Use Development',
    description: 'A 250,000 sq ft mixed-use development featuring retail, office, and residential components',
    propertyType: 'mixed-use',
    address: '123 Main Street, Downtown City, ST 12345',
    createdAt: new Date('2024-01-15'),
    modifiedAt: new Date(),
    createdBy: 'John Developer',
    tags: ['downtown', 'mixed-use', 'tif-eligible', 'opportunity-zone'],
    scenarios: [],
    activeScenarioId: undefined,
    settings: {
      currency: 'USD',
      units: 'imperial',
      fiscalYearStart: 1,
      defaultAssumptions: {
        inflationRate: 3.0,
        discountRate: 8.0,
        taxRate: 25.0
      }
    }
  };
};

const generateMockScenario = (projectId: string, index: number): Scenario => {
  const scenarios = [
    {
      name: 'Base Case',
      description: 'Conservative assumptions with market rents and standard financing',
      tags: ['conservative', 'base'],
      results: {
        irr: 15.2,
        leveragedIRR: 18.5,
        npv: 12500000,
        cashOnCash: 8.5,
        equityMultiple: 2.1,
        capRate: 6.5,
        yieldOnCost: 7.2,
        dscr: [1.25, 1.28, 1.32, 1.35, 1.38],
        cashFlows: []
      }
    },
    {
      name: 'Optimistic Case',
      description: 'Aggressive rent growth and lower vacancy assumptions',
      tags: ['optimistic', 'growth'],
      results: {
        irr: 22.5,
        leveragedIRR: 28.3,
        npv: 18750000,
        cashOnCash: 12.3,
        equityMultiple: 2.8,
        capRate: 7.2,
        yieldOnCost: 8.5,
        dscr: [1.35, 1.42, 1.48, 1.55, 1.62],
        cashFlows: []
      }
    },
    {
      name: 'Downside Case',
      description: 'Stress test with recession scenario and higher vacancies',
      tags: ['downside', 'stress-test'],
      results: {
        irr: 8.5,
        leveragedIRR: 10.2,
        npv: 3500000,
        cashOnCash: 4.2,
        equityMultiple: 1.5,
        capRate: 5.8,
        yieldOnCost: 6.0,
        dscr: [1.05, 1.08, 1.10, 1.12, 1.15],
        cashFlows: []
      }
    },
    {
      name: 'TIF Financing Scenario',
      description: 'Includes tax increment financing and public incentives',
      tags: ['tif', 'public-financing', 'incentives'],
      results: {
        irr: 25.8,
        leveragedIRR: 32.5,
        npv: 22000000,
        cashOnCash: 15.2,
        equityMultiple: 3.2,
        capRate: 6.8,
        yieldOnCost: 9.2,
        dscr: [1.45, 1.52, 1.58, 1.65, 1.72],
        cashFlows: []
      }
    }
  ];

  const scenario = scenarios[index % scenarios.length];

  return {
    id: `scenario-00${index + 1}`,
    projectId,
    name: scenario.name,
    description: scenario.description,
    version: 1,
    createdAt: new Date(Date.now() - (scenarios.length - index) * 86400000),
    modifiedAt: new Date(Date.now() - (scenarios.length - index) * 3600000),
    createdBy: 'John Developer',
    locked: index === 0, // Lock the first scenario
    archived: false,
    tags: scenario.tags,
    parentScenarioId: index > 0 ? 'scenario-001' : undefined,
    results: scenario.results,
    data: {
      propertyInfo: {
        name: 'Downtown Mixed-Use',
        address: '123 Main Street',
        propertyType: 'mixed-use',
        grossArea: 250000,
        netRentableArea: 225000,
        units: 150,
        parkingSpaces: 300,
        yearBuilt: 2025
      },
      acquisition: {
        purchasePrice: 45000000,
        closingCosts: 900000,
        dueDiligence: 150000,
        brokerFees: 450000,
        renovationCosts: 5000000,
        acquisitionDate: new Date('2024-06-01')
      },
      financing: {
        loans: [{
          id: 'loan-001',
          name: 'Senior Construction Loan',
          amount: 35000000,
          interestRate: index === 3 ? 4.5 : 6.5, // Lower rate for TIF scenario
          term: 3,
          amortization: 25,
          type: 'construction',
          startDate: new Date('2024-06-01')
        }],
        equityRequirement: 16500000,
        preferredReturn: 8
      },
      revenue: {
        rental: [
          {
            id: 'rental-001',
            unit: 'Retail Space',
            area: 25000,
            monthlyRent: 35,
            escalation: 3,
            leaseStart: new Date('2025-01-01'),
            leaseEnd: new Date('2035-01-01'),
            vacancyRate: index === 2 ? 15 : 5
          },
          {
            id: 'rental-002',
            unit: 'Office Space',
            area: 100000,
            monthlyRent: 28,
            escalation: 3,
            leaseStart: new Date('2025-01-01'),
            leaseEnd: new Date('2035-01-01'),
            vacancyRate: index === 2 ? 20 : 10
          },
          {
            id: 'rental-003',
            unit: 'Residential Units',
            area: 100000,
            monthlyRent: 2.50,
            escalation: index === 1 ? 5 : 3,
            leaseStart: new Date('2025-01-01'),
            leaseEnd: new Date('2026-01-01'),
            vacancyRate: index === 2 ? 10 : 5
          }
        ],
        other: [
          {
            id: 'other-001',
            name: 'Parking Revenue',
            type: 'parking',
            amount: 50000,
            frequency: 'monthly',
            escalation: 2
          }
        ],
        escalations: []
      },
      expenses: {
        operating: [
          {
            id: 'opex-001',
            category: 'Property Management',
            description: 'Management fees',
            amount: 150000,
            frequency: 'annual',
            escalation: 3,
            recoverable: false
          },
          {
            id: 'opex-002',
            category: 'Utilities',
            description: 'Common area utilities',
            amount: 300000,
            frequency: 'annual',
            escalation: 3,
            recoverable: true,
            recoveryRate: 85
          }
        ],
        capital: [
          {
            id: 'capex-001',
            description: 'Roof Replacement',
            amount: 500000,
            year: 5,
            category: 'replacement'
          }
        ]
      },
      exit: {
        holdPeriod: 7,
        exitCapRate: 6.0,
        sellingCosts: 2,
        terminal: {
          method: 'capRate',
          value: 6.0
        }
      }
    },
    metadata: {
      assumptions: 'Market assumptions based on Q4 2023 research',
      notes: 'This scenario assumes ' + scenario.description.toLowerCase(),
      changeLog: [
        {
          timestamp: new Date(),
          user: 'John Developer',
          field: 'scenario',
          oldValue: null,
          newValue: 'created',
          reason: 'Initial scenario creation'
        }
      ]
    }
  };
};

// Test Harness Component
const TestScenarioManager: React.FC = () => {
  const [project, setProject] = useState<Project>(generateMockProject());
  const [currentScenario, setCurrentScenario] = useState<Scenario | undefined>();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  // Initialize with mock scenarios
  useEffect(() => {
    const mockScenarios = [
      generateMockScenario(project.id, 0),
      generateMockScenario(project.id, 1),
      generateMockScenario(project.id, 2),
      generateMockScenario(project.id, 3)
    ];
    setScenarios(mockScenarios);
    setCurrentScenario(mockScenarios[0]);
  }, [project.id]);

  const handleScenarioChange = (scenario: Scenario) => {
    console.log('Scenario changed:', scenario);
    setCurrentScenario(scenario);
  };

  const handleScenarioUpdate = (scenario: Scenario) => {
    console.log('Scenario updated:', scenario);
    setScenarios(prev => prev.map(s => s.id === scenario.id ? scenario : s));
    if (currentScenario?.id === scenario.id) {
      setCurrentScenario(scenario);
    }
  };

  const propertyTypeIcons = {
    'office': <Building2 className="h-5 w-5" />,
    'retail': <ShoppingBag className="h-5 w-5" />,
    'multifamily': <Home className="h-5 w-5" />,
    'mixed-use': <Briefcase className="h-5 w-5" />,
    'industrial': <Factory className="h-5 w-5" />,
    'hospitality': <Hotel className="h-5 w-5" />
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Scenario Manager Test</h1>
              <p className="text-sm text-gray-600">Testing scenario management functionality</p>
            </div>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              {showDebug ? 'Hide' : 'Show'} Debug Info
            </button>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                {propertyTypeIcons[project.propertyType]}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{project.name}</h2>
                <p className="text-gray-600 mt-1">{project.description}</p>
                <p className="text-sm text-gray-500 mt-2">{project.address}</p>
                <div className="flex gap-2 mt-3">
                  {project.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Created by</p>
              <p className="font-medium">{project.createdBy}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Current Scenario Info */}
        {currentScenario && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Current Scenario</h3>
                <p className="text-blue-700">{currentScenario.name} (v{currentScenario.version})</p>
                <p className="text-sm text-blue-600 mt-1">{currentScenario.description}</p>
              </div>
              {currentScenario.results && (
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-sm text-blue-600">IRR</p>
                    <p className="text-xl font-bold text-blue-900">{currentScenario.results.irr.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-blue-600">NPV</p>
                    <p className="text-xl font-bold text-blue-900">${(currentScenario.results.npv / 1000000).toFixed(1)}M</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-blue-600">Multiple</p>
                    <p className="text-xl font-bold text-blue-900">{currentScenario.results.equityMultiple.toFixed(1)}x</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scenario Manager */}
        <ScenarioManager
          project={project}
          currentScenario={currentScenario}
          onScenarioChange={handleScenarioChange}
          onScenarioUpdate={handleScenarioUpdate}
        />

        {/* Debug Info */}
        {showDebug && (
          <div className="mt-6 bg-gray-900 text-gray-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Debug Information</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-300 mb-2">Project State</h4>
                <pre className="text-xs overflow-auto bg-gray-800 p-4 rounded">
                  {JSON.stringify(project, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-medium text-gray-300 mb-2">Current Scenario</h4>
                <pre className="text-xs overflow-auto bg-gray-800 p-4 rounded">
                  {JSON.stringify(currentScenario, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-medium text-gray-300 mb-2">All Scenarios ({scenarios.length})</h4>
                <div className="space-y-2">
                  {scenarios.map(s => (
                    <div key={s.id} className="bg-gray-800 p-2 rounded">
                      <p className="text-sm">
                        {s.name} - v{s.version} - {s.locked ? 'Locked' : 'Unlocked'} - {s.archived ? 'Archived' : 'Active'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Actions */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Test Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => {
                const newScenario = generateMockScenario(project.id, scenarios.length);
                console.log('Creating new scenario:', newScenario);
                alert('Check console for new scenario data');
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Test Create
            </button>
            <button
              onClick={() => {
                if (currentScenario) {
                  console.log('Duplicating scenario:', currentScenario);
                  alert('Check console for duplication data');
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Test Duplicate
            </button>
            <button
              onClick={() => {
                if (currentScenario) {
                  console.log('Locking/Unlocking scenario:', currentScenario);
                  alert(`Scenario would be ${currentScenario.locked ? 'unlocked' : 'locked'}`);
                }
              }}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Test Lock Toggle
            </button>
            <button
              onClick={() => {
                if (currentScenario && scenarios.length > 1) {
                  console.log('Deleting scenario:', currentScenario);
                  alert('Check console for deletion data');
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Test Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestScenarioManager;