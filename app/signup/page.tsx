import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col px-6 py-5">
      <Link href="/signin" aria-label="Back" className="text-ink hover:text-primary transition-colors">
        <ArrowLeft size={22} />
      </Link>
      <div className="flex flex-1 flex-col justify-center py-6">
        <SignUpForm />
      </div>
    </div>
  );
}
