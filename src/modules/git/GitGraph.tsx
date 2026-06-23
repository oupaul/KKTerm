// GitKraken-style commit graph: SVG lane routing + commit rows. Ported from the
// redesign mockup (`git-graph.jsx`) and adapted to real history (computed lanes,
// derived author avatars, i18n column headers).
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { GitRef, GraphCommit } from "./gitTypes";
import {
  authorColor,
  authorInitials,
  type GitTheme,
  type LaneColorMode,
  laneColor,
  lanePalette,
} from "./gitPalette";
import { GitIcon } from "./GitIcon";

const LANE_W = 22;
const PAD = 16;

export function Avatar({
  name,
  email,
  large,
}: {
  name: string;
  email: string;
  large?: boolean;
}) {
  return (
    <span
      className={large ? "git-avatar lg" : "git-avatar"}
      style={{ background: authorColor(name, email) }}
    >
      {authorInitials(name)}
    </span>
  );
}

function RefBadge({ refData, color }: { refData: GitRef; color: string }) {
  if (refData.type === "head") {
    return (
      <span className="git-ref head" style={{ background: color }}>
        <span className="gl"><GitIcon name="branch" size={12} /></span>
        {refData.name}
      </span>
    );
  }
  if (refData.type === "remote") {
    return (
      <span className="git-ref remote">
        <span className="gl"><GitIcon name="remote" size={12} /></span>
        {refData.name}
      </span>
    );
  }
  if (refData.type === "tag") {
    return (
      <span className="git-ref tag">
        <span className="gl"><GitIcon name="tag" size={11} /></span>
        {refData.name}
      </span>
    );
  }
  return (
    <span className="git-ref branch">
      <span className="gl" style={{ color }}><GitIcon name="branch" size={12} /></span>
      {refData.name}
    </span>
  );
}

interface GraphNode extends Partial<GraphCommit> {
  row: number;
  lane: number;
  wt?: boolean;
  parents: string[];
}

