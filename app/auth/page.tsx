import { SignupForm } from "@/components/SignupForm";

export const metadata = {
  title: "Sign Up",
  description:
    "Sign up for the free AI Foundry and Grant Winning Course. Email verification is required.",
};

export default function AuthPage() {
  return <SignupForm />;
}
