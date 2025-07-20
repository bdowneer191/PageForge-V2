import { Recommendation } from '../types.ts';

const callApi = async (action: string, payload: any, userId: string) => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload, userId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'An error occurred with the AI service.');
    }
    return response.json();
  } catch (error) {
    console.error(`Error in AI service call (${action}):`, error);
    throw error;
  }
}

export const generateOptimizationPlan = async (pageSpeedReport: any, userId: string): Promise<Recommendation[]> => {
  try {
    const { recommendations } = await callApi('plan', { pageSpeedReport }, userId);
    return recommendations;
  } catch (error) {
    return [{ title: 'Error', description: 'Failed to generate an AI optimization plan. The AI service may be temporarily unavailable or misconfigured.', priority: 'High' }];
  }
};

export const generateComparisonAnalysis = async (reportBefore: any, reportAfter: any, userId: string) => {
  try {
    const { analysis } = await callApi('compare', { reportBefore, reportAfter }, userId);
    return analysis;
  } catch (error) {
    return null;
  }
};

export const rewriteToSemanticHtml = async (html: string, userId: string): Promise<string> => {
  try {
    const { rewrittenHtml } = await callApi('rewrite', { html }, userId);
    return rewrittenHtml;
  } catch (error) {
    console.warn("Semantic rewrite failed, returning original HTML.", error);
    return html;
  }
};