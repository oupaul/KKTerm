// Automations tab — list of durable trigger→condition→actions rules plus a
// read-only flow builder. Ported from the redesign mockup
// (itops-automations.jsx). Phase 0 renders against the placeholder fixtures in
// data.ts; Phase 3 re-homes the live WatchdogDetail view here and wires durable
// Automations (see docs/ITOPS.md).

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ItIcon, IT_ACCENTS, type ItIconName } from "./icons";
import {
  AUTOMATIONS,
  BUILDER_AUTOMATION,
  type Automation,
  type BuilderActionKind,
} from "./data";

const ACT_ICON: Record<BuilderActionKind, ItIconName> = {
  bell: "bell",
  mail: "mail",
  run: "run",
  bot: "bot",
  popup: "popup",
  webhook: "webhook",
};
const ACT_COLOR: Record<BuilderActionKind, string> = {
  bell: IT_ACCENTS.blue,
  mail: IT_ACCENTS.green,
  run: IT_ACCENTS.orange,
  bot: IT_ACCENTS.purple,
  popup: IT_ACCENTS.teal,
  webhook: IT_ACCENTS.indigo,
};

function AutoRow({ a, onOpen }: { a: Automation; onOpen: () => void }) {
  const { t } = useTranslation();
  const [on, setOn] = useState(a.enabled);
  return (
    <div
      className={`au-row${on ? "" : " off"}`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <span className="tile" style={{ background: a.trigColor }}>
        <ItIcon name={a.trigKind} size={17} sw={1.6} />
      </span>
      <div className="au-main">
        <span className="nm">{a.name}</span>
        <span className="au-flow">
          <span>{a.trigger}</span>
          {a.cond ? (
            <>
              <span className="arrow">
                <ItIcon name="chevR" size={12} />
              </span>
              <span className="cond">{a.cond}</span>
            </>
          ) : null}
          <span className="arrow">
            <ItIcon name="arrow" size={13} />
          </span>
          <span className="au-acts">
            {a.actions.map((act, i) => (
              <span key={i} className="a" style={{ background: ACT_COLOR[act] }}>
                <ItIcon name={ACT_ICON[act]} size={12} sw={1.7} />
              </span>
            ))}
          </span>
        </span>
      </div>
      <div className="au-side">
        <button
          type="button"
          className="au-toggle"
          data-on={on ? "1" : "0"}
          title={on ? t("itops.automations.armed") : t("itops.automations.disabled")}
          aria-label={on ? t("itops.automations.armed") : t("itops.automations.disabled")}
          onClick={(e) => {
            e.stopPropagation();
            setOn((v) => !v);
          }}
        >
          <i />
        </button>
        <span className={`au-fired${on && a.fired.includes("armed") ? " armed" : ""}`}>
          {a.fired}
        </span>
      </div>
    </div>
  );
}

function AutomationBuilder({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const a = BUILDER_AUTOMATION;
  return (
    <div className="bld">
      <button type="button" className="bld-back" onClick={onBack}>
        <ItIcon name="chevR" size={14} />
        {t("itops.automations.builder.back")}
      </button>

      <div className="bld-titlerow">
        <span className="tile" style={{ background: a.trigger.color }}>
          <ItIcon name={a.trigger.kind} size={21} sw={1.6} />
        </span>
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <div className="nm">{a.name}</div>
          <div className="st">
            <span className="d" />
            {t("itops.automations.builder.armedStatus")}
          </div>
        </div>
        <button type="button" className="it-icon-btn" title={t("itops.actions.more")}>
          <ItIcon name="dots" size={16} />
        </button>
        <button type="button" className="it-btn">
          <span className="it-btn-ic">
            <ItIcon name="check" size={14} sw={2.3} />
          </span>
          {t("itops.actions.save")}
        </button>
      </div>

      {/* TRIGGER */}
      <div className="stage">
        <span className="stage-dot filled">
          <i />
        </span>
        <div className="stage-kicker">{t("itops.automations.builder.whenTrigger")}</div>
        <div className="bld-card">
          <span className="tile" style={{ background: a.trigger.color }}>
            <ItIcon name={a.trigger.kind} size={18} sw={1.6} />
          </span>
          <div className="bld-card-txt">
            <div className="t">
              {a.trigger.label} · {a.trigger.detail}
            </div>
            <div className="d">{t("itops.automations.builder.target", { target: a.trigger.target })}</div>
          </div>
          <span className="meta-pill">{a.trigger.poll}</span>
        </div>
      </div>

      {/* CONDITION */}
      <div className="stage">
        <span className="stage-dot filled">
          <i />
        </span>
        <div className="stage-kicker">{t("itops.automations.builder.onlyIfCondition")}</div>
        <div className="cond-card">
          <span className="lhs">{t("itops.automations.builder.sampledValue")}</span>
          <span className="op">{a.condition.label}</span>
          <span className="rhs">
            {a.condition.value}
            {a.condition.unit}
          </span>
          <span className="note">{t("itops.automations.builder.evaluatedBy")}</span>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="stage">
        <span className="stage-dot filled">
          <i />
        </span>
        <div className="stage-kicker">{t("itops.automations.builder.thenActions")}</div>
        <div className="stage-cards">
          {a.actions.map((act, i) => (
            <div key={i} className="bld-card">
              <span className="grab">
                <ItIcon name="grip" size={16} />
              </span>
              <span className="tile" style={{ background: act.color }}>
                <ItIcon name={act.kind} size={17} sw={1.6} />
              </span>
              <div className="bld-card-txt">
                <div className="t">{act.label}</div>
                <div className="d">{act.detail}</div>
              </div>
              <span className="meta-pill">{i + 1}</span>
            </div>
          ))}
          <button type="button" className="bld-add">
            <ItIcon name="plus" size={14} />
            {t("itops.actions.addAction")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AutomationsTab({ empty }: { empty: boolean }) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);

  if (empty) {
    return (
      <div className="it-empty">
        <span className="glyph">
          <ItIcon name="auto" size={28} sw={1.6} />
        </span>
        <h2>{t("itops.automations.emptyTitle")}</h2>
        <p>{t("itops.automations.emptyBody")}</p>
        <button type="button" className="it-btn primary">
          <span className="it-btn-ic">
            <ItIcon name="plus" size={15} />
          </span>
          {t("itops.actions.newAutomation")}
        </button>
      </div>
    );
  }

  if (openId) {
    return <AutomationBuilder onBack={() => setOpenId(null)} />;
  }

  return (
    <div className="au">
      <div className="au-list">
        {AUTOMATIONS.map((a) => (
          <AutoRow key={a.id} a={a} onOpen={() => setOpenId(a.id)} />
        ))}
      </div>
    </div>
  );
}
