/**
 * AI Intelligence Reports API
 *
 * GET /api/v1/reports/ai?scan_id=xxx - Get AI intelligence report for a scan
 * POST /api/v1/reports/ai - Generate AI intelligence report for a scan
 *
 * The AI report includes:
 * - Executive summary with risk assessment
 * - Finding correlation and deduplication
 * - Prioritized action items
 * - Code patterns and trends
 * - Smart recommendations
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, getRateLimitHeaders } from '@/lib/api/auth';
import { successResponse, handleError, Errors } from '@/lib/api/errors';
import { getScan, getIssuesByScan } from '@/lib/api/store';
import { getProject } from '@/lib/db/v1-api';
import {
  FindingIntelligence,
  ReportGenerator,
  type IntelligenceReport,
  type ExecutiveSummary,
  type DeveloperReport,
} from '@/lib/integrations/ai';
import { AuditResult, AuditFinding, Severity } from '@/lib/integrations/types';
import { SUBSCRIPTION_TIERS } from '@/lib/billing/credits';
import { logger } from '@/lib/logger';

interface AIReportResponse {
  scanId: string;
  generatedAt: string;
  intelligence: IntelligenceReport;
  executiveSummary: ExecutiveSummary;
  developerReport: DeveloperReport;
  format: 'full' | 'summary' | 'executive';
}

/**
 * Convert scan issues to AuditFindings for AI processing
 */
function convertIssuesToFindings(
  issues: Array<{
    id: string;
    title: string;
    description?: string;
    severity: Severity;
    type: string;
    tool?: string;
    file?: string;
    location?: { file?: string; line?: number; column?: number };
  }>
): AuditFinding[] {
  return issues.map((issue) => ({
    id: issue.id,
    tool: issue.tool || 'unknown',
    category: 'code-quality' as const, // Default category
    severity: issue.severity,
    title: issue.title,
    description: issue.description || issue.title,
    explanation: `This issue was detected by ${issue.tool || 'the scanner'}.`,
    impact: getSeverityImpact(issue.severity),
    file: issue.location?.file || issue.file,
    line: issue.location?.line,
    column: issue.location?.column,
    recommendation: `Review and fix this ${issue.severity} severity issue.`,
    effort: 'moderate' as const,
    tags: [issue.type || 'general'],
    aiPrompt: {
      short: `Explain and fix: ${issue.title}`,
      detailed: `Analyze this ${issue.severity} issue: ${issue.title}. ${issue.description || ''}`,
      steps: [
        'Review the issue context',
        'Identify the root cause',
        'Apply the recommended fix',
        'Verify the fix works correctly',
      ],
    },
  }));
}

/**
 * Get impact description based on severity
 */
function getSeverityImpact(severity: Severity): string {
  switch (severity) {
    case 'critical':
      return 'This is a critical issue that could cause severe security vulnerabilities or system failures.';
    case 'high':
      return 'This is a high-priority issue that should be addressed soon to prevent potential problems.';
    case 'medium':
      return 'This issue should be addressed to maintain code quality and prevent future issues.';
    case 'low':
      return 'This is a minor issue that can be addressed during regular maintenance.';
    case 'info':
      return 'This is an informational finding for awareness.';
    default:
      return 'Review this issue for potential improvements.';
  }
}

/**
 * GET /api/v1/reports/ai
 * Get AI intelligence report for a scan
 */
