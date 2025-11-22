export default function Logo({
  className = "h-7 w-auto",
}: {
  className?: string;
}) {
  return (
    <div
      className={`font-semibold tracking-tight flex items-center gap-1 ${className}`}
    >
      <span className="text-brand-500">S A M I</span>
      {/* <span className="text-xs uppercase rounded bg-brand-500/10 px-1.5 py-0.5 text-brand-400">
        AI
      </span> */}
    </div>
  );
}
