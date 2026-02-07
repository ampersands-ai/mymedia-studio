import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { CinematicNav } from "@/components/cinematic/CinematicNav";
import { ContactSection } from "@/components/cinematic/ContactSection";
import { brand, pageTitle, privacyMailto } from '@/config/brand';

const Terms = () => {
  useEffect(() => {
    document.title = pageTitle('Terms of Service');
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', `Terms of Service for ${brand.name} - Understand the rules and guidelines for using our AI-powered creative platform.`);
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
              TERMS OF SERVICE
            </h1>
            <p className="text-white/50 font-medium">Effective Date: December 2024</p>
          </header>

          <div className="space-y-8 text-white/70">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">1. Acceptance of Terms</h2>
              <p className="leading-relaxed">
                By accessing or using {brand.name} ("Service," "Platform," or "we"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use our Service. We reserve the right to modify these Terms at any time, and your continued use constitutes acceptance of any changes.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">2. Description of Service</h2>
              <p className="leading-relaxed mb-4">
                {brand.name} is an AI content creation platform that provides access to multiple third-party AI models through a unified interface and subscription. The Service enables users to generate videos, images, audio, and other content using AI models.
              </p>
              <p className="leading-relaxed mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
                <strong className="text-white">Important:</strong> {brand.name} acts as an aggregator and interface layer. We do not develop or operate the underlying AI models — they are provided by third-party companies.
              </p>
              <p className="leading-relaxed mb-3">Our Service integrates AI providers including but not limited to:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li><strong className="text-white">Video:</strong> Google Veo, OpenAI Sora, Runway, Kling AI, MiniMax (Hailuo), Alibaba (Wan), ByteDance (Seedance)</li>
                <li><strong className="text-white">Image:</strong> Midjourney, FLUX (Black Forest Labs), Ideogram, DALL-E, Google Imagen, Seedream, xAI (Grok Imagine), HiDream, Alibaba (Qwen), Recraft</li>
                <li><strong className="text-white">Audio/Voice:</strong> ElevenLabs, Suno</li>
                <li><strong className="text-white">Text:</strong> Anthropic Claude, OpenAI GPT</li>
              </ul>
              <p className="leading-relaxed mt-4 text-white/60 italic">
                This list may change as we add or remove providers. We do not guarantee the continued availability of any specific model.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">3. Eligibility and Account Registration</h2>
              <p className="leading-relaxed mb-4">
                <strong className="text-white">You must be at least 18 years of age to use this Service.</strong> By using {brand.name}, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into these Terms.
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>You must provide accurate, current, and complete information during registration</li>
                <li>Registration is exclusively through Google OAuth authentication for enhanced security and convenience</li>
                <li>Your Google account email is automatically verified upon registration</li>
                <li>Your account is secured through Google's authentication system</li>
                <li>You are responsible for all activities that occur under your account</li>
                <li>You must notify us immediately of any unauthorized access to your account</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">4. Subscription Plans and Pricing</h2>
              
              <h3 className="text-xl font-semibold mb-3 text-white/90">4.1 Subscription Tiers</h3>
              <div className="overflow-x-auto mb-6">
                <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                  <div className="grid grid-cols-3 gap-4 text-sm font-semibold text-white border-b border-white/10 pb-2 mb-2">
                    <div>Tier</div>
                    <div>Monthly Price</div>
                    <div>Credits/Month</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-4"><div>Free</div><div>$0</div><div>5 (one-time, never refills)</div></div>
                    <div className="grid grid-cols-3 gap-4"><div>Explorer</div><div>$7.99</div><div>375</div></div>
                    <div className="grid grid-cols-3 gap-4"><div>Professional</div><div>$19.99</div><div>1,000</div></div>
                    <div className="grid grid-cols-3 gap-4"><div>Ultimate</div><div>$44.99</div><div>2,500</div></div>
                    <div className="grid grid-cols-3 gap-4"><div>Studio</div><div>$74.99</div><div>5,000</div></div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <span className="text-primary font-semibold">🔥 Limited Time Offer: 20% off all plans!</span>
                  </div>
                </div>
              </div>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-6">
                <li>All plans are billed monthly</li>
                <li>All prices are in USD</li>
                <li>Payments are processed by Dodo Payments (primary) or Stripe (backup). By subscribing, you also agree to the applicable payment processor's terms of service</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white/90">4.2 Credits</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-6">
                <li>Subscription credits are allocated at the start of each billing cycle</li>
                <li>Different AI models and generation types consume different amounts of credits based on computational cost</li>
                <li>Credit costs per generation are displayed before you submit a request</li>
                <li>Credits are non-refundable and have no cash value</li>
                <li>Failed generations due to system errors will have credits refunded automatically</li>
                <li>Failed generations due to content policy violations or user error may not be refunded</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white/90">4.3 Credit Expiration</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-6">
                <li><strong className="text-white">While subscribed:</strong> Credits never expire. Unused credits roll over each billing cycle.</li>
                <li><strong className="text-white">After cancellation:</strong> Credits are frozen for 30 days after your billing cycle ends. If you resubscribe within 30 days, your credits are fully restored. After 30 days, all unused credits are permanently forfeited.</li>
                <li><strong className="text-white">Account deletion:</strong> All credits are forfeited immediately and cannot be recovered.</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white/90">4.4 One-Time Credit Purchases</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-6">
                <li>Available to paid subscribers only (Free tier users cannot purchase additional credits)</li>
                <li>Priced at your current subscription tier rate — higher tiers unlock better per-credit pricing</li>
                <li>One-time credits are added to your balance and follow the same expiration rules as subscription credits</li>
                <li>One-time credits are non-refundable</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white/90">4.5 Pricing Changes</h3>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10 mb-4">
                <p className="text-white/90 font-semibold mb-2">Important:</p>
                <p className="leading-relaxed">
                  {brand.name}'s pricing is dependent on costs charged by third-party AI model providers. These providers may change their pricing at any time, sometimes with little or no advance notice to us.
                </p>
              </div>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-6">
                <li>We reserve the right to adjust our subscription pricing at any time to reflect changes in underlying model costs, market conditions, or operational expenses</li>
                <li><strong className="text-white">For planned price changes:</strong> We will endeavor to provide advance notice via email when possible</li>
                <li><strong className="text-white">For third-party cost pass-throughs:</strong> Price changes may take effect immediately or at your next billing cycle, depending on when we are notified by providers</li>
                <li><strong className="text-white">Annual subscribers:</strong> Your rate is locked for the duration of your prepaid term. Changes apply upon renewal</li>
                <li>Continued use of the Service after a price change constitutes acceptance of the new pricing</li>
                <li>If you do not agree to a price change, you may cancel your subscription before renewal</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white/90">4.6 Credit Cost Changes</h3>
              <p className="leading-relaxed mb-4">
                We reserve the right to adjust the credit cost of specific AI models or generation types at any time. These changes may occur due to:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-4">
                <li>Changes in third-party provider pricing</li>
                <li>Introduction of new models</li>
                <li>Changes in computational requirements</li>
                <li>Model deprecation or replacement</li>
              </ul>
              <p className="leading-relaxed mb-6">
                We will endeavor to provide notice of significant credit cost changes, but changes may take effect immediately when required by third-party pricing adjustments. Current credit costs are always displayed before you submit a generation request.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">4.7 Taxes</h3>
              <p className="leading-relaxed">
                Prices do not include applicable taxes. You are responsible for all taxes associated with your subscription and purchases.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">5. Upgrades and Downgrades</h2>
              
              <h3 className="text-xl font-semibold mb-3 text-white/90">5.1 Upgrades</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-6">
                <li>Take effect immediately upon confirmation</li>
                <li>Your billing cycle resets to the upgrade date</li>
                <li>You receive the full credit allocation of your new tier immediately</li>
                <li>Existing credits remain in your account — new credits are added on top</li>
                <li>Your payment processor handles proration automatically. You pay only the difference for time remaining on your old plan</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white/90">5.2 Downgrades</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Take effect at the end of your current billing cycle</li>
                <li>You retain full access to your current tier until the cycle ends</li>
                <li>Existing credits remain in your account — no credits are removed</li>
                <li>Your next billing cycle begins at the new (lower) tier rate and credit allocation</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">6. Cancellation and Termination</h2>
              
              <h3 className="text-xl font-semibold mb-3 text-white/90">6.1 Cancellation by You</h3>
              <p className="leading-relaxed mb-4">
                You may cancel your subscription at any time through your account settings.
              </p>
              <p className="font-semibold text-white mb-2">Effect of Cancellation:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-6">
                <li>You retain access to paid features until the end of your current billing cycle</li>
                <li>After your billing cycle ends, your credits are frozen for 30 days</li>
                <li>If you resubscribe within 30 days, your credits are fully restored</li>
                <li>After 30 days, all unused credits are permanently removed</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white/90">6.2 Account Deletion</h3>
              <p className="leading-relaxed mb-4">
                You may delete your account at any time through your account settings.
              </p>
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30 mb-6">
                <p className="text-red-400 font-semibold mb-2">Warning: Account deletion is immediate and permanent.</p>
                <ul className="list-disc pl-6 space-y-1 leading-relaxed text-white/70">
                  <li>All credits are forfeited immediately</li>
                  <li>All generation history is deleted</li>
                  <li>All account data is removed</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold mb-3 text-white/90">6.3 Termination by Us</h3>
              <p className="leading-relaxed mb-4">We may suspend or terminate your account if you:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-4">
                <li>Violate these Terms of Service</li>
                <li>Engage in fraudulent or illegal activity</li>
                <li>Abuse the Service or other users</li>
                <li>Fail to pay for services rendered</li>
                <li>Repeatedly violate our content moderation policies</li>
                <li>Attempt to circumvent our systems or exploit vulnerabilities</li>
              </ul>
              <p className="leading-relaxed mb-6">
                Upon termination by us, your access will be revoked immediately. Unused credits will be forfeited. We are not obligated to provide refunds for terminations due to Terms violations.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">6.4 No Refunds</h3>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="font-semibold text-white mb-2">Refund Policy</p>
                <p className="leading-relaxed mb-2">We do not provide refunds for:</p>
                <ul className="list-disc pl-6 space-y-1 leading-relaxed">
                  <li>Partial billing periods</li>
                  <li>Unused credits</li>
                  <li>Prepaid annual subscriptions</li>
                  <li>Accounts terminated for Terms violations</li>
                </ul>
                <p className="leading-relaxed mt-3 font-semibold text-white">All sales are final except as required by applicable law.</p>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">7. Content Moderation</h2>
              <p className="leading-relaxed mb-4">
                All user prompts are screened through automated safety systems before processing. This moderation evaluates content to ensure compliance with our acceptable use policies.
              </p>
              <h3 className="text-xl font-semibold mb-3 text-white/90">Prohibited Content Categories:</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-4">
                <li>Sexual content and sexually explicit material</li>
                <li><strong className="text-white">Content sexualizing or exploiting minors (zero tolerance)</strong></li>
                <li>Harassment, bullying, and threatening content</li>
                <li>Hate speech and discriminatory content</li>
                <li>Illicit activities and illegal content</li>
                <li>Self-harm and suicide-related content</li>
                <li>Extreme violence and graphic content</li>
                <li>Non-consensual intimate imagery</li>
                <li>Deepfakes of real people without consent</li>
              </ul>
              <p className="leading-relaxed mb-3">
                Content that triggers our moderation system will be blocked. We maintain a zero-tolerance policy for prohibited content. Violations may result in:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Content blocking (no credits charged)</li>
                <li>Warning notification</li>
                <li>Temporary account suspension</li>
                <li>Permanent account termination</li>
                <li>Reporting to law enforcement (for illegal content)</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">8. Acceptable Use Policy</h2>
              <p className="leading-relaxed mb-4">You agree NOT to use the Service to:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Generate illegal, harmful, or offensive content</li>
                <li>Create content that infringes on intellectual property rights</li>
                <li>Generate deepfakes or realistic depictions of real people without their consent</li>
                <li>Create non-consensual intimate imagery of any person</li>
                <li>Generate content depicting minors in inappropriate or sexual situations</li>
                <li>Produce content promoting violence, terrorism, or hate</li>
                <li>Attempt to reverse engineer or extract AI models</li>
                <li>Abuse, harass, or harm others</li>
                <li>Generate spam, malware, or phishing content</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Use automated systems to abuse the credit system</li>
                <li>Create misleading or fraudulent content intended to deceive</li>
                <li>Circumvent or attempt to bypass our content moderation systems</li>
                <li>Resell, sublicense, or redistribute access to the Service</li>
                <li>Interfere with or disrupt the Service or its infrastructure</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">9. Intellectual Property Rights</h2>
              
              <h3 className="text-xl font-semibold mb-3 text-white/90">9.1 Your Content</h3>
              <p className="leading-relaxed mb-4">
                You retain ownership of the prompts you submit. By using the Service, you grant us a limited, worldwide, non-exclusive, royalty-free license to process your prompts solely for the purpose of providing the Service.
              </p>
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30 mb-6">
                <p className="text-green-400 font-semibold">We do NOT use your prompts or generated content to train our own AI models.</p>
              </div>
              <p className="leading-relaxed mb-6 text-white/60 italic">
                Note: Third-party AI providers may have their own data usage policies. Please review their terms for information on how they handle data.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">9.2 Generated Outputs</h3>
              <p className="leading-relaxed mb-2">Subject to the terms of the underlying AI model providers:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-6">
                <li>You own the outputs generated through your use of the Service, to the extent permitted by law and third-party provider terms</li>
                <li>Commercial use rights are included with paid subscriptions, subject to third-party model provider terms</li>
                <li>Some AI model providers may have additional restrictions — you are responsible for compliance with their terms</li>
                <li>AI-generated content may not be unique. Similar outputs could be generated for other users using similar prompts</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white/90">9.3 Our Platform</h3>
              <p className="leading-relaxed mb-6">
                The Service, including all software, interface design, branding, and trademarks, is owned by {brand.name} and protected by intellectual property laws. You may not copy, modify, distribute, or reverse engineer any part of our platform.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">9.4 Feedback</h3>
              <p className="leading-relaxed">
                If you provide feedback or suggestions about the Service, you grant {brand.name} a perpetual, royalty-free license to use that feedback without compensation or attribution.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">10. Third-Party AI Models</h2>
              
              <h3 className="text-xl font-semibold mb-3 text-white/90">10.1 Availability</h3>
              <p className="leading-relaxed mb-3">
                We provide access to third-party AI models as-is. Model availability may change without notice due to:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-4">
                <li>Provider discontinuation or API changes</li>
                <li>Provider pricing changes making a model economically unviable</li>
                <li>Capacity constraints or rate limiting</li>
                <li>Compliance or legal requirements</li>
                <li>Technical issues or outages</li>
                <li>Provider policy changes</li>
              </ul>
              <p className="leading-relaxed mb-6">
                We do not guarantee continuous availability of any specific model. If a model you rely on becomes unavailable, we will endeavor to provide alternatives, but are not obligated to do so.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">10.2 Quality and Results</h3>
              <p className="leading-relaxed mb-3">
                AI generation results vary based on prompts, model capabilities, and other factors. We do not guarantee:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-6">
                <li>Specific output quality, resolution, or accuracy</li>
                <li>That outputs will meet your expectations</li>
                <li>That all prompts will successfully generate content</li>
                <li>Consistency across generations</li>
                <li>Factual accuracy of AI-generated text or content</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white/90">10.3 Provider Terms</h3>
              <p className="leading-relaxed mb-6">
                By using third-party models through {brand.name}, you agree to comply with each provider's terms of service and acceptable use policies. Violations of provider terms may result in content blocking or account termination.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">10.4 Your Responsibility</h3>
              <p className="leading-relaxed mb-2">You are solely responsible for:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Reviewing generated content before use</li>
                <li>Ensuring your use of generated content complies with applicable laws</li>
                <li>Compliance with third-party provider terms</li>
                <li>Any claims arising from your use of AI-generated content</li>
              </ul>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">11. DMCA and Copyright Claims</h2>
              
              <h3 className="text-xl font-semibold mb-3 text-white/90">11.1 Reporting Infringement</h3>
              <p className="leading-relaxed mb-3">
                If you believe content on our Service infringes your copyright, please send a DMCA takedown notice to our designated agent with:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-6">
                <li>Your physical or electronic signature</li>
                <li>Identification of the copyrighted work claimed to be infringed</li>
                <li>Identification of the infringing material and its location on our Service</li>
                <li>Your contact information (address, phone, email)</li>
                <li>A statement that you have a good faith belief the use is not authorized</li>
                <li>A statement under penalty of perjury that the information is accurate and you are authorized to act on behalf of the copyright owner</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 text-white/90">11.2 Designated Agent</h3>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10 mb-6">
                <p className="leading-relaxed">DMCA notices should be sent to:</p>
                <p className="mt-2"><strong className="text-white">Email:</strong> {brand.privacyEmail}</p>
                <p className="mt-2"><strong className="text-white">Mail:</strong> {brand.name} DMCA Agent<br />539 W Commerce St, Ste 5263<br />Dallas, Texas 75208<br />United States of America</p>
              </div>

              <h3 className="text-xl font-semibold mb-3 text-white/90">11.3 Counter-Notification</h3>
              <p className="leading-relaxed mb-6">
                If you believe your content was wrongly removed, you may submit a counter-notification with the required information under the DMCA. We will process counter-notifications in accordance with applicable law.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">11.4 Repeat Infringers</h3>
              <p className="leading-relaxed">
                We maintain a policy of terminating accounts of users who are repeat copyright infringers.
              </p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">12. Data Retention</h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li><strong className="text-white">Generated content:</strong> Retained for 2 weeks from creation, then automatically deleted</li>
                <li><strong className="text-white">Account information:</strong> Retained until you request account deletion</li>
                <li><strong className="text-white">Third-party provider data:</strong> May take up to 2 months to be fully deleted from provider systems</li>
                <li><strong className="text-white">Audit and security logs:</strong> Retained for 90 days</li>
                <li><strong className="text-white">Payment records:</strong> Retained as required for tax and legal compliance (typically 7 years)</li>
                <li><strong className="text-white">Anonymized analytics:</strong> May be retained indefinitely for service improvement</li>
              </ul>
              <p className="leading-relaxed mt-4">
                You are responsible for downloading any content you wish to keep before the retention period expires.
              </p>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">13. Service Availability</h2>
              <p className="leading-relaxed">
                We strive to maintain high availability but do not guarantee uninterrupted access to the Service. We may modify, suspend, or discontinue any aspect of the Service at any time, including specific AI models, features, or functionality. We are not liable for any downtime, service interruptions, or model unavailability.
              </p>
            </section>

            {/* Section 14 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">14. Disclaimers</h2>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="leading-relaxed mb-4 uppercase font-bold text-white/90">
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
                </p>
                <p className="leading-relaxed mb-3 uppercase font-bold text-white/90">
                  WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="list-disc pl-6 space-y-1 leading-relaxed uppercase">
                  <li>Merchantability</li>
                  <li>Fitness for a particular purpose</li>
                  <li>Non-infringement</li>
                  <li>Accuracy or reliability of outputs</li>
                  <li>Continuous availability of any model</li>
                </ul>
                <p className="leading-relaxed mt-4 uppercase font-bold text-white/90">
                  WE DO NOT WARRANT THAT THE SERVICE WILL BE ERROR-FREE, SECURE, OR UNINTERRUPTED, OR THAT ANY SPECIFIC AI MODEL WILL REMAIN AVAILABLE.
                </p>
              </div>
            </section>

            {/* Section 15 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">15. Limitation of Liability</h2>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="leading-relaxed mb-3 uppercase font-bold text-white/90">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, {brand.name.toUpperCase()} AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR:
                </p>
                <ul className="list-disc pl-6 space-y-1 leading-relaxed mb-4">
                  <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                  <li>Loss of profits, revenue, data, or business opportunities</li>
                  <li>Cost of substitute services</li>
                  <li>Any damages arising from AI-generated content</li>
                  <li>Any damages arising from model unavailability or changes</li>
                </ul>
                <p className="leading-relaxed uppercase font-bold text-white/90">
                  OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM YOUR USE OF THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS GREATER.
                </p>
                <p className="leading-relaxed mt-3 text-white/70">
                  This limitation applies regardless of the theory of liability (contract, tort, negligence, strict liability, or otherwise).
                </p>
              </div>
            </section>

            {/* Section 16 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">16. Indemnification</h2>
              <p className="leading-relaxed mb-3">
                You agree to indemnify, defend, and hold harmless {brand.name} and its affiliates from any claims, damages, losses, liabilities, costs, and expenses (including legal fees) arising from:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Your use of the Service</li>
                <li>Your generated content and how you use it</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of third-party rights</li>
                <li>Your violation of third-party AI provider terms</li>
                <li>Any claims related to content you create, publish, or distribute using the Service</li>
              </ul>
            </section>

            {/* Section 17 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">17. Dispute Resolution and Arbitration</h2>
              
              <h3 className="text-xl font-semibold mb-3 text-white/90">17.1 Binding Arbitration</h3>
              <p className="leading-relaxed mb-4">
                Any dispute, claim, or controversy arising out of or relating to these Terms or the Service shall be resolved by binding arbitration administered by the American Arbitration Association (AAA) in accordance with its Commercial Arbitration Rules.
              </p>
              <p className="leading-relaxed mb-6">
                The arbitration shall be conducted in Dallas, Texas, or at another mutually agreed location. The arbitrator's decision shall be final and binding. Judgment on the arbitration award may be entered in any court of competent jurisdiction.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">17.2 Small Claims Exception</h3>
              <p className="leading-relaxed mb-6">
                Either party may bring an individual action in small claims court for disputes within the court's jurisdiction, provided the action remains in small claims court.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">17.3 Class Action Waiver</h3>
              <p className="leading-relaxed mb-6">
                You agree that any arbitration or proceeding shall be limited to the dispute between us and you individually. You waive any right to participate in a class action lawsuit or class-wide arbitration.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">17.4 Exceptions</h3>
              <p className="leading-relaxed">
                Either party may seek injunctive relief in court for intellectual property infringement or unauthorized access to the Service.
              </p>
            </section>

            {/* Section 18 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">18. Governing Law</h2>
              <p className="leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the <strong className="text-white">State of Texas, United States of America</strong>, without regard to its conflict of law provisions. For any matters not subject to arbitration, the state and federal courts located in Dallas County, Texas shall have exclusive jurisdiction.
              </p>
            </section>

            {/* Section 19 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">19. Changes to Terms</h2>
              <p className="leading-relaxed mb-3">
                We may modify these Terms at any time. We will notify you of material changes by:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed mb-4">
                <li>Posting the updated Terms on our website</li>
                <li>Updating the "Effective Date" above</li>
                <li>Sending email notification for significant changes</li>
              </ul>
              <p className="leading-relaxed">
                Your continued use of the Service after changes are posted constitutes acceptance of the modified Terms. If you do not agree to modified Terms, you must stop using the Service and cancel your subscription.
              </p>
            </section>

            {/* Section 20 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">20. General Provisions</h2>
              
              <h3 className="text-xl font-semibold mb-3 text-white/90">20.1 Entire Agreement</h3>
              <p className="leading-relaxed mb-6">
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and {brand.name} regarding the Service.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">20.2 Severability</h3>
              <p className="leading-relaxed mb-6">
                If any provision of these Terms is found unenforceable, the remaining provisions remain in full effect.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">20.3 Waiver</h3>
              <p className="leading-relaxed mb-6">
                Our failure to enforce any provision does not constitute a waiver of that provision or our right to enforce it later.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">20.4 Assignment</h3>
              <p className="leading-relaxed mb-6">
                You may not assign these Terms without our written consent. We may assign these Terms freely in connection with a merger, acquisition, or sale of assets.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-white/90">20.5 Force Majeure</h3>
              <p className="leading-relaxed">
                We are not liable for failures or delays caused by circumstances beyond our reasonable control, including natural disasters, war, terrorism, labor disputes, government actions, or third-party service provider failures.
              </p>
            </section>

            {/* Section 21 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">21. Contact Information</h2>
              <p className="leading-relaxed">
                If you have questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="font-semibold text-white">{brand.name}</p>
                <p className="font-semibold mt-2 text-white">Email: {brand.privacyEmail}</p>
                <p className="font-semibold mt-2 text-white">Address: 539 W Commerce St, Ste 5263<br />Dallas, Texas 75208<br />United States of America</p>
              </div>
            </section>

            <section className="mt-10 p-6 bg-primary/10 rounded-xl border border-primary/30">
              <p className="font-bold text-white">
                BY USING {brand.name.toUpperCase()}, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
              </p>
            </section>
          </div>
        </article>
      </main>

      <ContactSection />
    </div>
  );
};

export default Terms;