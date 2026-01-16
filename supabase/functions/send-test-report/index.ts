import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FailedTest {
  name: string;
  file: string;
  error: string;
}

interface TestResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  failedTests: FailedTest[];
}

interface CoverageMetrics {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

interface TestReportRequest {
  runId: string;
  runType: "unit" | "e2e" | "all";
  trigger: "ci" | "manual" | "cron";
  branch: string;
  commitSha?: string;
  author?: string;
  logsUrl?: string;
  unit?: TestResults & { coverage?: CoverageMetrics };
  e2e?: TestResults;
}

interface PreviousRun {
  passed: number;
  total_tests: number;
  duration_ms: number;
  coverage_lines: number | null;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "dev@artifio.ai";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    if (!resendApiKey) {
      throw new Error("Missing RESEND_API_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const payload: TestReportRequest = await req.json();
    console.log("[send-test-report] Received payload:", JSON.stringify(payload, null, 2));

    // Validate required fields
    if (!payload.runId || !payload.runType || !payload.trigger || !payload.branch) {
      throw new Error("Missing required fields: runId, runType, trigger, branch");
    }

    // Calculate totals
    const unitTotal = payload.unit?.total || 0;
    const unitPassed = payload.unit?.passed || 0;
    const unitFailed = payload.unit?.failed || 0;
    const unitSkipped = payload.unit?.skipped || 0;

    const e2eTotal = payload.e2e?.total || 0;
    const e2ePassed = payload.e2e?.passed || 0;
    const e2eFailed = payload.e2e?.failed || 0;
    const e2eSkipped = payload.e2e?.skipped || 0;

    const totalTests = unitTotal + e2eTotal;
    const totalPassed = unitPassed + e2ePassed;
    const totalFailed = unitFailed + e2eFailed;
    const totalSkipped = unitSkipped + e2eSkipped;
    const totalDuration = (payload.unit?.duration || 0) + (payload.e2e?.duration || 0);

    // Determine status
    let status: "passed" | "failed" | "partial";
    if (totalFailed === 0) {
      status = "passed";
    } else if (totalPassed === 0) {
      status = "failed";
    } else {
      status = "partial";
    }

    // Combine failed tests
    const allFailedTests: FailedTest[] = [
      ...(payload.unit?.failedTests || []),
      ...(payload.e2e?.failedTests || []),
    ];

    // Save to database
    const { error: insertError } = await supabase.from("test_runs").insert({
      run_id: payload.runId,
      run_type: payload.runType,
      trigger: payload.trigger,
      branch: payload.branch,
      commit_sha: payload.commitSha,
      author: payload.author,
      logs_url: payload.logsUrl,
      total_tests: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      duration_ms: totalDuration,
      coverage_lines: payload.unit?.coverage?.lines,
      coverage_functions: payload.unit?.coverage?.functions,
      coverage_branches: payload.unit?.coverage?.branches,
      coverage_statements: payload.unit?.coverage?.statements,
      failed_tests: allFailedTests,
      status,
    });

    if (insertError) {
      console.error("[send-test-report] Failed to insert test run:", insertError);
    }

    // Fetch previous run for comparison
    const { data: previousRuns } = await supabase
      .from("test_runs")
      .select("passed, total_tests, duration_ms, coverage_lines, created_at")
      .eq("branch", payload.branch)
      .order("created_at", { ascending: false })
      .limit(2);

    const previousRun: PreviousRun | null = previousRuns && previousRuns.length > 1 
      ? previousRuns[1] as PreviousRun 
      : null;

    // Generate email HTML
    const emailHtml = generateEmailHtml({
      payload,
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
      status,
      allFailedTests,
      previousRun,
    });

    // Generate subject
    const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : "0";
    const statusEmoji = status === "passed" ? "✅" : status === "failed" ? "❌" : "⚠️";
    const subject = `${statusEmoji} Tests ${status.charAt(0).toUpperCase() + status.slice(1)} - ${totalPassed}/${totalTests} (${passRate}%) | ${payload.branch}`;

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: "Artifio Tests <tests@artifio.ai>",
      to: [adminEmail],
      subject,
      html: emailHtml,
    });

