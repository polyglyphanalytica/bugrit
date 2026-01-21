/**
 * Compliance Mapping Module
 *
 * Maps security findings to compliance frameworks:
 * - OWASP Top 10 (2021)
 * - CIS Controls v8
 * - SOC 2 Trust Principles
 * - PCI DSS v4.0
 * - NIST CSF
 * - ISO 27001
 */

import { AuditFinding, Severity } from '../integrations/types';
import { AuditReport } from '../integrations/orchestrator';

// ============================================================
// Compliance Framework Definitions
// ============================================================

export type ComplianceFramework = 'owasp-top-10' | 'cis-controls' | 'soc2' | 'pci-dss' | 'nist-csf' | 'iso-27001';

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  category?: string;
}

export interface ComplianceMapping {
  framework: ComplianceFramework;
  controlId: string;
  controlName: string;
  findingId: string;
  findingTitle: string;
  severity: Severity;
  status: 'pass' | 'fail' | 'partial';
}

export interface ComplianceReport {
  framework: ComplianceFramework;
  frameworkName: string;
  generatedAt: Date;
  projectId: string;

  // Overall status
  status: 'compliant' | 'non-compliant' | 'partial';
  score: number; // 0-100

  // Control breakdown
  controls: {
    total: number;
    passed: number;
    failed: number;
    partial: number;
    notApplicable: number;
  };

  // Detailed mappings
  controlResults: Array<{
    control: ComplianceControl;
    status: 'pass' | 'fail' | 'partial' | 'not-applicable';
    findings: string[];
    evidence?: string;
  }>;

  // Recommendations
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    controlId: string;
    description: string;
    remediation: string;
  }>;
}

// ============================================================
// OWASP Top 10 (2021)
// ============================================================

export const OWASP_TOP_10: Record<string, ComplianceControl> = {
  'A01': {
    id: 'A01:2021',
    name: 'Broken Access Control',
    description: 'Restrictions on what authenticated users are allowed to do are often not properly enforced.',
    category: 'Access Control',
  },
  'A02': {
    id: 'A02:2021',
    name: 'Cryptographic Failures',
    description: 'Failures related to cryptography which often lead to sensitive data exposure.',
    category: 'Cryptography',
  },
  'A03': {
    id: 'A03:2021',
    name: 'Injection',
    description: 'User-supplied data is not validated, filtered, or sanitized by the application.',
    category: 'Input Validation',
  },
  'A04': {
    id: 'A04:2021',
    name: 'Insecure Design',
    description: 'Missing or ineffective control design.',
    category: 'Design',
  },
  'A05': {
    id: 'A05:2021',
    name: 'Security Misconfiguration',
    description: 'Missing appropriate security hardening or improperly configured permissions.',
    category: 'Configuration',
  },
  'A06': {
    id: 'A06:2021',
    name: 'Vulnerable and Outdated Components',
    description: 'Using components with known vulnerabilities.',
    category: 'Dependencies',
  },
  'A07': {
    id: 'A07:2021',
    name: 'Identification and Authentication Failures',
    description: 'Confirmation of the user\'s identity, authentication, and session management.',
    category: 'Authentication',
  },
  'A08': {
    id: 'A08:2021',
    name: 'Software and Data Integrity Failures',
    description: 'Code and infrastructure that does not protect against integrity violations.',
    category: 'Integrity',
  },
  'A09': {
    id: 'A09:2021',
    name: 'Security Logging and Monitoring Failures',
    description: 'Without logging and monitoring, breaches cannot be detected.',
    category: 'Monitoring',
  },
  'A10': {
    id: 'A10:2021',
    name: 'Server-Side Request Forgery (SSRF)',
    description: 'SSRF flaws occur when a web application fetches a remote resource without validating the URL.',
    category: 'Input Validation',
  },
};

// ============================================================
// CIS Controls v8
// ============================================================

