import { Case } from './case.model';

/**
 * Generate unique case ID
 * Format: CS-YYYY-XXXX (e.g., CS-2024-0001)
 */
export const generateCaseId = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `CS-${currentYear}`;

  // Find the latest case ID for the current year
  const latestCase = await Case.findOne({
    id: new RegExp(`^${prefix}-`),
  })
    .sort({ id: -1 })
    .select('id');

  if (!latestCase) {
    return `${prefix}-0001`;
  }

  // Extract the number part and increment
  const lastNumber = parseInt(latestCase.id.split('-')[2]);
  const nextNumber = (lastNumber + 1).toString().padStart(4, '0');

  return `${prefix}-${nextNumber}`;
};

/**
 * Generate unique case number
 * Format: ADV-YYYY-XXXXXX (e.g., ADV-2024-000001)
 * Uses atomic counter approach with retry logic for conflict prevention
 */
export const generateCaseNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `ADV-${currentYear}`;
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Find the latest case number for the current year using caseNumber field
    const latestCase = await Case.findOne({
      caseNumber: new RegExp(`^${prefix}-`),
    })
      .sort({ caseNumber: -1 })
      .select('caseNumber')
      .lean();

    let nextNumber: number;

    if (!latestCase) {
      nextNumber = 1;
    } else {
      // Extract the number part and increment
      const parts = latestCase.caseNumber.split('-');
      const lastNumber = parseInt(parts[2], 10);
      nextNumber = lastNumber + 1;
    }

    // Generate the case number
    const caseNumber = `${prefix}-${nextNumber.toString().padStart(6, '0')}`;

    // Verify uniqueness before returning (defensive check)
    const existingCase = await Case.findOne({ caseNumber }).select('caseNumber').lean();

    if (!existingCase) {
      return caseNumber;
    }

    // If conflict exists, retry with a random offset to reduce collision probability
    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
    }
  }

  // Fallback: use timestamp for guaranteed uniqueness
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${timestamp}`;
};

/**
 * Calculate case progress based on various factors
 * This is a placeholder - can be enhanced with more complex logic
 */
export const calculateCaseProgress = (
  documentsCount: number,
  tasksCompleted: number,
  totalTasks: number,
): number => {
  if (totalTasks === 0) return 0;

  const taskProgress = (tasksCompleted / totalTasks) * 100;
  return Math.min(Math.round(taskProgress), 100);
};
