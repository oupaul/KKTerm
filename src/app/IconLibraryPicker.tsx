import { Search } from "../lib/reicon";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ariaPressed } from "../lib/aria";
import {
  getReiconIconComponent,
  iconKeywordsForName,
  iconLabelForName,
} from "../lib/reiconCatalog";
import {
  materialIconRefForId,
  searchMaterialIcons,
  type MaterialIconSearchItem,
} from "../lib/iconCatalog";
import { materialIconUrlForId } from "../lib/iconCatalogUrls";
import { buildIconSearchGroups, iconSearchGroupsMatch } from "../lib/iconSearchAliases";

const DEFAULT_MATERIAL_RESULT_LIMIT = 180;

export type IconLibraryStaticOption = {
  value: string | null;
  label: string;
  keywords?: string[];
  icon: ReactNode;
};

export function IconLibraryPicker({
  className = "",
  defaultOption,
  emptyHint,
  iconNames,
  iconValueForName = (name) => name,
  materialResultLimit = DEFAULT_MATERIAL_RESULT_LIMIT,
  onSelect,
  savedImageDataUrls = [],
  savedImageLabelForIndex = (index) => String(index + 1),
  searchPlaceholder,
  staticOptions: extraStaticOptions = [],
  value,
}: {
  className?: string;
  defaultOption?: IconLibraryStaticOption;
  emptyHint?: string;
  iconNames: readonly string[];
  iconValueForName?: (name: string) => string;
  materialResultLimit?: number;
  onSelect: (value: string | null) => void;
  savedImageDataUrls?: readonly string[];
  savedImageLabelForIndex?: (index: number) => string;
  searchPlaceholder?: string;
  staticOptions?: readonly IconLibraryStaticOption[];
  value: string | null;
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [query, setQuery] = useState("");
  const visibleBaseOptions = useMemo(
    () => createStaticOptions({
      defaultOption,
      iconNames,
      iconValueForName,
      savedImageDataUrls,
      savedImageLabelForIndex,
      staticOptions: extraStaticOptions,
    }),
    [defaultOption, iconNames, iconValueForName, savedImageDataUrls, savedImageLabelForIndex, extraStaticOptions],
  );
  const visibleStaticOptions = useMemo(
    () => filterStaticOptions(visibleBaseOptions, query, language),
    [language, query, visibleBaseOptions],
  );
  const materialOptions = useMemo(
    () => searchMaterialIcons(query, materialResultLimit, language),
    [language, materialResultLimit, query],
  );
  const hasResults = visibleStaticOptions.length > 0 || materialOptions.length > 0;

  return (
    <div className={`icon-library-picker ${className}`.trim()}>
      <label className="search-box icon-library-search">
        <Search size={14} />
        <input
          aria-label={t("common.search")}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder ?? t("common.search")}
          type="search"
          value={query}
        />
      </label>
      <div className="connection-icon-grid icon-library-grid">
        {visibleStaticOptions.map((option) => (
          <IconLibraryButton
            active={value === option.value}
            icon={option.icon}
            key={option.value ?? "__default"}
            label={option.label}
            onClick={() => onSelect(option.value)}
          />
        ))}
        {materialOptions.map((icon) => (
          <MaterialIconButton
            active={value === materialIconRefForId(icon.id)}
            icon={icon}
            key={icon.id}
            onSelect={onSelect}
          />
        ))}
      </div>
      {!hasResults && emptyHint ? <p className="icon-library-empty">{emptyHint}</p> : null}
    </div>
  );
}

function createStaticOptions({
  defaultOption,
  iconNames,
  iconValueForName,
  savedImageDataUrls,
  savedImageLabelForIndex,
  staticOptions,
}: {
  defaultOption?: IconLibraryStaticOption;
  iconNames: readonly string[];
  iconValueForName: (name: string) => string;
  savedImageDataUrls: readonly string[];
  savedImageLabelForIndex: (index: number) => string;
  staticOptions: readonly IconLibraryStaticOption[];
}) {
  const options: IconLibraryStaticOption[] = [];
  if (defaultOption) {
    options.push(defaultOption);
  }
  options.push(...staticOptions);
  options.push(
    ...iconNames.map((name) => {
      const Icon = getReiconIconComponent(name);
      return {
        value: iconValueForName(name),
        label: iconLabelForName(name),
        keywords: iconKeywordsForName(name),
        icon: Icon ? <Icon size={20} /> : null,
      };
    }),
  );
  options.push(
    ...savedImageDataUrls.map((dataUrl, index) => ({
      value: dataUrl,
      label: savedImageLabelForIndex(index),
      keywords: ["saved", "image", String(index + 1)],
      icon: <img alt="" aria-hidden="true" draggable={false} src={dataUrl} />,
    })),
  );
  return options.filter((option) => option.icon !== null);
}

function filterStaticOptions(
  options: readonly IconLibraryStaticOption[],
  query: string,
  language?: string,
) {
  const groups = buildIconSearchGroups(query, language);
  if (groups.length === 0) {
    return options;
  }
  return options.filter((option) => {
    const searchText = [option.label, ...(option.keywords ?? [])].join(" ").toLowerCase();
    return iconSearchGroupsMatch(searchText, groups);
  });
}

function MaterialIconButton({
  active,
  icon,
  onSelect,
}: {
  active: boolean;
  icon: MaterialIconSearchItem;
  onSelect: (value: string) => void;
}) {
  const src = materialIconUrlForId(icon.id);
  if (!src) {
    return null;
  }
  return (
    <IconLibraryButton
      active={active}
      icon={<img alt="" aria-hidden="true" draggable={false} src={src} />}
      label={icon.label}
      onClick={() => onSelect(materialIconRefForId(icon.id))}
    />
  );
}

function IconLibraryButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="connection-icon-choice"
      onClick={onClick}
      title={label}
      type="button"
      {...ariaPressed(active)}
    >
      {icon}
    </button>
  );
}
