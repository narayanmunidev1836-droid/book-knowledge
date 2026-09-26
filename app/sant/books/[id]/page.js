"use client";

import { useParams } from "next/navigation";
import BookEntries from "@/components/BookEntries";

export default function BookDetailPage() {
  const params = useParams();
  return <BookEntries bookId={params?.id} />;
}
