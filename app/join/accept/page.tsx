import { JoinAcceptClient } from "@/components/join/JoinAcceptClient";

export const dynamic = "force-dynamic";

export default function JoinAcceptPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-center px-6">
      <JoinAcceptClient />
    </div>
  );
}
