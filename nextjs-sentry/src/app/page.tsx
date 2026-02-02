import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <header className="border-gray-200/80 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 shadow-lg">
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
                <p className="text-gray-500 text-xs">API Comparison</p>
              </div>
            </div>
            <nav className="flex items-center gap-4">
              <a
                className="text-gray-500 text-sm transition-colors hover:text-gray-700"
                href="https://trpc.io"
                rel="noopener noreferrer"
                target="_blank"
              >
                tRPC Docs
              </a>
              <a
                className="text-gray-500 text-sm transition-colors hover:text-gray-700"
                href="https://tanstack.com/query"
                rel="noopener noreferrer"
                target="_blank"
              >
                React Query Docs
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-24">
        <div className="absolute inset-0 bg-grid-white/5" />
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-green-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-bold text-4xl text-white tracking-tight sm:text-5xl lg:text-6xl">
              Compare API Approaches
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-gray-300 text-lg sm:text-xl">
              Explore the same post management application built with two
              different approaches: tRPC for type-safe APIs and traditional REST
              endpoints.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-gray-400">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                Same UI/UX
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                Same Features
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                Same Database
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                Different Implementation
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cards Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            {/* tRPC Card */}
            <Link
              className="group relative overflow-hidden rounded-2xl border border-purple-200 bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-purple-300 hover:shadow-xl"
              href="/post-trpc"
            >
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-purple-100 transition-transform duration-300 group-hover:scale-150" />
              <div className="relative">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25">
                  <svg
                    aria-hidden="true"
                    className="h-8 w-8 text-white"
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
                </div>
                <h3 className="mb-3 font-bold text-2xl text-gray-900">
                  tRPC Implementation
                </h3>
                <p className="mb-6 text-gray-600">
                  End-to-end type safety with automatic TypeScript inference. No
                  manual API schemas, no code generation, just pure TypeScript
                  magic.
                </p>
                <ul className="mb-8 space-y-3">
                  <li className="flex items-center gap-3 text-gray-600 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5 text-purple-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    Type-safe API calls
                  </li>
                  <li className="flex items-center gap-3 text-gray-600 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5 text-purple-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    Automatic TypeScript inference
                  </li>
                  <li className="flex items-center gap-3 text-gray-600 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5 text-purple-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    Built-in React Query integration
                  </li>
                  <li className="flex items-center gap-3 text-gray-600 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5 text-purple-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    Zero runtime overhead
                  </li>
                </ul>
                <div className="flex items-center gap-2 font-semibold text-purple-600 transition-colors group-hover:text-purple-700">
                  Explore tRPC Version
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
              </div>
            </Link>

            {/* REST API Card */}
            <Link
              className="group relative overflow-hidden rounded-2xl border border-green-200 bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-green-300 hover:shadow-xl"
              href="/post-api"
            >
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-green-100 transition-transform duration-300 group-hover:scale-150" />
              <div className="relative">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-600 shadow-green-500/25 shadow-lg">
                  <svg
                    aria-hidden="true"
                    className="h-8 w-8 text-white"
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
                </div>
                <h3 className="mb-3 font-bold text-2xl text-gray-900">
                  REST API Implementation
                </h3>
                <p className="mb-6 text-gray-600">
                  Traditional REST endpoints with React Query for state
                  management. Industry-standard approach with familiar patterns.
                </p>
                <ul className="mb-8 space-y-3">
                  <li className="flex items-center gap-3 text-gray-600 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    Standard HTTP endpoints
                  </li>
                  <li className="flex items-center gap-3 text-gray-600 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    Manual React Query setup
                  </li>
                  <li className="flex items-center gap-3 text-gray-600 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    Zod validation on server
                  </li>
                  <li className="flex items-center gap-3 text-gray-600 text-sm">
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    Universal compatibility
                  </li>
                </ul>
                <div className="flex items-center gap-2 font-semibold text-green-600 transition-colors group-hover:text-green-700">
                  Explore REST Version
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="mb-12 text-center font-bold text-3xl text-gray-900">
            Side-by-Side Comparison
          </h3>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-gray-200 border-b bg-gray-50">
                  <th className="px-6 py-4 text-left font-semibold text-gray-900 text-sm">
                    Feature
                  </th>
                  <th className="px-6 py-4 text-center font-semibold text-purple-600 text-sm">
                    tRPC
                  </th>
                  <th className="px-6 py-4 text-center font-semibold text-green-600 text-sm">
                    REST API
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    Type Safety
                  </td>
                  <td className="px-6 py-4 text-center text-sm">
                    <span className="inline-flex items-center gap-1 text-purple-600">
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          clipRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          fillRule="evenodd"
                        />
                      </svg>
                      End-to-end
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm">
                    <span className="inline-flex items-center gap-1 text-yellow-600">
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          clipRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          fillRule="evenodd"
                        />
                      </svg>
                      Manual types
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    Boilerplate
                  </td>
                  <td className="px-6 py-4 text-center text-purple-600 text-sm">
                    Minimal
                  </td>
                  <td className="px-6 py-4 text-center text-green-600 text-sm">
                    More setup
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    Learning Curve
                  </td>
                  <td className="px-6 py-4 text-center text-purple-600 text-sm">
                    Medium
                  </td>
                  <td className="px-6 py-4 text-center text-green-600 text-sm">
                    Easy
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    External Client Support
                  </td>
                  <td className="px-6 py-4 text-center text-purple-600 text-sm">
                    TypeScript only
                  </td>
                  <td className="px-6 py-4 text-center text-green-600 text-sm">
                    Any language
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    React Query Integration
                  </td>
                  <td className="px-6 py-4 text-center text-purple-600 text-sm">
                    Built-in
                  </td>
                  <td className="px-6 py-4 text-center text-green-600 text-sm">
                    Manual
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    Validation
                  </td>
                  <td className="px-6 py-4 text-center text-purple-600 text-sm">
                    Zod (shared)
                  </td>
                  <td className="px-6 py-4 text-center text-green-600 text-sm">
                    Zod (server)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="mb-12 text-center font-bold text-3xl text-gray-900">
            Shared Technology Stack
          </h3>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Next.js 15", desc: "React Framework" },
              { name: "React Query", desc: "Data Fetching" },
              { name: "React Hook Form", desc: "Form Management" },
              { name: "Zod", desc: "Schema Validation" },
              { name: "Prisma", desc: "Database ORM" },
              { name: "Tailwind CSS", desc: "Styling" },
              { name: "TypeScript", desc: "Type Safety" },
              { name: "SQLite", desc: "Database" },
            ].map((tech) => (
              <div
                className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm"
                key={tech.name}
              >
                <h4 className="font-semibold text-gray-900">{tech.name}</h4>
                <p className="mt-1 text-gray-500 text-sm">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-gray-200 border-t bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-gray-500 text-sm">
              Built with Next.js, tRPC, and Tailwind CSS
            </p>
            <div className="flex items-center gap-6">
              <Link
                className="text-gray-500 text-sm transition-colors hover:text-purple-600"
                href="/post-trpc"
              >
                tRPC Version
              </Link>
              <Link
                className="text-gray-500 text-sm transition-colors hover:text-green-600"
                href="/post-api"
              >
                API Version
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
