export default function ExpiredPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10 text-center">
      <h1 className="text-xl font-semibold text-slate-900">This download link has expired</h1>
      <p className="mt-2 text-sm text-slate-600">
        Download links stay active for 24 hours and allow a limited number of downloads per file.
        Contact the seller you bought from and they can send you a fresh link straight away.
      </p>
    </main>
  );
}
