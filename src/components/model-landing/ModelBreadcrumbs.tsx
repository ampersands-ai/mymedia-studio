import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface ModelBreadcrumbsProps {
  modelName: string;
  category?: string;
}

export function ModelBreadcrumbs({ modelName, category }: ModelBreadcrumbsProps) {
  return (
    <nav className="container max-w-6xl mx-auto px-4 py-4" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-sm text-muted-foreground">
        <li>
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        <li>
          <ChevronRight className="h-4 w-4" />
        </li>
        <li>
          <Link
            href="/models"
            className="hover:text-foreground transition-colors"
          >
            Models
          </Link>
        </li>
        {category && (
          <>
            <li>
              <ChevronRight className="h-4 w-4" />
            </li>
            <li>
              <Link
                href={`/models?category=${category}`}
                className="hover:text-foreground transition-colors capitalize"
              >
                {category}
              </Link>
            </li>
          </>
        )}
        <li>
          <ChevronRight className="h-4 w-4" />
        </li>
        <li className="text-foreground font-medium truncate max-w-[200px]">
          {modelName}
        </li>
      </ol>
    </nav>
  );
}
