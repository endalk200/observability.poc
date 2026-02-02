import Link from "next/link";
import { Suspense } from "react";
import { HydrateClient } from "~/trpc/server";
import { PostsList } from "./_components/posts-list";

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-11 w-full max-w-md animate-pulse rounded-lg bg-gray-200" />
        <div className="h-11 w-32 animate-pulse rounded-lg bg-gray-200" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div className="h-48 animate-pulse rounded-xl bg-gray-200" key={i} />
        ))}
      </div>
    </div>
  );
}

export default function PostTrpcPage() {
  return (
    <HydrateClient>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50">
        {/* Header */}
        <header className="sticky top-0 z-40 border-gray-200/80 border-b bg-white/80 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-3">
                <Link className="flex items-center gap-3" href="/">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/25">
                    <svg
                      aria-hidden="true"
                      className="h-6 w-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  </div>
                  <div>
                    <h1 className="font-bold text-gray-900 text-xl">PostHub</h1>
                    <p className="text-gray-500 text-xs">tRPC Implementation</p>
                  </div>
                </Link>
              </div>
              <nav className="flex items-center gap-2">
                <Link
                  className="rounded-lg px-4 py-2 font-medium text-gray-600 text-sm transition-colors hover:bg-gray-100 hover:text-gray-900"
                  href="/post-api"
                >
                  Switch to API
                </Link>
                <div className="flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1.5 font-medium text-purple-700 text-sm">
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                  tRPC
                </div>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative overflow-hidden border-gray-200/80 border-b bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
          <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-medium text-sm text-white backdrop-blur-sm">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                Powered by tRPC
              </div>
              <h2 className="font-bold text-3xl text-white tracking-tight sm:text-4xl">
                Post Management with tRPC
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-purple-100">
                Type-safe API calls with end-to-end TypeScript support. No
                manual API schema definitions needed.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Suspense fallback={<LoadingSkeleton />}>
            <PostsList />
          </Suspense>
        </main>

        {/* Footer */}
        <footer className="border-gray-200 border-t bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-gray-500 text-sm">
                Using tRPC for type-safe API calls
              </p>
              <Link
                className="font-medium text-purple-600 text-sm hover:text-purple-700"
                href="/post-api"
              >
                Compare with REST API →
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </HydrateClient>
  );
}
