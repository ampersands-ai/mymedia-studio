import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { CinematicNav } from "@/components/cinematic/CinematicNav";
import { ContactSection } from "@/components/cinematic/ContactSection";

const Privacy = () => {
  useEffect(() => {
    document.title = "Privacy Policy - Artifio.ai";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Privacy Policy for Artifio.ai - Learn how we collect, use, and protect your personal information.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white scroll-smooth">
      <CinematicNav />

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-24 md:py-32 max-w-4xl">
        {/* Back Button */}
        <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>

        <article className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-12">
          <header className="mb-10">
            <h1 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              PRIVACY POLICY
            </h1>
            <p className="text-white/50 font-medium">Effective Date: December 2024</p>
          </header>

          <div className="space-y-8 text-white/70">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">1. Introduction</h2>
              <p className="leading-relaxed mb-4">
                Welcome to Artifio.ai ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI content creation platform.
              </p>
              <p className="leading-relaxed">
                By using Artifio.ai, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold mb-3 text-white/90">2.1 Personal Information</h3>
              <div className="overflow-x-auto mb-6">
                <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                  <div className="grid grid-cols-3 gap-4 text-sm font-semibold text-white border-b border-white/10 pb-2 mb-2">
                    <div>Data Type</div>
                    <div>Purpose</div>
                    <div>Required</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-4"><div>Email address</div><div>Account registration, communications</div><div>Yes (from Google)</div></div>
                    <div className="grid grid-cols-3 gap-4"><div>Name</div><div>Account profile display</div><div>Yes (from Google)</div></div>
                    <div className="grid grid-cols-3 gap-4"><div>Password</div><div>Not collected (Google OAuth only)</div><div>No</div></div>
                    <div className="grid grid-cols-3 gap-4"><div>Payment information</div><div>Subscription and purchase processing</div><div>For paid plans</div></div>
                  </div>
                </div>
              </div>
              <p className="leading-relaxed mb-6 text-white/60 italic">
                Note: Payment information is processed by Dodo Payments (primary) or Stripe (backup). We do not store your full credit card details.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">2.2 Usage Information</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-6">
                <li><strong className="text-white">Generation data:</strong> Prompts submitted, models selected, generation settings, timestamps</li>
                <li><strong className="text-white">Credit usage:</strong> Credits consumed, purchase history, subscription changes</li>
                <li><strong className="text-white">Device information:</strong> Browser type, operating system, device type</li>
                <li><strong className="text-white">Network information:</strong> IP address, approximate location (country/region)</li>
                <li><strong className="text-white">Analytics data:</strong> Pages visited, features used, session duration, interaction patterns</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white/90">2.3 User Content</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-6">
                <li><strong className="text-white">Inputs:</strong> Text prompts, images, videos, or audio you upload for processing</li>
                <li><strong className="text-white">Outputs:</strong> Generated images, videos, audio, and other content</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white/90">2.4 Communications</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Email correspondence with our support team</li>
                <li>Feedback and survey responses</li>
                <li>Support ticket contents</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">3. How We Use Your Information</h2>
              <p className="leading-relaxed mb-4">We use collected information to:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-6">
                <li><strong className="text-white">Provide the Service:</strong> Process your prompts, generate content, manage your account</li>
                <li><strong className="text-white">Process transactions:</strong> Handle subscriptions, credit purchases, and billing</li>
                <li><strong className="text-white">Track usage:</strong> Monitor credit consumption and allocation</li>
                <li><strong className="text-white">Communicate:</strong> Send transactional emails (receipts, subscription updates, verification)</li>
                <li><strong className="text-white">Improve:</strong> Analyze usage patterns to enhance features and user experience</li>
                <li><strong className="text-white">Secure:</strong> Detect and prevent fraud, abuse, and security threats</li>
                <li><strong className="text-white">Moderate:</strong> Enforce content policies and acceptable use</li>
                <li><strong className="text-white">Comply:</strong> Meet legal obligations and respond to lawful requests</li>
              </ul>
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <p className="text-green-400 font-semibold">We do NOT use your prompts or generated content to train our own AI models.</p>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">4. Third-Party AI Model Providers</h2>
              <p className="leading-relaxed mb-4">
                Artifio provides access to AI models operated by third-party providers. When you submit prompts or content for AI generation, that data is transmitted to the relevant third-party provider to process your request.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">4.1 Current AI Providers</h3>
              <div className="overflow-x-auto mb-6">
                <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm font-semibold text-white border-b border-white/10 pb-2 mb-2">
                    <div>Category</div>
                    <div>Providers</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4"><div>Video Generation</div><div>Google (Veo), OpenAI (Sora), Runway, Kling AI, MiniMax (Hailuo), Alibaba (Wan), ByteDance (Seedance)</div></div>
                    <div className="grid grid-cols-2 gap-4"><div>Image Generation</div><div>Midjourney, FLUX (Black Forest Labs), Ideogram, OpenAI (DALL-E), Google (Imagen), Seedream, xAI (Grok Imagine), HiDream, Alibaba (Qwen), Recraft</div></div>
                    <div className="grid grid-cols-2 gap-4"><div>Audio/Voice</div><div>ElevenLabs, Suno</div></div>
                    <div className="grid grid-cols-2 gap-4"><div>Text/Scripts</div><div>Anthropic (Claude), OpenAI (GPT)</div></div>
                    <div className="grid grid-cols-2 gap-4"><div>Stock Media</div><div>Pixabay</div></div>
                  </div>
                </div>
              </div>
              <p className="leading-relaxed mb-6 text-white/60 italic">
                This list may change as we add or remove providers.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">4.2 Third-Party Data Handling</h3>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10 mb-6">
                <p className="text-white/90 font-semibold mb-2">Important:</p>
                <p className="leading-relaxed">
                  Each provider has its own privacy policy and data handling practices. We select providers based on their data handling practices but cannot guarantee how third parties process data once transmitted.
                </p>
              </div>
              <p className="leading-relaxed mb-6">
                We encourage you to review the privacy policies of providers whose models you use. We are not responsible for the privacy practices of third-party AI providers.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">4.3 Data Transmitted to Providers</h3>
              <p className="leading-relaxed mb-3">When you make a generation request, the following may be transmitted to the relevant provider:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-4">
                <li>Your text prompt</li>
                <li>Any images or media you upload for processing</li>
                <li>Generation settings (resolution, style, etc.)</li>
                <li>Technical metadata required for processing</li>
              </ul>
              <p className="leading-relaxed font-semibold text-white">
                We do not transmit your email address, name, or payment information to AI providers.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">5. Other Third-Party Service Providers</h2>
              <p className="leading-relaxed mb-4">We work with trusted third-party providers to deliver our services:</p>
              <div className="overflow-x-auto mb-6">
                <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                  <div className="grid grid-cols-3 gap-4 text-sm font-semibold text-white border-b border-white/10 pb-2 mb-2">
                    <div>Provider</div>
                    <div>Purpose</div>
                    <div>Data Shared</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-4"><div>Dodo</div><div>Primary payment processing</div><div>Payment details, email, transaction data</div></div>
                    <div className="grid grid-cols-3 gap-4"><div>Stripe</div><div>Backup payment processing</div><div>Payment details, email, transaction data</div></div>
                    <div className="grid grid-cols-3 gap-4"><div>Supabase</div><div>Database and authentication</div><div>Account data, usage data</div></div>
                    <div className="grid grid-cols-3 gap-4"><div>Resend</div><div>Email delivery</div><div>Email address, email content</div></div>
                    <div className="grid grid-cols-3 gap-4"><div>PostHog</div><div>Analytics</div><div>Anonymized usage patterns</div></div>
                    <div className="grid grid-cols-3 gap-4"><div>Google</div><div>OAuth authentication</div><div>Authentication tokens (if using Google sign-in)</div></div>
                  </div>
                </div>
              </div>
              <p className="leading-relaxed font-semibold text-white">
                We do not sell your personal information to third parties.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">6. Data Retention</h2>
              <div className="overflow-x-auto mb-6">
                <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm font-semibold text-white border-b border-white/10 pb-2 mb-2">
                    <div>Data Type</div>
                    <div>Retention Period</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4"><div>Generated content</div><div>2 weeks from creation, then auto-deleted</div></div>
                    <div className="grid grid-cols-2 gap-4"><div>Account information</div><div>Until you request deletion</div></div>
                    <div className="grid grid-cols-2 gap-4"><div>Generation history/prompts</div><div>Until account deletion</div></div>
                    <div className="grid grid-cols-2 gap-4"><div>Payment records</div><div>7 years (tax/legal compliance)</div></div>
                    <div className="grid grid-cols-2 gap-4"><div>Security/audit logs</div><div>90 days</div></div>
                    <div className="grid grid-cols-2 gap-4"><div>Support communications</div><div>2 years</div></div>
                    <div className="grid grid-cols-2 gap-4"><div>Third-party provider data</div><div>Up to 2 months after deletion request (provider-dependent)</div></div>
                    <div className="grid grid-cols-2 gap-4"><div>Anonymized analytics</div><div>Indefinitely</div></div>
                  </div>
                </div>
              </div>
              <p className="leading-relaxed">
                You are responsible for downloading any generated content you wish to keep before the 2-week retention period expires.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">7. Content Moderation</h2>
              <p className="leading-relaxed mb-4">
                All prompts submitted to our Service are automatically screened through moderation systems before processing. This includes:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-4">
                <li>OpenAI's Moderation API</li>
                <li>Additional internal safety filters</li>
              </ul>
              <p className="leading-relaxed mb-4">
                Moderation evaluates content across categories including sexual content, violence, hate speech, self-harm, and illegal activities. Prompts that violate our policies are blocked and not processed.
              </p>
              <p className="leading-relaxed mb-2">This moderation is performed to:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Ensure user safety</li>
                <li>Comply with applicable laws</li>
                <li>Enforce our acceptable use policies</li>
                <li>Meet third-party provider requirements</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">8. Data Security</h2>
              <p className="leading-relaxed mb-4">
                We implement industry-standard security measures including:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-4">
                <li><strong className="text-white">Encryption in transit:</strong> TLS/SSL for all data transmission</li>
                <li><strong className="text-white">Encryption at rest:</strong> Sensitive data encrypted in storage</li>
                <li><strong className="text-white">Password security:</strong> Secure hashing (never stored in plain text)</li>
                <li><strong className="text-white">Access controls:</strong> Role-based access, principle of least privilege</li>
                <li><strong className="text-white">Row Level Security:</strong> Database-level access controls (Supabase RLS)</li>
                <li><strong className="text-white">Regular audits:</strong> Security assessments and vulnerability scanning</li>
                <li><strong className="text-white">Secure infrastructure:</strong> Cloud hosting with SOC 2 compliant providers</li>
              </ul>
              <p className="leading-relaxed">
                However, no method of transmission or storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security. You are responsible for maintaining the security of your account credentials.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">9. Your Rights and Choices</h2>
              <p className="leading-relaxed mb-4">Depending on your jurisdiction, you may have the right to:</p>
              <div className="overflow-x-auto mb-6">
                <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm font-semibold text-white border-b border-white/10 pb-2 mb-2">
                    <div>Right</div>
                    <div>Description</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4"><div>Access</div><div>Request a copy of your personal data</div></div>
                    <div className="grid grid-cols-2 gap-4"><div>Correction</div><div>Request correction of inaccurate information</div></div>
                    <div className="grid grid-cols-2 gap-4"><div>Deletion</div><div>Request deletion of your account and associated data</div></div>
                    <div className="grid grid-cols-2 gap-4"><div>Portability</div><div>Request your data in a portable format</div></div>
                    <div className="grid grid-cols-2 gap-4"><div>Objection</div><div>Object to certain processing of your data</div></div>
                    <div className="grid grid-cols-2 gap-4"><div>Withdrawal</div><div>Withdraw consent where processing is based on consent</div></div>
                    <div className="grid grid-cols-2 gap-4"><div>Opt-out</div><div>Unsubscribe from marketing communications</div></div>
                  </div>
                </div>
              </div>
              <p className="leading-relaxed mb-6">
                To exercise these rights, contact us at <strong className="text-white">privacy@artifio.ai</strong>. We will respond within 30 days.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">9.1 Account Deletion</h3>
              <p className="leading-relaxed mb-3">
                You may delete your account at any time through your account settings. Upon deletion:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-4">
                <li>Your account and profile information will be permanently removed</li>
                <li>All credits will be forfeited immediately</li>
                <li>Generation history will be deleted</li>
                <li>This action cannot be undone</li>
              </ul>
              <p className="leading-relaxed text-white/60 italic">
                Note: Some data may persist in backups for a limited period and in third-party provider systems for up to 2 months.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">10. GDPR Rights (European Users)</h2>
              <p className="leading-relaxed mb-4">
                If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you have additional rights under the General Data Protection Regulation (GDPR):
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">Legal Basis for Processing:</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-6">
                <li><strong className="text-white">Contract:</strong> Processing necessary to provide the Service you requested</li>
                <li><strong className="text-white">Consent:</strong> Where you have given explicit consent</li>
                <li><strong className="text-white">Legitimate Interests:</strong> For security, fraud prevention, and service improvement</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white/90">Data Controller:</h3>
              <p className="leading-relaxed mb-6">
                Artifio.ai, located in Texas, USA
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">Your Additional Rights:</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-6">
                <li>Right to lodge a complaint with your local supervisory authority</li>
                <li>Right to restrict processing in certain circumstances</li>
                <li>Right to object to automated decision-making</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white/90">International Transfers:</h3>
              <p className="leading-relaxed mb-4">
                Your data is transferred to the United States. We ensure appropriate safeguards through standard contractual clauses and compliance with applicable data protection frameworks.
              </p>
              <p className="leading-relaxed">
                Contact <strong className="text-white">privacy@artifio.ai</strong> for GDPR-related inquiries.
              </p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">11. CCPA Rights (California Residents)</h2>
              <p className="leading-relaxed mb-4">
                If you are a California resident, you have rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">Your Rights:</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-6">
                <li><strong className="text-white">Right to Know:</strong> Request information about categories and specific pieces of personal data we collect</li>
                <li><strong className="text-white">Right to Delete:</strong> Request deletion of your personal information</li>
                <li><strong className="text-white">Right to Correct:</strong> Request correction of inaccurate personal information</li>
                <li><strong className="text-white">Right to Opt-Out:</strong> We do not sell or share your personal information for cross-context behavioral advertising</li>
                <li><strong className="text-white">Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white/90">Categories of Personal Information Collected:</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-6">
                <li>Identifiers (email, name, IP address)</li>
                <li>Commercial information (purchase history, subscription data)</li>
                <li>Internet activity (usage data, browsing history on our Service)</li>
                <li>Inferences (preferences derived from usage patterns)</li>
              </ul>
              <p className="leading-relaxed mb-4 font-semibold text-white">
                We do not sell your personal information. We do not use sensitive personal information for purposes other than providing the Service.
              </p>
              <p className="leading-relaxed">
                To exercise your CCPA rights, contact <strong className="text-white">privacy@artifio.ai</strong> or use our account settings.
              </p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">12. Cookies and Tracking</h2>
              <p className="leading-relaxed mb-4">We use cookies and similar technologies for:</p>
              <div className="overflow-x-auto mb-6">
                <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                  <div className="grid grid-cols-3 gap-4 text-sm font-semibold text-white border-b border-white/10 pb-2 mb-2">
                    <div>Cookie Type</div>
                    <div>Purpose</div>
                    <div>Required</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-4"><div>Essential</div><div>Authentication, session management, security</div><div>Yes</div></div>
                    <div className="grid grid-cols-3 gap-4"><div>Functional</div><div>Preferences, settings</div><div>No</div></div>
                    <div className="grid grid-cols-3 gap-4"><div>Analytics</div><div>Usage patterns, service improvement (PostHog)</div><div>No</div></div>
                  </div>
                </div>
              </div>
              <p className="leading-relaxed mb-4 font-semibold text-white">
                We do not use third-party advertising or tracking cookies.
              </p>
              <p className="leading-relaxed">
                You can control cookies through your browser settings. Disabling essential cookies may affect your ability to use the Service.
              </p>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">13. Children's Privacy</h2>
              <p className="leading-relaxed mb-4">
                <strong className="text-white">Artifio.ai is not intended for anyone under 18 years of age.</strong> We do not knowingly collect personal information from individuals under 18.
              </p>
              <p className="leading-relaxed">
                If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at <strong className="text-white">privacy@artifio.ai</strong>. We will take steps to delete such information from our systems.
              </p>
            </section>

            {/* Section 14 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">14. International Data Transfers</h2>
              <p className="leading-relaxed mb-4">
                Your information may be transferred to and processed in the United States and other countries where our service providers operate.
              </p>
              <p className="leading-relaxed mb-2">We ensure appropriate safeguards for international transfers including:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-4">
                <li>Standard contractual clauses approved by relevant authorities</li>
                <li>Data processing agreements with service providers</li>
                <li>Compliance with applicable data protection frameworks</li>
              </ul>
              <p className="leading-relaxed">
                By using the Service, you consent to the transfer of your information to the United States and other jurisdictions.
              </p>
            </section>

            {/* Section 15 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">15. Data Breach Notification</h2>
              <p className="leading-relaxed mb-3">
                In the event of a data breach that affects your personal information, we will:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li><strong className="text-white">Notify affected users within 72 hours</strong> of becoming aware of the breach (where required by law)</li>
                <li>Provide information about the nature of the breach and data affected</li>
                <li>Describe measures taken to address the breach</li>
                <li>Provide recommendations for protecting yourself</li>
              </ul>
            </section>

            {/* Section 16 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">16. Do Not Track</h2>
              <p className="leading-relaxed">
                Some browsers have a "Do Not Track" feature that signals websites not to track browsing activity. Our Service does not currently respond to DNT signals, as there is no industry standard for compliance. However, we do not engage in cross-site tracking or targeted advertising.
              </p>
            </section>

            {/* Section 17 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">17. Links to Third-Party Sites</h2>
              <p className="leading-relaxed">
                Our Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to read the privacy policies of any third-party sites you visit.
              </p>
            </section>

            {/* Section 18 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">18. Changes to This Policy</h2>
              <p className="leading-relaxed mb-3">
                We may update this Privacy Policy from time to time. We will notify you of material changes by:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-4">
                <li>Posting the updated policy on our website</li>
                <li>Updating the "Effective Date" above</li>
                <li>Sending email notification for significant changes</li>
              </ul>
              <p className="leading-relaxed">
                Your continued use of the Service after changes constitutes acceptance of the updated policy. We encourage you to review this policy periodically.
              </p>
            </section>

            {/* Section 19 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">19. Contact Us</h2>
              <p className="leading-relaxed">
                If you have questions about this Privacy Policy, wish to exercise your data rights, have DMCA concerns, or have any other inquiries, please contact us:
              </p>
              <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="font-semibold text-white">Artifio.ai</p>
                <p className="font-semibold mt-2 text-white">Email: privacy@artifio.ai</p>
                <p className="font-semibold mt-2 text-white">Address: 539 W Commerce St, Ste 5263<br />Dallas, Texas 75208<br />United States of America</p>
                <p className="mt-3 text-white/70">Response Time: We aim to respond to all inquiries within 30 days.</p>
              </div>
            </section>
          </div>
        </article>
      </main>

      <ContactSection />
    </div>
  );
};

export default Privacy;