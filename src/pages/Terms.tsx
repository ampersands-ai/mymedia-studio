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
            <p className="text-white/50 font-medium">Last Updated: October 4, 2025</p>
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
                Artifio.ai provides AI-powered content generation tools, including but not limited to video creation, image generation, music composition, and text generation. The Service operates on a token-based system, where users consume tokens to generate content.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">3. Account Registration</h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>You must provide accurate, current, and complete information during registration</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You are responsible for all activities that occur under your account</li>
                <li>You must be at least 13 years old to use the Service</li>
                <li>You must notify us immediately of any unauthorized access to your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">4. Credit System and Payments</h2>
              <h3 className="text-xl font-semibold mb-3 text-white/90">Free Tier</h3>
              <p className="leading-relaxed mb-4">
                New users receive 5 free credits upon registration. Free credits do not expire but are subject to fair use policies.
              </p>
              
              <h3 className="text-xl font-semibold mb-3 text-white/90">Paid Plans</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Token packages and subscriptions are available for purchase</li>
                <li>All payments are processed securely through our payment provider</li>
                <li>Tokens are non-refundable except as required by law</li>
                <li>Unused tokens may expire according to your plan's terms</li>
                <li>We reserve the right to modify pricing with 30 days' notice</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">5. Acceptable Use Policy</h2>
              <p className="leading-relaxed mb-4">You agree NOT to use the Service to:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Generate illegal, harmful, or offensive content</li>
                <li>Create content that infringes on intellectual property rights</li>
                <li>Generate deepfakes or impersonate others without consent</li>
                <li>Attempt to reverse engineer or extract our AI models</li>
                <li>Abuse, harass, or harm others</li>
                <li>Generate spam, malware, or phishing content</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Use automated systems to abuse the token system</li>
                <li>Generate content depicting minors in inappropriate situations</li>
                <li>Create misleading or fraudulent content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">6. Intellectual Property Rights</h2>
              <h3 className="text-xl font-semibold mb-3 text-white/90">Your Content</h3>
              <p className="leading-relaxed mb-4">
                You retain ownership of the prompts you submit and the content generated by our AI. However, by using the Service, you grant us a worldwide, non-exclusive, royalty-free license to use your prompts to:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Provide and improve the Service</li>
                <li>Train and optimize our AI models</li>
                <li>Comply with legal obligations</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-6 text-white/90">Our Platform</h3>
              <p className="leading-relaxed">
                The Service, including all software, algorithms, designs, and trademarks, is owned by Artifio.ai and protected by intellectual property laws. You may not copy, modify, distribute, or reverse engineer any part of our platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">7. AI-Generated Content</h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>AI-generated content is provided "as is" without guarantees of accuracy or quality</li>
                <li>You are responsible for verifying the accuracy and appropriateness of generated content</li>
                <li>Generated content may not be unique and could be similar to content created for other users</li>
                <li>You are responsible for ensuring your use of AI-generated content complies with applicable laws</li>
                <li>We do not claim ownership of your AI-generated content, but you are solely responsible for its use</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">8. Service Availability</h2>
              <p className="leading-relaxed">
                We strive to maintain high availability but do not guarantee uninterrupted access to the Service. We may modify, suspend, or discontinue any aspect of the Service at any time. We are not liable for any downtime or service interruptions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">9. Termination</h2>
              <p className="leading-relaxed mb-4">
                We may suspend or terminate your account if you:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Violate these Terms of Service</li>
                <li>Engage in fraudulent or illegal activity</li>
                <li>Abuse the Service or other users</li>
                <li>Fail to pay for services rendered</li>
              </ul>
              <p className="leading-relaxed mt-4">
                You may terminate your account at any time. Upon termination, your access will be revoked, and unused tokens will be forfeited unless otherwise required by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">10. Disclaimers</h2>
              <p className="leading-relaxed mb-4 uppercase font-bold text-white/90">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
              </p>
              <p className="leading-relaxed">
                We disclaim all warranties, including but not limited to merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be error-free, secure, or uninterrupted.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">11. Limitation of Liability</h2>
              <p className="leading-relaxed mb-4 uppercase font-bold text-white/90">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, ARTIFIO.AI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
              </p>
              <p className="leading-relaxed">
                Our total liability to you for any claims arising from your use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim, or $100, whichever is greater.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">12. Indemnification</h2>
              <p className="leading-relaxed">
                You agree to indemnify, defend, and hold harmless Artifio.ai from any claims, damages, losses, or expenses (including legal fees) arising from your use of the Service, your generated content, or your violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">13. Governing Law and Dispute Resolution</h2>
              <p className="leading-relaxed">
                These Terms are governed by the laws of [Your Jurisdiction]. Any disputes shall be resolved through binding arbitration in accordance with [Arbitration Rules], except where prohibited by law. You waive your right to participate in class action lawsuits.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">14. Changes to Service</h2>
              <p className="leading-relaxed">
                We reserve the right to modify or discontinue any feature, content, or the Service itself at any time without notice. We may also change pricing, token allocations, and features of any plan with reasonable notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">15. Contact Information</h2>
              <p className="leading-relaxed">
                If you have questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="font-semibold text-white">Email: legal@artifio.ai</p>
                <p className="font-semibold mt-2 text-white">Address: [Your Business Address]</p>
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
