'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
        <div className="container-wide flex items-center justify-between h-16">
          <Logo href="/" />
          <div className="flex items-center gap-3">
            <Link href="/login">
              <GradientButton variant="ghost" size="sm">Sign in</GradientButton>
            </Link>
            <Link href="/signup">
              <GradientButton size="sm" glow>Get Started</GradientButton>
            </Link>
          </div>
        </div>
      </header>

      <main className="container-tight py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-gray-500">Last updated: January 2024</p>
          </div>

          <GlassCard className="p-8 md:p-12">
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
                <p className="text-gray-500 leading-relaxed mb-4">
                  Polyglyph Analytica (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting the privacy and security of your personal information. This Privacy Policy describes how we collect, use, disclose, and safeguard your information when you use our Bugrit code quality analysis platform (the &quot;Service&quot;), including our website, applications, and related services.
                </p>
                <p className="text-gray-500 leading-relaxed mb-4">
                  This Privacy Policy has been drafted in accordance with the General Data Protection Regulation (EU) 2016/679 (&quot;GDPR&quot;), the California Consumer Privacy Act (&quot;CCPA&quot;), and other applicable data protection legislation. By accessing or using our Service, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy.
                </p>
                <p className="text-gray-500 leading-relaxed">
                  If you do not agree with the terms of this Privacy Policy, please do not access or use the Service.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">2. Data Controller</h2>
                <p className="text-gray-500 leading-relaxed mb-4">
                  For the purposes of applicable data protection legislation, the data controller is:
                </p>
                <div className="bg-muted/30 rounded-xl p-6 mb-4">
                  <p className="font-semibold mb-2">Polyglyph Analytica</p>
                  <p className="text-gray-500 text-sm">
                    Email: privacy@bugrit.com<br />
                    Data Protection Officer: dpo@bugrit.com
                  </p>
                </div>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">3. Information We Collect</h2>

                <h3 className="text-xl font-semibold mb-3 mt-6">3.1 Information You Provide Directly</h3>
                <p className="text-gray-500 leading-relaxed mb-4">
                  We collect information that you voluntarily provide when using our Service, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-500 mb-4">
                  <li><strong>Account Information:</strong> Name, email address, password (encrypted), organization name, and billing information when you create an account or subscribe to our Service.</li>
                  <li><strong>Profile Information:</strong> Professional details, preferences, and settings you choose to provide.</li>
                  <li><strong>Payment Information:</strong> Credit card details, billing address, and transaction history processed through our payment processor, Stripe, Inc.</li>
                  <li><strong>Communications:</strong> Correspondence when you contact our support team, provide feedback, or participate in surveys.</li>
                  <li><strong>Source Code and Repository Data:</strong> Code repositories, configuration files, and related metadata that you submit for analysis through our Service.</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">3.2 Information Collected Automatically</h3>
                <p className="text-gray-500 leading-relaxed mb-4">
                  When you access our Service, we automatically collect certain information, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-500 mb-4">
                  <li><strong>Device Information:</strong> Device type, operating system, browser type and version, unique device identifiers, and mobile network information.</li>
                  <li><strong>Log Data:</strong> IP address, access times, pages viewed, referring URL, and actions taken within the Service.</li>
                  <li><strong>Usage Data:</strong> Features used, scan frequency, report generation patterns, and interaction with our Service.</li>
                  <li><strong>Cookies and Similar Technologies:</strong> Information collected through cookies, pixel tags, and similar tracking technologies as described in Section 8.</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">3.3 Information from Third Parties</h3>
                <p className="text-gray-500 leading-relaxed mb-4">
                  We may receive information about you from third-party sources, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-500">
                  <li><strong>Authentication Providers:</strong> If you choose to link or sign in using a third-party service (e.g., GitHub, Google), we receive your name, email address, and profile information from that service.</li>
                  <li><strong>Repository Hosting Services:</strong> When you connect your repositories (e.g., GitHub, GitLab, Bitbucket), we access repository metadata, commit history, and code content as authorised by you.</li>
                  <li><strong>Business Partners:</strong> Information from partners who refer you to our Service or with whom we offer co-branded services.</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">4. Legal Basis for Processing</h2>
                <p className="text-gray-500 leading-relaxed mb-4">
                  We process your personal information on the following legal bases under applicable data protection law:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-500">
                  <li><strong>Performance of Contract:</strong> Processing necessary for the performance of our contract with you, including providing the Service, processing payments, and managing your account.</li>
                  <li><strong>Legitimate Interests:</strong> Processing necessary for our legitimate interests, including improving our Service, preventing fraud, ensuring security, and conducting business analytics, provided such interests are not overridden by your rights.</li>
                  <li><strong>Consent:</strong> Where you have provided explicit consent for specific processing activities, such as receiving marketing communications or participating in optional features.</li>
                  <li><strong>Legal Obligations:</strong> Processing necessary to comply with applicable laws, regulations, or legal processes.</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">5. How We Use Your Information</h2>
                <p className="text-gray-500 leading-relaxed mb-4">
                  We use the information we collect for the following purposes:
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">5.1 Service Provision and Improvement</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-500 mb-4">
                  <li>Providing, maintaining, and improving our code analysis Service</li>
                  <li>Processing and analysing your source code to generate quality reports</li>
                  <li>Personalising your experience and providing tailored recommendations</li>
                  <li>Developing new features, products, and services</li>
                  <li>Conducting research and analytics to improve our algorithms and tools</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">5.2 Communications</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-500 mb-4">
                  <li>Sending transactional communications regarding your account and Service usage</li>
                  <li>Responding to your enquiries and support requests</li>
                  <li>Sending marketing communications (with your consent where required)</li>
                  <li>Providing important notices about changes to our Service or policies</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">5.3 Security and Compliance</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-500">
                  <li>Protecting against fraud, abuse, and security threats</li>
                  <li>Enforcing our Terms of Service and other agreements</li>
                  <li>Complying with legal obligations and responding to lawful requests</li>
                  <li>Maintaining audit trails and records as required by law</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">6. Data Sharing and Disclosure</h2>
                <p className="text-gray-500 leading-relaxed mb-4">
                  We do not sell your personal information. We may share your information in the following circumstances:
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">6.1 Service Providers</h3>
                <p className="text-gray-500 leading-relaxed mb-4">
                  We engage trusted third-party service providers to perform functions on our behalf, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-500 mb-4">
                  <li><strong>Cloud Infrastructure:</strong> Data hosting and storage services</li>
                  <li><strong>Payment Processing:</strong> Stripe, Inc. for payment processing and subscription management</li>
                  <li><strong>Analytics:</strong> Services that help us understand Service usage and improve performance</li>
                  <li><strong>Communication:</strong> Email delivery and customer support platforms</li>
                </ul>
                <p className="text-gray-500 leading-relaxed mb-4">
                  These service providers are contractually bound to protect your information and may only use it for the specific purposes for which we engage them.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">6.2 Legal Requirements</h3>
                <p className="text-gray-500 leading-relaxed mb-4">
                  We may disclose your information if required to do so by law or in response to valid legal requests, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-500 mb-4">
                  <li>Complying with a subpoena, court order, or other legal process</li>
                  <li>Responding to requests from law enforcement or government authorities</li>
                  <li>Protecting our rights, property, or safety, or that of our users or others</li>
                  <li>Enforcing our agreements and policies</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">6.3 Business Transfers</h3>
                <p className="text-gray-500 leading-relaxed mb-4">
                  In the event of a merger, acquisition, reorganisation, bankruptcy, or sale of all or a portion of our assets, your information may be transferred as part of that transaction. We will notify you of any such change and the choices you may have regarding your information.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">6.4 With Your Consent</h3>
                <p className="text-gray-500 leading-relaxed">
                  We may share your information with third parties when you have given us your explicit consent to do so.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">7. International Data Transfers</h2>
                <p className="text-gray-500 leading-relaxed mb-4">
                  Your information is stored and processed in the United States of America. If you are accessing our Service from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States where our servers are located and our central database is operated.
                </p>
                <p className="text-gray-500 leading-relaxed mb-4">
                  For transfers of personal data from the European Economic Area (&quot;EEA&quot;), United Kingdom, or Switzerland to the United States, we rely on:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-500 mb-4">
                  <li><strong>Standard Contractual Clauses:</strong> We use European Commission-approved Standard Contractual Clauses to provide adequate safeguards for transfers of personal data.</li>
                  <li><strong>Supplementary Measures:</strong> We implement additional technical and organisational measures to ensure the security of your data during transfer and processing.</li>
                </ul>
                <p className="text-gray-500 leading-relaxed">
                  By using our Service, you consent to the transfer of your information to the United States and other jurisdictions where we or our service providers operate.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">8. Cookies and Tracking Technologies</h2>
                <p className="text-gray-500 leading-relaxed mb-4">
                  We use cookies and similar tracking technologies to collect and store information about your interactions with our Service. These technologies include:
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">8.1 Types of Cookies</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-500 mb-4">
                  <li><strong>Essential Cookies:</strong> Required for the operation of our Service, including authentication, security, and session management.</li>
                  <li><strong>Functional Cookies:</strong> Enable enhanced functionality and personalisation, such as remembering your preferences.</li>
                  <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our Service, allowing us to improve performance and user experience.</li>
                  <li><strong>Marketing Cookies:</strong> Used to track visitors across websites to display relevant advertisements (only with your consent).</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">8.2 Managing Cookies</h3>
                <p className="text-gray-500 leading-relaxed">
                  You can manage your cookie preferences through your browser settings. Please note that disabling certain cookies may affect the functionality of our Service. For more information about cookies and how to manage them, visit <a href="https://www.allaboutcookies.org" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">www.allaboutcookies.org</a>.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">9. Data Retention</h2>
                <p className="text-gray-500 leading-relaxed mb-4">
                  We retain your personal information for as long as necessary to fulfil the purposes for which it was collected, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-500 mb-4">
                  <li><strong>Account Data:</strong> Retained for the duration of your account and for a period of 30 days following account deletion to allow for recovery.</li>
                  <li><strong>Scan Data and Reports:</strong> Retained according to your subscription tier (30 days for Free, 90 days for Pro, 1 year for Business) unless you request earlier deletion.</li>
                  <li><strong>Source Code:</strong> Processed for analysis purposes only and not retained after report generation, unless you opt into repository monitoring features.</li>
                  <li><strong>Transaction Records:</strong> Retained for 7 years to comply with financial and tax regulations.</li>
                  <li><strong>Communications:</strong> Support correspondence retained for 3 years for quality assurance and dispute resolution.</li>
                </ul>
                <p className="text-gray-500 leading-relaxed">
                  Following the applicable retention period, your information will be securely deleted or anonymised in accordance with our data destruction procedures.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">10. Your Rights and Choices</h2>
                <p className="text-gray-500 leading-relaxed mb-4">
                  Depending on your location, you may have the following rights regarding your personal information:
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">10.1 Access and Portability</h3>
                <p className="text-gray-500 leading-relaxed mb-4">
                  You have the right to request access to the personal information we hold about you and to receive a copy of your data in a structured, commonly used, and machine-readable format.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">10.2 Rectification</h3>
                <p className="text-gray-500 leading-relaxed mb-4">
                  You have the right to request correction of any inaccurate or incomplete personal information we hold about you.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">10.3 Erasure</h3>
                <p className="text-gray-500 leading-relaxed mb-4">
                  You have the right to request deletion of your personal information, subject to certain exceptions required for legal compliance or legitimate business purposes.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">10.4 Restriction and Objection</h3>
                <p className="text-gray-500 leading-relaxed mb-4">
                  You have the right to request restriction of processing or object to processing of your personal information in certain circumstances.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">10.5 Withdrawal of Consent</h3>
                <p className="text-gray-500 leading-relaxed mb-4">
                  Where processing is based on consent, you have the right to withdraw your consent at any time without affecting the lawfulness of processing based on consent before its withdrawal.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">10.6 Exercising Your Rights</h3>
                <p className="text-gray-500 leading-relaxed">
                  To exercise any of these rights, please contact us at <a href="mailto:privacy@bugrit.com" className="text-primary hover:underline">privacy@bugrit.com</a>. We will respond to your request within 30 days. You also have the right to lodge a complaint with a supervisory authority if you believe your rights have been violated.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">11. California Privacy Rights</h2>
                <p className="text-gray-500 leading-relaxed mb-4">
                  If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-500 mb-4">
                  <li><strong>Right to Know:</strong> You may request disclosure of the categories and specific pieces of personal information we have collected about you.</li>
                  <li><strong>Right to Delete:</strong> You may request deletion of your personal information, subject to certain exceptions.</li>
                  <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights.</li>
                  <li><strong>Right to Opt-Out:</strong> We do not sell personal information, but you may opt out of any future sales.</li>
                </ul>
                <p className="text-gray-500 leading-relaxed">
                  To exercise your California privacy rights, contact us at <a href="mailto:privacy@bugrit.com" className="text-primary hover:underline">privacy@bugrit.com</a> or call us at our designated toll-free number.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">12. Data Security</h2>
                <p className="text-gray-500 leading-relaxed mb-4">
                  We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction. These measures include:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-500 mb-4">
                  <li>Encryption of data in transit using TLS 1.3 and at rest using AES-256</li>
                  <li>Regular security assessments and penetration testing</li>
                  <li>Access controls and authentication mechanisms</li>
                  <li>Employee training on data protection and security practices</li>
                  <li>Incident response procedures and breach notification protocols</li>
                  <li>SOC 2 Type II compliance (in progress)</li>
                </ul>
                <p className="text-gray-500 leading-relaxed">
                  While we strive to protect your information, no method of transmission over the Internet or electronic storage is completely secure. We cannot guarantee absolute security but are committed to maintaining industry-standard protections.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">13. Children&apos;s Privacy</h2>
                <p className="text-gray-500 leading-relaxed">
                  Our Service is not directed to individuals under the age of 16, and we do not knowingly collect personal information from children. If we become aware that we have inadvertently collected personal information from a child under 16, we will take steps to delete such information promptly. If you believe we may have collected information from a child, please contact us at <a href="mailto:privacy@bugrit.com" className="text-primary hover:underline">privacy@bugrit.com</a>.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">14. Third-Party Links</h2>
                <p className="text-gray-500 leading-relaxed">
                  Our Service may contain links to third-party websites or services that are not operated by us. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services. We encourage you to review the privacy policies of any third-party sites you visit.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">15. Changes to This Privacy Policy</h2>
                <p className="text-gray-500 leading-relaxed mb-4">
                  We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-500 mb-4">
                  <li>Update the &quot;Last updated&quot; date at the top of this policy</li>
                  <li>Notify you by email or through a prominent notice on our Service</li>
                  <li>Obtain your consent where required by applicable law</li>
                </ul>
                <p className="text-gray-500 leading-relaxed">
                  We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">16. Contact Us</h2>
                <p className="text-gray-500 leading-relaxed mb-4">
                  If you have any questions, concerns, or complaints about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="bg-muted/30 rounded-xl p-6">
                  <p className="font-semibold mb-2">Polyglyph Analytica</p>
                  <p className="text-gray-500 text-sm mb-4">
                    Email: <a href="mailto:privacy@bugrit.com" className="text-primary hover:underline">privacy@bugrit.com</a><br />
                    Data Protection Officer: <a href="mailto:dpo@bugrit.com" className="text-primary hover:underline">dpo@bugrit.com</a>
                  </p>
                  <p className="text-gray-500 text-sm">
                    We will endeavour to respond to your enquiry within 30 days.
                  </p>
                </div>
              </section>
            </div>
          </GlassCard>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container-wide">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo href="/" />
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-sm text-primary font-medium">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-gray-500 hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/docs" className="text-sm text-gray-500 hover:text-foreground transition-colors">
                Docs
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
