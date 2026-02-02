"use client";

import Link from "next/link";
import { Suspense } from "react";
import { PostsListApi } from "./_components/posts-list-api";

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

export default function PostApiPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-gray-200/80 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Link className="flex items-center gap-3" href="/">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-green-500/25 shadow-lg">
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
                  <p className="text-gray-500 text-xs">
                    REST API Implementation
                  </p>
                </div>
              </Link>
            </div>
            <nav className="flex items-center gap-2">
              <Link
                className="rounded-lg px-4 py-2 font-medium text-gray-600 text-sm transition-colors hover:bg-gray-100 hover:text-gray-900"
                href="/post-trpc"
              >
                Switch to tRPC
              </Link>
              <div className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1.5 font-medium text-green-700 text-sm">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                REST API
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-gray-200/80 border-b bg-gradient-to-r from-green-600 via-green-500 to-emerald-500">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
        <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
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
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              Powered by REST API
            </div>
            <h2 className="font-bold text-3xl text-white tracking-tight sm:text-4xl">
              Post Management with REST API
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-green-100 text-lg">
              Traditional REST endpoints with React Query for data fetching.
              Same tools, different approach.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Suspense fallback={<LoadingSkeleton />}>
          <PostsListApi />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-gray-200 border-t bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-gray-500 text-sm">
              Using REST API with React Query
            </p>
            <Link
              className="font-medium text-green-600 text-sm hover:text-green-700"
              href="/post-trpc"
            >
              Compare with tRPC →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
