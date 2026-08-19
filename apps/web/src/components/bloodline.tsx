"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@spark/utils";

interface Activity {
  id: string; idea_id: string; type: string; content: string; created_at: string;
}

interface OffspringIdea {
  id: string; title: string; status: string; created_at: string;
}

interface Relationship {
  id: string; source_id: string; target_id: string; type: string;
  created_by: string; created_at: string;
}

interface BloodlineEvent {
  time: string;
  type: "capture" | "status" | "activity" | "relation" | "offspring" | "parent";
  label: string;
  detail?: string;
  ideaId?: string;
  iconColor: string;
}

const STATUS_LABELS: Record<string, string> = {
  seed: "种子", sprout: "萌芽", growing: "生长中",
  realized: "已实现", archived: "已归档", dormant: "休眠",
};

const ACTIVITY_LABELS: Record<string, string> = {
  capture: "捕获", status_change: "状态变更", importance_change: "调整重要程度",
  note: "笔记", research: "调研", discussion: "讨论",
  prototype: "原型", decision: "决策", reference: "参考", general: "活动",
};

const REL_LABELS: Record<string, string> = {
  related: "相关", conflict: "冲突", derived: "衍生", parent_child: "父子",
};

function EventIcon({ type }: { type: string }) {
  const s = 12;
  switch (type) {
    case "capture":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/></svg>;
    case "status":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>;
    case "relation":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 0 1 0 10h-2"/><path d="M8 12h8"/></svg>;
    case "offspring":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v6M12 22v-6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M22 12h-6"/></svg>;
    case "parent":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10M7 12h10M7 17h10"/></svg>;
    default:
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/></svg>;
  }
}

interface BloodlineProps {
  ideaId: string;
  createdAt: string;
  parentAId: string | null;
  parentBId: string | null;
  relationships: Relationship[];
  relIdeaTitles: Record<string, string>;
}

export default function BloodlineView({ ideaId, createdAt, parentAId, parentBId, relationships, relIdeaTitles }: BloodlineProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [offspring, setOffspring] = useState<OffspringIdea[]>([]);
  const [parentA, setParentA] = useState<OffspringIdea | null>(null);
  const [parentB, setParentB] = useState<OffspringIdea | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [actRes, offRes] = await Promise.all([
        fetch("/api/ideas/" + ideaId + "/activities").then(r => r.ok ? r.json() : []),
        fetch("/api/ideas?parent=" + ideaId + "&pageSize=50").then(r => r.ok ? r.json() : { ideas: [] }),
      ]);
      if (cancelled) return;
      setActivities(actRes);
      setOffspring(offRes.ideas ?? []);

      // Fetch parent idea titles if this is a hybrid
      if (parentAId) {
        const r = await fetch("/api/ideas/" + parentAId).then(r => r.ok ? r.json() : null);
        if (!cancelled && r) setParentA({ id: r.id, title: r.title, status: r.status, created_at: r.created_at });
      }
      if (parentBId) {
        const r = await fetch("/api/ideas/" + parentBId).then(r => r.ok ? r.json() : null);
        if (!cancelled && r) setParentB({ id: r.id, title: r.title, status: r.status, created_at: r.created_at });
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [ideaId, parentAId, parentBId]);

  // Build timeline events
  const events: BloodlineEvent[] = [];

  // Hybrid origins
  if (parentA) {
    events.push({
      time: parentA.created_at, type: "parent", label: "杂交亲本 A",
      detail: parentA.title, ideaId: parentA.id, iconColor: "text-violet-500",
    });
  }
  if (parentB) {
    events.push({
      time: parentB.created_at, type: "parent", label: "杂交亲本 B",
      detail: parentB.title, ideaId: parentB.id, iconColor: "text-violet-500",
    });
  }

  // Capture
  events.push({
    time: createdAt, type: "capture", label: "捕获", detail: "想法诞生", iconColor: "text-amber-500",
  });

  // Activities (status changes and key activities, excluding capture which we already added)
  for (const act of activities) {
    if (act.type === "capture") continue;
    events.push({
      time: act.created_at,
      type: act.type === "status_change" ? "status" : "activity",
      label: ACTIVITY_LABELS[act.type] || "活动",
      detail: act.content,
      iconColor: act.type === "status_change" ? "text-sky-500" : "text-neutral-400",
    });
  }

  // Relationships
  for (const rel of relationships) {
    const otherId = rel.source_id === ideaId ? rel.target_id : rel.source_id;
    const otherTitle = relIdeaTitles[otherId] || "未知想法";
    events.push({
      time: rel.created_at,
      type: "relation",
      label: "建立关联",
      detail: (REL_LABELS[rel.type] || rel.type) + " — " + otherTitle,
      ideaId: otherId,
      iconColor: "text-emerald-500",
    });
  }

  // Offspring
  for (const child of offspring) {
    events.push({
      time: child.created_at,
      type: "offspring",
      label: "杂交后代",
      detail: child.title,
      ideaId: child.id,
      iconColor: "text-rose-500",
    });
  }

  // Sort by time ascending
  events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  if (loading) return null;
  if (events.length <= 1) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>
        </svg>
        <span className="text-[12px] font-semibold text-[#404040]">想法血脉</span>
      </div>
      <div className="relative pl-5">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-0 bottom-0 w-px bg-[#e5e5e5]" />

        <div className="space-y-3">
          {events.map((evt, i) => (
            <div key={i} className="relative">
              {/* Node */}
              <div className={"absolute -left-5 top-0.5 flex h-[15px] w-[15px] items-center justify-center rounded-full bg-white ring-1 ring-[#e5e5e5] " + evt.iconColor}>
                <EventIcon type={evt.type} />
              </div>
              {/* Content */}
              <div className="pt-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-[#a3a3a3]">{evt.label}</span>
                  <span className="text-[10px] text-[#d4d4d4]">{formatRelativeTime(evt.time)}</span>
                </div>
                {evt.detail && (
                  evt.ideaId ? (
                    <button
                      onClick={() => router.push("/ideas/" + evt.ideaId)}
                      className="text-left text-[12px] text-[#525252] hover:text-amber-600 transition-colors line-clamp-2"
                    >
                      {evt.detail}
                    </button>
                  ) : (
                    <p className="text-[12px] text-[#525252] line-clamp-2">{evt.detail}</p>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
