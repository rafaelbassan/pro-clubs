import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-sm pt-16">
          <div className="skeleton h-[380px]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
