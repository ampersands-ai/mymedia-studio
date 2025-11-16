import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SEOMetadata } from "@/types/blog";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SEOFieldsProps {
  metadata: SEOMetadata;
  onChange: (metadata: SEOMetadata) => void;
  title?: string;
  content?: string;
}

export const SEOFields = ({ metadata, onChange, title, content }: SEOFieldsProps) => {
  const [keywordInput, setKeywordInput] = useState("");
  const [seoScore, setSeoScore] = useState<number>(0);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Calculate SEO score based on metadata completeness
  useEffect(() => {
    let score = 0;
    const newWarnings: string[] = [];

    // Meta title (20 points)
    if (metadata.meta_title) {
      if (metadata.meta_title.length >= 50 && metadata.meta_title.length <= 60) {
        score += 20;
      } else if (metadata.meta_title.length < 30) {
        newWarnings.push("Meta title too short (recommended: 50-60 characters)");
        score += 5;
      } else {
        score += 10;
        newWarnings.push("Meta title length not optimal (recommended: 50-60 characters)");
      }
    } else {
      newWarnings.push("Meta title is missing");
    }

    // Meta description (20 points)
    if (metadata.meta_description) {
      if (metadata.meta_description.length >= 150 && metadata.meta_description.length <= 160) {
        score += 20;
      } else if (metadata.meta_description.length < 120) {
        newWarnings.push("Meta description too short (recommended: 150-160 characters)");
        score += 5;
      } else {
        score += 10;
        newWarnings.push("Meta description length not optimal (recommended: 150-160 characters)");
      }
    } else {
      newWarnings.push("Meta description is missing");
    }

    // Keywords (15 points)
    if (metadata.meta_keywords && metadata.meta_keywords.length >= 3) {
      score += 15;
    } else {
      newWarnings.push("Add at least 3-5 meta keywords");
    }

    // Open Graph (15 points)
    if (metadata.og_title && metadata.og_description) {
      score += 15;
    }

    // Twitter Card (10 points)
    if (metadata.twitter_title && metadata.twitter_description) {
      score += 10;
    }

    // Canonical URL (10 points)
    if (metadata.canonical_url) {
      score += 10;
    }

    // Schema data (10 points)
    if (metadata.schema_data) {
      score += 10;
    }

    setSeoScore(score);
    setWarnings(newWarnings);
  }, [metadata]);

  const handleAddKeyword = () => {
    if (keywordInput.trim()) {
      const keywords = [...(metadata.meta_keywords || []), keywordInput.trim()];
      onChange({ ...metadata, meta_keywords: keywords });
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (index: number) => {
    const keywords = [...(metadata.meta_keywords || [])];
    keywords.splice(index, 1);
    onChange({ ...metadata, meta_keywords: keywords });
  };

  const handleAutoFill = () => {
    const updates: Partial<SEOMetadata> = {};

    if (title && !metadata.meta_title) {
      updates.meta_title = title.slice(0, 60);
    }

    if (title && !metadata.og_title) {
      updates.og_title = title;
    }

    if (title && !metadata.twitter_title) {
      updates.twitter_title = title;
    }

    if (content && !metadata.meta_description) {
      const plainText = content.replace(/<[^>]*>/g, '').slice(0, 160);
      updates.meta_description = plainText;
      updates.og_description = plainText;
      updates.twitter_description = plainText;
    }

    onChange({ ...metadata, ...updates });
  };

  const getSEOScoreColor = () => {
    if (seoScore >= 80) return "text-green-600";
    if (seoScore >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* SEO Score Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>SEO Optimization</CardTitle>
              <CardDescription>Optimize your blog post for search engines</CardDescription>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${getSEOScoreColor()}`}>
                {seoScore}%
              </div>
              <p className="text-sm text-muted-foreground">SEO Score</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={handleAutoFill} variant="outline" size="sm">
            Auto-fill from Content
          </Button>

          {warnings.length > 0 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Basic SEO Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Basic SEO</CardTitle>
          <CardDescription>Essential metadata for search engines</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meta-title">
              Meta Title <span className="text-muted-foreground text-sm">({metadata.meta_title?.length || 0}/60)</span>
            </Label>
            <Input
              id="meta-title"
              value={metadata.meta_title || ""}
              onChange={(e) => onChange({ ...metadata, meta_title: e.target.value })}
              placeholder="Your SEO-optimized title (50-60 characters)"
              maxLength={60}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-description">
              Meta Description <span className="text-muted-foreground text-sm">({metadata.meta_description?.length || 0}/160)</span>
            </Label>
            <Textarea
              id="meta-description"
              value={metadata.meta_description || ""}
              onChange={(e) => onChange({ ...metadata, meta_description: e.target.value })}
              placeholder="Compelling description for search results (150-160 characters)"
              maxLength={160}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Meta Keywords</Label>
            <div className="flex gap-2">
              <Input
                id="keywords"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                placeholder="Add keyword and press Enter"
              />
              <Button type="button" onClick={handleAddKeyword} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {metadata.meta_keywords?.map((keyword, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {keyword}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleRemoveKeyword(index)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="canonical-url">Canonical URL</Label>
            <Input
              id="canonical-url"
              type="url"
              value={metadata.canonical_url || ""}
              onChange={(e) => onChange({ ...metadata, canonical_url: e.target.value })}
              placeholder="https://yoursite.com/blog/post-slug"
            />
          </div>
        </CardContent>
      </Card>

      {/* Open Graph */}
      <Card>
        <CardHeader>
          <CardTitle>Open Graph (Facebook, LinkedIn)</CardTitle>
          <CardDescription>How your post appears on social media</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="og-title">OG Title</Label>
            <Input
              id="og-title"
              value={metadata.og_title || ""}
              onChange={(e) => onChange({ ...metadata, og_title: e.target.value })}
              placeholder="Social media title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="og-description">OG Description</Label>
            <Textarea
              id="og-description"
              value={metadata.og_description || ""}
              onChange={(e) => onChange({ ...metadata, og_description: e.target.value })}
              placeholder="Social media description"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="og-image">OG Image URL</Label>
            <Input
              id="og-image"
              type="url"
              value={metadata.og_image_url || ""}
              onChange={(e) => onChange({ ...metadata, og_image_url: e.target.value })}
              placeholder="https://yoursite.com/images/og-image.jpg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Twitter Card */}
      <Card>
        <CardHeader>
          <CardTitle>Twitter Card</CardTitle>
          <CardDescription>Optimize for Twitter/X sharing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="twitter-title">Twitter Title</Label>
            <Input
              id="twitter-title"
              value={metadata.twitter_title || ""}
              onChange={(e) => onChange({ ...metadata, twitter_title: e.target.value })}
              placeholder="Title for Twitter card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitter-description">Twitter Description</Label>
            <Textarea
              id="twitter-description"
              value={metadata.twitter_description || ""}
              onChange={(e) => onChange({ ...metadata, twitter_description: e.target.value })}
              placeholder="Description for Twitter card"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitter-image">Twitter Image URL</Label>
            <Input
              id="twitter-image"
              type="url"
              value={metadata.twitter_image_url || ""}
              onChange={(e) => onChange({ ...metadata, twitter_image_url: e.target.value })}
              placeholder="https://yoursite.com/images/twitter-image.jpg"
            />
          </div>
        </CardContent>
      </Card>

      {/* SEO Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>SEO Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {metadata.meta_title ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">Meta title is set</span>
            </div>
            <div className="flex items-center gap-2">
              {metadata.meta_description ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">Meta description is set</span>
            </div>
            <div className="flex items-center gap-2">
              {metadata.meta_keywords && metadata.meta_keywords.length >= 3 ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">At least 3 keywords added</span>
            </div>
            <div className="flex items-center gap-2">
              {metadata.og_title && metadata.og_description ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">Open Graph data is complete</span>
            </div>
            <div className="flex items-center gap-2">
              {metadata.canonical_url ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
              <span className="text-sm">Canonical URL is set (recommended)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