export const CIS_CONTROLS: Record<string, ComplianceControl> = {
  'CIS-1': { id: 'CIS-1', name: 'Inventory and Control of Enterprise Assets', description: 'Actively manage all enterprise assets connected to the infrastructure.' },
  'CIS-2': { id: 'CIS-2', name: 'Inventory and Control of Software Assets', description: 'Actively manage all software on the network.' },
  'CIS-3': { id: 'CIS-3', name: 'Data Protection', description: 'Develop processes and technical controls to identify, classify, and protect data.' },
  'CIS-4': { id: 'CIS-4', name: 'Secure Configuration of Enterprise Assets and Software', description: 'Establish and maintain secure configuration for enterprise assets and software.' },
  'CIS-5': { id: 'CIS-5', name: 'Account Management', description: 'Use processes and tools to assign and manage authorization to credentials.' },
  'CIS-6': { id: 'CIS-6', name: 'Access Control Management', description: 'Use processes and tools to create, assign, manage, and revoke access credentials.' },
  'CIS-7': { id: 'CIS-7', name: 'Continuous Vulnerability Management', description: 'Develop a plan to continuously assess and track vulnerabilities.' },
  'CIS-8': { id: 'CIS-8', name: 'Audit Log Management', description: 'Collect, alert, review, and retain audit logs of events.' },
  'CIS-9': { id: 'CIS-9', name: 'Email and Web Browser Protections', description: 'Improve protections and detections of threats from email and web vectors.' },
  'CIS-10': { id: 'CIS-10', name: 'Malware Defenses', description: 'Prevent or control the installation, spread, and execution of malicious applications.' },
  'CIS-11': { id: 'CIS-11', name: 'Data Recovery', description: 'Establish and maintain data recovery practices.' },
  'CIS-12': { id: 'CIS-12', name: 'Network Infrastructure Management', description: 'Establish and maintain the secure configuration of network devices.' },
  'CIS-13': { id: 'CIS-13', name: 'Network Monitoring and Defense', description: 'Operate processes and tools to establish and maintain network monitoring and defense.' },
  'CIS-14': { id: 'CIS-14', name: 'Security Awareness and Skills Training', description: 'Establish and maintain a security awareness program.' },
  'CIS-15': { id: 'CIS-15', name: 'Service Provider Management', description: 'Develop a process to evaluate service providers.' },
  'CIS-16': { id: 'CIS-16', name: 'Application Software Security', description: 'Manage the security life cycle of in-house developed software.' },
  'CIS-17': { id: 'CIS-17', name: 'Incident Response Management', description: 'Establish a program to develop and maintain an incident response capability.' },
  'CIS-18': { id: 'CIS-18', name: 'Penetration Testing', description: 'Test the effectiveness and resiliency of enterprise assets.' },
};

// ============================================================
// SOC 2 Trust Service Criteria
// ============================================================

export const SOC2_CRITERIA: Record<string, ComplianceControl> = {
  'CC1': { id: 'CC1', name: 'Control Environment', description: 'COSO Principle 1-5: Integrity, oversight, structure, competence, accountability.' },
  'CC2': { id: 'CC2', name: 'Communication and Information', description: 'COSO Principle 13-15: Use quality information, internal and external communication.' },
  'CC3': { id: 'CC3', name: 'Risk Assessment', description: 'COSO Principle 6-9: Specify objectives, identify and analyze risks, assess fraud risk.' },
  'CC4': { id: 'CC4', name: 'Monitoring Activities', description: 'COSO Principle 16-17: Conduct ongoing and separate evaluations.' },
  'CC5': { id: 'CC5', name: 'Control Activities', description: 'COSO Principle 10-12: Select and develop controls, technology controls, policies.' },
  'CC6': { id: 'CC6', name: 'Logical and Physical Access Controls', description: 'Access management, authentication, data protection.' },
  'CC7': { id: 'CC7', name: 'System Operations', description: 'Detect and respond to security events, recovery.' },
  'CC8': { id: 'CC8', name: 'Change Management', description: 'Manage changes to infrastructure, data, software.' },
  'CC9': { id: 'CC9', name: 'Risk Mitigation', description: 'Identify, select, develop risk mitigation activities.' },
  'A1': { id: 'A1', name: 'Availability', description: 'System availability for operation and use.' },
  'PI1': { id: 'PI1', name: 'Processing Integrity', description: 'System processing is complete, valid, accurate, timely.' },
  'C1': { id: 'C1', name: 'Confidentiality', description: 'Information designated as confidential is protected.' },
  'P1': { id: 'P1', name: 'Privacy', description: 'Personal information is collected, used, retained, disclosed in conformity.' },
};

