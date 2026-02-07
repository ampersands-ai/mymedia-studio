import { brand } from "@/config/brand";

export const ComparisonTable = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      {/* Buying Separate */}
      <div className="brutalist-card p-8 bg-white dark:bg-card">
        <h3 className="text-2xl font-black mb-6 text-neutral-900 dark:text-neutral-100">
          Buying Separate Subscriptions
        </h3>
        <div className="space-y-3 mb-6">
          {[
            { name: "Midjourney", price: 30 },
            { name: "Runway", price: 35 },
            { name: "ElevenLabs", price: 22 },
            { name: "ChatGPT Plus", price: 20 },
            { name: "Pika", price: 28 },
          ].map((tool) => (
            <div key={tool.name} className="flex justify-between items-center">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">❌ {tool.name}</span>
              <span className="font-bold text-neutral-900 dark:text-neutral-100">${tool.price}/mo</span>
            </div>
          ))}
        </div>
        <div className="border-t-4 border-black dark:border-white pt-4">
          <div className="flex justify-between items-center">
            <span className="text-xl font-black text-neutral-900 dark:text-neutral-100">Total:</span>
            <span className="text-3xl font-black text-error dark:text-red-400">$135/month</span>
          </div>
        </div>
      </div>

      {/* Brand All-in-One */}
      <div className="brutalist-card p-8 bg-secondary-50 dark:bg-secondary-900/20 border-secondary-600 dark:border-secondary-400 shadow-lg shadow-secondary-600/20">
        <h3 className="text-2xl font-black mb-6 text-neutral-900 dark:text-neutral-100">
          {brand.name} All-in-One
        </h3>
        <div className="space-y-4 mb-6 h-[200px] flex flex-col justify-center">
          <div className="text-center space-y-3">
            <div className="text-neutral-900 dark:text-neutral-100 font-bold">✅ All of the above</div>
            <div className="text-neutral-900 dark:text-neutral-100 font-bold">✅ + 26 more AI models</div>
            <div className="text-neutral-900 dark:text-neutral-100 font-bold">✅ + 200 templates</div>
          </div>
        </div>
        <div className="border-t-4 border-black dark:border-white pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xl font-black text-neutral-900 dark:text-neutral-100">Starting at:</span>
            <span className="text-3xl font-black text-secondary-600 dark:text-secondary-400">$7.99/mo</span>
          </div>
          <div className="text-center py-3 bg-primary-500 dark:bg-primary-600 border-4 border-black dark:border-primary-400">
            <span className="text-xl font-black text-neutral-900 dark:text-neutral-100">💰 Save $127/mo</span>
          </div>
          <div className="text-center text-sm font-bold text-green-600 dark:text-green-400 pt-2">
            ✓ Credits never expire while subscribed
          </div>
          <div className="text-center text-sm font-bold text-primary-600 dark:text-primary-400">
            🔥 Limited Time: 20% OFF
          </div>
        </div>
      </div>
    </div>
  );
};
