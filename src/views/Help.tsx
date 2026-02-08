import { useEffect } from "react";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HelpCircle,
  Video,
  Image,
  Music,
  Settings,
  Lightbulb,
  AlertTriangle,
  Shield,
  Mail,
  PlayCircle,
  Users
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { brand, pageTitle, supportMailto } from '@/config/brand';

const Help = () => {
  useEffect(() => {
    document.title = pageTitle('Help Center');
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', `Complete guide to using ${brand.name} - create videos, images, and audio with 30+ AI models. Learn prompts, manage credits, and troubleshoot issues.`);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
      <GlobalHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <HelpCircle className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h1 className="text-4xl md:text-6xl font-black mb-6">
              Help Center
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Everything you need to know to create with 30+ AI models
            </p>
          </div>
        </section>

        {/* Quick Reference */}
        <section className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Quick Reference</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Generate content</span><span>Dashboard → Choose type → Select model</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">View credits</span><span>Dashboard header or Account Settings</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">View history</span><span>Dashboard → History</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Buy credits</span><span>Account Settings → Credits</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Change plan</span><span>Account Settings → Subscription</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Update payment</span><span>Account Settings → Billing</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Cancel subscription</span><span>Account Settings → Subscription → Cancel</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Get help</span><span>{brand.supportEmail}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Main Content */}
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Getting Started */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <PlayCircle className="h-6 w-6 text-primary" />
                  Getting Started
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg mb-3">Creating Your Account</h3>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Go to {brand.name}</li>
                    <li>Click <strong className="text-foreground">Sign Up</strong></li>
                    <li>Enter your email or continue with Google</li>
                    <li>Verify your email address</li>
                    <li>You're in - Free users start with 5 credits</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3">Understanding Credits</h3>
                  <p className="text-muted-foreground mb-3">
                    Credits are how you pay for generations. Different models cost different amounts based on their computational requirements.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Credit costs are <strong className="text-foreground">always shown before you generate</strong></li>
                    <li>Higher-quality outputs typically cost more credits</li>
                    <li>You're never charged without seeing the cost first</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3">Your First Generation</h3>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Log in to your dashboard</li>
                    <li>Choose a creation type (Video, Image, or Audio)</li>
                    <li>Select a model</li>
                    <li>Enter your prompt</li>
                    <li>Adjust settings (resolution, style, etc.)</li>
                    <li>Review the credit cost</li>
                    <li>Click <strong className="text-foreground">Generate</strong></li>
                    <li>Wait for completion</li>
                    <li>Preview and download</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Creating Videos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Video className="h-6 w-6 text-primary" />
                  Creating Videos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg mb-3">Choosing a Video Model</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-bold">Model</th>
                          <th className="text-left py-2 font-bold">Best For</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b"><td className="py-2 font-medium text-foreground">Veo</td><td className="py-2">High-quality, realistic video (Google)</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium text-foreground">Sora</td><td className="py-2">Creative, cinematic content (OpenAI)</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium text-foreground">Runway</td><td className="py-2">Fast iterations, style control</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium text-foreground">Kling</td><td className="py-2">Character consistency, multiple quality tiers</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium text-foreground">Hailuo</td><td className="py-2">Smooth motion, natural movement</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium text-foreground">Wan</td><td className="py-2">Versatile generation, speech-to-video</td></tr>
                        <tr><td className="py-2 font-medium text-foreground">Seedance</td><td className="py-2">Motion and dance generation</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3">Writing Effective Video Prompts</h3>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm"><strong>Bad:</strong> "A dog running"</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-sm"><strong>Good:</strong> "Golden retriever running through a sunlit meadow, slow motion, cinematic, shallow depth of field"</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="font-medium mb-2">Include:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                      <li>Subject (who/what)</li>
                      <li>Action (what's happening)</li>
                      <li>Setting (where)</li>
                      <li>Style (cinematic, documentary, animated)</li>
                      <li>Camera movement (pan, zoom, static)</li>
                      <li>Lighting (golden hour, dramatic, soft)</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3">Tips for Better Videos</h3>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Start with shorter durations to test prompts</li>
                    <li>Be explicit about camera movement</li>
                    <li>Describe the mood and atmosphere</li>
                    <li>Reference specific visual styles</li>
                    <li>Iterate - refine your prompt based on results</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Creating Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Image className="h-6 w-6 text-primary" />
                  Creating Images
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg mb-3">Choosing an Image Model</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-bold">Model</th>
                          <th className="text-left py-2 font-bold">Best For</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b"><td className="py-2 font-medium text-foreground">Midjourney</td><td className="py-2">Artistic, stylized images</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium text-foreground">FLUX</td><td className="py-2">Photorealistic, high detail, editing</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium text-foreground">Ideogram</td><td className="py-2">Text in images, logos, characters</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium text-foreground">Google Imagen</td><td className="py-2">Photorealism, natural scenes</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium text-foreground">Seedream</td><td className="py-2">Fast, versatile generation</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium text-foreground">Grok Imagine</td><td className="py-2">Creative, unique styles</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium text-foreground">HiDream</td><td className="py-2">High-quality, fast generation</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium text-foreground">Qwen</td><td className="py-2">Image editing, transformations</td></tr>
                        <tr><td className="py-2 font-medium text-foreground">Recraft</td><td className="py-2">Upscaling, enhancement</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3">Writing Effective Image Prompts</h3>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm"><strong>Bad:</strong> "A mountain"</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-sm"><strong>Good:</strong> "Snow-capped mountain peak at sunrise, dramatic orange and pink sky, low clouds in valley, photorealistic, wide landscape shot, golden hour lighting"</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="font-medium mb-2">Structure your prompt:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-sm">
                      <li>Subject: What's the main focus?</li>
                      <li>Style: Photorealistic? Illustration? Oil painting?</li>
                      <li>Composition: Close-up? Wide shot? Overhead?</li>
                      <li>Lighting: Natural? Studio? Dramatic?</li>
                      <li>Details: Colors, textures, mood</li>
                    </ol>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3">Tips for Better Images</h3>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>More detail = better results</li>
                    <li>Reference specific art styles or artists</li>
                    <li>Describe lighting explicitly</li>
                    <li>Specify what you DON'T want (if the model supports negative prompts)</li>
                    <li>Generate multiple variations and pick the best</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Creating Audio */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Music className="h-6 w-6 text-primary" />
                  Creating Audio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg mb-3">Voice Generation (ElevenLabs)</h3>
                  <p className="text-muted-foreground mb-3">Create natural-sounding voiceovers and narration.</p>
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium mb-2">How to use:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-sm">
                        <li>Select ElevenLabs</li>
                        <li>Choose a voice</li>
                        <li>Enter your script</li>
                        <li>Adjust speed, stability, and clarity</li>
                        <li>Generate and download</li>
                      </ol>
                    </div>
                    <div>
                      <p className="font-medium mb-2">Tips:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                        <li>Write naturally - how you'd actually speak</li>
                        <li>Use punctuation for pacing (commas = pauses)</li>
                        <li>Keep scripts concise for best quality</li>
                        <li>Preview before generating long content</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3">Music Generation (Suno)</h3>
                  <p className="text-muted-foreground mb-3">Create original music and songs.</p>
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium mb-2">How to use:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-sm">
                        <li>Select Suno</li>
                        <li>Describe the music you want (genre, mood, instruments)</li>
                        <li>Optionally include lyrics</li>
                        <li>Generate</li>
                      </ol>
                    </div>
                    <div>
                      <p className="font-medium mb-2">Tips:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                        <li>Specify genre clearly (lo-fi hip hop, orchestral, punk rock)</li>
                        <li>Describe the mood (uplifting, melancholic, energetic)</li>
                        <li>Mention specific instruments if important</li>
                        <li>Reference similar artists for style guidance</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Avatars & Lip-Sync */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-primary" />
                  Creating Avatars & Lip-Sync Videos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg mb-3">Choosing an Avatar Model</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-bold">Model</th>
                          <th className="text-left py-2 font-bold">Best For</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b"><td className="py-2 font-medium text-foreground">Kling Avatar</td><td className="py-2">High-quality talking head videos</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium text-foreground">Infinitalk</td><td className="py-2">Natural lip-sync from audio</td></tr>
                        <tr><td className="py-2 font-medium text-foreground">Wan Speech-to-Video</td><td className="py-2">Detailed control, multiple resolutions</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3">How to Use</h3>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Upload a portrait image (clear face, front-facing works best)</li>
                    <li>Upload or record your audio</li>
                    <li>Optionally add a guiding prompt</li>
                    <li>Select resolution and settings</li>
                    <li>Generate</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3">Tips for Better Results</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Use high-quality, well-lit portrait images</li>
                    <li>Keep audio clear with minimal background noise</li>
                    <li>Shorter audio clips (under 15 seconds) work best</li>
                    <li>Front-facing portraits with neutral expressions sync best</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Managing Your Account */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Settings className="h-6 w-6 text-primary" />
                  Managing Your Account
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="credits">
                    <AccordionTrigger>Viewing Your Credits</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">
                        Your current credit balance is displayed in the dashboard header. Click it to see credits remaining, credits used this period, and usage history.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="history">
                    <AccordionTrigger>Checking Generation History</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Go to <strong className="text-foreground">Dashboard</strong></li>
                        <li>Click <strong className="text-foreground">History</strong> or <strong className="text-foreground">My Creations</strong></li>
                        <li>View all past generations</li>
                        <li>Re-download or delete as needed</li>
                      </ol>
                      <p className="text-muted-foreground mt-2 text-sm"><strong>Remember:</strong> Content is stored for 2 weeks, then automatically deleted.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="upgrade">
                    <AccordionTrigger>Updating Your Plan</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div>
                          <p className="font-medium mb-2">To upgrade:</p>
                          <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-sm">
                            <li>Go to <strong className="text-foreground">Account Settings</strong> → <strong className="text-foreground">Subscription</strong></li>
                            <li>Click <strong className="text-foreground">Upgrade</strong></li>
                            <li>Select your new plan</li>
                            <li>Confirm - upgrade is immediate</li>
                          </ol>
                        </div>
                        <div>
                          <p className="font-medium mb-2">To downgrade:</p>
                          <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-sm">
                            <li>Go to <strong className="text-foreground">Account Settings</strong> → <strong className="text-foreground">Subscription</strong></li>
                            <li>Click <strong className="text-foreground">Change Plan</strong></li>
                            <li>Select lower tier</li>
                            <li>Confirm - takes effect at end of billing cycle</li>
                          </ol>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="buy-credits">
                    <AccordionTrigger>Buying More Credits</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground text-sm mb-2">(Paid subscribers only)</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Go to <strong className="text-foreground">Account Settings</strong> → <strong className="text-foreground">Credits</strong></li>
                        <li>Click <strong className="text-foreground">Buy Credits</strong></li>
                        <li>Confirm purchase at your plan's rate</li>
                        <li>Credits added instantly</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="cancel">
                    <AccordionTrigger>Canceling Your Subscription</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Go to <strong className="text-foreground">Account Settings</strong> → <strong className="text-foreground">Subscription</strong></li>
                        <li>Click <strong className="text-foreground">Cancel Subscription</strong></li>
                        <li>Confirm</li>
                      </ol>
                      <p className="text-muted-foreground mt-2 text-sm">You'll keep access until your billing period ends. Credits are frozen for 30 days after - resubscribe to restore them.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="delete">
                    <AccordionTrigger>Deleting Your Account</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Go to <strong className="text-foreground">Account Settings</strong> → <strong className="text-foreground">Account</strong></li>
                        <li>Click <strong className="text-foreground">Delete Account</strong></li>
                        <li>Confirm</li>
                      </ol>
                      <p className="text-destructive mt-2 text-sm font-medium">Warning: This is permanent. All credits and content are immediately deleted.</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Best Practices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Lightbulb className="h-6 w-6 text-primary" />
                  Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg mb-3">Prompt Engineering</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="font-medium text-green-600 dark:text-green-400 mb-2">Do:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                        <li>Be specific and detailed</li>
                        <li>Include style references</li>
                        <li>Describe mood and atmosphere</li>
                        <li>Specify technical details</li>
                        <li>Iterate and refine</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="font-medium text-destructive mb-2">Don't:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                        <li>Use vague, one-word prompts</li>
                        <li>Expect perfect results on first try</li>
                        <li>Ignore the preview/settings</li>
                        <li>Forget to download within 2 weeks</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3">Maximizing Your Credits</h3>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li><strong className="text-foreground">Start small:</strong> Test prompts with lower-cost options before committing to expensive generations</li>
                    <li><strong className="text-foreground">Be precise:</strong> Better prompts = fewer retries = fewer credits spent</li>
                    <li><strong className="text-foreground">Check settings:</strong> Make sure resolution/duration match your actual needs</li>
                    <li><strong className="text-foreground">Use the right model:</strong> Expensive isn't always better for your use case</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3">Staying Organized</h3>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Download content promptly (2-week storage limit)</li>
                    <li>Name files clearly when saving</li>
                    <li>Keep a prompt library of what works</li>
                    <li>Note which models work best for your needs</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Troubleshooting */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                  Troubleshooting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="failed">
                    <AccordionTrigger>Generation Failed</AccordionTrigger>
                    <AccordionContent>
                      <p className="font-medium mb-2">Possible causes:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm mb-3">
                        <li>Content policy violation (prohibited content detected)</li>
                        <li>Invalid or unclear prompt</li>
                        <li>Model temporarily unavailable</li>
                        <li>System error</li>
                      </ul>
                      <p className="font-medium mb-2">What to do:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                        <li>Check the error message</li>
                        <li>Review your prompt for policy violations</li>
                        <li>Try a different model</li>
                        <li>Wait and retry</li>
                        <li>Contact support if persistent</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="slow">
                    <AccordionTrigger>Generation Taking Too Long</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Complex outputs take longer (especially video)</li>
                        <li>High demand can cause delays</li>
                        <li>Check the estimated time shown during generation</li>
                        <li>If stuck for 10+ minutes with no progress, try again or contact support</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="wrong">
                    <AccordionTrigger>Content Looks Wrong</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Refine your prompt with more detail</li>
                        <li>Try a different model better suited to your needs</li>
                        <li>Adjust settings (resolution, style)</li>
                        <li>Generate multiple variations</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="login">
                    <AccordionTrigger>Can't Log In</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Check your email/password</li>
                        <li>Use "Forgot Password" to reset</li>
                        <li>Clear browser cache and cookies</li>
                        <li>Try a different browser</li>
                        <li>Contact support if still locked out</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="payment">
                    <AccordionTrigger>Payment Failed</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Verify card details are correct</li>
                        <li>Check for sufficient funds</li>
                        <li>Try a different payment method</li>
                        <li>Contact your bank if declined repeatedly</li>
                        <li>Contact {brand.supportEmail}</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="credits-missing">
                    <AccordionTrigger>Credits Not Showing</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Refresh the page</li>
                        <li>Log out and back in</li>
                        <li>Check billing history to confirm payment processed</li>
                        <li>Contact support if credits are missing after confirmed payment</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Content Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-primary" />
                  Content Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg mb-3 text-green-600 dark:text-green-400">What's Allowed</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Original creative content</li>
                    <li>Commercial projects (paid plans)</li>
                    <li>Personal projects</li>
                    <li>Educational content</li>
                    <li>Marketing materials</li>
                    <li>Entertainment</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3 text-destructive">What's Prohibited</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Sexual or explicit content</li>
                    <li>Content involving minors inappropriately</li>
                    <li>Harassment or hate speech</li>
                    <li>Violence or gore</li>
                    <li>Illegal content</li>
                    <li>Non-consensual imagery of real people</li>
                    <li>Deepfakes without consent</li>
                    <li>Misinformation or fraud</li>
                    <li>Spam or malware</li>
                  </ul>
                  <p className="text-muted-foreground mt-3 text-sm">
                    Violations result in content blocking. Repeated violations lead to account termination.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Support */}
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Mail className="h-6 w-6 text-primary" />
                  Contact Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <p className="text-2xl font-bold mb-2">{brand.supportEmail}</p>
                  <p className="text-muted-foreground mb-4">Response Time: 24-48 hours</p>
                  <div className="text-left max-w-md mx-auto">
                    <p className="font-medium mb-2">When contacting support, include:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                      <li>Your account email</li>
                      <li>Description of the issue</li>
                      <li>Steps to reproduce (if applicable)</li>
                      <li>Screenshots or error messages</li>
                      <li>Model and settings used (for generation issues)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Help;
