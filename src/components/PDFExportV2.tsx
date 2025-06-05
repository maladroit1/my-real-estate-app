import React, { useState } from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFViewer,
  PDFDownloadLink,
  Font,
  Svg,
  Path,
  Line,
  Rect,
} from '@react-pdf/renderer';
import { Download, FileText, X } from 'lucide-react';

// TypeScript Types
export interface PDFConfig {
  projectName: string;
  propertyType: string;
  date: string;
  preparedBy?: string;
  companyLogo?: string;
}

export interface ReportSections {
  executiveSummary: boolean;
  keyMetrics: boolean;
  cashFlowProjections: boolean;
  sensitivityAnalysis: boolean;
  sourcesAndUses: boolean;
  returnAnalysis: boolean;
  assumptions: boolean;
  risks: boolean;
}

export interface ChartData {
  cashFlowData: Array<{
    year: number;
    noi: number;
    cashFlow: number;
    cumulativeCashFlow: number;
  }>;
  sensitivityData: Array<{
    variable: string;
    values: Array<{ change: number; irr: number }>;
  }>;
  sourcesUsesData: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
}

export interface ProFormaData {
  // Key Metrics
  totalCost: number;
  equityRequired: number;
  irr: string;
  equityMultiple: string;
  avgCashOnCash: string;
  yieldOnCost: string;
  developmentSpread: string;
  
  // Property Details
  siteArea: number;
  buildingGFA: number;
  units?: number;
  parkingSpaces: number;
  
  // Financial Details
  landCost: number;
  hardCosts: number;
  softCosts: number;
  developerFee: number;
  constructionLoanAmount: number;
  permanentLoanAmount: number;
  lpEquity: number;
  gpEquity: number;
  
  // Operating Assumptions
  rentPSF?: number;
  avgUnitRent?: number;
  vacancy: number;
  opex: number;
  capRate: number;
  holdPeriod: number;
  
  // Cottonwood Heights Specific
  cottonwoodHeights?: {
    commercialNOI: number;
    marketRateNOI: number;
    tifRevenue: number;
    crossSubsidy: number;
  };
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
  },
  coverPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
    textAlign: 'center',
    color: '#666666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    paddingBottom: 5,
  },
  subsectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333333',
  },
  text: {
    fontSize: 10,
    marginBottom: 5,
    color: '#4a4a4a',
  },
  boldText: {
    fontWeight: 'bold',
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableCell: {
    flex: 1,
    padding: 8,
    fontSize: 9,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 8,
    fontSize: 9,
    fontWeight: 'bold',
  },
  metricCard: {
    backgroundColor: '#f8fafc',
    padding: 15,
    marginBottom: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  chartContainer: {
    marginTop: 10,
    marginBottom: 10,
    height: 200,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
  },
  disclaimer: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 20,
    fontStyle: 'italic',
  },
});

// Format currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format percentage
const formatPercent = (value: string | number): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return `${numValue.toFixed(2)}%`;
};

// Simple Chart Component for Cash Flow
const CashFlowChart: React.FC<{ data: ChartData['cashFlowData'] }> = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  const maxValue = Math.max(...data.map(d => Math.max(d.noi, d.cashFlow)));
  const chartWidth = 500;
  const chartHeight = 150;
  const barWidth = chartWidth / (data.length * 2);
  
  return (
    <View style={styles.chartContainer}>
      <Svg width={chartWidth} height={chartHeight}>
        {data.map((item, index) => {
          const noiHeight = (item.noi / maxValue) * (chartHeight - 20);
          const cashFlowHeight = (item.cashFlow / maxValue) * (chartHeight - 20);
          const x = index * barWidth * 2;
          
          return (
            <React.Fragment key={index}>
              {/* NOI Bar */}
              <Path
                d={`M ${x + 10} ${chartHeight - noiHeight} 
                    L ${x + 10} ${chartHeight} 
                    L ${x + barWidth - 5} ${chartHeight} 
                    L ${x + barWidth - 5} ${chartHeight - noiHeight} Z`}
                fill="#10B981"
              />
              {/* Cash Flow Bar */}
              <Path
                d={`M ${x + barWidth + 5} ${chartHeight - cashFlowHeight} 
                    L ${x + barWidth + 5} ${chartHeight} 
                    L ${x + barWidth * 2 - 10} ${chartHeight} 
                    L ${x + barWidth * 2 - 10} ${chartHeight - cashFlowHeight} Z`}
                fill="#3B82F6"
              />
            </React.Fragment>
          );
        })}
        {/* X-axis */}
        <Line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#e5e7eb" strokeWidth="1" />
      </Svg>
    </View>
  );
};

