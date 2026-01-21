'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';

export default function TermsPage() {
  return (
    <div className="min-h-screen mesh-gradient">
      {/* Header */}
      <header className="glass border-b border-white/10 sticky top-0 z-50">
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
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: January 2024</p>
          </div>

          <GlassCard className="p-8 md:p-12">
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">1. Introduction and Acceptance</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  These Terms of Service (&quot;Terms&quot;, &quot;Agreement&quot;) constitute a legally binding agreement between you (&quot;User&quot;, &quot;you&quot;, or &quot;your&quot;) and Polyglyph Analytica (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) governing your access to and use of the Bugrit code quality analysis platform, including our website at bugrit.dev, applications, APIs, and all related services (collectively, the &quot;Service&quot;).
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  BY ACCESSING OR USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS. IF YOU ARE ENTERING INTO THIS AGREEMENT ON BEHALF OF A COMPANY OR OTHER LEGAL ENTITY, YOU REPRESENT THAT YOU HAVE THE AUTHORITY TO BIND SUCH ENTITY TO THESE TERMS.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  If you do not agree to these Terms, you must not access or use the Service.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">2. Definitions</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  In these Terms, unless the context otherwise requires:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>&quot;Account&quot;</strong> means the user account created to access and use the Service.</li>
                  <li><strong>&quot;Authorised User&quot;</strong> means individuals authorised by you to use the Service under your subscription.</li>
                  <li><strong>&quot;Content&quot;</strong> means any data, text, code, files, images, or other materials uploaded, submitted, or transmitted through the Service.</li>
                  <li><strong>&quot;Documentation&quot;</strong> means the user guides, technical documentation, and other materials we provide regarding the Service.</li>
                  <li><strong>&quot;Intellectual Property Rights&quot;</strong> means all patents, copyrights, trademarks, trade secrets, and other proprietary rights.</li>
                  <li><strong>&quot;Organisation&quot;</strong> means a company, team, or other entity that maintains a subscription to the Service.</li>
                  <li><strong>&quot;Scan&quot;</strong> means a single analysis of source code or repository performed by the Service.</li>
                  <li><strong>&quot;Subscription&quot;</strong> means your selected service tier (Free, Pro, or Business) and associated features and limits.</li>
                  <li><strong>&quot;Your Code&quot;</strong> means source code, configuration files, and related materials you submit for analysis.</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">3. Account Registration and Security</h2>

                <h3 className="text-xl font-semibold mb-3 mt-6">3.1 Account Creation</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  To access certain features of the Service, you must create an Account. You agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Provide accurate, current, and complete information during registration;</li>
                  <li>Maintain and promptly update your Account information;</li>
                  <li>Maintain the security and confidentiality of your login credentials;</li>
                  <li>Accept responsibility for all activities that occur under your Account;</li>
                  <li>Notify us immediately of any unauthorised use or security breach.</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">3.2 Account Requirements</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You must be at least 16 years of age to create an Account. If you are under 18, you represent that you have your parent or guardian&apos;s consent to use the Service.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">3.3 Organisation Accounts</h3>
                <p className="text-muted-foreground leading-relaxed">
                  If you create an Account on behalf of an Organisation, you represent and warrant that you are authorised to bind the Organisation to these Terms. The Organisation shall be responsible for all activities of its Authorised Users.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">4. Service Description</h2>

                <h3 className="text-xl font-semibold mb-3 mt-6">4.1 The Service</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Bugrit is a code quality analysis platform that provides automated testing, analysis, and reporting tools for software development. The Service includes:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Code quality analysis using 69 integrated testing tools;</li>
                  <li>AI-powered report generation and prioritisation;</li>
                  <li>Multi-platform support (web, iOS, Android, desktop);</li>
                  <li>API access for programmatic integration;</li>
                  <li>Team collaboration features;</li>
                  <li>Continuous integration and deployment support.</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">4.2 Service Availability</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We will use commercially reasonable efforts to make the Service available 24 hours a day, 7 days a week. However, we do not guarantee uninterrupted access and reserve the right to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Perform scheduled maintenance with reasonable advance notice;</li>
                  <li>Perform emergency maintenance without prior notice;</li>
                  <li>Modify, suspend, or discontinue any aspect of the Service;</li>
                  <li>Impose limits on certain features or restrict access.</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">4.3 Service Modifications</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify, update, or discontinue the Service or any features at any time. Material changes will be communicated with reasonable notice. Your continued use of the Service following any changes constitutes acceptance of such changes.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">5. Subscription Plans and Payment</h2>

                <h3 className="text-xl font-semibold mb-3 mt-6">5.1 Subscription Tiers</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The Service is offered under the following subscription tiers:
                </p>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold border-b border-border">Plan</th>
                        <th className="text-left py-3 px-4 font-semibold border-b border-border">Price</th>
                        <th className="text-left py-3 px-4 font-semibold border-b border-border">Key Features</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-4">Free</td>
                        <td className="py-3 px-4">$0/month</td>
                        <td className="py-3 px-4">5 scans/month, 1 project, web platform</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-4">Pro</td>
                        <td className="py-3 px-4">$29/month</td>
                        <td className="py-3 px-4">50 scans/month, 5 projects, web + mobile</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4">Business</td>
                        <td className="py-3 px-4">$99/month</td>
                        <td className="py-3 px-4">Unlimited scans, unlimited projects, all platforms</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-xl font-semibold mb-3 mt-6">5.2 Payment Terms</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  For paid subscriptions:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Payment is due in advance on a monthly or annual basis;</li>
                  <li>All fees are quoted and payable in United States Dollars (USD);</li>
                  <li>Payments are processed securely through Stripe, Inc.;</li>
                  <li>You authorise us to charge your designated payment method;</li>
                  <li>Subscriptions automatically renew unless cancelled prior to the renewal date.</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">5.3 Taxes</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  All fees are exclusive of applicable taxes. You are responsible for paying all taxes associated with your use of the Service, except for taxes based on our net income.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">5.4 Refunds</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Except as otherwise provided in these Terms or required by applicable law:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>All fees are non-refundable;</li>
                  <li>No refunds will be issued for partial months of service;</li>
                  <li>Downgrading your subscription does not entitle you to a refund;</li>
                  <li>We may, in our sole discretion, provide refunds or credits on a case-by-case basis.</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">5.5 Price Changes</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify our pricing at any time. Price changes will be communicated at least 30 days in advance and will apply to the next billing cycle following the notice period.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">6. Acceptable Use</h2>

                <h3 className="text-xl font-semibold mb-3 mt-6">6.1 Permitted Use</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may use the Service solely for lawful purposes and in accordance with these Terms. You are granted a limited, non-exclusive, non-transferable, revocable licence to access and use the Service for your internal business purposes.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">6.2 Prohibited Conduct</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You agree not to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Use the Service for any illegal or unauthorised purpose;</li>
                  <li>Violate any applicable laws, regulations, or third-party rights;</li>
                  <li>Upload malicious code, viruses, or harmful content;</li>
                  <li>Attempt to gain unauthorised access to the Service or related systems;</li>
                  <li>Interfere with or disrupt the Service or servers;</li>
                  <li>Reverse engineer, decompile, or disassemble the Service;</li>
                  <li>Remove or alter any proprietary notices or labels;</li>
                  <li>Use the Service to develop competing products;</li>
                  <li>Resell, sublicence, or distribute the Service without authorisation;</li>
                  <li>Circumvent any access controls, rate limits, or usage restrictions;</li>
                  <li>Use automated systems to access the Service in a manner that exceeds reasonable use;</li>
                  <li>Impersonate any person or entity or misrepresent your affiliation;</li>
                  <li>Collect or harvest user information without consent;</li>
                  <li>Use the Service for cryptocurrency mining or similar activities.</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">6.3 Enforcement</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to investigate and take appropriate action against any suspected violations, including removing Content, suspending or terminating Accounts, and reporting to law enforcement authorities.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">7. Intellectual Property</h2>

                <h3 className="text-xl font-semibold mb-3 mt-6">7.1 Our Intellectual Property</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The Service, including all software, algorithms, designs, text, graphics, logos, and other content provided by us, is owned by Polyglyph Analytica and protected by intellectual property laws. Nothing in these Terms grants you any right, title, or interest in our intellectual property except for the limited licence granted herein.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">7.2 Your Intellectual Property</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You retain all ownership rights in Your Code and other Content you submit to the Service. By submitting Content, you grant us a limited, non-exclusive, royalty-free licence to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Process and analyse Your Code to provide the Service;</li>
                  <li>Generate reports and insights based on Your Code;</li>
                  <li>Store Your Code for the duration necessary to provide the Service;</li>
                  <li>Use anonymised, aggregated data to improve the Service.</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We will not use Your Code for any purpose other than providing and improving the Service without your explicit consent.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">7.3 Feedback</h3>
                <p className="text-muted-foreground leading-relaxed">
                  If you provide feedback, suggestions, or ideas regarding the Service, you grant us an unrestricted, perpetual, irrevocable, royalty-free licence to use such feedback for any purpose without compensation or attribution to you.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">8. Confidentiality</h2>

                <h3 className="text-xl font-semibold mb-3 mt-6">8.1 Definition</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  &quot;Confidential Information&quot; means any non-public information disclosed by either party that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and circumstances of disclosure.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">8.2 Obligations</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Each party agrees to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Protect the other party&apos;s Confidential Information using reasonable care;</li>
                  <li>Use Confidential Information only for purposes related to the Service;</li>
                  <li>Not disclose Confidential Information to third parties without consent;</li>
                  <li>Return or destroy Confidential Information upon request or termination.</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">8.3 Exclusions</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Confidential Information does not include information that: (a) is or becomes publicly available through no fault of the receiving party; (b) was rightfully known prior to disclosure; (c) is rightfully obtained from third parties without restriction; or (d) is independently developed without use of Confidential Information.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">9. Data Protection</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Our collection and use of personal information in connection with the Service is described in our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, which is incorporated into these Terms by reference.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Where we process personal data on your behalf, we act as a data processor and will:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Process personal data only in accordance with your instructions;</li>
                  <li>Implement appropriate technical and organisational security measures;</li>
                  <li>Assist you in responding to data subject requests;</li>
                  <li>Notify you of any personal data breaches without undue delay;</li>
                  <li>Delete or return personal data upon termination of the Service.</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">10. Warranties and Disclaimers</h2>

                <h3 className="text-xl font-semibold mb-3 mt-6">10.1 Our Warranties</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We warrant that:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>We have the right and authority to provide the Service;</li>
                  <li>The Service will perform substantially in accordance with the Documentation;</li>
                  <li>We will use commercially reasonable efforts to maintain the security of the Service.</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">10.2 Disclaimer</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  EXCEPT AS EXPRESSLY PROVIDED HEREIN, THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, OR NON-INFRINGEMENT.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  WE DO NOT WARRANT THAT:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>The Service will be uninterrupted, error-free, or secure;</li>
                  <li>Any defects will be corrected;</li>
                  <li>The Service will meet your specific requirements;</li>
                  <li>Analysis results will be complete, accurate, or suitable for any purpose;</li>
                  <li>The Service will detect all issues or vulnerabilities in Your Code.</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">10.3 Beta Features</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Any features designated as &quot;beta&quot;, &quot;preview&quot;, or &quot;experimental&quot; are provided without any warranty and may be modified or discontinued at any time without notice.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">11. Limitation of Liability</h2>

                <h3 className="text-xl font-semibold mb-3 mt-6">11.1 Exclusion of Damages</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL POLYGLYPH ANALYTICA, ITS AFFILIATES, DIRECTORS, OFFICERS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Loss of profits, revenue, or business;</li>
                  <li>Loss of data or data breaches;</li>
                  <li>Loss of goodwill or reputation;</li>
                  <li>Cost of procurement of substitute services;</li>
                  <li>Any damages arising from Your Code or its deployment;</li>
                  <li>Any damages resulting from undetected issues or vulnerabilities.</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">11.2 Cap on Liability</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, OUR TOTAL CUMULATIVE LIABILITY ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF: (A) THE AMOUNTS PAID BY YOU TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM; OR (B) ONE HUNDRED UNITED STATES DOLLARS (USD $100).
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">11.3 Basis of the Bargain</h3>
                <p className="text-muted-foreground leading-relaxed">
                  The limitations and exclusions in this Section reflect the allocation of risk between the parties and are an essential element of the basis of the bargain between us. The Service would not be provided without these limitations.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">12. Indemnification</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You agree to defend, indemnify, and hold harmless Polyglyph Analytica, its affiliates, and their respective directors, officers, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising out of or related to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Your use of the Service;</li>
                  <li>Your Content or Your Code;</li>
                  <li>Your violation of these Terms;</li>
                  <li>Your violation of any applicable laws or third-party rights;</li>
                  <li>Any claims that Your Code infringes intellectual property rights;</li>
                  <li>Any negligent or wrongful acts or omissions by you or your Authorised Users.</li>
                </ul>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">13. Term and Termination</h2>

                <h3 className="text-xl font-semibold mb-3 mt-6">13.1 Term</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  These Terms commence upon your acceptance and continue until terminated in accordance with this Section.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">13.2 Termination by You</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may terminate your Account at any time by contacting us or using the Account deletion feature. Termination will be effective at the end of your current billing period.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">13.3 Termination by Us</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We may terminate or suspend your Account immediately, without prior notice or liability, if:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>You breach any provision of these Terms;</li>
                  <li>You fail to pay any amounts due;</li>
                  <li>We are required to do so by law;</li>
                  <li>We discontinue the Service.</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">13.4 Effect of Termination</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Upon termination:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Your right to access the Service will immediately cease;</li>
                  <li>We may delete your Account and associated data;</li>
                  <li>You remain liable for any amounts owed;</li>
                  <li>Provisions that by their nature should survive will survive termination.</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">13.5 Data Export</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Upon request made within 30 days of termination, we will provide you with an export of your data in a commonly used format, subject to applicable fees for Business tier subscribers.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">14. Dispute Resolution</h2>

                <h3 className="text-xl font-semibold mb-3 mt-6">14.1 Governing Law</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">14.2 Informal Resolution</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Before initiating any formal dispute resolution, you agree to first contact us at legal@bugrit.dev to attempt to resolve any dispute informally. We will attempt to resolve disputes within 30 days.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">14.3 Arbitration</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Any dispute that cannot be resolved informally shall be resolved by binding arbitration administered by the American Arbitration Association in accordance with its Commercial Arbitration Rules. The arbitration shall be conducted in English and held in Delaware, United States, or remotely by mutual agreement.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">14.4 Class Action Waiver</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  YOU AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS WILL BE CONDUCTED ONLY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">14.5 Exceptions</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of competent jurisdiction to protect its intellectual property rights.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">15. General Provisions</h2>

                <h3 className="text-xl font-semibold mb-3 mt-6">15.1 Entire Agreement</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  These Terms, together with the Privacy Policy and any other agreements expressly incorporated by reference, constitute the entire agreement between you and Polyglyph Analytica regarding the Service and supersede all prior agreements and understandings.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">15.2 Severability</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  If any provision of these Terms is held to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">15.3 Waiver</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">15.4 Assignment</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may not assign or transfer these Terms without our prior written consent. We may assign these Terms without restriction.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">15.5 Force Majeure</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Neither party shall be liable for any failure or delay in performance due to circumstances beyond its reasonable control, including acts of God, natural disasters, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, strikes, or shortages of transportation, facilities, fuel, energy, labour, or materials.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">15.6 Notices</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Notices to you may be sent to the email address associated with your Account. Notices to us should be sent to legal@bugrit.dev.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">15.7 No Third-Party Beneficiaries</h3>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms do not create any third-party beneficiary rights in any individual or entity.
                </p>
              </section>

              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">16. Changes to These Terms</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We reserve the right to modify these Terms at any time. When we make material changes, we will:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Update the &quot;Last updated&quot; date at the top of these Terms;</li>
                  <li>Notify you by email or through a prominent notice on the Service;</li>
                  <li>Provide at least 30 days&apos; notice before material changes take effect.</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  Your continued use of the Service after changes become effective constitutes acceptance of the revised Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">17. Contact Information</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  If you have any questions about these Terms, please contact us:
                </p>
                <div className="bg-muted/30 rounded-xl p-6">
                  <p className="font-semibold mb-2">Polyglyph Analytica</p>
                  <p className="text-muted-foreground text-sm mb-4">
                    Email: <a href="mailto:legal@bugrit.dev" className="text-primary hover:underline">legal@bugrit.dev</a><br />
                    General Enquiries: <a href="mailto:hello@bugrit.dev" className="text-primary hover:underline">hello@bugrit.dev</a>
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
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-primary font-medium">
                Terms
              </Link>
              <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Docs
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
