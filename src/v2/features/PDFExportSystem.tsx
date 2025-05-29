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
  Image,
  Canvas,
  Line,
  Rect,
  Path,
  Svg,
  G,
  Circle
} from '@react-pdf/renderer';
import { Project, Scenario, CalculationResults } from './ScenarioManager';
import { 
  FileText, Download, X, Eye, Loader, CheckCircle,
  TrendingUp, DollarSign, Building2, Calendar
} from 'lucide-react';

// ============= TypeScript Types for PDF =============
export interface PDFConfig {
  template: 'institutional' | 'bank' | 'investor' | 'internal';
  includeExecutiveSummary: boolean;
  includeMetricsDashboard: boolean;
  includeCashFlows: boolean;
  includeSensitivityAnalysis: boolean;
  includeAssumptions: boolean;
  includeCharts: boolean;
  companyLogo?: string;
  companyName: string;
  preparedBy: string;
  confidential: boolean;
  watermark?: string;
}

export interface ReportSections {
  executiveSummary: ExecutiveSummaryData;
  metricsDashboard: MetricsDashboardData;
  cashFlowProjections: CashFlowData[];
  sensitivityAnalysis: SensitivityData;
  assumptions: AssumptionsData;
}

export interface ExecutiveSummaryData {
  projectName: string;
  propertyType: string;
  address: string;
  investmentHighlights: string[];
  keyRisks: string[];
  recommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Pass';
  summary: string;
}

export interface MetricsDashboardData {
  purchasePrice: number;
  totalInvestment: number;
  equityRequired: number;
  targetIRR: number;
  actualIRR: number;
  targetMultiple: number;
  actualMultiple: number;
  capRate: number;
  cashOnCash: number;
  averageDSCR: number;
  exitValue: number;
}

export interface CashFlowData {
  year: number;
  revenue: {
    rental: number;
    other: number;
    total: number;
  };
  expenses: {
    operating: number;
    capital: number;
    total: number;
  };
  noi: number;
  debtService: number;
  beforeTaxCashFlow: number;
  afterTaxCashFlow: number;
}

export interface SensitivityData {
  variables: string[];
  scenarios: {
    name: string;
    changes: Record<string, number>;
    results: {
      irr: number;
      npv: number;
      multiple: number;
    };
  }[];
}

export interface AssumptionsData {
  market: {
    rentGrowth: number;
    expenseGrowth: number;
    capRateCompression: number;
    vacancyRate: number;
  };
  financing: {
    ltv: number;
    interestRate: number;
    term: number;
    amortization: number;
  };
  operations: {
    managementFee: number;
    reservesPercent: number;
    tenantImprovements: number;
    leasingCommissions: number;
  };
  tax: {
    propertyTax: number;
    incomeTax: number;
    depreciation: number;
  };
}

export interface ChartData {
  cashFlowChart: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      color: string;
    }[];
  };
  irrWaterfall: {
    categories: string[];
    values: number[];
    colors: string[];
  };
  sensitivityMatrix: {
    xAxis: string;
    yAxis: string;
    data: number[][];
  };
}

// ============= PDF Styles =============
const getStyles = (template: string) => StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica'
  },
  coverPage: {
    flexDirection: 'column',
    backgroundColor: template === 'bank' ? '#004080' : template === 'investor' ? '#1a1a1a' : '#1e40af',
    padding: template === 'bank' ? 80 : 60,
    color: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#6b7280'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827'
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1f2937'
  },
  section: {
    marginBottom: 25
  },
  sectionTitle: {
    fontSize: template === 'bank' ? 14 : 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: template === 'bank' ? '#004080' : template === 'investor' ? '#333333' : '#1e40af',
    borderBottomWidth: template === 'bank' ? 1 : 2,
    borderBottomColor: template === 'bank' ? '#004080' : template === 'investor' ? '#333333' : '#1e40af',
    paddingBottom: 5,
    textTransform: template === 'bank' ? 'uppercase' : 'none'
  },
  text: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#374151'
  },
  boldText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827'
  },
  smallText: {
    fontSize: 9,
    color: '#6b7280'
  },
  table: {
    marginTop: 10,
    marginBottom: 10
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
    paddingVertical: 8,
    paddingHorizontal: 5
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 6,
    paddingHorizontal: 5
  },
  tableCell: {
    flex: 1,
    fontSize: 10
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  metric: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  metricLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 3
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af'
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  metricItem: {
    width: '48%',
    marginBottom: 10
  },
  highlight: {
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b'
  },
  chart: {
    marginVertical: 20,
    height: 200
  },
  confidential: {
    position: 'absolute',
    top: '50%',
    left: '25%',
    transform: 'rotate(-45deg)',
    fontSize: 60,
    opacity: 0.1,
    color: '#dc2626'
  }
});

