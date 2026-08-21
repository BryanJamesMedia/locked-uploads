export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-lg font-semibold tracking-tight text-slate-900">Locked Uploads</p>
          <p className="text-sm text-slate-500">Sell any file through a shareable link.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
