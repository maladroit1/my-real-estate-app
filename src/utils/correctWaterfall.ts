/**
 * Corrected Waterfall Distribution Implementation
 * This implements a proper real estate equity waterfall
 */

export interface WaterfallResult {
  distributions: {
    lp: number;
    gp: number;
  };
  steps: WaterfallStep[];
  individualReturns: {
    lpIRR: number;
    gpIRR: number;
    lpMultiple: number;
    gpMultiple: number;
  };
}

export interface WaterfallStep {
  tier: string;
  description: string;
  lpAmount: number;
  gpAmount: number;
  totalAmount: number;
  remainingCashFlow: number;
}

export interface EquityStructure {
  lpEquity: number;       // LP ownership % (e.g., 90)
  gpEquity: number;       // GP ownership % (e.g., 10)
  preferredReturn: number; // Annual preferred return % (e.g., 8)
  gpCoinvest: number;     // GP co-investment as % of GP equity (e.g., 10)
  catchUp: boolean;       // Whether to include catch-up
  catchUpSplit: number;   // GP % during catch-up (e.g., 100)
  targetGPPromote: number; // Target GP % after catch-up (e.g., 20)
}

export interface WaterfallTier {
  minIRR: number;
  maxIRR: number;
  lpShare: number;
  gpShare: number;
}

/**
 * Calculate proper waterfall distribution
 */
export function calculateProperWaterfall(
  totalCashFlow: number,
  initialEquity: number,
  equityStructure: EquityStructure,
  waterfallTiers: WaterfallTier[],
  holdPeriod: number,
  actualIRR: number
): WaterfallResult {
  const steps: WaterfallStep[] = [];
  let remainingCashFlow = totalCashFlow;
  const distributions = { lp: 0, gp: 0 };

  // Calculate actual equity contributions
  const lpCapital = initialEquity * (equityStructure.lpEquity / 100);
  const gpCapitalShare = initialEquity * (equityStructure.gpEquity / 100);
  const gpCoinvestment = gpCapitalShare * (equityStructure.gpCoinvest / 100);
  const totalCapital = lpCapital + gpCoinvestment;

  // Step 1: Return of Capital
  // LP gets their capital back first
  const lpCapitalReturn = Math.min(remainingCashFlow, lpCapital);
  distributions.lp += lpCapitalReturn;
  remainingCashFlow -= lpCapitalReturn;

  steps.push({
    tier: "Return of LP Capital",
    description: "LP receives return of invested capital",
    lpAmount: lpCapitalReturn,
    gpAmount: 0,
    totalAmount: lpCapitalReturn,
    remainingCashFlow: remainingCashFlow
  });

  // GP gets their co-investment back
  if (gpCoinvestment > 0 && remainingCashFlow > 0) {
    const gpCapitalReturn = Math.min(remainingCashFlow, gpCoinvestment);
    distributions.gp += gpCapitalReturn;
    remainingCashFlow -= gpCapitalReturn;

    steps.push({
      tier: "Return of GP Capital",
      description: "GP receives return of co-invested capital",
      lpAmount: 0,
      gpAmount: gpCapitalReturn,
      totalAmount: gpCapitalReturn,
      remainingCashFlow: remainingCashFlow
    });
  }

  // Step 2: Preferred Return (Compounded)
  // Calculate compounded preferred return
  const lpPreferredAmount = lpCapital * (Math.pow(1 + equityStructure.preferredReturn / 100, holdPeriod) - 1);
  const gpPreferredAmount = gpCoinvestment * (Math.pow(1 + equityStructure.preferredReturn / 100, holdPeriod) - 1);

  // LP preferred return
  const lpPreferredPaid = Math.min(remainingCashFlow, lpPreferredAmount);
  distributions.lp += lpPreferredPaid;
  remainingCashFlow -= lpPreferredPaid;

  steps.push({
    tier: "LP Preferred Return",
    description: `LP receives ${equityStructure.preferredReturn}% compounded preferred return`,
    lpAmount: lpPreferredPaid,
    gpAmount: 0,
    totalAmount: lpPreferredPaid,
    remainingCashFlow: remainingCashFlow
  });

  // GP preferred return on co-investment
  if (gpCoinvestment > 0 && remainingCashFlow > 0) {
    const gpPreferredPaid = Math.min(remainingCashFlow, gpPreferredAmount);
    distributions.gp += gpPreferredPaid;
    remainingCashFlow -= gpPreferredPaid;

    steps.push({
      tier: "GP Preferred Return",
      description: `GP receives ${equityStructure.preferredReturn}% preferred on co-investment`,
      lpAmount: 0,
      gpAmount: gpPreferredPaid,
      totalAmount: gpPreferredPaid,
      remainingCashFlow: remainingCashFlow
    });
  }

  // Step 3: GP Catch-up (if applicable)
  if (equityStructure.catchUp && remainingCashFlow > 0) {
    // Calculate total distributions so far
    const totalDistributedSoFar = distributions.lp + distributions.gp;
    
    // GP needs to catch up to their target promote percentage
    const targetGPAmount = (totalDistributedSoFar / (1 - equityStructure.targetGPPromote / 100)) * (equityStructure.targetGPPromote / 100);
    const gpCatchUpNeeded = Math.max(0, targetGPAmount - distributions.gp);
    
    // GP gets catch-up split (often 100%) until they reach target
    const catchUpAmount = Math.min(remainingCashFlow, gpCatchUpNeeded);
    const gpCatchUpShare = catchUpAmount * (equityStructure.catchUpSplit / 100);
    const lpCatchUpShare = catchUpAmount * (1 - equityStructure.catchUpSplit / 100);
    
    distributions.gp += gpCatchUpShare;
    distributions.lp += lpCatchUpShare;
    remainingCashFlow -= catchUpAmount;

    steps.push({
      tier: "GP Catch-up",
      description: `GP receives ${equityStructure.catchUpSplit}% until reaching ${equityStructure.targetGPPromote}% of total`,
      lpAmount: lpCatchUpShare,
      gpAmount: gpCatchUpShare,
      totalAmount: catchUpAmount,
      remainingCashFlow: remainingCashFlow
    });
  }

  // Step 4: Carried Interest/Promote Splits
  if (remainingCashFlow > 0) {
    // Find applicable tier based on project IRR
    const applicableTier = waterfallTiers.find(
      tier => actualIRR >= tier.minIRR && actualIRR < tier.maxIRR
    );

    if (applicableTier) {
      const lpAmount = remainingCashFlow * (applicableTier.lpShare / 100);
      const gpAmount = remainingCashFlow * (applicableTier.gpShare / 100);

      distributions.lp += lpAmount;
      distributions.gp += gpAmount;

      steps.push({
        tier: `Promote Split (${applicableTier.minIRR}-${applicableTier.maxIRR}% IRR)`,
        description: `Remaining profits split ${applicableTier.lpShare}% LP / ${applicableTier.gpShare}% GP`,
        lpAmount: lpAmount,
        gpAmount: gpAmount,
        totalAmount: remainingCashFlow,
        remainingCashFlow: 0
      });
    } else {
      // Default to last tier if IRR exceeds all tiers
      const lastTier = waterfallTiers[waterfallTiers.length - 1];
      const lpAmount = remainingCashFlow * (lastTier.lpShare / 100);
      const gpAmount = remainingCashFlow * (lastTier.gpShare / 100);

      distributions.lp += lpAmount;
      distributions.gp += gpAmount;

      steps.push({
        tier: `Promote Split (>${lastTier.minIRR}% IRR)`,
        description: `Remaining profits split ${lastTier.lpShare}% LP / ${lastTier.gpShare}% GP`,
        lpAmount: lpAmount,
        gpAmount: gpAmount,
        totalAmount: remainingCashFlow,
        remainingCashFlow: 0
      });
    }
  }

  // Calculate individual partner returns
  const lpTotalCashFlow = distributions.lp;
  const gpTotalCashFlow = distributions.gp;
  
  const lpMultiple = lpCapital > 0 ? lpTotalCashFlow / lpCapital : 0;
  const gpMultiple = gpCoinvestment > 0 ? gpTotalCashFlow / gpCoinvestment : Infinity;

  // Simple IRR approximation (for display purposes)
  // In production, use proper IRR calculation with actual cash flow timing
  const lpIRR = lpCapital > 0 
    ? (Math.pow(lpMultiple, 1 / holdPeriod) - 1) * 100 
    : 0;
  const gpIRR = gpCoinvestment > 0 
    ? (Math.pow(gpMultiple, 1 / holdPeriod) - 1) * 100 
    : actualIRR; // GP IRR is complex due to promote

  return {
    distributions,
    steps,
    individualReturns: {
      lpIRR,
      gpIRR,
      lpMultiple,
      gpMultiple
    }
  };
}

