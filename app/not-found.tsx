import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-5 px-6">
      <p className="text-sm font-medium text-fd-primary">404</p>
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="text-fd-muted-foreground">This page may have moved or is no longer available.</p>
      <Link className="font-medium text-fd-primary underline underline-offset-4" href="/guides/quickstart">Go to the quickstart →</Link>
    </main>
  );
}