export async function GET(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, 'reports:read');

    const url = new URL(request.url);
    const scanId = url.searchParams.get('scan_id');
    const format = (url.searchParams.get('format') || 'full') as 'full' | 'summary' | 'executive';

    if (!scanId) {
      return Errors.missingField('scan_id');
    }

    // Check if user's tier includes AI reports
    const tierConfig = SUBSCRIPTION_TIERS[context.tier as keyof typeof SUBSCRIPTION_TIERS];
    if (!tierConfig?.features?.aiFeatures?.length) {
      return Errors.validationError(
        'AI reports require a paid subscription. Upgrade to access AI-powered analysis.',
        { currentTier: context.tier, requiredTier: 'starter' }
      );
    }

    // Get scan
    const scan = await getScan(scanId);
    if (!scan) {
      return Errors.notFound('Scan');
    }

    // Verify access
    const project = await getProject(scan.projectId);
    if (!project || project.organizationId !== context.organizationId) {
      return Errors.forbidden();
    }

    // Check scan is completed
    if (scan.status !== 'completed') {
      return Errors.validationError('Cannot generate AI report for incomplete scan', {
        scanStatus: scan.status,
      });
    }

    // Get issues from the scan
    const issues = await getIssuesByScan(scanId);

    if (issues.length === 0) {
      return successResponse({
        scanId,
        generatedAt: new Date().toISOString(),
        message: 'No issues found - your code looks good!',
        intelligence: null,
        executiveSummary: {
          headline: 'Clean Code Report',
          riskLevel: 'healthy',
          riskScore: 0,
          keyMetrics: {
            totalIssues: 0,
            criticalCount: 0,
            securityRisk: 'None',
            complianceStatus: 'Passing',
            technicalDebt: 'Low',
          },
          topConcerns: [],
          positiveNotes: ['No issues detected in this scan'],
          immediateActions: [],
          estimatedFixTime: '0 minutes',
        },
        format,
      });
    }

    // Convert issues to audit findings
    const findings = convertIssuesToFindings(issues);

    // Create audit result for FindingIntelligence
    const auditResults: AuditResult[] = [{
      tool: 'aggregated',
      category: 'code-quality',
      success: true,
      duration: 0,
      findings,
      summary: {
        total: findings.length,
        bySeverity: {
          critical: findings.filter(f => f.severity === 'critical').length,
          high: findings.filter(f => f.severity === 'high').length,
          medium: findings.filter(f => f.severity === 'medium').length,
          low: findings.filter(f => f.severity === 'low').length,
          info: findings.filter(f => f.severity === 'info').length,
        },
        passed: 0,
        failed: findings.length,
      },
    }];

    // Generate intelligence report
    const intelligence = new FindingIntelligence(auditResults);
    const intelligenceReport = intelligence.generateReport();

    // Generate human-readable reports
    const generator = new ReportGenerator(intelligenceReport, findings);
    const executiveSummary = generator.generateExecutiveSummary();
    const developerReport = generator.generateDeveloperReport();

    const response: AIReportResponse = {
      scanId,
      generatedAt: new Date().toISOString(),
      intelligence: intelligenceReport,
      executiveSummary,
      developerReport,
      format,
    };

    // Trim response based on requested format
    if (format === 'executive') {
      return successResponse({
        scanId: response.scanId,
        generatedAt: response.generatedAt,
        executiveSummary: response.executiveSummary,
        format: 'executive',
      });
    }

    if (format === 'summary') {
      return successResponse({
        scanId: response.scanId,
        generatedAt: response.generatedAt,
        executiveSummary: response.executiveSummary,
        intelligence: {
          totalRawFindings: intelligenceReport.totalRawFindings,
          totalGroupedFindings: intelligenceReport.totalGroupedFindings,
          deduplicationRate: intelligenceReport.deduplicationRate,
          topIssues: intelligenceReport.topIssues,
          recommendations: intelligenceReport.recommendations,
        },
        format: 'summary',
      });
    }

    const fullResponse = successResponse(response);

    // Add rate limit headers
    const rateLimitHeaders = getRateLimitHeaders(context);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      fullResponse.headers.set(key, value);
    });

    return fullResponse;
  } catch (error) {
    logger.error('AI report generation error', { error });
    return handleError(error);
  }
}

/**
 * POST /api/v1/reports/ai
 * Generate and store AI intelligence report for a scan
 */
export async function POST(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, 'reports:write');

    const body = await request.json();
    const { scanId, format = 'full' } = body;

    if (!scanId) {
      return Errors.missingField('scanId');
    }

    // Check if user's tier includes AI reports
    const tierConfig = SUBSCRIPTION_TIERS[context.tier as keyof typeof SUBSCRIPTION_TIERS];
    if (!tierConfig?.features?.aiFeatures?.length) {
      return Errors.validationError(
        'AI reports require a paid subscription. Upgrade to access AI-powered analysis.',
        { currentTier: context.tier, requiredTier: 'starter' }
      );
    }

    // Get scan
    const scan = await getScan(scanId);
    if (!scan) {
      return Errors.notFound('Scan');
    }

    // Verify access
    const project = await getProject(scan.projectId);
    if (!project || project.organizationId !== context.organizationId) {
      return Errors.forbidden();
    }

    // Check scan is completed
    if (scan.status !== 'completed') {
      return Errors.validationError('Cannot generate AI report for incomplete scan', {
        scanStatus: scan.status,
      });
    }

    // Get issues from the scan
    const issues = await getIssuesByScan(scanId);
    const findings = convertIssuesToFindings(issues);

    // Create audit results
    const auditResults: AuditResult[] = [{
      tool: 'aggregated',
      category: 'code-quality',
      success: true,
      duration: 0,
      findings,
      summary: {
        total: findings.length,
        bySeverity: {
          critical: findings.filter(f => f.severity === 'critical').length,
          high: findings.filter(f => f.severity === 'high').length,
          medium: findings.filter(f => f.severity === 'medium').length,
          low: findings.filter(f => f.severity === 'low').length,
          info: findings.filter(f => f.severity === 'info').length,
        },
        passed: 0,
        failed: findings.length,
      },
    }];

    // Generate intelligence report
    const intelligence = new FindingIntelligence(auditResults);
    const intelligenceReport = intelligence.generateReport();

    // Generate human-readable reports
    const generator = new ReportGenerator(intelligenceReport, findings);
    const executiveSummary = generator.generateExecutiveSummary();
    const developerReport = generator.generateDeveloperReport();

    const response: AIReportResponse = {
      scanId,
      generatedAt: new Date().toISOString(),
      intelligence: intelligenceReport,
      executiveSummary,
      developerReport,
      format,
    };

    logger.info('AI report generated', {
      scanId,
      totalFindings: findings.length,
      groupedFindings: intelligenceReport.totalGroupedFindings,
      deduplicationRate: intelligenceReport.deduplicationRate,
    });

    const fullResponse = successResponse(response, 201);

    // Add rate limit headers
    const rateLimitHeaders = getRateLimitHeaders(context);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      fullResponse.headers.set(key, value);
    });

    return fullResponse;
  } catch (error) {
    logger.error('AI report generation error', { error });
    return handleError(error);
  }
}
