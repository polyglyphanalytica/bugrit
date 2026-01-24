// OpenAPI Diff Integration - API Schema Change Detection
// License: Apache 2.0
// Website: https://github.com/OpenAPITools/openapi-diff

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface OpenAPIDiffChange {
  method: string;
  pathUrl: string;
  messages: string[];
}

interface OpenAPIDiffResult {
  newEndpoints: OpenAPIDiffChange[];
  missingEndpoints: OpenAPIDiffChange[];
  changedOperations: Array<{
    pathUrl: string;
    httpMethod: string;
    newRequestBody?: { description: string };
    missingRequestBody?: { description: string };
    changedParameters?: Array<{
      name: string;
      in: string;
      newParameter?: boolean;
      missingParameter?: boolean;
      deprecated?: boolean;
      required?: { oldValue: boolean; newValue: boolean };
    }>;
    changedResponses?: Array<{
      httpStatusCode: string;
      newResponse?: boolean;
      missingResponse?: boolean;
      changedContent?: Array<{
        mediaType: string;
        changedSchema?: { description: string };
      }>;
    }>;
  }>;
  compatible: boolean;
  incompatible: boolean;
}

export class OpenAPIDiffIntegration implements ToolIntegration {
  name = 'openapi-diff';
  category = 'api-schema' as const;
  description = 'Detects breaking and non-breaking changes between OpenAPI specifications';
  website = 'https://github.com/OpenAPITools/openapi-diff';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx openapi-diff --version', { stdio: 'ignore', timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        failOnIncompatible: true,
        outputFormat: 'json',
      },
    };
  }

  async run(target: AuditTarget, _config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');

      // Need both old and new specs for diff
      if (!target.apiSpec) {
        return this.createErrorResult('No API spec provided. Set target.apiSpec with the new spec path.', startTime);
      }

      // Look for a baseline spec to compare against
      const fs = await import('fs');
      const path = await import('path');
      const targetDir = target.directory || '.';

      // Common locations for baseline specs
      const baselinePaths = [
        path.join(targetDir, '.openapi-baseline.yaml'),
        path.join(targetDir, '.openapi-baseline.json'),
        path.join(targetDir, 'openapi.baseline.yaml'),
        path.join(targetDir, 'openapi.baseline.json'),
      ];

      let baselineSpec: string | null = null;
      for (const bp of baselinePaths) {
        if (fs.existsSync(bp)) {
          baselineSpec = bp;
          break;
        }
      }

      if (!baselineSpec) {
        // If no baseline, create one and report no changes
        return {
          tool: this.name,
          category: this.category,
          success: true,
          duration: Date.now() - startTime,
          findings: [],
          summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 1, failed: 0 },
          metadata: { message: 'No baseline spec found. Create .openapi-baseline.yaml for future comparisons.' },
        };
      }

      const result = execSync(
        `npx openapi-diff "${baselineSpec}" "${target.apiSpec}" --json`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, timeout: 60000 }
      );

      if (result.trim()) {
        const diff: OpenAPIDiffResult = JSON.parse(result);

        // Process breaking changes (missing endpoints)
        for (const endpoint of diff.missingEndpoints || []) {
          findings.push(this.createBreakingChangeFinding(endpoint, 'endpoint_removed'));
        }

        // Process changed operations
        for (const change of diff.changedOperations || []) {
          // Check for breaking parameter changes
          for (const param of change.changedParameters || []) {
            if (param.missingParameter) {
              findings.push(this.createParameterFinding(change, param, 'removed'));
            }
            if (param.required?.newValue && !param.required?.oldValue) {
              findings.push(this.createParameterFinding(change, param, 'required'));
            }
          }

          // Check for breaking response changes
          for (const response of change.changedResponses || []) {
            if (response.missingResponse) {
              findings.push(this.createResponseFinding(change, response, 'removed'));
            }
          }

          // Request body changes
          if (change.missingRequestBody) {
            findings.push(this.createRequestBodyFinding(change, 'removed'));
          }
        }

        // New endpoints are informational
        for (const endpoint of diff.newEndpoints || []) {
          findings.push(this.createNewEndpointFinding(endpoint));
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        const stdout = (error as { stdout: string }).stdout;
        if (stdout.trim()) {
          try {
            const diff: OpenAPIDiffResult = JSON.parse(stdout);
            if (diff.incompatible) {
              findings.push({
                id: `openapi-diff-incompatible`,
                tool: this.name,
                category: this.category,
                severity: 'high',
                title: 'API Breaking Changes Detected',
                description: 'The API specification contains breaking changes that may affect consumers.',
                explanation: 'Breaking API changes can cause client applications to fail. These should be carefully managed through versioning.',
                impact: 'Existing API consumers may experience failures after deployment.',
                recommendation: 'Version your API appropriately and communicate changes to consumers.',
                aiPrompt: {
                  short: 'Review API breaking changes',
                  detailed: 'Breaking changes detected in API specification. Review changes and ensure proper versioning.',
                  steps: ['Review all breaking changes', 'Update API version', 'Communicate changes to consumers', 'Update documentation'],
                },
                ruleId: 'breaking-change',
                tags: ['openapi', 'breaking-change', 'api-compatibility'],
                effort: 'moderate',
              });
            }
            return this.createResult(findings, Date.now() - startTime);
          } catch { /* Parse error */ }
        }
      }

      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error', startTime);
    }
  }

  private createBreakingChangeFinding(endpoint: OpenAPIDiffChange, type: string): AuditFinding {
    return {
      id: `openapi-diff-${type}-${endpoint.method}-${endpoint.pathUrl}`,
      tool: this.name,
      category: this.category,
      severity: 'high',
      title: `API Breaking Change: ${endpoint.method.toUpperCase()} ${endpoint.pathUrl} removed`,
      description: `The endpoint ${endpoint.method.toUpperCase()} ${endpoint.pathUrl} was removed from the API specification.`,
      explanation: 'Removing an API endpoint is a breaking change that will cause existing clients to fail when they attempt to call this endpoint.',
      impact: 'Clients using this endpoint will receive 404 errors after deployment.',
      recommendation: `Keep the endpoint available or deprecate it gradually. If removal is necessary, bump the major API version.`,
      aiPrompt: {
        short: `Handle removal of ${endpoint.method.toUpperCase()} ${endpoint.pathUrl}`,
        detailed: `API endpoint removed:\n\nMethod: ${endpoint.method.toUpperCase()}\nPath: ${endpoint.pathUrl}\n\nThis is a breaking change. Either restore the endpoint, deprecate it gradually, or bump the API major version.`,
        steps: ['Decide if removal is intentional', 'If keeping, restore the endpoint', 'If removing, bump major version', 'Update API documentation', 'Notify API consumers'],
      },
      ruleId: 'endpoint-removed',
      tags: ['openapi', 'breaking-change', 'endpoint-removed'],
      effort: 'moderate',
    };
  }

  private createParameterFinding(
    change: OpenAPIDiffResult['changedOperations'][0],
    param: NonNullable<OpenAPIDiffResult['changedOperations'][0]['changedParameters']>[0],
    type: 'removed' | 'required'
  ): AuditFinding {
    const severity: Severity = type === 'removed' ? 'high' : 'medium';
    const title = type === 'removed'
      ? `Parameter removed: ${param.name} in ${change.httpMethod.toUpperCase()} ${change.pathUrl}`
      : `Parameter now required: ${param.name} in ${change.httpMethod.toUpperCase()} ${change.pathUrl}`;

    return {
      id: `openapi-diff-param-${type}-${change.httpMethod}-${change.pathUrl}-${param.name}`,
      tool: this.name,
      category: this.category,
      severity,
      title,
      description: type === 'removed'
        ? `Parameter "${param.name}" (${param.in}) was removed from ${change.httpMethod.toUpperCase()} ${change.pathUrl}.`
        : `Parameter "${param.name}" (${param.in}) is now required in ${change.httpMethod.toUpperCase()} ${change.pathUrl}.`,
      explanation: type === 'removed'
        ? 'Removing a parameter is a breaking change if clients are sending it.'
        : 'Making a parameter required is a breaking change as existing clients may not be sending it.',
      impact: 'Existing API clients may fail if they depend on this parameter behavior.',
      recommendation: type === 'removed'
        ? 'Keep the parameter as optional/deprecated if backwards compatibility is needed.'
        : 'Make the parameter optional with a default value, or bump the major API version.',
      aiPrompt: {
        short: `Fix parameter change: ${param.name}`,
        detailed: `Parameter ${type === 'removed' ? 'removed' : 'now required'}:\n\nEndpoint: ${change.httpMethod.toUpperCase()} ${change.pathUrl}\nParameter: ${param.name} (${param.in})\n\nReview if this breaking change is intentional.`,
        steps: ['Review the parameter change', 'Determine backwards compatibility needs', 'Update or revert change', 'Update documentation'],
      },
      ruleId: `parameter-${type}`,
      tags: ['openapi', 'breaking-change', 'parameter', type],
      effort: 'easy',
    };
  }

  private createResponseFinding(
    change: OpenAPIDiffResult['changedOperations'][0],
    response: NonNullable<OpenAPIDiffResult['changedOperations'][0]['changedResponses']>[0],
    type: 'removed'
  ): AuditFinding {
    return {
      id: `openapi-diff-response-${type}-${change.httpMethod}-${change.pathUrl}-${response.httpStatusCode}`,
      tool: this.name,
      category: this.category,
      severity: 'medium',
      title: `Response removed: ${response.httpStatusCode} from ${change.httpMethod.toUpperCase()} ${change.pathUrl}`,
      description: `Response code ${response.httpStatusCode} was removed from ${change.httpMethod.toUpperCase()} ${change.pathUrl}.`,
      explanation: 'Removing a documented response code may break clients that expect and handle this response.',
      impact: 'Clients may not properly handle the API response.',
      recommendation: 'Document all possible response codes. If the response is no longer returned, update clients.',
      aiPrompt: {
        short: `Review response change for ${change.pathUrl}`,
        detailed: `Response code removed:\n\nEndpoint: ${change.httpMethod.toUpperCase()} ${change.pathUrl}\nStatus Code: ${response.httpStatusCode}\n\nVerify this change is intentional.`,
        steps: ['Verify response is no longer returned', 'Update API documentation', 'Notify API consumers'],
      },
      ruleId: 'response-removed',
      tags: ['openapi', 'response-change', response.httpStatusCode],
      effort: 'easy',
    };
  }

  private createRequestBodyFinding(
    change: OpenAPIDiffResult['changedOperations'][0],
    type: 'removed'
  ): AuditFinding {
    return {
      id: `openapi-diff-body-${type}-${change.httpMethod}-${change.pathUrl}`,
      tool: this.name,
      category: this.category,
      severity: 'high',
      title: `Request body removed: ${change.httpMethod.toUpperCase()} ${change.pathUrl}`,
      description: `The request body was removed from ${change.httpMethod.toUpperCase()} ${change.pathUrl}.`,
      explanation: 'Removing a request body is a breaking change if clients are sending data in the request body.',
      impact: 'Clients sending request bodies will have their data ignored or receive errors.',
      recommendation: 'Keep accepting the request body or bump the major API version.',
      aiPrompt: {
        short: `Review request body removal for ${change.pathUrl}`,
        detailed: `Request body removed:\n\nEndpoint: ${change.httpMethod.toUpperCase()} ${change.pathUrl}\n\nThis is a breaking change for clients sending data.`,
        steps: ['Determine if removal is intentional', 'Keep body support or bump version', 'Update documentation'],
      },
      ruleId: 'request-body-removed',
      tags: ['openapi', 'breaking-change', 'request-body'],
      effort: 'moderate',
    };
  }

  private createNewEndpointFinding(endpoint: OpenAPIDiffChange): AuditFinding {
    return {
      id: `openapi-diff-new-${endpoint.method}-${endpoint.pathUrl}`,
      tool: this.name,
      category: this.category,
      severity: 'info',
      title: `New endpoint: ${endpoint.method.toUpperCase()} ${endpoint.pathUrl}`,
      description: `A new endpoint ${endpoint.method.toUpperCase()} ${endpoint.pathUrl} was added to the API specification.`,
      explanation: 'Adding new endpoints is a non-breaking change. Ensure the new endpoint is documented and tested.',
      impact: 'No impact on existing clients. New functionality available.',
      recommendation: 'Ensure the new endpoint has proper documentation, authentication, and test coverage.',
      aiPrompt: {
        short: `Review new endpoint ${endpoint.pathUrl}`,
        detailed: `New endpoint added:\n\nMethod: ${endpoint.method.toUpperCase()}\nPath: ${endpoint.pathUrl}\n\nEnsure proper documentation and testing.`,
        steps: ['Add API documentation', 'Add authentication if needed', 'Write tests', 'Update API changelog'],
      },
      ruleId: 'endpoint-added',
      tags: ['openapi', 'new-endpoint'],
      effort: 'trivial',
    };
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);

    return {
      tool: this.name,
      category: this.category,
      success: true,
      duration,
      findings,
      summary: {
        total: findings.length,
        bySeverity,
        passed: findings.filter(f => f.severity === 'info').length,
        failed: findings.filter(f => f.severity !== 'info').length,
      },
    };
  }

  private createErrorResult(error: string, startTime: number): AuditResult {
    return {
      tool: this.name,
      category: this.category,
      success: false,
      duration: Date.now() - startTime,
      findings: [],
      summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
      error,
    };
  }
}
