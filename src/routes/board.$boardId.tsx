import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { WhiteboardHost } from "@/components/whiteboard-host";

export const Route = createFileRoute("/board/$boardId")({
  head: () => ({
    meta: [
      { title: "Whiteboard — Hbibo Board" },
      {
        name: "description",
        content: "Infinite canvas whiteboard with pen, shapes, sticky notes and text tools.",
      },
      { property: "og:title", content: "Whiteboard — Hbibo Board" },
      {
        property: "og:description",
        content: "Draw, write and organise ideas on an infinite canvas.",
      },
    ],
  }),
  component: BoardPage,
});

function BoardPage() {
  const { boardId } = Route.useParams();
  const navigate = useNavigate();
  const onHome = useCallback(() => {
    void navigate({ to: "/" });
  }, [navigate]);

  return <WhiteboardHost boardId={boardId} onHome={onHome} />;
}
