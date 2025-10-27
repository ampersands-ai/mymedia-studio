interface ProblemCardProps {
  icon: React.ReactNode;
  text: string;
}

export const ProblemCard = ({ icon, text }: ProblemCardProps) => {
  return (
    <div className="brutalist-card p-6 gpu-accelerated card hover-lift hover:border-secondary-600 transition-colors">
      <div className="mb-4 text-secondary-600">{icon}</div>
      <p className="text-base md:text-lg font-medium text-muted-foreground">{text}</p>
    </div>
  );
};
