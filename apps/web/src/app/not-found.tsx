import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-5 py-24">
      <h1 className="font-display text-5xl tracking-tight">That page is not here.</h1>
      <Link href="/" className="text-primary">
        Back to Built by Liv
      </Link>
    </main>
  );
}
