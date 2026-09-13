import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { KNOWLEDGE_CATEGORIES, sourceLabel } from "@/lib/knowledge";
import { updateArticle } from "../actions";

export default async function ArticleDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await getCurrentUser();
  const { data: article } = await supabase.from("knowledge_base_articles").select("*, properties(name)").eq("id", params.id).maybeSingle();
  if (!article) notFound();

  const { data: properties } = user?.profile?.organization_id
    ? await supabase.from("properties").select("*").eq("organization_id", user.profile.organization_id).order("name")
    : { data: [] };

  const updateWithId = updateArticle.bind(null, article.id);
  const source = sourceLabel((article as any).properties?.name ?? null, article.category, article.title);

  return (
    <div className="max-w-2xl">
      <PageHeader title={article.title} description={`Source: ${source}`} />
      <form action={updateWithId} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="category">
              Category
            </label>
            <select id="category" name="category" defaultValue={article.category} required className="input">
              {KNOWLEDGE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="property_id">
              Property
            </label>
            <select id="property_id" name="property_id" defaultValue={article.property_id ?? ""} className="input">
              <option value="">All properties</option>
              {(properties ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input id="title" name="title" defaultValue={article.title} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="content">
            Content
          </label>
          <textarea id="content" name="content" defaultValue={article.content} required rows={8} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={article.status} className="input">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Save changes
        </button>
      </form>
    </div>
  );
}
