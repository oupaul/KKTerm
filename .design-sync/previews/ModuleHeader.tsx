import {
  ModuleHeader,
  ModuleHeaderLead,
  ModuleIconTile,
  ModuleHeaderTitle,
  ModuleHeaderDivider,
  ModuleHeaderSpacer,
  DIcon,
  Btn,
} from "kkterm";

export const Workspace = () => (
  <ModuleHeader style={{ width: 540 }}>
    <ModuleHeaderLead>
      <ModuleIconTile module="workspace">
        <DIcon name="terminal" size={15} />
      </ModuleIconTile>
      <ModuleHeaderTitle as="span">Workspace</ModuleHeaderTitle>
    </ModuleHeaderLead>
    <ModuleHeaderDivider />
    <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 500 }}>
      3 active sessions
    </span>
    <ModuleHeaderSpacer />
    <Btn sm icon="plus">
      New Tab
    </Btn>
  </ModuleHeader>
);

export const Dashboard = () => (
  <ModuleHeader style={{ width: 540 }}>
    <ModuleHeaderLead>
      <ModuleIconTile module="dashboard">
        <DIcon name="dashboard" size={15} />
      </ModuleIconTile>
      <ModuleHeaderTitle as="span">Dashboard</ModuleHeaderTitle>
    </ModuleHeaderLead>
    <ModuleHeaderSpacer />
    <Btn sm icon="refresh">
      Refresh
    </Btn>
  </ModuleHeader>
);

export const Installer = () => (
  <ModuleHeader style={{ width: 540 }}>
    <ModuleHeaderLead>
      <ModuleIconTile module="installer" compact>
        <DIcon name="package" size={13} />
      </ModuleIconTile>
      <ModuleHeaderTitle as="span">Installer</ModuleHeaderTitle>
    </ModuleHeaderLead>
    <ModuleHeaderDivider />
    <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 500 }}>
      12 packages
    </span>
    <ModuleHeaderSpacer />
  </ModuleHeader>
);
