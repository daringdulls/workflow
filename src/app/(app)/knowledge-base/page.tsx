import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { categoryLabel, KNOWLEDGE_CATEGORIES } from "@/lib/knowledge";

export default async function KnowledgeBasePage({ searchParams }: { searchParams: { category?: string } }) {
  const user = await getCurrentUser();
  const supabase = createClient();

  let query = supabase.from("knowledge_base_articles").select("*, properties(name)").order("category").order("title");
  if (user?.profile?.organization_id) query = query.eq("organization_id", user.profile.organization_id);
  if (searchParams.category) query = query.eq("category", searchParams.category);
  const { data: articles } = await query;

  const columns: Column<any>[] = [
    { header: "Title", cell: (a) => <span className="font-medium text-navy-900">{a.title}</span> },
    { header: "Category", cell: (a) => categoryLabel(a.category) },
    { header: "Property", cell: (a) => a.properties?.name ?? "All properties" },
    { header: "Status", cell: (a) => <StatusBadge status={a.status} tone={a.status === "active" ? "emerald" : "slate"} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        description="Approved answers Pixel AI draws from for non-transactional questions — every reply cites its source."
        actions={
          <a href="/knowledge-base/new" className="btn-primary">
            Add Article
          </a>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <a
          href="/knowledge-base"
          className={`badge ${!searchParams.category ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          All
        </a>
        {KNOWLEDGE_CATEGORIES.map((c) => (
          <a
            key={c.value}
            href={`/knowledge-base?category=${c.value}`}
            className={`badge ${searchParams.category === c.value ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {c.label}
          </a>
        ))}
      </div>

      {!articles || articles.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No articles yet"
          description="Add check-in times, policies, dive requirements and FAQs so Pixel AI can answer guest questions accurately instead of guessing."
          actionLabel="Add Article"
          actionHref="/knowledge-base/new"
        />
      ) : (
        <DataTable columns={columns} rows={articles} rowHref={(a) => `/knowledge-base/${a.id}`} />
      )}
    </div>
  );
}
