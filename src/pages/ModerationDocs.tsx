import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const ModerationDocs = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !contentRef.current) return;

    const content = contentRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Artifio.ai Content Moderation System Documentation</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              color: #1a1a1a;
              line-height: 1.6;
            }
            h1 { font-size: 24px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            h2 { font-size: 18px; margin-top: 30px; color: #333; }
            h3 { font-size: 16px; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f5f5f5; font-weight: 600; }
            code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 14px; }
            pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
            .check { color: #22c55e; }
            blockquote { background: #f9f9f9; border-left: 4px solid #ddd; margin: 15px 0; padding: 10px 15px; }
            @media print {
              body { margin: 20px; }
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Content Moderation Documentation</h1>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>

        <div ref={contentRef} className="bg-card p-8 rounded-lg border">
          <h1>Artifio.ai Content Moderation System Documentation</h1>

          <h2>Overview</h2>
          <p>
            Artifio.ai implements a <strong>mandatory content moderation layer</strong> using OpenAI's 
            industry-leading Moderation API. Every user-submitted prompt is automatically screened 
            <strong> before</strong> any AI content generation occurs. This ensures compliance with 
            content policies and prevents the creation of harmful, illegal, or inappropriate content.
          </p>

          <h2>Technical Implementation</h2>

          <h3>1. Pre-Generation Moderation Gate</h3>
          <ul>
            <li><strong>Every prompt</strong> submitted by users passes through our moderation edge function</li>
            <li>Content is screened <strong>before</strong> any generation request is processed</li>
            <li>If flagged, the generation is <strong>blocked immediately</strong> with a user-friendly error message</li>
            <li>No credits are charged for blocked requests</li>
          </ul>

          <h3>2. OpenAI Moderation API Integration</h3>
          <p>We use OpenAI's <code>omni-moderation-latest</code> model, which screens for:</p>

          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>sexual</code></td><td>Sexual content</td></tr>
              <tr><td><code>sexual/minors</code></td><td>Sexual content involving minors</td></tr>
              <tr><td><code>harassment</code></td><td>Harassment or bullying content</td></tr>
              <tr><td><code>harassment/threatening</code></td><td>Threatening harassment</td></tr>
              <tr><td><code>hate</code></td><td>Hate speech</td></tr>
              <tr><td><code>hate/threatening</code></td><td>Threatening hate speech</td></tr>
              <tr><td><code>illicit</code></td><td>Illegal activities</td></tr>
              <tr><td><code>illicit/violent</code></td><td>Violent illegal activities</td></tr>
              <tr><td><code>self-harm</code></td><td>Self-harm content</td></tr>
              <tr><td><code>self-harm/intent</code></td><td>Intent to self-harm</td></tr>
              <tr><td><code>self-harm/instructions</code></td><td>Instructions for self-harm</td></tr>
              <tr><td><code>violence</code></td><td>Violent content</td></tr>
              <tr><td><code>violence/graphic</code></td><td>Graphic violence</td></tr>
            </tbody>
          </table>

          <h3>3. Enforcement Flow</h3>
          <pre>
{`User Prompt → Moderation API Check → [PASS] → Generation Proceeds
                                    → [FAIL] → Generation Blocked + User Notified`}
          </pre>

          <h3>4. Logging</h3>
          <p>All moderation checks are logged with:</p>
          <ul>
            <li>Truncated prompt (first 100 characters for privacy)</li>
            <li>Flagged status (pass/fail)</li>
            <li>Specific categories triggered</li>
            <li>User ID (for accountability)</li>
          </ul>

          <h2>User Experience</h2>
          <p>When content is flagged, users receive a clear message:</p>
          <blockquote>
            "Content policy violation: Your prompt contains content that violates our guidelines: 
            [specific categories]. Please revise and try again."
          </blockquote>

          <h2>Compliance Summary</h2>
          <ul>
            <li><span className="check">✅</span> <strong>Pre-generation screening</strong> - All content checked before creation</li>
            <li><span className="check">✅</span> <strong>Industry-standard API</strong> - OpenAI's production moderation model</li>
            <li><span className="check">✅</span> <strong>13 content categories</strong> monitored including CSAM, violence, illegal content</li>
            <li><span className="check">✅</span> <strong>Logging</strong> - Traceability of moderation decisions</li>
            <li><span className="check">✅</span> <strong>Zero tolerance</strong> - Flagged content is blocked, not generated</li>
          </ul>

          <hr style={{ margin: '30px 0' }} />
          <p style={{ fontSize: '14px', color: '#666' }}>
            This system ensures Artifio.ai maintains a safe platform while preventing misuse of AI generation capabilities.
          </p>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '20px' }}>
            Document generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModerationDocs;
