import * as Icons from "lucide-react";
import { Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ariaPressed } from "../lib/aria";
import {
  materialIconRefForId,
  searchMaterialIcons,
  type MaterialIconSearchItem,
} from "../lib/iconCatalog";
import { materialIconUrlForId } from "../lib/iconCatalogUrls";

const DEFAULT_MATERIAL_RESULT_LIMIT = 180;

type LucideIcon = React.ComponentType<{ size?: number; width?: number; height?: number }>;

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
  lucideNames,
  lucideValueForName = (name) => name,
  materialResultLimit = DEFAULT_MATERIAL_RESULT_LIMIT,
  onSelect,
  savedImageDataUrls = [],
  savedImageLabelForIndex = (index) => String(index + 1),
  staticOptions: extraStaticOptions = [],
  value,
}: {
  className?: string;
  defaultOption?: IconLibraryStaticOption;
  emptyHint?: string;
  lucideNames: readonly string[];
  lucideValueForName?: (name: string) => string;
  materialResultLimit?: number;
  onSelect: (value: string | null) => void;
  savedImageDataUrls?: readonly string[];
  savedImageLabelForIndex?: (index: number) => string;
  staticOptions?: readonly IconLibraryStaticOption[];
  value: string | null;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const visibleBaseOptions = useMemo(
    () => createStaticOptions({
      defaultOption,
      lucideNames,
      lucideValueForName,
      savedImageDataUrls,
      savedImageLabelForIndex,
      staticOptions: extraStaticOptions,
    }),
    [defaultOption, lucideNames, lucideValueForName, savedImageDataUrls, savedImageLabelForIndex, extraStaticOptions],
  );
  const visibleStaticOptions = useMemo(
    () => filterStaticOptions(visibleBaseOptions, query),
    [query, visibleBaseOptions],
  );
  const materialOptions = useMemo(
    () => searchMaterialIcons(query, materialResultLimit),
    [materialResultLimit, query],
  );
  const hasResults = visibleStaticOptions.length > 0 || materialOptions.length > 0;

  return (
    <div className={`icon-library-picker ${className}`.trim()}>
      <label className="search-box icon-library-search">
        <Search size={14} />
        <input
          aria-label={t("common.search")}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("common.search")}
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
  lucideNames,
  lucideValueForName,
  savedImageDataUrls,
  savedImageLabelForIndex,
  staticOptions,
}: {
  defaultOption?: IconLibraryStaticOption;
  lucideNames: readonly string[];
  lucideValueForName: (name: string) => string;
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
    ...lucideNames.map((name) => {
      const Icon = (Icons as unknown as Record<string, LucideIcon | undefined>)[name];
      return {
        value: lucideValueForName(name),
        label: name,
        keywords: splitIconName(name),
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

function filterStaticOptions(options: readonly IconLibraryStaticOption[], query: string) {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) {
    return options;
  }
  return options.filter((option) => {
    const searchText = [option.label, ...(option.keywords ?? [])].join(" ").toLowerCase();
    return tokens.every((token) => searchText.includes(token));
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

function splitIconName(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/\s+/)
    .filter(Boolean);
}
