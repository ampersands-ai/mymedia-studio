import { Upload, Wand2, Settings, Download } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

const steps = [
  {
    icon: Upload,
    title: 'Upload or Enter Prompt',
    description: 'Start with an image, text, or creative idea',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Wand2,
    title: 'Choose AI Model',
    description: '30+ models for different styles and outputs',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Settings,
    title: 'Customize Settings',
    description: 'Fine-tune parameters for perfect results',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: Download,
    title: 'Generate & Download',
    description: 'Get professional results in seconds',
    color: 'from-green-500 to-emerald-500',
  },
];

export const WorkflowSteps = () => {
  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            How It{' '}
            <span className="bg-gradient-to-r from-primary-yellow to-primary-orange bg-clip-text text-transparent">
              Works
            </span>
          </h2>
          <p className="text-xl text-gray-800 dark:text-gray-200">
            From idea to creation in 4 simple steps
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <GlassCard hover gradient className="p-6 h-full group">
                {/* Step number */}
                <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-gradient-to-br from-primary-yellow to-primary-orange flex items-center justify-center text-white font-bold text-xl shadow-lg z-10">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 transform group-hover:scale-110 transition-transform`}>
                  <step.icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-800 dark:text-gray-200">
                  {step.description}
                </p>
              </GlassCard>

              {/* Arrow connector (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 translate-x-full z-0">
                  <svg width="32" height="32" viewBox="0 0 32 32" className="text-gray-300 dark:text-gray-700">
                    <path d="M8 16h16m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