// ============= Chart Components =============
const CashFlowBarChart: React.FC<{
  data: CashFlowData[];
  width: number;
  height: number;
}> = ({ data, width, height }) => {
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  // Get max value for scaling
  const maxValue = Math.max(...data.map(d => Math.max(d.revenue.total, d.noi, d.beforeTaxCashFlow)));
  const barWidth = innerWidth / (data.length * 3 + data.length - 1);
  const gap = barWidth * 0.5;
  
  // Scale function
  const yScale = (value: number) => innerHeight - (value / maxValue) * innerHeight;
  
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <G transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Y-axis line */}
          <Line
            x1={0}
            y1={0}
            x2={0}
            y2={innerHeight}
            stroke="#374151"
            strokeWidth={1}
          />
          
          {/* X-axis line */}
          <Line
            x1={0}
            y1={innerHeight}
            x2={innerWidth}
            y2={innerHeight}
            stroke="#374151"
            strokeWidth={1}
          />
          
          {/* Bars */}
          {data.slice(0, 5).map((item, index) => {
            const x = index * (barWidth * 3 + gap);
            return (
              <G key={item.year}>
                {/* Revenue bar */}
                <Rect
                  x={x}
                  y={yScale(item.revenue.total)}
                  width={barWidth}
                  height={innerHeight - yScale(item.revenue.total)}
                  fill="#3b82f6"
                />
                
                {/* NOI bar */}
                <Rect
                  x={x + barWidth}
                  y={yScale(item.noi)}
                  width={barWidth}
                  height={innerHeight - yScale(item.noi)}
                  fill="#10b981"
                />
                
                {/* Cash Flow bar */}
                <Rect
                  x={x + barWidth * 2}
                  y={yScale(item.beforeTaxCashFlow)}
                  width={barWidth}
                  height={innerHeight - yScale(item.beforeTaxCashFlow)}
                  fill="#f59e0b"
                />
                
                {/* Year label */}
                <Text
                  x={x + barWidth * 1.5}
                  y={innerHeight + 15}
                  style={{ fontSize: 10 }}
                  textAnchor="middle"
                  fill="#374151"
                >
                  Year {item.year}
                </Text>
              </G>
            );
          })}
          
          {/* Legend */}
          <G transform={`translate(${innerWidth - 100}, -10)`}>
            <Rect x={0} y={0} width={10} height={10} fill="#3b82f6" />
            <Text x={15} y={8} style={{ fontSize: 8 }} fill="#374151">Revenue</Text>
            
            <Rect x={0} y={15} width={10} height={10} fill="#10b981" />
            <Text x={15} y={23} style={{ fontSize: 8 }} fill="#374151">NOI</Text>
            
            <Rect x={0} y={30} width={10} height={10} fill="#f59e0b" />
            <Text x={15} y={38} style={{ fontSize: 8 }} fill="#374151">Cash Flow</Text>
          </G>
        </G>
      </Svg>
    </View>
  );
};

const CapitalStackPieChart: React.FC<{
  equity: number;
  debt: number;
  width: number;
  height: number;
}> = ({ equity, debt, width, height }) => {
  const total = equity + debt;
  const equityPercent = (equity / total) * 100;
  const debtPercent = (debt / total) * 100;
  
  // Calculate pie slices
  const radius = Math.min(width, height) / 2 - 20;
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Debt slice (starting from top)
  const debtAngle = (debtPercent / 100) * 360;
  const debtEndX = centerX + radius * Math.sin((debtAngle * Math.PI) / 180);
  const debtEndY = centerY - radius * Math.cos((debtAngle * Math.PI) / 180);
  const largeArcFlag = debtAngle > 180 ? 1 : 0;
  
  const debtPath = `
    M ${centerX} ${centerY}
    L ${centerX} ${centerY - radius}
    A ${radius} ${radius} 0 ${largeArcFlag} 1 ${debtEndX} ${debtEndY}
    Z
  `;
  
  const equityPath = `
    M ${centerX} ${centerY}
    L ${debtEndX} ${debtEndY}
    A ${radius} ${radius} 0 ${1 - largeArcFlag} 1 ${centerX} ${centerY - radius}
    Z
  `;
  
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Debt slice */}
        <Path d={debtPath} fill="#ef4444" />
        
        {/* Equity slice */}
        <Path d={equityPath} fill="#3b82f6" />
        
        {/* Labels */}
        <Text x={centerX - 30} y={centerY - radius / 2} style={{ fontSize: 12, fontWeight: 'bold' }} fill="white">
          Debt {debtPercent.toFixed(0)}%
        </Text>
        <Text x={centerX + 10} y={centerY + radius / 3} style={{ fontSize: 12, fontWeight: 'bold' }} fill="white">
          Equity {equityPercent.toFixed(0)}%
        </Text>
        
        {/* Legend */}
        <G transform={`translate(10, ${height - 40})`}>
          <Rect x={0} y={0} width={15} height={15} fill="#3b82f6" />
          <Text x={20} y={12} style={{ fontSize: 10 }} fill="#374151">Equity: ${(equity / 1000000).toFixed(1)}M</Text>
          
          <Rect x={100} y={0} width={15} height={15} fill="#ef4444" />
          <Text x={120} y={12} style={{ fontSize: 10 }} fill="#374151">Debt: ${(debt / 1000000).toFixed(1)}M</Text>
        </G>
      </Svg>
    </View>
  );
};

