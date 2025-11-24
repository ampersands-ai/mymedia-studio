#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Batch CORS Update Script
 * Updates all edge functions to use secure CORS configuration
 */

const CORS_IMPORT = `import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";`;

interface UpdateResult {
  updated: string[];
  skipped: string[];
  failed: string[];
}

async function updateFile(filePath: string): Promise<'updated' | 'skipped' | 'failed'> {
  try {
    let content = await Deno.readTextFile(filePath);

    // Skip if already updated
    if (content.includes('getResponseHeaders')) {
      return 'skipped';
    }

    // Skip if no corsHeaders found
    if (!content.includes('corsHeaders')) {
      return 'skipped';
    }

    const original = content;

    // Step 1: Add CORS import after last import statement
    const importRegex = /^import .+ from .+;$/gm;
    const imports = [...content.matchAll(importRegex)];
    if (imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const insertPos = (lastImport.index || 0) + lastImport[0].length;
      content = content.slice(0, insertPos) + '\n' + CORS_IMPORT + content.slice(insertPos);
    }

    // Step 2: Remove old corsHeaders definition
    content = content.replace(/const corsHeaders = \{[^}]+\};?\n*/g, '');

    // Step 3: Add responseHeaders after Deno.serve
    content = content.replace(
      /Deno\.serve\(async \(req\) => \{/,
      `Deno.serve(async (req) => {\n  const responseHeaders = getResponseHeaders(req);`
    );

    // Step 4: Update OPTIONS handler
    content = content.replace(
      /if \(req\.method === ['"]OPTIONS['"]\) \{[\s\S]*?return new Response\([^)]*\);[\s\n]*\}/,
      `if (req.method === 'OPTIONS') {\n    return handleCorsPreflight(req);\n  }`
    );

    // Step 5: Replace all corsHeaders with responseHeaders
    content = content.replace(/corsHeaders/g, 'responseHeaders');

    // Verify changes
    if (!content.includes('getResponseHeaders') || !content.includes('responseHeaders')) {
      console.error(`  ❌ Verification failed for ${filePath}`);
      return 'failed';
    }

    // Write updated content
    await Deno.writeTextFile(filePath, content);
    return 'updated';

  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}:`, error);
    return 'failed';
  }
}

async function main() {
  console.log('🔧 Starting batch CORS update for edge functions...\n');

  const result: UpdateResult = {
    updated: [],
    skipped: [],
    failed: []
  };

  // Find all edge function index.ts files
  const command = new Deno.Command('find', {
    args: ['supabase/functions', '-maxdepth', '2', '-name', 'index.ts', '-type', 'f'],
    stdout: 'piped'
  });

  const { stdout } = await command.output();
  const files = new TextDecoder().decode(stdout)
    .split('\n')
    .filter(f => f.trim())
    .filter(f => !f.includes('_shared'))
    .filter(f => !f.includes('/providers/'));

  console.log(`Found ${files.length} edge functions\n`);

  for (const file of files) {
    const funcName = file.split('/').slice(-2, -1)[0];
    process.stdout.write(`📝 Processing ${funcName}... `);

    const status = await updateFile(file);

    if (status === 'updated') {
      console.log('✅');
      result.updated.push(funcName);
    } else if (status === 'skipped') {
      console.log('⏭️  (already done or no CORS)');
      result.skipped.push(funcName);
    } else {
      console.log('❌');
      result.failed.push(funcName);
    }
  }

  // Also check webhooks subdirectory
  try {
    const webhookCommand = new Deno.Command('find', {
      args: ['supabase/functions/webhooks', '-name', 'index.ts', '-type', 'f'],
      stdout: 'piped'
    });
    const { stdout: webhookStdout } = await webhookCommand.output();
    const webhookFiles = new TextDecoder().decode(webhookStdout)
      .split('\n')
      .filter(f => f.trim());

    for (const file of webhookFiles) {
      const funcName = file.split('/').slice(-2, -1)[0];
      process.stdout.write(`📝 Processing ${funcName}... `);

      const status = await updateFile(file);

      if (status === 'updated') {
        console.log('✅');
        result.updated.push(funcName);
      } else if (status === 'skipped') {
        console.log('⏭️  (already done)');
        result.skipped.push(funcName);
      } else {
        console.log('❌');
        result.failed.push(funcName);
      }
    }
  } catch {
    // Webhooks directory might not exist
  }

  console.log('\n============================================');
  console.log(`✅ Updated: ${result.updated.length} functions`);
  console.log(`⏭️  Skipped: ${result.skipped.length} functions`);
  if (result.failed.length > 0) {
    console.log(`❌ Failed: ${result.failed.length} functions`);
    console.log('Failed functions:', result.failed.join(', '));
  }
  console.log('============================================\n');

  if (result.updated.length > 0) {
    console.log('Next steps:');
    console.log('1. Review changes: git diff supabase/functions');
    console.log('2. Test critical functions');
    console.log('3. Commit changes');
  }

  // Return exit code
  Deno.exit(result.failed.length > 0 ? 1 : 0);
}

main();
