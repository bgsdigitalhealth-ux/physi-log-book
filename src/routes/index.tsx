import { createFileRoute, redirect } from "@tanstack/react-router";

import { authQueryOptions } from "@/lib/auth";
import { homeFor } from "@/lib/nav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Physiology Practical Record | BGS Medical College Hospital" },
      {
        name: "description",
        content:
          "Digital practical record system for MBBS Phase I physiology — student journal, faculty evaluation and department administration.",
      },
      {
        property: "og:title",
        content: "Physiology Practical Record | BGS Medical College Hospital",
      },
      {
        property: "og:description",
        content:
          "Digital practical record system for MBBS Phase I physiology — student journal, faculty evaluation and department administration.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    const ctx = await context.queryClient.ensureQueryData(authQueryOptions);
    if (!ctx) throw redirect({ to: "/login" });
    throw redirect({ to: homeFor(ctx.role) });
  },
  component: () => null,
});
