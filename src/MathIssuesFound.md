# Math Issues Found in Real Estate Pro Forma V2

## 1. **Division by Zero Risks**

### Cap Rate Calculations
- **Location**: Cash flow calculations for exit value
- **Issue**: If `operatingAssumptions.capRate` is 0, division by zero occurs
- **Fix Needed**: Add validation to ensure cap rate > 0 before division

### Cost Per SF Calculations
- **Location**: Validation warnings section
- **Issue**: If `buildingGFA` is 0, division by zero when calculating cost/SF
- **Current Protection**: Uses conditional checks, but should be more explicit

## 2. **Soft Cost Developer Fee Calculation**

### Original Issue (Now Fixed)
- Developer fee was being calculated correctly (on total before fee)
- The fix properly calculates: `totalBeforeDeveloperFee * developerFee / 100`

## 3. **For-Sale Property Issues (Now Fixed)**

### Unit Count Issue
- Was using apartment unitMix (65 units) instead of salesAssumptions.totalUnits
- Now correctly uses getTotalUnitCount() which returns salesAssumptions.totalUnits

### Site Work Calculation
- Now properly updates when unit count changes
- Correctly includes landscaping in site work total when enabled

## 4. **Potential Edge Cases Still Present**

### Negative Values
1. **Land Cost**: No validation preventing negative land cost
2. **Construction Costs**: No validation for negative $/SF values
3. **Rental Rates**: No validation for negative rents

### Loan Calculations
1. **LTC > 100%**: No validation to prevent loan-to-cost exceeding 100%
2. **Interest Rate**: No upper bound validation (could have 100%+ rates)
3. **Average Outstanding**: Could exceed 100% theoretically

### IRR Calculation
- Good error handling exists in irrCalculator.ts
- Handles edge cases like all positive/negative cash flows
- Newton-Raphson with bisection fallback

## 5. **Rounding and Precision Issues**

### Currency Display
- Uses Intl.NumberFormat which is good
- Should ensure all currency calculations round to nearest cent internally

### Percentage Calculations
- Some percentages might accumulate rounding errors
- Example: Multiple percentage-based fees could compound errors

## 6. **Property-Specific Calculation Issues**

### Cottonwood Heights
1. Public financing contributions are subtracted from hard costs
   - Could result in negative hard costs if contributions > costs
2. TIF calculations depend on cap rate (division by zero risk)
3. Townhome sales spread over 3 years is hardcoded

### Apartment Properties
1. Unit mix validation exists but could be stricter
2. No validation that total unit SF ≤ building GFA

### For-Sale Properties
1. Sales pace validation missing (could be 0 or negative)
2. Price escalation not capped (could be 100%+ per year)
3. Deposit structure percentages don't validate to 100%

## 7. **Time-Based Calculations**

### Construction Interest
- Correctly uses monthly rate calculation
- But no validation on construction period length

### Hold Period
- No validation on maximum hold period
- Very long hold periods could cause calculation overflow

## 8. **Recommended Fixes**

1. **Add Input Validation Layer**
   ```typescript
   const validateInputs = () => {
     if (operatingAssumptions.capRate <= 0) {
       addWarning('Cap rate must be greater than 0');
     }
     if (constructionLoan.ltc > 100) {
       addWarning('LTC cannot exceed 100%');
     }
     // etc.
   };
   ```

2. **Add Safe Division Function**
   ```typescript
   const safeDivide = (numerator: number, denominator: number, fallback = 0) => {
     if (denominator === 0 || !isFinite(denominator)) return fallback;
     return numerator / denominator;
   };
   ```

3. **Add Bounds Checking**
   ```typescript
   const clamp = (value: number, min: number, max: number) => {
     return Math.min(Math.max(value, min), max);
   };
   ```

4. **Add Calculation Sanity Checks**
   - Total development cost should be positive
   - NOI should be less than gross revenue
   - Exit value should be positive
   - IRR should be between -100% and reasonable upper bound

## 9. **Test Coverage Needed**

1. Edge case testing for all property types
2. Boundary value testing (0, negative, very large numbers)
3. Calculation cascade testing (change one input, verify all dependent calcs)
4. Rounding error accumulation tests
5. Performance tests with extreme values