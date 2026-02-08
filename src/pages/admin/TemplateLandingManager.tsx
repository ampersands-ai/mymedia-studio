import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminTemplates } from "@/hooks/useAdminTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SmartLoader } from "@/components/ui/smart-loader";
import { Plus, MoreVertical, Eye, Edit, Trash2, ExternalLink } from "lucide-react";

export default function TemplateLandingManager() {
  const router = useRouter();
  const { templates, isLoading, deleteTemplate, togglePublish } = useAdminTemplates();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredTemplates = templates?.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category_slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTemplate.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <SmartLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Landing Pages</h1>
          <p className="text-muted-foreground">
            Manage SEO-optimized template landing pages
          </p>
        </div>
        <Button onClick={() => router.push("/admin/template-landing/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template Page
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Conversion</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTemplates?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No templates found. Create your first template page!
                </TableCell>
              </TableRow>
            ) : (
              filteredTemplates?.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {template.category_slug}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {template.slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.is_published ? "default" : "outline"}>
                      {template.is_published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell>{template.view_count.toLocaleString()}</TableCell>
                  <TableCell>{template.use_count.toLocaleString()}</TableCell>
                  <TableCell>
                    {template.view_count > 0
                      ? `${((template.use_count / template.view_count) * 100).toFixed(1)}%`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            window.open(
                              `/templates/${template.category_slug}/${template.slug}`,
                              "_blank"
                            )
                          }
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/template-landing/${template.id}`)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            togglePublish.mutate({
                              id: template.id,
                              isPublished: !template.is_published,
                            })
                          }
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          {template.is_published ? "Unpublish" : "Publish"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteId(template.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template Page?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The template landing page will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
