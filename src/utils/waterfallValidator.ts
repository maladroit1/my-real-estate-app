/**
 * Waterfall Distribution Validator and Analyzer
 * This module validates and analyzes the waterfall distribution implementation
 */

export interface WaterfallValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  analysis: {
    preferredReturnCorrect: boolean;
    catchUpCorrect: boolean;
    tiersCorrect: boolean;
    totalDistributionCorrect: boolean;
    lpGpSplitCorrect: boolean;
  };
  calculations: {
    expectedLpAmount: number;
    actualLpAmount: number;
    expectedGpAmount: number;
    actualGpAmount: number;
    variance: number;
  };
}

export function validateWaterfallDistribution(
  totalDistributions: number,
  initialEquity: number,
  equityStructure: {
    lpEquity: number;
    gpEquity: number;
    preferredReturn: number;
    gpCoinvest: number;
    catchUp: boolean;
    catchUpPercentage: number;
  },
  waterfallTiers: Array<{
    minIRR: number;
    maxIRR: number;
    lpShare: number;
    gpShare: number;
  }>,
  holdPeriod: number,
  projectIRR: number
): WaterfallValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const analysis = {
    preferredReturnCorrect: true,
    catchUpCorrect: true,
    tiersCorrect: true,
    totalDistributionCorrect: true,
    lpGpSplitCorrect: true,
  };

  // Validate inputs
  if (equityStructure.lpEquity + equityStructure.gpEquity !== 100) {
    errors.push("LP + GP equity must equal 100%");
    analysis.lpGpSplitCorrect = false;
  }

  // Calculate expected distributions
  let remainingCashFlow = totalDistributions;
  let expectedLpAmount = 0;
  let expectedGpAmount = 0;

  // Step 1: Preferred Return
  const totalPreferredReturn = initialEquity * (equityStructure.preferredReturn / 100) * holdPeriod;
  const lpPreferredAmount = totalPreferredReturn * (equityStructure.lpEquity / 100);
  const gpPreferredAmount = totalPreferredReturn * (equityStructure.gpEquity / 100);

  // LP gets their preferred return first
  const lpPreferredDistribution = Math.min(remainingCashFlow, lpPreferredAmount);
  expectedLpAmount += lpPreferredDistribution;
  remainingCashFlow -= lpPreferredDistribution;

  // GP gets their preferred return (if GP co-invests)
  if (equityStructure.gpCoinvest > 0 && remainingCashFlow > 0) {
    const gpPreferredDistribution = Math.min(remainingCashFlow, gpPreferredAmount);
    expectedGpAmount += gpPreferredDistribution;
    remainingCashFlow -= gpPreferredDistribution;
  }

  // Step 2: Catch-up (if applicable)
  if (equityStructure.catchUp && remainingCashFlow > 0) {
    // GP catches up to their promote percentage
    const targetGpShare = 0.20; // Typical GP promote target
    const totalDistributedSoFar = expectedLpAmount + expectedGpAmount;
    const gpTargetAmount = (totalDistributedSoFar + remainingCashFlow) * targetGpShare;
    const gpCatchUpNeeded = Math.max(0, gpTargetAmount - expectedGpAmount);
    
    const catchUpAmount = Math.min(
      remainingCashFlow,
      gpCatchUpNeeded,
      remainingCashFlow * (equityStructure.catchUpPercentage / 100)
    );
    
    expectedGpAmount += catchUpAmount;
    remainingCashFlow -= catchUpAmount;
  }

  // Step 3: Waterfall tiers based on IRR
  if (remainingCashFlow > 0) {
    // Find applicable tier based on project IRR
    const applicableTier = waterfallTiers.find(
      tier => projectIRR >= tier.minIRR && projectIRR < tier.maxIRR
    );

    if (applicableTier) {
      expectedLpAmount += remainingCashFlow * (applicableTier.lpShare / 100);
      expectedGpAmount += remainingCashFlow * (applicableTier.gpShare / 100);
    } else {
      warnings.push(`No waterfall tier found for IRR ${projectIRR}%`);
    }
  }

  // Validate tier structure
  for (let i = 0; i < waterfallTiers.length - 1; i++) {
    const currentTier = waterfallTiers[i];
    const nextTier = waterfallTiers[i + 1];

    // Check continuity
    if (currentTier.maxIRR !== nextTier.minIRR) {
      errors.push(`Gap in waterfall tiers between ${currentTier.maxIRR}% and ${nextTier.minIRR}%`);
      analysis.tiersCorrect = false;
    }

    // Check GP share increases with IRR
    if (nextTier.gpShare < currentTier.gpShare) {
      warnings.push(`GP share decreases in higher IRR tier (${currentTier.gpShare}% to ${nextTier.gpShare}%)`);
    }

    // Validate LP + GP = 100%
    if (currentTier.lpShare + currentTier.gpShare !== 100) {
      errors.push(`Tier ${i + 1}: LP + GP shares must equal 100%`);
      analysis.tiersCorrect = false;
    }
  }

  // Check last tier
  const lastTier = waterfallTiers[waterfallTiers.length - 1];
  if (lastTier.lpShare + lastTier.gpShare !== 100) {
    errors.push(`Last tier: LP + GP shares must equal 100%`);
    analysis.tiersCorrect = false;
  }

  // Validate total distribution
  const totalExpected = expectedLpAmount + expectedGpAmount;
  const variance = Math.abs(totalExpected - totalDistributions);
  
  if (variance > 0.01) {
    errors.push(`Total distribution mismatch: Expected ${totalExpected.toFixed(2)}, got ${totalDistributions.toFixed(2)}`);
    analysis.totalDistributionCorrect = false;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    analysis,
    calculations: {
      expectedLpAmount,
      actualLpAmount: 0, // To be filled by actual calculation
      expectedGpAmount,
      actualGpAmount: 0, // To be filled by actual calculation
      variance,
    },
  };
}

