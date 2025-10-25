import { ChevronRight, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TemplateBreadcrumbsProps {
  category: string;
  categoryName?: string;
  templateName: string;
}

export function TemplateBreadcrumbs({
  category,
  categoryName,
  templateName,
}: TemplateBreadcrumbsProps) {
  const navigate = useNavigate();

  return (
    <nav className="py-4 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-6xl mx-auto">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <button
              onClick={() => navigate("/")}
              className="hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          </li>
          <ChevronRight className="w-4 h-4" />
          <li>
            <span className="text-foreground">Templates</span>
          </li>
          <ChevronRight className="w-4 h-4" />
          <li>
            <span className="text-foreground capitalize">
              {categoryName || category.replace(/-/g, " ")}
            </span>
          </li>
          <ChevronRight className="w-4 h-4" />
          <li>
            <span className="text-foreground font-medium">{templateName}</span>
          </li>
        </ol>
      </div>
    </nav>
  );
}