// PDF Document Component
const ProFormaPDFDocument: React.FC<{
  config: PDFConfig;
  sections: ReportSections;
  data: ProFormaData;
  chartData: ChartData;
}> = ({ config, sections, data, chartData }) => {
  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.title}>{config.projectName}</Text>
          <Text style={styles.subtitle}>Real Estate Development Pro Forma</Text>
          <Text style={[styles.text, { marginTop: 20 }]}>Property Type: {config.propertyType}</Text>
          <Text style={styles.text}>Date: {config.date}</Text>
          {config.preparedBy && <Text style={styles.text}>Prepared by: {config.preparedBy}</Text>}
        </View>
        <Text style={styles.footer}>Confidential - Proprietary Information</Text>
      </Page>

      {/* Executive Summary */}
      {sections.executiveSummary && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.section}>
            <Text style={styles.text}>
              This pro forma analysis evaluates the financial feasibility of the {config.projectName} development,
              a {config.propertyType} project comprising {data.buildingGFA.toLocaleString()} square feet on a
              {' '}{data.siteArea.toFixed(2)}-acre site.
            </Text>
            <Text style={[styles.text, { marginTop: 10 }]}>
              The project requires a total investment of {formatCurrency(data.totalCost)} with
              {' '}{formatCurrency(data.equityRequired)} in equity. The development is projected to generate
              an IRR of {formatPercent(data.irr)} with an equity multiple of {data.equityMultiple}x over
              a {data.holdPeriod}-year investment period.
            </Text>
            {data.cottonwoodHeights && (
              <Text style={[styles.text, { marginTop: 10 }]}>
                As a mixed-use development, the project leverages commercial components generating
                {' '}{formatCurrency(data.cottonwoodHeights.commercialNOI)} in annual NOI to support
                market rate housing, with TIF revenues of {formatCurrency(data.cottonwoodHeights.tifRevenue)}
                annually enhancing project returns.
              </Text>
            )}
          </View>
          <Text style={styles.pageNumber}>Page 2</Text>
        </Page>
      )}

      {/* Key Metrics Dashboard */}
      {sections.keyMetrics && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Key Metrics Dashboard</Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
            <View style={[styles.metricCard, { width: '48%', marginRight: '2%' }]}>
              <Text style={styles.metricValue}>{formatPercent(data.irr)}</Text>
              <Text style={styles.metricLabel}>Project IRR</Text>
            </View>
            <View style={[styles.metricCard, { width: '48%' }]}>
              <Text style={styles.metricValue}>{data.equityMultiple}x</Text>
              <Text style={styles.metricLabel}>Equity Multiple</Text>
            </View>
            <View style={[styles.metricCard, { width: '48%', marginRight: '2%' }]}>
              <Text style={styles.metricValue}>{formatCurrency(data.totalCost)}</Text>
              <Text style={styles.metricLabel}>Total Development Cost</Text>
            </View>
            <View style={[styles.metricCard, { width: '48%' }]}>
              <Text style={styles.metricValue}>{formatCurrency(data.equityRequired)}</Text>
              <Text style={styles.metricLabel}>Equity Required</Text>
            </View>
          </View>

          <Text style={styles.subsectionTitle}>Development Metrics</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Yield on Cost</Text>
              <Text style={[styles.tableCell, styles.boldText]}>{formatPercent(data.yieldOnCost)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Development Spread</Text>
              <Text style={[styles.tableCell, styles.boldText]}>{data.developmentSpread} bps</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Average Cash-on-Cash</Text>
              <Text style={[styles.tableCell, styles.boldText]}>{formatPercent(data.avgCashOnCash)}</Text>
            </View>
          </View>
          
          <Text style={styles.pageNumber}>Page 3</Text>
        </Page>
      )}

      {/* Cash Flow Projections */}
      {sections.cashFlowProjections && chartData.cashFlowData.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Cash Flow Projections</Text>
          
          <CashFlowChart data={chartData.cashFlowData} />
          
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableHeaderCell}>Year</Text>
              <Text style={styles.tableHeaderCell}>NOI</Text>
              <Text style={styles.tableHeaderCell}>Cash Flow</Text>
              <Text style={styles.tableHeaderCell}>Cumulative CF</Text>
            </View>
            {chartData.cashFlowData.slice(0, 10).map((row, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{row.year}</Text>
                <Text style={styles.tableCell}>{formatCurrency(row.noi)}</Text>
                <Text style={styles.tableCell}>{formatCurrency(row.cashFlow)}</Text>
                <Text style={styles.tableCell}>{formatCurrency(row.cumulativeCashFlow)}</Text>
              </View>
            ))}
          </View>
          
          <Text style={styles.pageNumber}>Page 4</Text>
        </Page>
      )}

      {/* Sources & Uses */}
      {sections.sourcesAndUses && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Sources & Uses of Funds</Text>
          
          <View style={{ flexDirection: 'row', marginBottom: 20 }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.subsectionTitle}>Sources</Text>
              <View style={styles.table}>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>Senior Debt</Text>
                  <Text style={[styles.tableCell, styles.boldText]}>
                    {formatCurrency(data.constructionLoanAmount)}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>LP Equity</Text>
                  <Text style={[styles.tableCell, styles.boldText]}>
                    {formatCurrency(data.lpEquity)}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>GP Equity</Text>
                  <Text style={[styles.tableCell, styles.boldText]}>
                    {formatCurrency(data.gpEquity)}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={{ flex: 1 }}>
              <Text style={styles.subsectionTitle}>Uses</Text>
              <View style={styles.table}>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>Land Cost</Text>
                  <Text style={[styles.tableCell, styles.boldText]}>
                    {formatCurrency(data.landCost)}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>Hard Costs</Text>
                  <Text style={[styles.tableCell, styles.boldText]}>
                    {formatCurrency(data.hardCosts)}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>Soft Costs</Text>
                  <Text style={[styles.tableCell, styles.boldText]}>
                    {formatCurrency(data.softCosts)}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>Developer Fee</Text>
                  <Text style={[styles.tableCell, styles.boldText]}>
                    {formatCurrency(data.developerFee)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          <Text style={styles.pageNumber}>Page 5</Text>
        </Page>
      )}

      {/* Assumptions Page */}
      {sections.assumptions && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Key Assumptions</Text>
          
          <Text style={styles.subsectionTitle}>Operating Assumptions</Text>
          <View style={styles.table}>
            {data.rentPSF && (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Base Rent (PSF)</Text>
                <Text style={[styles.tableCell, styles.boldText]}>${data.rentPSF}</Text>
              </View>
            )}
            {data.avgUnitRent && (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Average Unit Rent</Text>
                <Text style={[styles.tableCell, styles.boldText]}>${data.avgUnitRent}/mo</Text>
              </View>
            )}
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Vacancy Rate</Text>
              <Text style={[styles.tableCell, styles.boldText]}>{formatPercent(data.vacancy)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Operating Expenses</Text>
              <Text style={[styles.tableCell, styles.boldText]}>
                {data.rentPSF ? `$${data.opex}/SF` : `$${data.opex}/unit`}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Exit Cap Rate</Text>
              <Text style={[styles.tableCell, styles.boldText]}>{formatPercent(data.capRate)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Hold Period</Text>
              <Text style={[styles.tableCell, styles.boldText]}>{data.holdPeriod} years</Text>
            </View>
          </View>
          
          <Text style={styles.disclaimer}>
            This analysis is based on assumptions believed to be reasonable but which may prove to be incorrect.
            Actual results may vary significantly from projections. This document is for informational purposes
            only and does not constitute an offer to sell or solicitation to buy securities.
          </Text>
          
          <Text style={styles.pageNumber}>Page 6</Text>
        </Page>
      )}
    </Document>
  );
};