/**
 * Test waterfall with various scenarios
 */
export function testWaterfallScenarios() {
  const testScenarios = [
    {
      name: "Basic 8% Preferred, No Excess",
      totalDistributions: 800000,
      initialEquity: 1000000,
      holdPeriod: 1,
      projectIRR: 8,
      expected: {
        lp: 720000, // 90% of 800k
        gp: 80000,  // 10% of 800k
      }
    },
    {
      name: "Excess Return with Catch-up",
      totalDistributions: 2000000,
      initialEquity: 1000000,
      holdPeriod: 5,
      projectIRR: 15,
      expected: {
        lp: 1600000, // Gets preferred + share of excess
        gp: 400000,  // Gets catch-up + share of excess
      }
    },
    {
      name: "High IRR Scenario",
      totalDistributions: 3000000,
      initialEquity: 1000000,
      holdPeriod: 5,
      projectIRR: 25,
      expected: {
        lp: 1800000, // 60% at highest tier
        gp: 1200000, // 40% at highest tier
      }
    },
  ];

  return testScenarios;
}

/**
 * Calculate waterfall distribution step by step
 */
export function calculateWaterfallDistribution(
  totalCashFlow: number,
  initialEquity: number,
  equityStructure: any,
  waterfallTiers: any[],
  holdPeriod: number,
  projectIRR: number
) {
  const steps = [];
  let remainingCashFlow = totalCashFlow;
  const distributions = { lp: 0, gp: 0 };

  // Step 1: Calculate preferred return
  const annualPreferred = initialEquity * (equityStructure.preferredReturn / 100);
  const totalPreferred = annualPreferred * holdPeriod;
  
  // LP preferred
  const lpEquityShare = equityStructure.lpEquity / 100;
  const lpPreferredAmount = totalPreferred * lpEquityShare;
  const lpPreferredPaid = Math.min(remainingCashFlow, lpPreferredAmount);
  
  distributions.lp += lpPreferredPaid;
  remainingCashFlow -= lpPreferredPaid;
  
  steps.push({
    step: "LP Preferred Return",
    amount: lpPreferredPaid,
    remaining: remainingCashFlow,
    description: `LP receives ${equityStructure.preferredReturn}% preferred on their ${equityStructure.lpEquity}% equity`
  });

  // GP preferred (if co-investing)
  if (equityStructure.gpCoinvest > 0) {
    const gpEquityShare = equityStructure.gpEquity / 100;
    const gpPreferredAmount = totalPreferred * gpEquityShare * (equityStructure.gpCoinvest / 100);
    const gpPreferredPaid = Math.min(remainingCashFlow, gpPreferredAmount);
    
    distributions.gp += gpPreferredPaid;
    remainingCashFlow -= gpPreferredPaid;
    
    steps.push({
      step: "GP Preferred Return",
      amount: gpPreferredPaid,
      remaining: remainingCashFlow,
      description: `GP receives preferred on their ${equityStructure.gpCoinvest}% co-investment`
    });
  }

  // Step 2: Catch-up
  if (equityStructure.catchUp && remainingCashFlow > 0) {
    const catchUpAmount = remainingCashFlow * (equityStructure.catchUpPercentage / 100);
    distributions.gp += catchUpAmount;
    remainingCashFlow -= catchUpAmount;
    
    steps.push({
      step: "GP Catch-up",
      amount: catchUpAmount,
      remaining: remainingCashFlow,
      description: `GP receives ${equityStructure.catchUpPercentage}% catch-up`
    });
  }

  // Step 3: Waterfall splits
  if (remainingCashFlow > 0) {
    const applicableTier = waterfallTiers.find(
      tier => projectIRR >= tier.minIRR && projectIRR < tier.maxIRR
    );
    
    if (applicableTier) {
      const lpAmount = remainingCashFlow * (applicableTier.lpShare / 100);
      const gpAmount = remainingCashFlow * (applicableTier.gpShare / 100);
      
      distributions.lp += lpAmount;
      distributions.gp += gpAmount;
      
      steps.push({
        step: `Waterfall Tier (${applicableTier.minIRR}-${applicableTier.maxIRR}% IRR)`,
        amount: remainingCashFlow,
        remaining: 0,
        description: `Split ${applicableTier.lpShare}% LP / ${applicableTier.gpShare}% GP`
      });
    }
  }

  return {
    distributions,
    steps,
    totalDistributed: distributions.lp + distributions.gp,
    lpPercentage: (distributions.lp / totalCashFlow) * 100,
    gpPercentage: (distributions.gp / totalCashFlow) * 100,
  };
}