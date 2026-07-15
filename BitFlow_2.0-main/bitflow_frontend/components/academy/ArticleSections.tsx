import type { AcademySection } from "@/lib/academy-types";

const CALLOUT_STYLES = {
  tip:     "border-phosphor/30 bg-phosphor/5 text-phosphor",
  warning: "border-warn/30 bg-warn/5 text-warn",
  note:    "border-info/30 bg-info/5 text-info",
};

const CALLOUT_LABELS = {
  tip:     "Tip",
  warning: "Warning",
  note:    "Note",
};

interface Props {
  sections: AcademySection[];
}

export default function ArticleSections({ sections }: Props) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <article key={section.id} id={section.id} className="scroll-mt-20">
          <h3 className="font-display text-[15px] font-bold text-bright mb-2">
            {section.heading}
          </h3>
          <p className="font-mono text-[11px] text-ghost/90 leading-relaxed">
            {section.body}
          </p>
          {section.bullets && section.bullets.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {section.bullets.map((bullet, i) => (
                <li
                  key={i}
                  className="font-mono text-[10px] text-pale flex gap-2 leading-relaxed"
                >
                  <span className="text-phosphor shrink-0">▸</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
          {section.callout && (
            <div
              className={`mt-3 px-3 py-2.5 rounded border font-mono text-[10px] leading-relaxed ${
                CALLOUT_STYLES[section.callout.type]
              }`}
            >
              <span className="font-bold uppercase text-[8px] tracking-wider mr-2">
                {CALLOUT_LABELS[section.callout.type]}
              </span>
              {section.callout.text}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