/**
 * Validate waterfall structure
 */
export function validateWaterfallStructure(
  equityStructure: EquityStructure,
  waterfallTiers: WaterfallTier[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate equity split
  if (equityStructure.lpEquity + equityStructure.gpEquity !== 100) {
    errors.push("LP + GP equity must equal 100%");
  }

  // Validate preferred return
  if (equityStructure.preferredReturn < 0 || equityStructure.preferredReturn > 20) {
    errors.push("Preferred return should be between 0% and 20%");
  }

  // Validate GP co-invest
  if (equityStructure.gpCoinvest < 0 || equityStructure.gpCoinvest > 100) {
    errors.push("GP co-investment must be between 0% and 100%");
  }

  // Validate waterfall tiers
  for (let i = 0; i < waterfallTiers.length; i++) {
    const tier = waterfallTiers[i];
    
    // Check LP + GP = 100%
    if (tier.lpShare + tier.gpShare !== 100) {
      errors.push(`Tier ${i + 1}: LP + GP shares must equal 100%`);
    }

    // Check continuity
    if (i > 0) {
      const prevTier = waterfallTiers[i - 1];
      if (tier.minIRR !== prevTier.maxIRR) {
        errors.push(`Gap between tier ${i} and ${i + 1}`);
      }
    }

    // Check GP share increases
    if (i > 0) {
      const prevTier = waterfallTiers[i - 1];
      if (tier.gpShare < prevTier.gpShare) {
        errors.push(`GP share should not decrease in higher tiers`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}