import { login } from "./actions";
import { Boxes, TriangleAlert } from "lucide-react";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; redirect?: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-card">
            <Boxes className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Pixel Core</h1>
            <p className="text-sm text-slate-400">Sign in to the Pixel integration hub</p>
          </div>
        </div>

        <form action={login} className="card space-y-4 p-6">
          <input type="hidden" name="redirect" value={searchParams.redirect ?? "/"} />

          {searchParams.error ? (
            <div className="flex items-start gap-2 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{searchParams.error}</span>
            </div>
          ) : null}

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="you@company.com" />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="input"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Access is granted by your Pixel Core administrator.
        </p>
      </div>
    </div>
  );
}