const SensitivityLineChart: React.FC<{
  data: { label: string; value: number }[];
  width: number;
  height: number;
}> = ({ data, width, height }) => {
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  const minValue = Math.min(...data.map(d => d.value));
  const maxValue = Math.max(...data.map(d => d.value));
  const range = maxValue - minValue;
  
  const xScale = (index: number) => (index / (data.length - 1)) * innerWidth;
  const yScale = (value: number) => innerHeight - ((value - minValue) / range) * innerHeight;
  
  // Create path
  const pathData = data
    .map((point, index) => {
      const x = xScale(index);
      const y = yScale(point.value);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
  
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <G transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(tick => (
            <G key={tick}>
              <Line
                x1={0}
                y1={innerHeight * (1 - tick)}
                x2={innerWidth}
                y2={innerHeight * (1 - tick)}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <Text
                x={-10}
                y={innerHeight * (1 - tick) + 4}
                style={{ fontSize: 8 }}
                textAnchor="end"
                fill="#6b7280"
              >
                {(minValue + range * tick).toFixed(1)}%
              </Text>
            </G>
          ))}
          
          {/* Line */}
          <Path
            d={pathData}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
          />
          
          {/* Data points */}
          {data.map((point, index) => (
            <G key={index}>
              <Circle
                cx={xScale(index)}
                cy={yScale(point.value)}
                r={3}
                fill="#3b82f6"
              />
              <Text
                x={xScale(index)}
                y={innerHeight + 20}
                style={{ fontSize: 8 }}
                textAnchor="middle"
                fill="#374151"
              >
                {point.label}
              </Text>
            </G>
          ))}
          
          {/* Axes */}
          <Line x1={0} y1={0} x2={0} y2={innerHeight} stroke="#374151" strokeWidth={1} />
          <Line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke="#374151" strokeWidth={1} />
          
          {/* Title */}
          <Text x={innerWidth / 2} y={-5} style={{ fontSize: 10 }} textAnchor="middle" fill="#1f2937">
            IRR Sensitivity Analysis
          </Text>
        </G>
      </Svg>
    </View>
  );
};

