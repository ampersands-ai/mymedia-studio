export function calculateTokenCost(
  baseCost: number,
  costMultipliers: Record<string, number>,
  parameters: Record<string, any>
): number {
  let totalCost = baseCost;
  
  // Apply multipliers based on parameters
  for (const [key, multiplierValue] of Object.entries(costMultipliers)) {
    const paramValue = parameters[key];
    
    if (paramValue !== undefined && paramValue !== null && paramValue !== false) {
      if (typeof multiplierValue === 'number') {
        // Direct multiplier (e.g., hd: 1.5 means multiply base by 1.5)
        if (typeof paramValue === 'boolean' && paramValue === true) {
          totalCost *= multiplierValue;
        }
        // Fixed cost addition (e.g., uploaded_image: 10 means add 10 per image)
        else if (typeof paramValue === 'number') {
          totalCost += (multiplierValue * paramValue);
        }
        // Array length (e.g., images: [file1, file2])
        else if (Array.isArray(paramValue)) {
          totalCost += (multiplierValue * paramValue.length);
        }
      }
    }
  }
  
  return Math.ceil(totalCost);
}
