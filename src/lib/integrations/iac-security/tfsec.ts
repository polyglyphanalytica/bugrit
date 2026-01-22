// tfsec Integration (Placeholder)
// TODO: Implement full integration

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult } from '../types';

export class TfsecIntegration implements ToolIntegration {
  name = 'tfsec';
  category = 'iac-security' as const;
  description = 'Static analysis security scanner for Terraform code';
  website = 'https://github.com/aquasecurity/tfsec';

  async isAvailable(): Promise<boolean> {
    return false;
  }

  getDefaultConfig(): ToolConfig {
    return { enabled: false };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    return {
      tool: this.name,
      category: this.category,
      success: false,
      duration: 0,
      findings: [],
      summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
      error: 'Integration not yet implemented',
    };
  }
}