// ============= PDF Document Component =============
const InvestmentReport: React.FC<{
  project: Project;
  scenario: Scenario;
  config: PDFConfig;
  sections: ReportSections;
}> = ({ project, scenario, config, sections }) => {
  const styles = getStyles(config.template);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 36, fontWeight: 'bold', marginBottom: 20 }}>
            {config.template === 'bank' ? 'LOAN UNDERWRITING REPORT' : 
             config.template === 'investor' ? 'INVESTMENT OPPORTUNITY' : 
             'INVESTMENT ANALYSIS'}
          </Text>
          <Text style={{ fontSize: 28, marginBottom: 40 }}>
            {project.name}
          </Text>
          <View style={{ marginBottom: 60 }}>
            <Text style={{ fontSize: 16, marginBottom: 10 }}>{project.address}</Text>
            <Text style={{ fontSize: 14 }}>{scenario.name}</Text>
          </View>
          <View style={{ marginTop: 'auto', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, marginBottom: 5 }}>{config.companyName}</Text>
            <Text style={{ fontSize: 12 }}>Prepared by: {config.preparedBy}</Text>
            <Text style={{ fontSize: 12 }}>{formatDate(new Date())}</Text>
          </View>
        </View>
        {config.confidential && (
          <Text style={styles.confidential}>CONFIDENTIAL</Text>
        )}
      </Page>

      {/* Executive Summary */}
      {config.includeExecutiveSummary && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>Executive Summary</Text>
            <Text style={styles.smallText}>{project.name}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.subtitle}>Investment Overview</Text>
            <Text style={styles.text}>{sections.executiveSummary.summary}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.boldText}>Property Details</Text>
            <View style={{ marginTop: 10 }}>
              <Text style={styles.text}>• Type: {sections.executiveSummary.propertyType}</Text>
              <Text style={styles.text}>• Location: {sections.executiveSummary.address}</Text>
              <Text style={styles.text}>• Scenario: {scenario.name}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.boldText}>Investment Highlights</Text>
            <View style={{ marginTop: 10 }}>
              {sections.executiveSummary.investmentHighlights.map((highlight, index) => (
                <Text key={index} style={styles.text}>• {highlight}</Text>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.boldText}>Key Risks</Text>
            <View style={{ marginTop: 10 }}>
              {sections.executiveSummary.keyRisks.map((risk, index) => (
                <Text key={index} style={styles.text}>• {risk}</Text>
              ))}
            </View>
          </View>

          <View style={[styles.highlight, { borderLeftColor: 
            sections.executiveSummary.recommendation === 'Strong Buy' ? '#10b981' :
            sections.executiveSummary.recommendation === 'Buy' ? '#3b82f6' :
            sections.executiveSummary.recommendation === 'Hold' ? '#f59e0b' : '#ef4444'
          }]}>
            <Text style={styles.boldText}>Recommendation: {sections.executiveSummary.recommendation}</Text>
          </View>

          <View style={styles.footer}>
            <Text>Page 1</Text>
            <Text>{config.confidential ? 'CONFIDENTIAL' : config.companyName}</Text>
          </View>
        </Page>
      )}

      {/* Metrics Dashboard */}
      {config.includeMetricsDashboard && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>Key Metrics Dashboard</Text>
            <Text style={styles.smallText}>{scenario.name}</Text>
          </View>

          <View style={styles.metricGrid}>
            <View style={[styles.metricItem, styles.metric]}>
              <Text style={styles.metricLabel}>Purchase Price</Text>
              <Text style={styles.metricValue}>{formatCurrency(sections.metricsDashboard.purchasePrice)}</Text>
            </View>
            <View style={[styles.metricItem, styles.metric]}>
              <Text style={styles.metricLabel}>Total Investment</Text>
              <Text style={styles.metricValue}>{formatCurrency(sections.metricsDashboard.totalInvestment)}</Text>
            </View>
            <View style={[styles.metricItem, styles.metric]}>
              <Text style={styles.metricLabel}>Equity Required</Text>
              <Text style={styles.metricValue}>{formatCurrency(sections.metricsDashboard.equityRequired)}</Text>
            </View>
            <View style={[styles.metricItem, styles.metric]}>
              <Text style={styles.metricLabel}>Projected Exit Value</Text>
              <Text style={styles.metricValue}>{formatCurrency(sections.metricsDashboard.exitValue)}</Text>
            </View>
          </View>

          <View style={[styles.section, { marginTop: 20 }]}>
            <Text style={styles.boldText}>Return Metrics</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellHeader, { flex: 2 }]}>Metric</Text>
                <Text style={styles.tableCellHeader}>Target</Text>
                <Text style={styles.tableCellHeader}>Projected</Text>
                <Text style={styles.tableCellHeader}>Status</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Internal Rate of Return (IRR)</Text>
                <Text style={styles.tableCell}>{formatPercent(sections.metricsDashboard.targetIRR)}</Text>
                <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{formatPercent(sections.metricsDashboard.actualIRR)}</Text>
                <Text style={[styles.tableCell, { color: sections.metricsDashboard.actualIRR >= sections.metricsDashboard.targetIRR ? '#10b981' : '#ef4444' }]}>
                  {sections.metricsDashboard.actualIRR >= sections.metricsDashboard.targetIRR ? 'PASS' : 'MISS'}
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Equity Multiple</Text>
                <Text style={styles.tableCell}>{sections.metricsDashboard.targetMultiple.toFixed(2)}x</Text>
                <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{sections.metricsDashboard.actualMultiple.toFixed(2)}x</Text>
                <Text style={[styles.tableCell, { color: sections.metricsDashboard.actualMultiple >= sections.metricsDashboard.targetMultiple ? '#10b981' : '#ef4444' }]}>
                  {sections.metricsDashboard.actualMultiple >= sections.metricsDashboard.targetMultiple ? 'PASS' : 'MISS'}
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Cap Rate</Text>
                <Text style={styles.tableCell}>-</Text>
                <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{formatPercent(sections.metricsDashboard.capRate)}</Text>
                <Text style={styles.tableCell}>-</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Cash-on-Cash Return</Text>
                <Text style={styles.tableCell}>-</Text>
                <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{formatPercent(sections.metricsDashboard.cashOnCash)}</Text>
                <Text style={styles.tableCell}>-</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Average DSCR</Text>
                <Text style={styles.tableCell}>1.25x</Text>
                <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{sections.metricsDashboard.averageDSCR.toFixed(2)}x</Text>
                <Text style={[styles.tableCell, { color: sections.metricsDashboard.averageDSCR >= 1.25 ? '#10b981' : '#ef4444' }]}>
                  {sections.metricsDashboard.averageDSCR >= 1.25 ? 'PASS' : 'MISS'}
                </Text>
              </View>
            </View>
          </View>

          {/* Capital Stack Chart */}
          {config.includeCharts && (
            <View style={{ marginTop: 20, alignItems: 'center' }}>
              <Text style={styles.boldText}>Capital Stack</Text>
              <View style={{ marginTop: 10 }}>
                <CapitalStackPieChart 
                  equity={sections.metricsDashboard.equityRequired}
                  debt={sections.metricsDashboard.totalInvestment - sections.metricsDashboard.equityRequired}
                  width={250}
                  height={200}
                />
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <Text>Page 2</Text>
            <Text>{config.confidential ? 'CONFIDENTIAL' : config.companyName}</Text>
          </View>
        </Page>
      )}

      {/* Cash Flow Projections */}
      {config.includeCashFlows && sections.cashFlowProjections.length > 0 && (
        <Page size="A4" style={styles.page} orientation="landscape">
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>Cash Flow Projections</Text>
            <Text style={styles.smallText}>10-Year Forecast</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 1.5 }]}>Year</Text>
              {sections.cashFlowProjections.slice(0, 10).map((cf) => (
                <Text key={cf.year} style={[styles.tableCellHeader, { flex: 1, textAlign: 'right' }]}>
                  {cf.year}
                </Text>
              ))}
            </View>
            
            {/* Revenue Section */}
            <View style={[styles.tableRow, { backgroundColor: '#f9fafb' }]}>
              <Text style={[styles.tableCell, { flex: 1.5, fontWeight: 'bold' }]}>REVENUE</Text>
              {sections.cashFlowProjections.slice(0, 10).map((cf) => (
                <Text key={cf.year} style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}></Text>
              ))}
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1.5, paddingLeft: 10 }]}>Rental Income</Text>
              {sections.cashFlowProjections.slice(0, 10).map((cf) => (
                <Text key={cf.year} style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  {formatCurrency(cf.revenue.rental)}
                </Text>
              ))}
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1.5, paddingLeft: 10 }]}>Other Income</Text>
              {sections.cashFlowProjections.slice(0, 10).map((cf) => (
                <Text key={cf.year} style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  {formatCurrency(cf.revenue.other)}
                </Text>
              ))}
            </View>
            <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: '#374151' }]}>
              <Text style={[styles.tableCell, { flex: 1.5, fontWeight: 'bold' }]}>Total Revenue</Text>
              {sections.cashFlowProjections.slice(0, 10).map((cf) => (
                <Text key={cf.year} style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>
                  {formatCurrency(cf.revenue.total)}
                </Text>
              ))}
            </View>

            {/* Expenses Section */}
            <View style={[styles.tableRow, { backgroundColor: '#f9fafb', marginTop: 10 }]}>
              <Text style={[styles.tableCell, { flex: 1.5, fontWeight: 'bold' }]}>EXPENSES</Text>
              {sections.cashFlowProjections.slice(0, 10).map((cf) => (
                <Text key={cf.year} style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}></Text>
              ))}
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1.5, paddingLeft: 10 }]}>Operating Expenses</Text>
              {sections.cashFlowProjections.slice(0, 10).map((cf) => (
                <Text key={cf.year} style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  {formatCurrency(cf.expenses.operating)}
                </Text>
              ))}
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1.5, paddingLeft: 10 }]}>Capital Expenses</Text>
              {sections.cashFlowProjections.slice(0, 10).map((cf) => (
                <Text key={cf.year} style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  {formatCurrency(cf.expenses.capital)}
                </Text>
              ))}
            </View>
            <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: '#374151' }]}>
              <Text style={[styles.tableCell, { flex: 1.5, fontWeight: 'bold' }]}>Total Expenses</Text>
              {sections.cashFlowProjections.slice(0, 10).map((cf) => (
                <Text key={cf.year} style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>
                  {formatCurrency(cf.expenses.total)}
                </Text>
              ))}
            </View>

            {/* NOI and Cash Flow */}
            <View style={[styles.tableRow, { backgroundColor: '#e0f2fe', marginTop: 10 }]}>
              <Text style={[styles.tableCell, { flex: 1.5, fontWeight: 'bold' }]}>Net Operating Income</Text>
              {sections.cashFlowProjections.slice(0, 10).map((cf) => (
                <Text key={cf.year} style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>
                  {formatCurrency(cf.noi)}
                </Text>
              ))}
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>Debt Service</Text>
              {sections.cashFlowProjections.slice(0, 10).map((cf) => (
                <Text key={cf.year} style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  {formatCurrency(cf.debtService)}
                </Text>
              ))}
            </View>
            <View style={[styles.tableRow, { backgroundColor: '#dcfce7', borderWidth: 2, borderColor: '#10b981' }]}>
              <Text style={[styles.tableCell, { flex: 1.5, fontWeight: 'bold' }]}>Before-Tax Cash Flow</Text>
              {sections.cashFlowProjections.slice(0, 10).map((cf) => (
                <Text key={cf.year} style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>
                  {formatCurrency(cf.beforeTaxCashFlow)}
                </Text>
              ))}
            </View>
          </View>

          {/* Cash Flow Chart */}
          {config.includeCharts && (
            <View style={{ marginTop: 30 }}>
              <Text style={styles.boldText}>Cash Flow Visualization (Years 1-5)</Text>
              <View style={{ marginTop: 10 }}>
                <CashFlowBarChart 
                  data={sections.cashFlowProjections.slice(0, 5)} 
                  width={700} 
                  height={200} 
                />
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <Text>Page 3</Text>
            <Text>{config.confidential ? 'CONFIDENTIAL' : config.companyName}</Text>
          </View>
        </Page>
      )}

      {/* Sensitivity Analysis */}
      {config.includeSensitivityAnalysis && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>Sensitivity Analysis</Text>
            <Text style={styles.smallText}>Impact on Returns</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.text}>
              The following analysis shows how changes in key variables impact the investment returns.
            </Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Scenario</Text>
              <Text style={[styles.tableCellHeader, { textAlign: 'right' }]}>IRR</Text>
              <Text style={[styles.tableCellHeader, { textAlign: 'right' }]}>NPV</Text>
              <Text style={[styles.tableCellHeader, { textAlign: 'right' }]}>Multiple</Text>
            </View>
            {sections.sensitivityAnalysis.scenarios.map((scenario, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{scenario.name}</Text>
                <Text style={[styles.tableCell, { textAlign: 'right', color: scenario.results.irr < 15 ? '#ef4444' : '#10b981' }]}>
                  {formatPercent(scenario.results.irr)}
                </Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                  {formatCurrency(scenario.results.npv)}
                </Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                  {scenario.results.multiple.toFixed(2)}x
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.section, { marginTop: 30 }]}>
            <Text style={styles.boldText}>Key Sensitivities</Text>
            <View style={{ marginTop: 10 }}>
              {sections.sensitivityAnalysis.variables.map((variable, index) => (
                <Text key={index} style={styles.text}>
                  • {variable}: High sensitivity to changes
                </Text>
              ))}
            </View>
          </View>

          {/* Sensitivity Chart */}
          {config.includeCharts && (
            <View style={{ marginTop: 20 }}>
              <SensitivityLineChart 
                data={sections.sensitivityAnalysis.scenarios.map(s => ({
                  label: s.name.split(' ')[0],
                  value: s.results.irr
                }))}
                width={500}
                height={200}
              />
            </View>
          )}

          <View style={styles.footer}>
            <Text>Page 4</Text>
            <Text>{config.confidential ? 'CONFIDENTIAL' : config.companyName}</Text>
          </View>
        </Page>
      )}

      {/* Assumptions */}
      {config.includeAssumptions && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>Key Assumptions</Text>
            <Text style={styles.smallText}>Analysis Parameters</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.boldText}>Market Assumptions</Text>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Annual Rent Growth</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>{formatPercent(sections.assumptions.market.rentGrowth)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Annual Expense Growth</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>{formatPercent(sections.assumptions.market.expenseGrowth)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Stabilized Vacancy Rate</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>{formatPercent(sections.assumptions.market.vacancyRate)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Cap Rate Compression</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>{sections.assumptions.market.capRateCompression} bps</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.boldText}>Financing Assumptions</Text>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Loan-to-Value (LTV)</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>{formatPercent(sections.assumptions.financing.ltv)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Interest Rate</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>{formatPercent(sections.assumptions.financing.interestRate)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Loan Term</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>{sections.assumptions.financing.term} years</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Amortization Period</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>{sections.assumptions.financing.amortization} years</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.boldText}>Operating Assumptions</Text>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Management Fee</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>{formatPercent(sections.assumptions.operations.managementFee)} of EGI</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Replacement Reserves</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>{formatPercent(sections.assumptions.operations.reservesPercent)} of EGI</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Tenant Improvements</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>${sections.assumptions.operations.tenantImprovements}/SF</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Leasing Commissions</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>{formatPercent(sections.assumptions.operations.leasingCommissions)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text>Page 5</Text>
            <Text>{config.confidential ? 'CONFIDENTIAL' : config.companyName}</Text>
          </View>
        </Page>
      )}

      {/* Disclaimer Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Disclaimer</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.text}>
            This investment analysis has been prepared by {config.companyName} for informational purposes only. 
            The projections and assumptions contained herein are based on information available at the time of 
            preparation and are subject to change without notice.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.boldText}>Important Notice</Text>
          <Text style={styles.text}>
            This analysis does not constitute an offer to sell or a solicitation of an offer to buy any securities. 
            Past performance is not indicative of future results. All investments involve risk, including the 
            potential loss of principal.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.boldText}>Forward-Looking Statements</Text>
          <Text style={styles.text}>
            This report contains forward-looking statements that involve risks and uncertainties. Actual results 
            may differ materially from the projections presented herein due to various factors including but not 
            limited to market conditions, regulatory changes, and economic factors.
          </Text>
        </View>

        {config.confidential && (
          <View style={[styles.highlight, { marginTop: 40 }]}>
            <Text style={styles.boldText}>CONFIDENTIAL</Text>
            <Text style={styles.text}>
              This document contains confidential and proprietary information. Any unauthorized use, 
              disclosure, or distribution is strictly prohibited.
            </Text>
          </View>
        )}

        <View style={[styles.footer, { marginTop: 'auto' }]}>
          <Text>© {new Date().getFullYear()} {config.companyName}. All rights reserved.</Text>
        </View>
      </Page>
    </Document>
  );
};

// ============= Preview Modal Component =============
const PDFPreviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  scenario: Scenario;
  config: PDFConfig;
  sections: ReportSections;
  onTemplateChange?: (template: PDFConfig['template']) => void;
}> = ({ isOpen, onClose, project, scenario, config, sections, onTemplateChange }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">PDF Preview</h2>
            <select
              value={config.template}
              onChange={(e) => onTemplateChange?.(e.target.value as PDFConfig['template'])}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="institutional">Institutional</option>
              <option value="bank">Bank</option>
              <option value="investor">Investor</option>
              <option value="internal">Internal</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <PDFDownloadLink
              document={<InvestmentReport project={project} scenario={scenario} config={config} sections={sections} />}
              fileName={`${project.name.replace(/\s+/g, '_')}_${scenario.name.replace(/\s+/g, '_')}_Report.pdf`}
            >
              {({ blob, url, loading, error }) => (
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Download PDF
                    </>
                  )}
                </button>
              )}
            </PDFDownloadLink>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <PDFViewer width="100%" height="100%" showToolbar={false}>
            <InvestmentReport project={project} scenario={scenario} config={config} sections={sections} />
          </PDFViewer>
        </div>
      </div>
    </div>
  );
};

// ============= Main PDF Export Component =============
export const PDFExportSystem: React.FC<{
  project: Project;
  scenario: Scenario;
  onClose?: () => void;
  className?: string;
}> = ({ project, scenario, onClose, className = '' }) => {
  const [showPreview, setShowPreview] = useState(true); // Show preview immediately
  const [config, setConfig] = useState<PDFConfig>({
    template: 'institutional',
    includeExecutiveSummary: true,
    includeMetricsDashboard: true,
    includeCashFlows: true,
    includeSensitivityAnalysis: true,
    includeAssumptions: true,
    includeCharts: true,
    companyName: 'Real Estate Investment Partners',
    preparedBy: 'Investment Analysis Team',
    confidential: true
  });

  // Generate report sections from scenario data
  const generateReportSections = (): ReportSections => {
    const results = scenario.results || {
      irr: 0,
      leveragedIRR: 0,
      npv: 0,
      cashOnCash: 0,
      equityMultiple: 1,
      capRate: 0,
      yieldOnCost: 0,
      dscr: [1.25],
      cashFlows: []
    };

    return {
      executiveSummary: {
        projectName: project.name,
        propertyType: project.propertyType,
        address: project.address,
        investmentHighlights: [
          `Strong projected IRR of ${results.irr.toFixed(1)}%`,
          `Equity multiple of ${results.equityMultiple.toFixed(2)}x over hold period`,
          `Stable cash flow with average DSCR of ${(results.dscr[0] || 1.25).toFixed(2)}x`,
          'Prime location with strong market fundamentals',
          'Professional property management in place'
        ],
        keyRisks: [
          'Market vacancy rates may exceed projections',
          'Interest rate fluctuations could impact returns',
          'Capital expenditure requirements may vary',
          'Regulatory changes could affect operations'
        ],
        recommendation: results.irr >= 18 ? 'Strong Buy' : 
                        results.irr >= 15 ? 'Buy' : 
                        results.irr >= 12 ? 'Hold' : 'Pass',
        summary: `This investment opportunity presents a ${project.propertyType} property located at ${project.address}. 
                  Based on our analysis, the property is expected to generate an IRR of ${results.irr.toFixed(1)}% with 
                  an equity multiple of ${results.equityMultiple.toFixed(2)}x. The investment demonstrates strong 
                  fundamentals with stable cash flows and attractive risk-adjusted returns.`
      },
      metricsDashboard: {
        purchasePrice: scenario.data.acquisition.purchasePrice,
        totalInvestment: scenario.data.acquisition.purchasePrice + 
                        scenario.data.acquisition.closingCosts + 
                        scenario.data.acquisition.renovationCosts,
        equityRequired: scenario.data.financing.equityRequirement,
        targetIRR: 15,
        actualIRR: results.irr,
        targetMultiple: 2.0,
        actualMultiple: results.equityMultiple,
        capRate: results.capRate,
        cashOnCash: results.cashOnCash,
        averageDSCR: results.dscr[0] || 1.25,
        exitValue: scenario.data.acquisition.purchasePrice * 1.5 // Simplified
      },
      cashFlowProjections: Array.from({ length: 10 }, (_, i) => ({
        year: i + 1,
        revenue: {
          rental: 1000000 + (i * 30000),
          other: 50000 + (i * 1500),
          total: 1050000 + (i * 31500)
        },
        expenses: {
          operating: 400000 + (i * 12000),
          capital: i === 4 ? 100000 : 20000,
          total: i === 4 ? 500000 : 420000 + (i * 12000)
        },
        noi: 630000 + (i * 19500),
        debtService: 480000,
        beforeTaxCashFlow: 150000 + (i * 19500),
        afterTaxCashFlow: 120000 + (i * 15600)
      })),
      sensitivityAnalysis: {
        variables: ['Rent Growth', 'Vacancy Rate', 'Exit Cap Rate', 'Interest Rate'],
        scenarios: [
          {
            name: 'Base Case',
            changes: {},
            results: { irr: results.irr, npv: results.npv, multiple: results.equityMultiple }
          },
          {
            name: 'Optimistic (+10% rents)',
            changes: { rentGrowth: 0.1 },
            results: { irr: results.irr + 3.5, npv: results.npv * 1.25, multiple: results.equityMultiple + 0.4 }
          },
          {
            name: 'Conservative (-10% rents)',
            changes: { rentGrowth: -0.1 },
            results: { irr: results.irr - 3.5, npv: results.npv * 0.75, multiple: results.equityMultiple - 0.3 }
          },
          {
            name: 'High Vacancy (10%)',
            changes: { vacancy: 0.1 },
            results: { irr: results.irr - 2.0, npv: results.npv * 0.85, multiple: results.equityMultiple - 0.2 }
          },
          {
            name: 'Lower Exit Cap (+50bps)',
            changes: { exitCap: 0.5 },
            results: { irr: results.irr - 1.5, npv: results.npv * 0.9, multiple: results.equityMultiple - 0.15 }
          }
        ]
      },
      assumptions: {
        market: {
          rentGrowth: 3.0,
          expenseGrowth: 3.0,
          capRateCompression: -25,
          vacancyRate: 5.0
        },
        financing: {
          ltv: 75,
          interestRate: scenario.data.financing.loans[0]?.interestRate || 6.5,
          term: scenario.data.financing.loans[0]?.term || 10,
          amortization: scenario.data.financing.loans[0]?.amortization || 30
        },
        operations: {
          managementFee: 3.0,
          reservesPercent: 2.0,
          tenantImprovements: 25,
          leasingCommissions: 5.0
        },
        tax: {
          propertyTax: 1.25,
          incomeTax: 35,
          depreciation: 27.5
        }
      }
    };
  };

  return (
    <PDFPreviewModal
      isOpen={showPreview}
      onClose={() => {
        setShowPreview(false);
        if (onClose) onClose();
      }}
      project={project}
      scenario={scenario}
      config={config}
      sections={generateReportSections()}
      onTemplateChange={(template) => setConfig({ ...config, template })}
    />
  );
};

export default PDFExportSystem;