interface AlertPayload {
  type: 'failure_rate' | 'storage_spike' | 'test' | 'model_failure';
  severity?: 'warning' | 'critical';
  message: string;
  failureRate?: number;
  storageFailures?: number;
  threshold?: number;
  details?: any;
  metadata?: any;
}

export function generateSlackPayload(payload: AlertPayload, settings: any) {
  const isTest = payload.type === 'test';
  const isFailureRate = payload.type === 'failure_rate';
  
  const color = isTest ? '#667eea' : isFailureRate ? '#dc3545' : '#fd7e14';
  const emoji = isTest ? '🔔' : isFailureRate ? '🚨' : '⚠️';
  
  if (isTest) {
    return {
      attachments: [{
        color,
        title: `${emoji} Test Alert - Webhook Monitoring`,
        text: 'This is a test alert from your Webhook Monitoring System.',
        fields: [
          {
            title: 'Status',
            value: '✅ Alert system is working correctly',
            short: true,
          },
          {
            title: 'Configured Thresholds',
            value: `• Failure Rate: ${settings.failure_rate_threshold}%\n• Storage Failures: ${settings.storage_failure_threshold}\n• Check Interval: ${settings.check_interval_minutes}min`,
            short: true,
          },
        ],
        footer: 'Webhook Monitor',
        ts: Math.floor(Date.now() / 1000),
      }],
    };
  }

  const fields = isFailureRate ? [
    {
      title: 'Current Failure Rate',
      value: `${payload.failureRate}%`,
      short: true,
    },
    {
      title: 'Threshold',
      value: `${payload.threshold}%`,
      short: true,
    },
    {
      title: 'Total Webhooks',
      value: payload.details?.total?.toString() || 'N/A',
      short: true,
    },
    {
      title: 'Failed',
      value: payload.details?.failed?.toString() || 'N/A',
      short: true,
    },
  ] : [
    {
      title: 'Storage Failures',
      value: payload.storageFailures?.toString() || 'N/A',
      short: true,
    },
    {
      title: 'Threshold',
      value: payload.threshold?.toString() || 'N/A',
      short: true,
    },
    {
      title: 'Time Window',
      value: payload.details?.time_window || '1 hour',
      short: true,
    },
    {
      title: 'Total Webhooks',
      value: payload.details?.total_webhooks?.toString() || 'N/A',
      short: true,
    },
  ];

  return {
    attachments: [{
      color,
      title: `${emoji} Webhook Alert: ${isFailureRate ? 'High Failure Rate' : 'Storage Spike'}`,
      text: payload.message,
      fields: [
        ...fields,
        {
          title: 'Recommended Actions',
          value: '• Check webhook monitoring dashboard\n• Review error logs and provider responses\n• Verify storage bucket permissions\n• Monitor provider API status',
          short: false,
        },
      ],
      footer: 'Webhook Monitor',
      ts: Math.floor(Date.now() / 1000),
    }],
  };
}

export function generateDiscordPayload(payload: AlertPayload, settings: any) {
  const isTest = payload.type === 'test';
  const isFailureRate = payload.type === 'failure_rate';
  
  const color = isTest ? 0x667eea : isFailureRate ? 0xdc3545 : 0xfd7e14;
  const emoji = isTest ? '🔔' : isFailureRate ? '🚨' : '⚠️';
  
  if (isTest) {
    return {
      embeds: [{
        color,
        title: `${emoji} Test Alert - Webhook Monitoring`,
        description: 'This is a test alert from your Webhook Monitoring System.',
        fields: [
          {
            name: 'Status',
            value: '✅ Alert system is working correctly',
            inline: true,
          },
          {
            name: 'Current Settings',
            value: `**Failure Rate:** ${settings.failure_rate_threshold}%\n**Storage Failures:** ${settings.storage_failure_threshold}\n**Check Interval:** ${settings.check_interval_minutes}min\n**Cooldown:** ${settings.cooldown_minutes}min`,
            inline: true,
          },
        ],
        footer: {
          text: 'Webhook Monitoring System',
        },
        timestamp: new Date().toISOString(),
      }],
    };
  }

  const fields = isFailureRate ? [
    {
      name: 'Current Failure Rate',
      value: `${payload.failureRate}%`,
      inline: true,
    },
    {
      name: 'Threshold',
      value: `${payload.threshold}%`,
      inline: true,
    },
    {
      name: '\u200b',
      value: '\u200b',
      inline: true,
    },
    {
      name: 'Total Webhooks',
      value: payload.details?.total?.toString() || 'N/A',
      inline: true,
    },
    {
      name: 'Failed',
      value: payload.details?.failed?.toString() || 'N/A',
      inline: true,
    },
    {
      name: 'Completed',
      value: payload.details?.completed?.toString() || 'N/A',
      inline: true,
    },
  ] : [
    {
      name: 'Storage Failures',
      value: payload.storageFailures?.toString() || 'N/A',
      inline: true,
    },
    {
      name: 'Threshold',
      value: payload.threshold?.toString() || 'N/A',
      inline: true,
    },
    {
      name: '\u200b',
      value: '\u200b',
      inline: true,
    },
    {
      name: 'Time Window',
      value: payload.details?.time_window || '1 hour',
      inline: true,
    },
    {
      name: 'Total Webhooks',
      value: payload.details?.total_webhooks?.toString() || 'N/A',
      inline: true,
    },
  ];

  return {
    embeds: [{
      color,
      title: `${emoji} Webhook Alert`,
      description: payload.message,
      fields: [
        ...fields,
        {
          name: '📋 Recommended Actions',
          value: '• Check webhook monitoring dashboard\n• Review error logs and provider responses\n• Verify storage bucket permissions\n• Monitor provider API status',
          inline: false,
        },
      ],
      footer: {
        text: `Webhook Monitor • Next alert after ${settings.cooldown_minutes}min cooldown`,
      },
      timestamp: new Date().toISOString(),
    }],
  };
}
