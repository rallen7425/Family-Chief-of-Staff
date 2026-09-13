import { SignInForm } from "@/components/auth/SignInForm";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-center px-6 py-10">
      <SignInForm />
    </div>
  );
}
