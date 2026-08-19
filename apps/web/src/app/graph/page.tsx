"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";

interface Idea {
  id: string; title: string; status: string; importance: number;
  collection: string; created_at: string; updated_at: string;
}

interface Relationship {
  id: string; source_id: string; target_id: string; type: string;
  created_by: string; ai_explanation: string | null;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string; title: string; status: string; importance: number; collection: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  type: string; created_by: string;
}

const STATUS_COLORS: Record<string, string> = {
  seed: "#f59e0b", sprout: "#10b981", growing: "#0ea5e9",
  realized: "#8b5cf6", archived: "#a3a3a3", dormant: "#78716c",
};
const STATUS_LABELS: Record<string, string> = {
  seed: "种子", sprout: "萌芽", growing: "生长中",
  realized: "已实现", archived: "已归档", dormant: "休眠",
};

const REL_STYLES: Record<string, { stroke: string; dash: string; width: number; label: string }> = {
  related: { stroke: "#d4d4d4", dash: "none", width: 1.5, label: "相关" },
  conflict: { stroke: "#ef4444", dash: "4 3", width: 1.5, label: "冲突" },
  derived: { stroke: "#f59e0b", dash: "none", width: 1.5, label: "衍生" },
  parent_child: { stroke: "#8b5cf6", dash: "none", width: 2.5, label: "父子" },
};

