"use client";

import { GlobeIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { enUS, zhCN, ja, ko, type Locale } from "@/core/i18n";
import { useI18n } from "@/core/i18n/hooks";

const languageOptions: { value: Locale; label: string }[] = [
  { value: "en-US", label: enUS.locale.localName },
  { value: "zh-CN", label: zhCN.locale.localName },
  { value: "ja", label: ja.locale.localName },
  { value: "ko", label: ko.locale.localName },
];

export function AuthLocaleSwitcher() {
  const { locale, changeLocale } = useI18n();

  return (
    <Select
      value={locale}
      onValueChange={(value) => changeLocale(value as Locale)}
    >
      <SelectTrigger className="h-8 w-fit gap-1.5 border-0 bg-transparent px-2 text-xs text-muted-foreground hover:text-foreground">
        <GlobeIcon className="size-3" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {languageOptions.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
