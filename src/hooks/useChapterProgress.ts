import { useCallback, useEffect, useState } from "react";
import { chapters } from "@/data/features-showcase";

export const useChapterProgress = () => {
  const [activeChapter, setActiveChapter] = useState<string>("intro");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(scrollProgress);

      // Find active chapter based on scroll position
      const chapterElements = chapters
        .map((chapter) => ({
          id: chapter.id,
          element: document.getElementById(`chapter-${chapter.id}`),
        }))
        .filter((item) => item.element !== null);

      for (let i = chapterElements.length - 1; i >= 0; i--) {
        const { id, element } = chapterElements[i];
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= window.innerHeight * 0.5) {
            setActiveChapter(id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToChapter = useCallback((chapterId: string) => {
    const element = document.getElementById(`chapter-${chapterId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return { activeChapter, progress, scrollToChapter };
};
