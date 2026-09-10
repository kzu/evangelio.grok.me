export function MarkCross({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <rect x="6.25" y="0" width="3.5" height="24" rx="0.4" />
      <rect x="0" y="5.5" width="16" height="3.5" rx="0.4" />
    </svg>
  );
}
