"use client";

import { useParams } from "next/navigation";
import TopicEntries from "@/components/TopicEntries";

export default function TopicDetailPage() {
  const params = useParams();
  return <TopicEntries topicId={params?.id} />;
}