// ============================================================
// Finding to Control Mapping Rules
// ============================================================

interface MappingRule {
  patterns: RegExp[];
  tags?: string[];
  tools?: string[];
  controls: Record<ComplianceFramework, string[]>;
}

const MAPPING_RULES: MappingRule[] = [
  // SQL Injection, XSS, Command Injection
  {
    patterns: [/injection/i, /sql/i, /xss/i, /cross-site.?script/i, /command.?injection/i],
    tags: ['injection', 'xss', 'sqli'],
    controls: {
      'owasp-top-10': ['A03'],
      'cis-controls': ['CIS-16'],
      'soc2': ['CC6', 'CC5'],
      'pci-dss': ['6.5.1'],
      'nist-csf': ['PR.DS-5'],
      'iso-27001': ['A.14.2.5'],
    },
  },
  // Authentication issues
  {
    patterns: [/auth/i, /password/i, /credential/i, /session/i, /token/i, /jwt/i],
    tags: ['authentication', 'session', 'credential'],
    controls: {
      'owasp-top-10': ['A07'],
      'cis-controls': ['CIS-5', 'CIS-6'],
      'soc2': ['CC6'],
      'pci-dss': ['8.2', '8.3'],
      'nist-csf': ['PR.AC-1', 'PR.AC-7'],
      'iso-27001': ['A.9.2', 'A.9.4'],
    },
  },
  // Cryptographic issues
  {
    patterns: [/crypt/i, /hash/i, /ssl/i, /tls/i, /certificate/i, /encrypt/i],
    tags: ['cryptography', 'encryption', 'ssl', 'tls'],
    controls: {
      'owasp-top-10': ['A02'],
      'cis-controls': ['CIS-3'],
      'soc2': ['CC6', 'C1'],
      'pci-dss': ['4.1', '3.4'],
      'nist-csf': ['PR.DS-1', 'PR.DS-2'],
      'iso-27001': ['A.10.1'],
    },
  },
  // Vulnerable dependencies
  {
    patterns: [/vulnerab/i, /cve-/i, /outdated/i, /dependency/i],
    tags: ['vulnerability', 'cve', 'dependency'],
    tools: ['trivy', 'grype', 'dependency-check', 'npm-audit'],
    controls: {
      'owasp-top-10': ['A06'],
      'cis-controls': ['CIS-2', 'CIS-7'],
      'soc2': ['CC7', 'CC8'],
      'pci-dss': ['6.3.3'],
      'nist-csf': ['ID.RA-1'],
      'iso-27001': ['A.12.6.1'],
    },
  },
  // Security misconfiguration
  {
    patterns: [/config/i, /misconfigur/i, /hardening/i, /default/i],
    tags: ['configuration', 'hardening', 'misconfiguration'],
    controls: {
      'owasp-top-10': ['A05'],
      'cis-controls': ['CIS-4'],
      'soc2': ['CC5', 'CC6'],
      'pci-dss': ['2.2'],
      'nist-csf': ['PR.IP-1'],
      'iso-27001': ['A.12.1.1'],
    },
  },
  // Secrets and sensitive data
  {
    patterns: [/secret/i, /api.?key/i, /private.?key/i, /credential/i, /sensitive/i],
    tags: ['secret', 'credential', 'sensitive-data'],
    tools: ['gitleaks', 'secretlint', 'detect-secrets'],
    controls: {
      'owasp-top-10': ['A02', 'A01'],
      'cis-controls': ['CIS-3'],
      'soc2': ['CC6', 'C1'],
      'pci-dss': ['3.4', '6.5.3'],
      'nist-csf': ['PR.DS-1'],
      'iso-27001': ['A.8.2.3'],
    },
  },
  // Access control
  {
    patterns: [/access.?control/i, /authorization/i, /permission/i, /rbac/i, /privilege/i],
    tags: ['access-control', 'authorization', 'privilege'],
    controls: {
      'owasp-top-10': ['A01'],
      'cis-controls': ['CIS-6'],
      'soc2': ['CC6'],
      'pci-dss': ['7.1', '7.2'],
      'nist-csf': ['PR.AC-4'],
      'iso-27001': ['A.9.1', 'A.9.2'],
    },
  },
  // Infrastructure as Code
  {
    patterns: [/terraform/i, /cloudformation/i, /kubernetes/i, /docker/i, /iac/i],
    tags: ['iac', 'terraform', 'kubernetes', 'docker'],
    tools: ['checkov', 'tfsec', 'dockle', 'hadolint'],
    controls: {
      'owasp-top-10': ['A05'],
      'cis-controls': ['CIS-4', 'CIS-12'],
      'soc2': ['CC5', 'CC8'],
      'pci-dss': ['2.2', '6.4.3'],
      'nist-csf': ['PR.IP-1'],
      'iso-27001': ['A.12.1.2', 'A.14.2.2'],
    },
  },
  // Logging and monitoring
  {
    patterns: [/log/i, /monitor/i, /audit/i, /trace/i],
    tags: ['logging', 'monitoring', 'audit'],
    controls: {
      'owasp-top-10': ['A09'],
      'cis-controls': ['CIS-8'],
      'soc2': ['CC4', 'CC7'],
      'pci-dss': ['10.1', '10.2'],
      'nist-csf': ['DE.AE-3', 'DE.CM-1'],
      'iso-27001': ['A.12.4'],
    },
  },
];

