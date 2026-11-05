import { Button } from "@/components/ui/button";
import { signInWithApple, signInWithGoogle } from "@/lib/actions";

export function SocialAuth() {
  return (
    <div className="grid gap-2">
      <form action={signInWithApple}>
        <Button variant="outline" className="h-11 w-full bg-card" type="submit">
          Continue with Apple
        </Button>
      </form>
      <form action={signInWithGoogle}>
        <Button variant="outline" className="h-11 w-full bg-card" type="submit">
          Continue with Google
        </Button>
      </form>
    </div>
  );
}
