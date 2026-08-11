export default function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
        <p className="text-sm text-gray-500">Loading BIOATTEND…</p>
      </div>
    </div>
  );
}
