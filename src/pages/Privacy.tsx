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
            <p className="text-white/50 font-medium">Effective Date: December 17, 2025</p>
          </header>

          <div className="space-y-8 text-white/70">
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">1. Introduction</h2>
              <p className="leading-relaxed">
                Welcome to Artifio.ai ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered content generation platform for creating videos, images, audio, and other creative content.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">2. Information We Collect</h2>
              <h3 className="text-xl font-semibold mb-3 text-white/90">Personal Information</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li><strong className="text-white">Email address</strong> - Required for account registration and verification</li>
                <li><strong className="text-white">Name</strong> - Optional, collected if you sign up via Google OAuth</li>
                <li><strong className="text-white">Authentication data</strong> - Password (encrypted) or OAuth tokens from Google</li>
                <li><strong className="text-white">Payment information</strong> - Processed by Dodo Payments; we do not store your full payment details</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6 text-white/90">Usage Information</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li><strong className="text-white">Generation prompts</strong> - Text prompts you submit for content generation</li>
                <li><strong className="text-white">Generated content</strong> - Images, videos, audio, and other outputs created using our Service</li>
                <li><strong className="text-white">Credit usage</strong> - Records of credits consumed and subscription information</li>
                <li><strong className="text-white">Device information</strong> - Browser type, operating system, and IP address</li>
                <li><strong className="text-white">Analytics data</strong> - Pages visited, features used, and interaction patterns (via PostHog)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>To provide and maintain our AI content generation services</li>
                <li>To process your prompts and generate content using our AI providers</li>
                <li>To manage your account, subscription, and credit balance</li>
                <li>To send you transactional emails (verification, password reset, generation notifications)</li>
                <li>To improve our services and develop new features</li>
                <li>To detect, prevent, and address fraud, abuse, or security issues</li>
                <li>To comply with legal obligations</li>
                <li>To moderate content and enforce our acceptable use policies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">4. Third-Party Service Providers</h2>
              <p className="leading-relaxed mb-4">
                We work with trusted third-party providers to deliver our services. <strong className="text-white">We do not sell your personal information.</strong> Below is a detailed list of our service providers and the data shared with each:
              </p>
              
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="font-semibold text-white mb-2">AI Generation Providers</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li><strong className="text-white">OpenAI</strong> - Content moderation and AI generation; receives prompts</li>
                    <li><strong className="text-white">Anthropic (Claude)</strong> - Script and text generation; receives prompts</li>
                    <li><strong className="text-white">Kie.ai</strong> - Video and image generation; receives prompts and uploaded images</li>
                    <li><strong className="text-white">ElevenLabs</strong> - Voice and audio generation; receives text and voice settings</li>
                    <li><strong className="text-white">Suno</strong> - Music generation; receives prompts</li>
                    <li><strong className="text-white">Pixabay</strong> - Stock video backgrounds; receives search queries</li>
                  </ul>
                </div>

                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="font-semibold text-white mb-2">Infrastructure & Analytics</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li><strong className="text-white">PostHog</strong> - Analytics and product insights; receives anonymized usage patterns</li>
                    <li><strong className="text-white">Resend</strong> - Email delivery; receives email addresses for transactional emails</li>
                    <li><strong className="text-white">Dodo Payments</strong> - Payment processing; receives payment details (we do not store these)</li>
                    <li><strong className="text-white">Google</strong> - OAuth authentication; receives authentication requests</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">5. Data Retention</h2>
              <p className="leading-relaxed mb-4">
                We retain your data only as long as necessary to provide our services and fulfill the purposes outlined in this policy:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li><strong className="text-white">Generated content:</strong> Retained for <strong>2 weeks</strong> from creation, then automatically deleted</li>
                <li><strong className="text-white">Account information:</strong> Retained until you request account deletion</li>
                <li><strong className="text-white">Third-party provider data:</strong> May take up to <strong>2 months</strong> to be fully deleted from provider systems</li>
                <li><strong className="text-white">Audit and security logs:</strong> Retained for 90 days for security purposes</li>
                <li><strong className="text-white">Anonymized analytics:</strong> May be retained indefinitely for service improvement</li>
              </ul>
              <p className="leading-relaxed mt-4">
                You are responsible for downloading any generated content you wish to keep before the 2-week retention period expires.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">6. Content Moderation</h2>
              <p className="leading-relaxed">
                All prompts submitted to our Service are automatically screened through OpenAI's Moderation API before processing. This system evaluates content across 13 categories including sexual content, violence, hate speech, and self-harm. Prompts that violate our policies are blocked and not processed. This moderation is performed to ensure user safety and compliance with applicable laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">7. Data Security</h2>
              <p className="leading-relaxed mb-4">
                We implement industry-standard security measures to protect your personal data:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Encryption of data in transit (TLS/SSL) and at rest</li>
                <li>Row Level Security (RLS) policies on our database</li>
                <li>Secure credential storage using encrypted vaults</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls limiting employee access to personal data</li>
              </ul>
              <p className="leading-relaxed mt-4">
                However, no method of transmission over the Internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">8. Your Rights</h2>
              <p className="leading-relaxed mb-4">Depending on your location, you may have the following rights:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li><strong className="text-white">Access:</strong> Request a copy of your personal data</li>
                <li><strong className="text-white">Correction:</strong> Request correction of inaccurate data</li>
                <li><strong className="text-white">Deletion:</strong> Request deletion of your personal data and account</li>
                <li><strong className="text-white">Portability:</strong> Request your data in a portable format</li>
                <li><strong className="text-white">Objection:</strong> Object to certain processing of your data</li>
                <li><strong className="text-white">Withdrawal:</strong> Withdraw consent at any time</li>
              </ul>
              <p className="leading-relaxed mt-4">
                To exercise any of these rights, please contact us at <strong className="text-white">privacy@artifio.ai</strong>. We will respond to your request within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">9. GDPR Rights (European Users)</h2>
              <p className="leading-relaxed mb-4">
                If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you have additional rights under the General Data Protection Regulation (GDPR):
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li><strong className="text-white">Legal Basis:</strong> We process your data based on consent, contract performance, and legitimate interests</li>
                <li><strong className="text-white">Data Controller:</strong> Artifio.ai, located in Texas, USA</li>
                <li><strong className="text-white">Right to Lodge Complaint:</strong> You have the right to lodge a complaint with your local supervisory authority</li>
                <li><strong className="text-white">International Transfers:</strong> Your data may be transferred to the United States; we ensure appropriate safeguards are in place</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Contact our privacy team at <strong className="text-white">privacy@artifio.ai</strong> for GDPR-related inquiries.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">10. CCPA Rights (California Residents)</h2>
              <p className="leading-relaxed mb-4">
                If you are a California resident, you have rights under the California Consumer Privacy Act (CCPA):
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li><strong className="text-white">Right to Know:</strong> You can request information about the categories and specific pieces of personal data we collect</li>
                <li><strong className="text-white">Right to Delete:</strong> You can request deletion of your personal information</li>
                <li><strong className="text-white">Right to Opt-Out:</strong> We do not sell your personal information, so no opt-out is necessary</li>
                <li><strong className="text-white">Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights</li>
              </ul>
              <p className="leading-relaxed mt-4">
                <strong className="text-white">We do not sell your personal information.</strong> To exercise your CCPA rights, contact us at <strong className="text-white">privacy@artifio.ai</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">11. Cookies and Tracking</h2>
              <p className="leading-relaxed mb-4">
                We use cookies and similar tracking technologies for the following purposes:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li><strong className="text-white">Essential cookies:</strong> Required for authentication and session management</li>
                <li><strong className="text-white">Analytics cookies:</strong> PostHog analytics to understand usage patterns (anonymized)</li>
                <li><strong className="text-white">Preference cookies:</strong> To remember your settings and preferences</li>
              </ul>
              <p className="leading-relaxed mt-4">
                We do not use third-party advertising cookies. You can control cookies through your browser settings, but disabling essential cookies may affect your ability to use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">12. Children's Privacy</h2>
              <p className="leading-relaxed">
                <strong className="text-white">Our Service is not intended for anyone under 18 years of age.</strong> We do not knowingly collect personal information from individuals under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at <strong className="text-white">privacy@artifio.ai</strong>. We will take steps to delete such information from our systems.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">13. International Data Transfers</h2>
              <p className="leading-relaxed">
                Your information may be transferred to and processed in the United States and other countries where our service providers operate. We ensure appropriate safeguards are in place, including standard contractual clauses and compliance with applicable data protection laws, to protect your data during international transfers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">14. Changes to This Policy</h2>
              <p className="leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Effective Date" above. We encourage you to review this policy periodically. Your continued use of our Service after changes are posted constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">15. Contact Us</h2>
              <p className="leading-relaxed">
                If you have questions about this privacy policy, wish to exercise your data rights, or have concerns about our privacy practices, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="font-semibold text-white">Artifio.ai</p>
                <p className="font-semibold mt-2 text-white">Privacy Contact: privacy@artifio.ai</p>
                <p className="font-semibold mt-2 text-white">Address: 539 W Commerce St, Ste 5263<br />Dallas, Texas 75208<br />United States of America</p>
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