// Finder-style commit context menu. Item list is supplied by the parent so the
// same component renders for any commit with the right wired actions.
import { GitIcon, type GitIconName } from "./GitIcon";

export interface CommitMenuItem {
  icon: GitIconName;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

export function GitCommitMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: (CommitMenuItem | null)[];
  onClose: () => void;
}) {
  return (
    <>
      <div
        className="git-ctx-backdrop"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div className="git-ctx-menu" style={{ left: x, top: y }}>
        {items.map((item, i) =>
          item === null ? (
            <div key={i} className="sep" />
          ) : (
            <button
              key={i}
              type="button"
              className={item.danger ? "danger" : undefined}
              onClick={() => {
                item.onClick();
                onClose();
              }}
            >
              <span className="gl"><GitIcon name={item.icon} size={15} /></span>
              {item.label}
            </button>
          ),
        )}
      </div>
    </>
  );
}