// Main Export Component
interface PDFExportSystemProps {
  projectData: ProFormaData;
  chartData: ChartData;
  projectName: string;
  propertyType: string;
  onClose?: () => void;
}

export const PDFExportSystem: React.FC<PDFExportSystemProps> = ({
  projectData,
  chartData,
  projectName,
  propertyType,
  onClose,
}) => {
  const [showPreview, setShowPreview] = useState(true);
  const [selectedSections, setSelectedSections] = useState<ReportSections>({
    executiveSummary: true,
    keyMetrics: true,
    cashFlowProjections: true,
    sensitivityAnalysis: true,
    sourcesAndUses: true,
    returnAnalysis: true,
    assumptions: true,
    risks: false,
  });

  const config: PDFConfig = {
    projectName,
    propertyType,
    date: new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    preparedBy: 'Real Estate Pro Forma v2',
  };

  const toggleSection = (section: keyof ReportSections) => {
    setSelectedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <>
      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">PDF Report Preview</h2>
              <button
                onClick={() => {
                  setShowPreview(false);
                  if (onClose) onClose();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 flex">
              {/* Section Selection */}
              <div className="w-64 p-4 border-r">
                <h3 className="font-medium mb-3">Report Sections</h3>
                <div className="space-y-2">
                  {Object.entries(selectedSections).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => toggleSection(key as keyof ReportSections)}
                        className="rounded"
                      />
                      <span className="text-sm capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* PDF Preview */}
              <div className="flex-1 p-4">
                <PDFViewer width="100%" height="100%" className="rounded-lg">
                  <ProFormaPDFDocument
                    config={config}
                    sections={selectedSections}
                    data={projectData}
                    chartData={chartData}
                  />
                </PDFViewer>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPreview(false);
                  if (onClose) onClose();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <PDFDownloadLink
                document={
                  <ProFormaPDFDocument
                    config={config}
                    sections={selectedSections}
                    data={projectData}
                    chartData={chartData}
                  />
                }
                fileName={`${projectName.replace(/\s+/g, '_')}_ProForma_${new Date().toISOString().split('T')[0]}.pdf`}
              >
                {({ blob, url, loading, error }) => (
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={loading}
                  >
                    <Download className="w-5 h-5" />
                    {loading ? 'Preparing...' : 'Download PDF'}
                  </button>
                )}
              </PDFDownloadLink>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PDFExportSystem;