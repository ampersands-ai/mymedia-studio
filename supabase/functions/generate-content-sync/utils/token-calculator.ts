export function calculateTokenCost(
  baseCost: number,
  costMultipliers: Record<string, any>, // Now can be nested
  parameters: Record<string, any>
): number {
  let totalCost = baseCost;
  
  for (const [paramName, multiplierConfig] of Object.entries(costMultipliers)) {
    const paramValue = parameters[paramName];
    
    if (paramValue === undefined || paramValue === null) continue;
    
    // Handle nested object (parameter-first structure)
    // Example: { "quality": { "Standard": 1, "HD": 1.5 } }
    if (typeof multiplierConfig === 'object' && !Array.isArray(multiplierConfig)) {
      // Get multiplier for the specific value, default to 1 if not defined
      const multiplier = multiplierConfig[paramValue] ?? 1;
      if (typeof multiplier === 'number') {
        totalCost *= multiplier;
      }
    }
    // Legacy: Handle flat number (for backward compatibility)
    else if (typeof multiplierConfig === 'number') {
      // Boolean multiplier (e.g., hd: true with hd: 1.5)
      if (typeof paramValue === 'boolean' && paramValue === true) {
        totalCost *= multiplierConfig;
      }
      // Fixed cost addition (e.g., uploaded_image: 10 means add 10 per image)
      else if (typeof paramValue === 'number') {
        totalCost += (multiplierConfig * paramValue);
      }
      // Array length (e.g., images: [file1, file2])
      else if (Array.isArray(paramValue)) {
        totalCost += (multiplierConfig * paramValue.length);
      }
    }
  }
  
  return Math.ceil(totalCost);
}
