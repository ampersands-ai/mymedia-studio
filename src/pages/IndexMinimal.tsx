import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const IndexMinimal = () => {
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-gray-950">
      {/* Quick Switch Button */}
      <div className="fixed top-4 right-4 z-50">
        <Link to="/">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Current Design
          </Button>
        </Link>
      </div>

      {/* Hero Section - Minimalistic */}
      <section className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-7xl font-light text-gray-900 dark:text-gray-50 tracking-tight">
            AI Content Generation
            <br />
            <span className="text-gray-600 dark:text-gray-400">Without All the Chaos</span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 font-light max-w-2xl mx-auto">
            Clean. Minimalistic. Powerful.
          </p>

          <div className="pt-8">
            <Link to="/dashboard/create">
              <Button 
                size="lg" 
                className="rounded-full px-8 py-6 text-lg font-normal bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-sm hover:shadow-md transition-all"
              >
                Start Creating Free
              </Button>
            </Link>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-500 font-light pt-4">
            No credit card required
          </p>
        </div>
      </section>

      {/* Value Props Section */}
      <section className="py-32 px-4 bg-[#F5F5F5] dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: "No BS Pricing",
                description: "Simple, transparent pricing. Pay for what you use.",
              },
              {
                title: "Quality Output",
                description: "State-of-the-art AI models. Professional results.",
              },
              {
                title: "Simple to Use",
                description: "Clean interface. No learning curve. Just create.",
              },
            ].map((item, i) => (
              <div 
                key={i}
                className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
              >
                <h3 className="text-xl font-medium text-gray-900 dark:text-gray-50 mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 font-light leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 dark:text-gray-50">
            Ready to Create Without Chaos?
          </h2>
          
          <Link to="/dashboard/create">
            <Button 
              size="lg" 
              className="rounded-full px-8 py-6 text-lg font-normal bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-sm hover:shadow-md transition-all"
            >
              Get Started Free
            </Button>
          </Link>

          <p className="text-sm text-gray-500 dark:text-gray-500 font-light">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-12 px-4 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-500 font-light">
              © 2025 ARTIFIO.AI
            </p>
            
            <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
              <Link to="/features" className="hover:text-gray-900 dark:hover:text-gray-50 transition-colors">
                Features
              </Link>
              <Link to="/pricing" className="hover:text-gray-900 dark:hover:text-gray-50 transition-colors">
                Pricing
              </Link>
              <Link to="/blog" className="hover:text-gray-900 dark:hover:text-gray-50 transition-colors">
                Blog
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default IndexMinimal;
