/** A small stacked fraction for buttons and sentences. */
export function InlineFraction({ n, d }: { n: number; d: number }) {
  return (
    <span className="inline-flex flex-col items-center leading-none align-middle text-[0.8em]" aria-label={`${n} over ${d}`}>
      <span>{n}</span>
      <span className="h-0.5 w-full min-w-3 bg-current rounded-full my-px" aria-hidden="true" />
      <span>{d}</span>
    </span>
  );
}
