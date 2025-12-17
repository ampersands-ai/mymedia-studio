import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { CinematicNav } from "@/components/cinematic/CinematicNav";
import { ContactSection } from "@/components/cinematic/ContactSection";

const Terms = () => {
  useEffect(() => {
    document.title = "Terms of Service - Artifio.ai";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Terms of Service for Artifio.ai - Understand the rules and guidelines for using our AI-powered creative platform.');
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
            <p className="text-white/50 font-medium">Effective Date: December 17, 2025</p>
          </header>

          <div className="space-y-8 text-white/70">
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">1. Acceptance of Terms</h2>
              <p className="leading-relaxed">
                By accessing or using Artifio.ai ("Service," "Platform," or "we"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use our Service. We reserve the right to modify these Terms at any time, and your continued use constitutes acceptance of any changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">2. Description of Service</h2>
              <p className="leading-relaxed">
                Artifio.ai is an AI-powered content generation platform that enables users to create videos, images, audio, and other creative content. Our Service integrates multiple AI providers including OpenAI, Anthropic (Claude), Kie.ai, ElevenLabs, and Suno to deliver high-quality content generation. The Service operates on a credit-based system where users consume credits to generate content.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">3. Eligibility and Account Registration</h2>
              <p className="leading-relaxed mb-4">
                <strong className="text-white">You must be at least 18 years of age to use this Service.</strong> By using Artifio.ai, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into these Terms.
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>You must provide accurate, current, and complete information during registration</li>
                <li>You may register using your email address or through Google OAuth authentication</li>
                <li>Email verification is required before accessing content generation features</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You are responsible for all activities that occur under your account</li>
                <li>You must notify us immediately of any unauthorized access to your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">4. Credit System and Payments</h2>
              <h3 className="text-xl font-semibold mb-3 text-white/90">Free Credits</h3>
              <p className="leading-relaxed mb-4">
                Users receive 5 free credits daily. Daily credits are provided to help you explore our platform. Free credits are subject to fair use policies and may be modified at our discretion.
              </p>
              
              <h3 className="text-xl font-semibold mb-3 text-white/90">Paid Plans</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Credit packages and subscriptions are available for purchase</li>
                <li>All payments are processed securely through Dodo Payments</li>
                <li>Credits are non-refundable except as required by law</li>
                <li>Monthly credits are tied to your billing period and may expire according to your plan's terms</li>
                <li>We reserve the right to modify pricing with 30 days' notice</li>
                <li>Failed generations due to system errors will have credits refunded automatically</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">5. Content Moderation</h2>
              <p className="leading-relaxed mb-4">
                All user prompts are screened through OpenAI's Moderation API before processing. This automated safety system evaluates content across 13 categories to ensure compliance with our acceptable use policies.
              </p>
              <h3 className="text-xl font-semibold mb-3 text-white/90">Prohibited Content Categories</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Sexual content and sexually explicit material</li>
                <li>Harassment, bullying, and threatening content</li>
                <li>Hate speech and discriminatory content</li>
                <li>Illicit activities and illegal content</li>
                <li>Self-harm and suicide-related content</li>
                <li>Violence and graphic content</li>
                <li>Content involving minors in inappropriate contexts</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Content that triggers our moderation system will be blocked, and no credits will be charged. We maintain a zero-tolerance policy for prohibited content. Repeated violations may result in account suspension or termination.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">6. Acceptable Use Policy</h2>
              <p className="leading-relaxed mb-4">You agree NOT to use the Service to:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Generate illegal, harmful, or offensive content</li>
                <li>Create content that infringes on intellectual property rights</li>
                <li>Generate deepfakes or impersonate others without consent</li>
                <li>Attempt to reverse engineer or extract our AI models</li>
                <li>Abuse, harass, or harm others</li>
                <li>Generate spam, malware, or phishing content</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Use automated systems to abuse the credit system</li>
                <li>Generate content depicting minors in inappropriate situations</li>
                <li>Create misleading or fraudulent content</li>
                <li>Circumvent or attempt to bypass our content moderation systems</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">7. Intellectual Property Rights</h2>
              <h3 className="text-xl font-semibold mb-3 text-white/90">Your Content</h3>
              <p className="leading-relaxed mb-4">
                You retain ownership of the prompts you submit and the content generated by our AI systems. However, by using the Service, you grant us a worldwide, non-exclusive, royalty-free license to use your prompts to:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Provide and improve the Service</li>
                <li>Train and optimize our AI models (in anonymized form)</li>
                <li>Comply with legal obligations</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6 text-white/90">Our Platform</h3>
              <p className="leading-relaxed">
                The Service, including all software, algorithms, designs, and trademarks, is owned by Artifio.ai and protected by intellectual property laws. You may not copy, modify, distribute, or reverse engineer any part of our platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">8. AI-Generated Content</h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>AI-generated content is provided "as is" without guarantees of accuracy or quality</li>
                <li>Content is generated using multiple AI providers including OpenAI, Anthropic (Claude), Kie.ai, ElevenLabs, and Suno</li>
                <li>You are responsible for verifying the accuracy and appropriateness of generated content</li>
                <li>Generated content may not be unique and could be similar to content created for other users</li>
                <li>You are responsible for ensuring your use of AI-generated content complies with applicable laws</li>
                <li>We do not claim ownership of your AI-generated content, but you are solely responsible for its use</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">9. Data Retention</h2>
              <p className="leading-relaxed mb-4">
                Your generated content is retained on our servers for <strong className="text-white">two (2) weeks</strong> from the date of creation. After this period, generated content is automatically deleted from our systems.
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>You are responsible for downloading and saving any content you wish to keep before the retention period expires</li>
                <li>Data stored with our third-party AI providers may take up to <strong className="text-white">two (2) months</strong> to be fully deleted from their systems</li>
                <li>Account information is retained until you request account deletion</li>
                <li>We may retain anonymized usage data for analytics and service improvement</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">10. Service Availability</h2>
              <p className="leading-relaxed">
                We strive to maintain high availability but do not guarantee uninterrupted access to the Service. We may modify, suspend, or discontinue any aspect of the Service at any time. We are not liable for any downtime or service interruptions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">11. Termination</h2>
              <p className="leading-relaxed mb-4">
                We may suspend or terminate your account if you:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Violate these Terms of Service</li>
                <li>Engage in fraudulent or illegal activity</li>
                <li>Abuse the Service or other users</li>
                <li>Fail to pay for services rendered</li>
                <li>Repeatedly violate our content moderation policies</li>
              </ul>
              <p className="leading-relaxed mt-4">
                You may terminate your account at any time. Upon termination, your access will be revoked, and unused credits will be forfeited unless otherwise required by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">12. Disclaimers</h2>
              <p className="leading-relaxed mb-4 uppercase font-bold text-white/90">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
              </p>
              <p className="leading-relaxed">
                We disclaim all warranties, including but not limited to merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be error-free, secure, or uninterrupted.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">13. Limitation of Liability</h2>
              <p className="leading-relaxed mb-4 uppercase font-bold text-white/90">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, ARTIFIO.AI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
              </p>
              <p className="leading-relaxed">
                Our total liability to you for any claims arising from your use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim, or $100, whichever is greater.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">14. Indemnification</h2>
              <p className="leading-relaxed">
                You agree to indemnify, defend, and hold harmless Artifio.ai from any claims, damages, losses, or expenses (including legal fees) arising from your use of the Service, your generated content, or your violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">15. Dispute Resolution and Arbitration</h2>
              <p className="leading-relaxed mb-4">
                <strong className="text-white">Binding Arbitration:</strong> Any dispute, claim, or controversy arising out of or relating to these Terms or the Service shall be resolved by binding arbitration administered by the American Arbitration Association (AAA) in accordance with its Commercial Arbitration Rules.
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>The arbitration shall be conducted in Dallas, Texas, or at another mutually agreed location</li>
                <li>The arbitrator's decision shall be final and binding</li>
                <li>Judgment on the arbitration award may be entered in any court of competent jurisdiction</li>
              </ul>
              <p className="leading-relaxed mt-4">
                <strong className="text-white">Small Claims Exception:</strong> Notwithstanding the above, either party may bring an individual action in small claims court for disputes within the court's jurisdiction, provided the action remains in small claims court and is not removed or appealed to a court of general jurisdiction.
              </p>
              <p className="leading-relaxed mt-4">
                <strong className="text-white">Class Action Waiver:</strong> You agree that any arbitration or proceeding shall be limited to the dispute between us and you individually. You waive any right to participate in a class action lawsuit or class-wide arbitration.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">16. Governing Law</h2>
              <p className="leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the <strong className="text-white">State of Texas, United States of America</strong>, without regard to its conflict of law provisions. For any matters not subject to arbitration, the state and federal courts located in Dallas County, Texas shall have exclusive jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">17. Changes to Terms</h2>
              <p className="leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on our website and updating the "Effective Date" above. Your continued use of the Service after changes are posted constitutes your acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">18. Contact Information</h2>
              <p className="leading-relaxed">
                If you have questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="font-semibold text-white">Artifio.ai</p>
                <p className="font-semibold mt-2 text-white">Email: privacy@artifio.ai</p>
                <p className="font-semibold mt-2 text-white">Address: 539 W Commerce St, Ste 5263<br />Dallas, Texas 75208<br />United States of America</p>
              </div>
            </section>

            <section className="mt-10 p-6 bg-primary/10 rounded-xl border border-primary/30">
              <p className="font-bold text-white">
                BY USING ARTIFIO.AI, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
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