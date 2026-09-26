import Spinner from "@/components/Spinner";

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Spinner />
    </div>
  );
}
