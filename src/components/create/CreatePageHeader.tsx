import { SessionWarning } from "@/components/SessionWarning";

/**
 * Props for CreatePageHeader component
 */
interface CreatePageHeaderProps {
  title?: string;
  description?: string;
}

/**
 * Header component for Create page
 * Displays title, description, and session warning
 */
export const CreatePageHeader = ({ 
  title = "WHAT YOU CAN CREATE",
  description = "Professional-grade AI tools for every creative need—no experience required"
}: CreatePageHeaderProps) => {
  return (
    <>
      <SessionWarning />
      <div className="mb-8 space-y-1">
        <h2 className="text-4xl md:text-5xl font-black">{title}</h2>
        <p className="text-lg text-foreground/80 font-medium">{description}</p>
      </div>
    </>
  );
};
