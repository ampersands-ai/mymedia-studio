interface ProblemCardProps {
  emoji: string;
  text: string;
}

export const ProblemCard = ({ emoji, text }: ProblemCardProps) => {
  return (
    <div className="brutalist-card p-6 hover-lift">
      <div className="text-4xl mb-4">{emoji}</div>
      <p className="text-base md:text-lg font-medium text-foreground">{text}</p>
    </div>
  );
};