// ============================================================
// Compliance Mapper
// ============================================================

export class ComplianceMapper {
  /**
   * Map a single finding to compliance controls
   */
  static mapFinding(finding: AuditFinding, framework: ComplianceFramework): string[] {
    const matchedControls = new Set<string>();

    for (const rule of MAPPING_RULES) {
      // Check patterns
      const matchesPattern = rule.patterns.some(
        pattern =>
          pattern.test(finding.title) ||
          pattern.test(finding.description) ||
          (finding.ruleId && pattern.test(finding.ruleId))
      );

      // Check tags
      const matchesTags = rule.tags?.some(tag =>
        finding.tags.includes(tag)
      );

      // Check tools
      const matchesTool = rule.tools?.includes(finding.tool.toLowerCase());

      if (matchesPattern || matchesTags || matchesTool) {
        const controls = rule.controls[framework] || [];
        controls.forEach(c => matchedControls.add(c));
      }
    }

    return Array.from(matchedControls);
  }

  /**
   * Generate a full compliance report
   */
  static generateReport(
    auditReport: AuditReport,
    framework: ComplianceFramework
  ): ComplianceReport {
    const frameworkControls = this.getFrameworkControls(framework);
    const controlResults = new Map<string, { findings: string[]; status: 'pass' | 'fail' | 'partial' }>();

    // Initialize all controls
    for (const [id] of Object.entries(frameworkControls)) {
      controlResults.set(id, { findings: [], status: 'pass' });
    }

    // Map findings to controls
    const allFindings = auditReport.results.flatMap(r => r.findings);

    for (const finding of allFindings) {
      const mappedControls = this.mapFinding(finding, framework);

      for (const controlId of mappedControls) {
        const result = controlResults.get(controlId);
        if (result) {
          result.findings.push(finding.id);
          // Determine status based on severity
          if (['critical', 'high'].includes(finding.severity)) {
            result.status = 'fail';
          } else if (result.status !== 'fail' && ['medium'].includes(finding.severity)) {
            result.status = 'partial';
          }
        }
      }
    }

    // Build control results
    const detailedResults = Object.entries(frameworkControls).map(([id, control]) => {
      const result = controlResults.get(id)!;
      return {
        control,
        status: result.findings.length === 0 ? 'pass' as const : result.status,
        findings: result.findings,
      };
    });

    // Calculate summary
    const passed = detailedResults.filter(r => r.status === 'pass').length;
    const failed = detailedResults.filter(r => r.status === 'fail').length;
    const partial = detailedResults.filter(r => r.status === 'partial').length;
    const total = detailedResults.length;

    const score = Math.round((passed / total) * 100);

    let status: ComplianceReport['status'] = 'compliant';
    if (failed > 0) status = 'non-compliant';
    else if (partial > 0) status = 'partial';

    // Generate recommendations
    const recommendations = this.generateRecommendations(detailedResults, frameworkControls);

    return {
      framework,
      frameworkName: this.getFrameworkName(framework),
      generatedAt: new Date(),
      projectId: auditReport.target.directory || auditReport.target.url || 'unknown',
      status,
      score,
      controls: {
        total,
        passed,
        failed,
        partial,
        notApplicable: 0,
      },
      controlResults: detailedResults,
      recommendations,
    };
  }