export function GitGraph({
  commits,
  selectedId,
  onSelect,
  onContext,
  theme,
  colorMode,
  rowH,
  showWorkingTree,
  workingTreeSelected,
  onSelectWorkingTree,
}: {
  commits: GraphCommit[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContext: (event: React.MouseEvent, commit: GraphCommit) => void;
  theme: GitTheme;
  colorMode: LaneColorMode;
  rowH: number;
  showWorkingTree: boolean;
  workingTreeSelected: boolean;
  onSelectWorkingTree: () => void;
}) {
  const { t } = useTranslation();
  const palette = lanePalette(colorMode, theme);
  const haloBg = theme === "dark" ? "#1e1e1f" : "#ffffff";

  const layout = useMemo(() => {
    const nodes: GraphNode[] = [];
    const byId: Record<string, GraphNode> = {};
    let row = 0;
    const headLane = commits[0]?.lane ?? 0;
    if (showWorkingTree) {
      nodes.push({ wt: true, lane: headLane, row: 0, parents: commits[0] ? [commits[0].id] : [] });
      row = 1;
    }
    for (const commit of commits) {
      const node: GraphNode = { ...commit, row, parents: commit.parents };
      byId[commit.id] = node;
      nodes.push(node);
      row += 1;
    }
    const maxLane = nodes.reduce((m, n) => Math.max(m, n.lane), 0);
    const graphW = PAD + (maxLane + 1) * LANE_W + 4;
    const totalH = nodes.length * rowH;
    const laneX = (lane: number) => PAD + lane * LANE_W;
    const nodeY = (r: number) => r * rowH + rowH / 2;

    const edges: { d: string; color: string; dashed: boolean }[] = [];
    for (const node of nodes) {
      const x1 = laneX(node.lane);
      const y1 = nodeY(node.row);
      node.parents.forEach((pid, k) => {
        const parent = byId[pid];
        if (!parent) {
          return;
        }
        const x2 = laneX(parent.lane);
        const y2 = nodeY(parent.row);
        const color = laneColor(Math.max(node.lane, parent.lane), palette);
        let d: string;
        if (node.lane === parent.lane) {
          d = `M${x1} ${y1} L${x2} ${y2}`;
        } else {
          const kk = Math.min(rowH, y2 - y1);
          if (k > 0) {
            // merge: bend near the child, then travel straight in the parent lane
            d = `M${x1} ${y1} C${x1} ${y1 + kk * 0.45} ${x2} ${y1 + kk * 0.55} ${x2} ${y1 + kk} L${x2} ${y2}`;
          } else {
            // branch / lane shift: travel in the child lane, bend near the parent
            d = `M${x1} ${y1} L${x1} ${y2 - kk} C${x1} ${y2 - kk * 0.45} ${x2} ${y2 - kk * 0.55} ${x2} ${y2}`;
          }
        }
        edges.push({ d, color, dashed: Boolean(node.wt) });
      });
    }

    return { nodes, edges, graphW, totalH, laneX, nodeY };
  }, [commits, showWorkingTree, rowH, palette]);

  const { nodes, edges, graphW, totalH, laneX, nodeY } = layout;

  return (
    <div className="git-graph-wrap">
      <div className="git-graph-colhead">
        <div className="c-msg" style={{ paddingLeft: graphW }}>{t("git.columnCommit")}</div>
        <div className="c-author">{t("git.columnAuthor")}</div>
        <div className="c-sha">{t("git.columnSha")}</div>
        <div className="c-date">{t("git.columnWhen")}</div>
      </div>
      <div className="git-graph-scroll" style={{ ["--git-row-h" as string]: `${rowH}px` }}>
        <svg
          className="git-graph-canvas"
          width={graphW}
          height={totalH}
          viewBox={`0 0 ${graphW} ${totalH}`}
        >
          {edges.map((edge, i) => (
            <path
              key={i}
              d={edge.d}
              fill="none"
              stroke={edge.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={edge.dashed ? "3 3.5" : undefined}
              opacity={edge.dashed ? 0.85 : 1}
            />
          ))}
          {nodes.map((node, i) => {
            const cx = laneX(node.lane);
            const cy = nodeY(node.row);
            const color = laneColor(node.lane, palette);
            if (node.wt) {
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="5"
                  fill={haloBg}
                  stroke={color}
                  strokeWidth="1.6"
                  strokeDasharray="2.4 2.4"
                />
              );
            }
            const isMerge = node.parents.length > 1;
            const isHead = (node.refs ?? []).some((r) => r.type === "head");
            return (
              <g key={i}>
                {isHead ? (
                  <circle cx={cx} cy={cy} r="9" fill="none" stroke={color} strokeWidth="1.6" opacity="0.45" />
                ) : null}
                <circle cx={cx} cy={cy} r={isMerge ? 6 : 5.5} fill={color} stroke={haloBg} strokeWidth="1.6" />
                {isMerge ? <circle cx={cx} cy={cy} r="2.3" fill={haloBg} /> : null}
              </g>
            );
          })}
        </svg>

        <div className="git-commit-rows">
          {showWorkingTree ? (
            <div
              className={`git-commit-row wt${workingTreeSelected ? " sel" : ""}`}
              style={{ paddingLeft: graphW }}
              onClick={onSelectWorkingTree}
            >
              <span className="git-wt-badge"><GitIcon name="pencil" size={12} /> {t("git.workingTree")}</span>
              <div className="c-msg">{t("git.uncommittedChanges")}</div>
              <div className="c-author" />
              <div className="c-sha">—</div>
              <div className="c-date">{t("git.now")}</div>
            </div>
          ) : null}
          {commits.map((commit) => {
            const color = laneColor(commit.lane, palette);
            const selected = commit.id === selectedId && !workingTreeSelected;
            return (
              <div
                key={commit.id}
                className={`git-commit-row${selected ? " sel" : ""}`}
                style={{ paddingLeft: graphW }}
                onClick={() => onSelect(commit.id)}
                onContextMenu={(event) => onContext(event, commit)}
              >
                {commit.refs.length > 0 ? (
                  <span className="git-refs">
                    {commit.refs.map((refData, i) => (
                      <RefBadge key={i} refData={refData} color={color} />
                    ))}
                  </span>
                ) : null}
                <div className="c-msg">{commit.subject}</div>
                <div className="c-author">
                  <Avatar name={commit.authorName} email={commit.authorEmail} />
                  <span className="nm">{commit.authorName}</span>
                </div>
                <div className="c-sha">{commit.shortId}</div>
                <div className="c-date">{commit.when}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
