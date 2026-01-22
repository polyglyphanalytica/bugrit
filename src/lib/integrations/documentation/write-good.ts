// write-good Integration (Placeholder)
// TODO: Implement full integration

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult } from '../types';

export class WriteGoodIntegration implements ToolIntegration {
  name = 'write-good';
  category = 'documentation' as const;
  description = 'Naive linter for English prose that catches common writing issues';
  website = 'https://github.com/btford/write-good';

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