  private static getFrameworkControls(framework: ComplianceFramework): Record<string, ComplianceControl> {
    switch (framework) {
      case 'owasp-top-10':
        return OWASP_TOP_10;
      case 'cis-controls':
        return CIS_CONTROLS;
      case 'soc2':
        return SOC2_CRITERIA;
      default:
        return OWASP_TOP_10;
    }
  }

  private static getFrameworkName(framework: ComplianceFramework): string {
    switch (framework) {
      case 'owasp-top-10':
        return 'OWASP Top 10 (2021)';
      case 'cis-controls':
        return 'CIS Controls v8';
      case 'soc2':
        return 'SOC 2 Type II';
      case 'pci-dss':
        return 'PCI DSS v4.0';
      case 'nist-csf':
        return 'NIST Cybersecurity Framework';
      case 'iso-27001':
        return 'ISO 27001:2022';
      default:
        return framework;
    }
  }

  private static generateRecommendations(
    results: ComplianceReport['controlResults'],
    controls: Record<string, ComplianceControl>
  ): ComplianceReport['recommendations'] {
    const recommendations: ComplianceReport['recommendations'] = [];

    for (const result of results) {
      if (result.status === 'fail') {
        recommendations.push({
          priority: 'high',
          controlId: result.control.id,
          description: `${result.control.name} has ${result.findings.length} critical/high findings`,
          remediation: `Address the ${result.findings.length} finding(s) to achieve compliance with ${result.control.id}`,
        });
      } else if (result.status === 'partial') {
        recommendations.push({
          priority: 'medium',
          controlId: result.control.id,
          description: `${result.control.name} has medium-severity findings`,
          remediation: `Review and address findings to fully comply with ${result.control.id}`,
        });
      }
    }

    // Sort by priority
    return recommendations.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });
  }
}

// ============================================================
// Exports
// ============================================================

export const SUPPORTED_FRAMEWORKS: ComplianceFramework[] = [
  'owasp-top-10',
  'cis-controls',
  'soc2',
  'pci-dss',
  'nist-csf',
  'iso-27001',
];

export function getFrameworkDescription(framework: ComplianceFramework): string {
  switch (framework) {
    case 'owasp-top-10':
      return 'OWASP Top 10 represents the most critical security risks to web applications.';
    case 'cis-controls':
      return 'CIS Controls are a prioritized set of safeguards to mitigate cyber attacks.';
    case 'soc2':
      return 'SOC 2 defines criteria for managing customer data based on trust service principles.';
    case 'pci-dss':
      return 'PCI DSS is a security standard for organizations that handle credit card data.';
    case 'nist-csf':
      return 'NIST CSF provides a policy framework for computer security guidance.';
    case 'iso-27001':
      return 'ISO 27001 specifies requirements for an information security management system.';
    default:
      return '';
  }
}
