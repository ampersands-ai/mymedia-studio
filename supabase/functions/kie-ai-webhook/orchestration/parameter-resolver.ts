/**
 * Input mapping and parameter resolution for workflows
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function replaceTemplateVariables(template: string, context: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim());
    return value ?? match;
  });
}

export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

export function resolveInputMappings(
  mappings: Record<string, string>, 
  context: Record<string, any>
): Record<string, any> {
  const resolved: Record<string, any> = {};
  for (const [paramKey, rawMapping] of Object.entries(mappings)) {
    let mapping = rawMapping;
    if (typeof mapping === 'string') {
      mapping = mapping.replace(/^user_input\./, 'user.');
    }
    let value = getNestedValue(context, mapping as string);
    if ((value === undefined || value === null) && typeof rawMapping === 'string') {
      const alternate = rawMapping.startsWith('user.') 
        ? rawMapping.replace(/^user\./, 'user_input.') 
        : rawMapping.replace(/^user_input\./, 'user.');
      value = getNestedValue(context, alternate);
    }
    if (value !== undefined && value !== null) {
      resolved[paramKey] = value;
    }
  }
  return resolved;
}

export function coerceParametersToSchema(
  params: Record<string, any>, 
  inputSchema: any
): Record<string, any> {
  if (!inputSchema || typeof inputSchema !== 'object') return params;
  const props = (inputSchema as any).properties || {};
  const out: Record<string, any> = { ...params };
  for (const [key, schema] of Object.entries<any>(props)) {
    if (!(key in out)) continue;
    out[key] = coerceValueToSchema(out[key], schema);
  }
  return out;
}

function coerceValueToSchema(value: any, schema: any): any {
  const declaredType = Array.isArray(schema?.type) ? schema.type[0] : schema?.type;
  if (!declaredType) return value;
  switch (declaredType) {
    case 'array': 
      return Array.isArray(value) ? value : (value === undefined || value === null) ? value : [value];
    case 'string': 
      return (value === undefined || value === null) ? value : 
             Array.isArray(value) ? String(value[0]) : 
             typeof value === 'string' ? value : String(value);
    case 'number': 
    case 'integer': {
      if (value === undefined || value === null) return value;
      const n = Array.isArray(value) ? parseFloat(value[0]) : parseFloat(value);
      return Number.isNaN(n) ? value : n;
    }
    case 'boolean': {
      let v = value;
      if (Array.isArray(v)) v = v[0];
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') {
        const s = v.toLowerCase();
        if (s === 'true') return true;
        if (s === 'false') return false;
      }
      return !!v;
    }
    default: 
      return value;
  }
}

export async function sanitizeParametersForProviders(
  params: Record<string, any>, 
  userId: string, 
  supabaseClient: SupabaseClient
): Promise<Record<string, any>> {
  const processed = { ...params };
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.startsWith('data:image/')) {
      const matches = value.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        const contentType = matches[1], base64Data = matches[2];
        const ext = contentType.split('/')[1] || 'jpg';
        const fileName = `workflow-input-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const filePath = `${userId}/${fileName}`;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        await supabaseClient.storage.from('generated-content').upload(filePath, bytes, { contentType, upsert: false });
        const { data: urlData } = await supabaseClient.storage.from('generated-content').createSignedUrl(filePath, 86400);
        processed[key] = urlData?.signedUrl || value;
      }
    }
  }
  return processed;
}
