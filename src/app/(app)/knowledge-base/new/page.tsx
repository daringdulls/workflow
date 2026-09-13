import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { KNOWLEDGE_CATEGORIES } from "@/lib/knowledge";
import { createArticle } from "../actions";

export default async function NewArticlePage() {
  const user = await getCurrentUser();
  const supabase = createClient();
  const { data: properties } = user?.profile?.organization_id
    ? await supabase.from("properties").select("*").eq("organization_id", user.profile.organization_id).order("name")
    : { data: [] };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Add Knowledge Base Article" description="Pixel AI only answers from content you approve here — never from guesses." />
      <form action={createArticle} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="category">
              Category
            </label>
            <select id="category" name="category" required className="input" defaultValue="faq">
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
            <select id="property_id" name="property_id" className="input">
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
          <input id="title" name="title" required className="input" placeholder="Do you provide towels for diving?" />
        </div>
        <div>
          <label className="label" htmlFor="content">
            Content
          </label>
          <textarea id="content" name="content" required rows={8} className="input" placeholder="Write the approved answer Pixel AI should use, in guest-facing language." />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary">
            Create Article
          </button>
          <a href="/knowledge-base" className="btn-secondary">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
