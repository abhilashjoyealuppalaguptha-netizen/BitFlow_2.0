import type { AcademyVideo } from "@/lib/academy-types";

interface Props {
  videos: AcademyVideo[];
}

export default function VideoList({ videos }: Props) {
  if (videos.length === 0) return null;

  return (
    <div className="space-y-2">
      {videos.map((v) => (
        <a
          key={v.id}
          href={v.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 px-3 py-2.5 rounded border border-rim/40 bg-surface/30 hover:border-info/40 hover:bg-surface/60 transition-all"
        >
          <span className="shrink-0 w-8 h-8 rounded bg-danger/15 border border-danger/30 flex items-center justify-center text-danger text-sm">
            ▶
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] text-bright group-hover:text-info transition-colors truncate">
              {v.title}
            </p>
            <p className="font-mono text-[8px] text-dim mt-0.5">
              {v.channel}
              {v.duration && <span className="mx-1">·</span>}
              {v.duration}
            </p>
          </div>
          <svg
            viewBox="0 0 8 8"
            className="w-2 h-2 text-dim/40 group-hover:text-info shrink-0 fill-none stroke-current"
            strokeWidth="1.2"
          >
            <path d="M1 4h6M4 1l3 3-3 3" />
          </svg>
        </a>
      ))}
    </div>
  );
}
