import { CATALOG_GROUPS, getCatalogGroup } from "./catalogModel";

const expectedGroups: readonly ["builtIn", "custom"] = CATALOG_GROUPS;
const builtInGroup: "builtIn" = getCatalogGroup({ isCustom: false });
const customGroup: "custom" = getCatalogGroup({ isCustom: true });

void expectedGroups;
void builtInGroup;
void customGroup;
