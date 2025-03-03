"use client";

import dynamic from "next/dynamic";

// Import the client component with SSR disabled to avoid hydration issues
const ClientPage = dynamic(() => import("./page-client"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-lg">Loading application...</p>
    </div>
  ),
});

export default function Page() {
  return <ClientPage />;
}