    if (emailError) {
      console.error("[send-test-report] Failed to send email:", emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log(`[send-test-report] Email sent successfully to ${adminEmail}`);

    return new Response(
      JSON.stringify({
        success: true,
        status,
        totalTests,
        totalPassed,
        totalFailed,
        duration: Date.now() - startTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[send-test-report] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

interface EmailGeneratorParams {
  payload: TestReportRequest;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  status: "passed" | "failed" | "partial";
  allFailedTests: FailedTest[];
  previousRun: PreviousRun | null;
}

function generateEmailHtml(params: EmailGeneratorParams): string {
  const {
    payload,
    totalTests,
    totalPassed,
    totalFailed,
    totalSkipped,
    totalDuration,
    status,
    allFailedTests,
    previousRun,
  } = params;

  const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : "0";
  const durationFormatted = formatDuration(totalDuration);
  const runDate = new Date().toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const statusColor = status === "passed" ? "#22c55e" : status === "failed" ? "#ef4444" : "#f59e0b";
  const statusEmoji = status === "passed" ? "✅" : status === "failed" ? "❌" : "⚠️";
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);

  // Calculate trends
  let passRateTrend = "";
  let durationTrend = "";
  let coverageTrend = "";

  if (previousRun) {
    const prevPassRate = previousRun.total_tests > 0 
      ? (previousRun.passed / previousRun.total_tests) * 100 
      : 0;
    const currentPassRate = parseFloat(passRate);
    const passRateDiff = currentPassRate - prevPassRate;
    
    if (Math.abs(passRateDiff) < 0.1) {
      passRateTrend = "↔️ stable";
    } else if (passRateDiff > 0) {
      passRateTrend = `<span style="color: #22c55e;">↑ +${passRateDiff.toFixed(1)}%</span>`;
    } else {
      passRateTrend = `<span style="color: #ef4444;">↓ ${passRateDiff.toFixed(1)}%</span>`;
    }

    if (previousRun.duration_ms) {
      const durationDiff = ((totalDuration - previousRun.duration_ms) / previousRun.duration_ms) * 100;
      if (Math.abs(durationDiff) < 5) {
        durationTrend = "↔️ stable";
      } else if (durationDiff < 0) {
        durationTrend = `<span style="color: #22c55e;">↓ ${Math.abs(durationDiff).toFixed(0)}% faster</span>`;
      } else {
        durationTrend = `<span style="color: #f59e0b;">↑ ${durationDiff.toFixed(0)}% slower</span>`;
      }
    }

    if (payload.unit?.coverage?.lines && previousRun.coverage_lines) {
      const coverageDiff = payload.unit.coverage.lines - previousRun.coverage_lines;
      if (Math.abs(coverageDiff) < 0.1) {
        coverageTrend = "↔️ no change";
      } else if (coverageDiff > 0) {
        coverageTrend = `<span style="color: #22c55e;">↑ +${coverageDiff.toFixed(1)}%</span>`;
      } else {
        coverageTrend = `<span style="color: #ef4444;">↓ ${coverageDiff.toFixed(1)}%</span>`;
      }
    }
  }

  // Generate failed tests section
  let failedTestsHtml = "";
  if (allFailedTests.length > 0) {
    failedTestsHtml = `
      <div style="margin-top: 24px; padding: 20px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
        <h3 style="margin: 0 0 16px 0; color: #dc2626; font-size: 16px;">❌ Failed Tests (${allFailedTests.length})</h3>
        ${allFailedTests.map((test) => `
          <div style="margin-bottom: 16px; padding: 12px; background: white; border-radius: 6px; border: 1px solid #fecaca;">
            <div style="font-weight: 600; color: #991b1b; margin-bottom: 4px;">${escapeHtml(test.name)}</div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">📁 ${escapeHtml(test.file)}</div>
            <div style="font-family: monospace; font-size: 11px; background: #f3f4f6; padding: 8px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-break: break-word;">
              ${escapeHtml(test.error.substring(0, 500))}${test.error.length > 500 ? "..." : ""}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  // Generate coverage section
  let coverageHtml = "";
  if (payload.unit?.coverage) {
    const cov = payload.unit.coverage;
    coverageHtml = `
      <div style="margin-top: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">📊 Code Coverage</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f9fafb;">
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">Lines</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 600;">${cov.lines.toFixed(1)}%</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${coverageTrend || "-"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">Functions</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 600;">${cov.functions.toFixed(1)}%</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">-</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">Branches</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 600;">${cov.branches.toFixed(1)}%</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">-</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">Statements</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 600;">${cov.statements.toFixed(1)}%</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">-</td>
          </tr>
        </table>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background: white;">
          
          <!-- Header -->
          <div style="background: ${statusColor}; color: white; padding: 32px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 8px;">${statusEmoji}</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">TEST REPORT - ${statusText.toUpperCase()}</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">
              Branch: <strong>${escapeHtml(payload.branch)}</strong>
              ${payload.commitSha ? ` | Commit: <code style="background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 3px;">${payload.commitSha.substring(0, 7)}</code>` : ""}
              ${payload.author ? ` | Author: ${escapeHtml(payload.author)}` : ""}
            </p>
          </div>

          <!-- Executive Summary -->
          <div style="padding: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; border-bottom: 2px solid #f97316; padding-bottom: 8px;">📋 Executive Summary</h2>
            
            <div style="display: grid; gap: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #f9fafb; border-radius: 8px;">
                <div>
                  <div style="font-size: 32px; font-weight: 700; color: ${statusColor};">${passRate}%</div>
                  <div style="color: #6b7280; font-size: 14px;">Pass Rate</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 14px;">
                    <span style="color: #22c55e;">✅ ${totalPassed}</span> |
                    <span style="color: #ef4444;">❌ ${totalFailed}</span> |
                    <span style="color: #6b7280;">⏭️ ${totalSkipped}</span>
                  </div>
                  <div style="color: #6b7280; font-size: 12px;">of ${totalTests} total tests</div>
                </div>
              </div>

              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">⏱️ Duration</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 500;">${durationFormatted}</td>
                  <td style="padding: 8px 0; text-align: right; color: #6b7280; font-size: 12px;">${durationTrend || ""}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">📅 Run Time</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 500;" colspan="2">${runDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">🔄 Trigger</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 500;" colspan="2">${payload.trigger.toUpperCase()}</td>
                </tr>
                ${previousRun ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">📈 vs Previous</td>
                  <td style="padding: 8px 0; text-align: right;" colspan="2">${passRateTrend}</td>
                </tr>
                ` : ""}
              </table>
            </div>

            ${payload.unit ? `
            <!-- Unit Tests Section -->
            <div style="margin-top: 24px;">
              <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">🧪 Unit Tests</h3>
              <div style="padding: 12px; background: #f0fdf4; border-radius: 6px; border-left: 4px solid #22c55e;">
                <span style="color: #22c55e; font-weight: 600;">✅ ${payload.unit.passed}</span>
                <span style="color: #6b7280;"> passed</span>
                ${payload.unit.failed > 0 ? `<span style="color: #ef4444; font-weight: 600; margin-left: 12px;">❌ ${payload.unit.failed}</span><span style="color: #6b7280;"> failed</span>` : ""}
                ${payload.unit.skipped > 0 ? `<span style="color: #6b7280; margin-left: 12px;">⏭️ ${payload.unit.skipped} skipped</span>` : ""}
                <span style="color: #6b7280; margin-left: 12px;">⏱️ ${formatDuration(payload.unit.duration)}</span>
              </div>
            </div>
            ` : ""}

            ${payload.e2e ? `
            <!-- E2E Tests Section -->
            <div style="margin-top: 24px;">
              <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">🌐 E2E Tests</h3>
              <div style="padding: 12px; background: ${payload.e2e.failed > 0 ? "#fef2f2" : "#f0fdf4"}; border-radius: 6px; border-left: 4px solid ${payload.e2e.failed > 0 ? "#ef4444" : "#22c55e"};">
                <span style="color: #22c55e; font-weight: 600;">✅ ${payload.e2e.passed}</span>
                <span style="color: #6b7280;"> passed</span>
                ${payload.e2e.failed > 0 ? `<span style="color: #ef4444; font-weight: 600; margin-left: 12px;">❌ ${payload.e2e.failed}</span><span style="color: #6b7280;"> failed</span>` : ""}
                ${payload.e2e.skipped > 0 ? `<span style="color: #6b7280; margin-left: 12px;">⏭️ ${payload.e2e.skipped} skipped</span>` : ""}
                <span style="color: #6b7280; margin-left: 12px;">⏱️ ${formatDuration(payload.e2e.duration)}</span>
              </div>
            </div>
            ` : ""}

            ${coverageHtml}
            ${failedTestsHtml}

            ${payload.logsUrl ? `
            <!-- Actions -->
            <div style="margin-top: 32px; text-align: center;">
              <a href="${payload.logsUrl}" style="display: inline-block; padding: 12px 32px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                View Full Logs →
              </a>
            </div>
            ` : ""}
          </div>

          <!-- Footer -->
          <div style="padding: 24px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">Sent by Artifio CI/CD Pipeline</p>
            <p style="margin: 4px 0 0 0;">Run ID: ${payload.runId}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(0);
  return `${minutes}m ${remainingSeconds}s`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
