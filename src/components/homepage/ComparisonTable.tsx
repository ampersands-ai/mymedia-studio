export const ComparisonTable = () => {
  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      {/* Buying Separate */}
      <div className="brutalist-card p-8 bg-white">
        <h3 className="text-2xl font-black mb-6 text-neutral-900">
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
              <span className="font-medium text-neutral-700">❌ {tool.name}</span>
              <span className="font-bold text-neutral-900">${tool.price}/mo</span>
            </div>
          ))}
        </div>
        <div className="border-t-4 border-black pt-4">
          <div className="flex justify-between items-center">
            <span className="text-xl font-black text-neutral-900">Total:</span>
            <span className="text-3xl font-black text-error">$135/month</span>
          </div>
        </div>
      </div>

      {/* artifio.ai */}
      <div className="brutalist-card p-8 bg-secondary-50 border-secondary-600 shadow-lg shadow-secondary-600/20">
        <h3 className="text-2xl font-black mb-6 text-neutral-900">
          artifio.ai All-in-One
        </h3>
        <div className="space-y-4 mb-6 h-[200px] flex flex-col justify-center">
          <div className="text-center space-y-3">
            <div className="text-neutral-900 font-bold">✅ All of the above</div>
            <div className="text-neutral-900 font-bold">✅ + 18 more AI models</div>
            <div className="text-neutral-900 font-bold">✅ + 200 templates</div>
          </div>
        </div>
        <div className="border-t-4 border-black pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xl font-black text-neutral-900">Starting at:</span>
            <span className="text-3xl font-black text-secondary-600">$7.99/month</span>
          </div>
          <div className="text-center py-3 bg-primary-500 border-4 border-black">
            <span className="text-xl font-black text-neutral-900">💰 Save $127/mo</span>
          </div>
        </div>
      </div>
    </div>
  );
};
