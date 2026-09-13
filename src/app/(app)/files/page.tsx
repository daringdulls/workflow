import { FolderOpen, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, titleCase } from "@/lib/format";
import { uploadFile } from "./actions";

const FILE_TYPES = ["passport", "voucher", "invoice", "quotation", "rate_sheet", "factsheet", "contract", "other"];
const RELATED_TYPES = ["guest", "booking", "quotation", "agent", "property"];

export default async function FilesPage() {
  const user = await getCurrentUser();
  const supabase = createClient();
  const { data: files } = user?.profile?.organization_id
    ? await supabase.from("files").select("*").eq("organization_id", user.profile.organization_id).order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Files & Documents" description="Passports, vouchers, invoices, rate sheets and contracts, stored securely." />

      <form action={uploadFile} className="card mb-6 space-y-3 p-5" encType="multipart/form-data">
        <p className="text-sm font-semibold text-navy-900">Upload a document</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select name="related_type" required className="input">
            <option value="">Related to…</option>
            {RELATED_TYPES.map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </select>
          <input name="related_id" required placeholder="Record ID (UUID)" className="input" />
          <select name="file_type" required className="input">
            <option value="">File type…</option>
            {FILE_TYPES.map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </select>
        </div>
        <input type="file" name="file" required className="input" />
        <p className="text-xs text-slate-400">
          Tip: open a guest, booking or agent first and copy its ID from the URL — file uploads are also available directly from a guest&apos;s Documents tab.
        </p>
        <button type="submit" className="btn-primary">
          Upload
        </button>
      </form>

      {!files || files.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No documents yet" description="Uploaded passports, vouchers and invoices will appear here." />
      ) : (
        <div className="card divide-y divide-slate-100">
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-navy-900">{f.file_name}</p>
                <p className="text-xs text-slate-400">
                  {titleCase(f.file_type)} · {titleCase(f.related_type)} · {formatDate(f.created_at)}
                </p>
              </div>
              <a href={`/api/files/${f.id}/download`} className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline">
                <Download className="h-3.5 w-3.5" /> Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
