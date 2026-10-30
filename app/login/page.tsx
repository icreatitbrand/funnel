import { LoginForm } from "@/components/LoginForm";

export const metadata = {
  title: "Sign In",
  description:
    "Sign in to your AI Foundry dashboard with the code sent to your email.",
};

export default function LoginPage() {
  return <LoginForm />;
}
