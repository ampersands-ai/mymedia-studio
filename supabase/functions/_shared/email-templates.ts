interface ActionButton {
  label: string;
  url: string;
}

export interface EmailSection {
  type: 'summary' | 'details' | 'list' | 'table' | 'actions';
  title?: string;
  content: string | string[] | ActionButton[];
}

export interface EmailConfig {
  title: string;
  preheader: string;
  headerColor: string;
  headerEmoji: string;
  sections: EmailSection[];
  footer?: string;
}

export function generateEmailHTML(config: EmailConfig): string {
  const sectionsHTML = config.sections.map(renderSection).join('\n');
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: ${config.headerColor}; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 10px 0 0 0; opacity: 0.9; }
          .section { padding: 20px 30px; border-bottom: 1px solid #e5e7eb; }
          .section-title { font-size: 18px; font-weight: 600; margin-bottom: 10px; }
          .code-block { background: #f3f4f6; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 13px; overflow-x: auto; }
          .button { display: inline-block; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 6px; margin: 5px; }
          .footer { padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; }
          .list-item { padding: 10px; margin: 5px 0; background: #f9fafb; border-left: 3px solid #f97316; }
          .severity-critical { color: #dc2626; font-weight: bold; }
          .severity-high { color: #ea580c; font-weight: bold; }
          .severity-medium { color: #d97706; }
          .severity-low { color: #65a30d; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>${config.headerEmoji} ${config.title}</h1>
            <p>${config.preheader}</p>
          </div>
          ${sectionsHTML}
          <div class="footer">
            ${config.footer || 'Sent by Artifio Monitoring System'}
          </div>
        </div>
      </body>
    </html>
  `;
}

function renderSection(section: EmailSection): string {
  switch (section.type) {
    case 'summary':
      return `
        <div class="section">
          ${section.title ? `<div class="section-title">${section.title}</div>` : ''}
          <div>${section.content}</div>
        </div>
      `;
    
    case 'details':
      return `
        <div class="section">
          ${section.title ? `<div class="section-title">${section.title}</div>` : ''}
          <div class="code-block">${escapeHtml(section.content)}</div>
        </div>
      `;
    
    case 'list':
      return `
        <div class="section">
          ${section.title ? `<div class="section-title">${section.title}</div>` : ''}
          <div>
            ${Array.isArray(section.content) ? section.content.map((item) => `<div class="list-item">${String(item)}</div>`).join('') : ''}
          </div>
        </div>
      `;

    case 'actions':
      return `
        <div class="section" style="text-align: center;">
          ${section.title ? `<div class="section-title">${section.title}</div>` : ''}
          <div>
            ${Array.isArray(section.content) ? section.content.map((action) => {
              const btn = action as ActionButton;
              return `<a href="${btn.url}" class="button">${btn.label}</a>`;
            }).join('') : ''}
          </div>
        </div>
      `;
    
    default:
      return '';
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