export default function GraphPage() {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterImportance, setFilterImportance] = useState<number[]>([]);
 const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/ideas?pageSize=100").then(r => r.ok ? r.json() : { ideas: [] }),
      fetch("/api/relationships").then(r => r.ok ? r.json() : []),
    ]).then(([data, rels]) => {
      setIdeas(data.ideas ?? []);
      setRelationships(Array.isArray(rels) ? rels : (rels?.relationships ?? []));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filteredIdeas = useMemo(() => ideas.filter(i => {
    if (filterStatus.length > 0 && !filterStatus.includes(i.status)) return false;
    if (filterImportance.length > 0 && !filterImportance.includes(i.importance)) return false;
    return true;
  }), [ideas, filterStatus, filterImportance]);

  const visibleIds = useMemo(() => new Set(filteredIdeas.map(i => i.id)), [filteredIdeas]);

  const nodes = useMemo<GraphNode[]>(() => filteredIdeas.map(i => ({
    id: i.id, title: i.title, status: i.status,
    importance: i.importance, collection: i.collection || "",
  })), [filteredIdeas]);

  const links = useMemo<GraphLink[]>(() => (Array.isArray(relationships) ? relationships : [])
    .filter(r => visibleIds.has(r.source_id) && visibleIds.has(r.target_id))
    .map(r => ({
      source: r.source_id, target: r.target_id,
      type: r.type, created_by: r.created_by,
    })), [relationships, visibleIds]);

  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    links.forEach(l => {
      const s = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
      ids.add(s); ids.add(t);
    });
    return ids;
  }, [links]);

  // D3 force simulation — built once per data/filter change
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current?.clientWidth ?? 800;
    const height = 550;

    const g = svg.append("g");

    // Zoom + pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => { g.attr("transform", event.transform); });
    svg.call(zoom);

    // Arrow marker for derived relationships
    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20).attr("refY", 0)
      .attr("markerWidth", 6).attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#f59e0b");

    // Simulation
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(d => {
          const style = REL_STYLES[(d as GraphLink).type] ?? REL_STYLES.related;
          return style.width > 2 ? 120 : 80;
        })
        .strength(0.3))
      .force("charge", d3.forceManyBody().strength(-180))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<GraphNode>().radius(d => 12 + d.importance * 4))
      .force("x", d3.forceX(width / 2).strength(0.04))
      .force("y", d3.forceY(height / 2).strength(0.04));

    // Links
    const linkSel = g.append("g")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", d => (REL_STYLES[d.type] ?? REL_STYLES.related).stroke)
      .attr("stroke-width", d => (REL_STYLES[d.type] ?? REL_STYLES.related).width)
      .attr("stroke-dasharray", d => {
        const dash = (REL_STYLES[d.type] ?? REL_STYLES.related).dash;
        return dash === "none" ? null : dash;
      })
      .attr("marker-end", d => d.type === "derived" ? "url(#arrow)" : null);

    // Nodes
    const nodeSel = g.append("g")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x; d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    // Node circle — size by importance, color by status, opacity for isolated
    nodeSel.append("circle")
      .attr("r", d => 8 + d.importance * 3)
      .attr("fill", d => STATUS_COLORS[d.status] ?? "#a3a3a3")
      .attr("fill-opacity", d => connectedIds.has(d.id) ? 1 : 0.3)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);

    // Node label
    nodeSel.append("text")
      .text(d => d.title.length > 12 ? d.title.slice(0, 11) + "\u2026" : d.title)
      .attr("x", d => 8 + d.importance * 3 + 4)
      .attr("y", 3)
      .attr("font-size", "10px")
      .attr("fill", "#404040")
      .attr("fill-opacity", d => connectedIds.has(d.id) ? 0.9 : 0.35)
      .style("pointer-events", "none");

    // Hover & click
    // D3-managed tooltip — avoids React re-renders that destabilize the force simulation
    const tooltip = d3.select(containerRef.current!)
      .append("div")
      .attr("class", "absolute bottom-3 left-3 rounded-[8px] bg-white px-3 py-2 shadow-lg ring-1 ring-[#e5e5e5] pointer-events-none max-w-[280px]")
      .style("opacity", 0)
      .style("transition", "opacity 0.15s");

    nodeSel
      .on("mouseenter", (_event, d) => {
        const color = STATUS_COLORS[d.status] ?? "#a3a3a3";
        const label = STATUS_LABELS[d.status] ?? d.status;
        tooltip.style("opacity", 1).html(
          `<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">` +
          `<span style="display:inline-block;height:8px;width:8px;border-radius:50%;background:${color}"></span>` +
          `<span style="font-size:12px;font-weight:500;color:#171717;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px">${d.title}</span>` +
          `</div>` +
          `<div style="display:flex;align-items:center;gap:12px;font-size:10px;color:#a3a3a3">` +
          `<span>${label}</span><span>重要程度 ${d.importance}</span>` +
          (d.collection ? `<span>${d.collection}</span>` : "") +
          `</div>`
        );
      })
      .on("mouseleave", () => tooltip.style("opacity", 0))
      .on("click", (_event, d) => router.push(`/ideas/${d.id}`));

    // Tick — update positions
    sim.on("tick", () => {
      linkSel
        .attr("x1", d => (d.source as GraphNode).x ?? 0)
        .attr("y1", d => (d.source as GraphNode).y ?? 0)
        .attr("x2", d => (d.target as GraphNode).x ?? 0)
        .attr("y2", d => (d.target as GraphNode).y ?? 0);
      nodeSel.attr("transform", d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      sim.stop();
      svg.selectAll("*").remove();
      tooltip.remove();
    };
  }, [nodes, links, connectedIds, router]);

  const toggleStatus = (s: string) => {
    setFilterStatus(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };
  const toggleImportance = (v: number) => {
    setFilterImportance(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <div ref={filterRef}>
      {/* Header */}
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1 text-[12px] text-[#a3a3a3] hover:text-[#737373] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
            </svg>
            返回
          </button>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/>
              <path d="M6 8v4a2 2 0 0 0 2 2h4"/><path d="M18 8v4a2 2 0 0 1-2 2h-4"/><path d="M12 16v-2"/>
            </svg>
            <h1 className="text-[15px] font-semibold tracking-tight text-[#171717]">想法图谱</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              showFilters || filterStatus.length > 0 || filterImportance.length > 0
                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200/50"
                : "text-[#a3a3a3] hover:bg-[#f5f5f5]"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/><path d="M7 12h10"/><path d="M11 18h2"/>
            </svg>
            筛选
          </button>
          <span className="text-[11px] text-[#a3a3a3] tabular-nums">
            {nodes.length} 节点 · {links.length} 连接
          </span>
        </div>
      </header>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 rounded-[10px] bg-[#fafafa] p-3 ring-1 ring-[#f0f0f0] animate-slide-down">
          <div className="mb-2.5">
            <span className="text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mr-2">状态</span>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <button
                key={val}
                onClick={() => toggleStatus(val)}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-colors mr-1 mb-1 ${
                  filterStatus.includes(val)
                    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200/50"
                    : "bg-white text-[#a3a3a3] ring-1 ring-[#e5e5e5]"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLORS[val] }} />
                {label}
              </button>
            ))}
          </div>
          <div>
            <span className="text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mr-2">重要程度</span>
            {[
              { v: 0, l: "未评级" }, { v: 1, l: "灵感碎片" },
              { v: 2, l: "有意思" }, { v: 3, l: "想做" }, { v: 4, l: "必做" },
            ].map(({ v, l }) => (
              <button
                key={v}
                onClick={() => toggleImportance(v)}
                className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium transition-colors mr-1 mb-1 ${
                  filterImportance.includes(v)
                    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200/50"
                    : "bg-white text-[#a3a3a3] ring-1 ring-[#e5e5e5]"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Graph canvas */}
      <div ref={containerRef} className="relative rounded-[10px] bg-white ring-1 ring-[#f0f0f0] overflow-hidden" style={{ minHeight: 550 }}>
        {loading ? (
          <div className="flex h-[550px] items-center justify-center">
            <div className="text-[13px] text-[#a3a3a3]">加载中…</div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex h-[550px] flex-col items-center justify-center gap-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/>
              <path d="M6 8v4a2 2 0 0 0 2 2h4"/><path d="M18 8v4a2 2 0 0 1-2 2h-4"/>
            </svg>
            <p className="text-[13px] text-[#a3a3a3]">还没有想法，先去捕获一些吧</p>
          </div>
        ) : links.length === 0 ? (
          <div className="flex h-[550px] flex-col items-center justify-center gap-2">
            <p className="text-[13px] text-[#a3a3a3]">还没有关联</p>
            <p className="text-[12px] text-[#d4d4d4]">试试 AI 连接器或手动添加关联</p>
          </div>
        ) : (
         <svg ref={svgRef} className="w-full" style={{ height: 550 }} />
       )}

      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {Object.entries(STATUS_LABELS).map(([val, label]) => (
          <div key={val} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[val] }} />
            <span className="text-[10px] text-[#a3a3a3]">{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {Object.entries(REL_STYLES).map(([key, style]) => (
          <div key={key} className="flex items-center gap-1.5">
            <svg width="20" height="6">
              <line x1="0" y1="3" x2="20" y2="3" stroke={style.stroke} strokeWidth={style.width}
                strokeDasharray={style.dash === "none" ? undefined : style.dash} />
            </svg>
            <span className="text-[10px] text-[#a3a3a3]">{style.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#d4d4d4]/30 ring-1 ring-[#e5e5e5]" />
          <span className="text-[10px] text-[#a3a3a3]">孤立想法</span>
        </div>
      </div>
    </div>
  );
}
