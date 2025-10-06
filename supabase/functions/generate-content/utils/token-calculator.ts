export function calculateTokenCost(
  baseCost: number,
  costMultipliers: Record<string, number>,
  parameters: Record<string, any>
): number {
  let totalCost = baseCost;
  
  // Apply multipliers based on parameters
  for (const [multiplierKey, multiplierValue] of Object.entries(costMultipliers)) {
    if (typeof multiplierValue !== 'number') continue;
    
    // Check if multiplierKey matches any parameter's VALUE (e.g., quality="HD" matches HD: 1.5)
    const matchingParam = Object.entries(parameters).find(
      ([_, value]) => value === multiplierKey
    );
    
    if (matchingParam) {
      totalCost *= multiplierValue;
      continue;
    }
    
    // Otherwise check if it's a parameter NAME with specific types
    const paramValue = parameters[multiplierKey];
    
    if (paramValue !== undefined && paramValue !== null && paramValue !== false) {
      // Boolean multiplier (e.g., hd: true with hd: 1.5)
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
  
  return Math.ceil(totalCost);
}
