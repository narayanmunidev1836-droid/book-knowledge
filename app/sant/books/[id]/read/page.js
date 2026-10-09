"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import PdfReader from "@/components/PdfReader";

export default function ReadBookPage() {
  const params = useParams();
  return (
    <Suspense fallback={null}>
      <PdfReader bookId={params?.id} />
    </Suspense>
  );
}
