"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getCitiesByUF } from "@/lib/ibge-data";

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  uf: string | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CityAutocomplete({
  value,
  onChange,
  uf,
  placeholder = "Selecione uma cidade...",
  className,
  disabled
}: CityAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  
  const cities = React.useMemo(() => getCitiesByUF(uf), [uf]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal bg-bg-secondary border-border-default h-10 px-3 hover:bg-bg-tertiary", !value && "text-text-disabled", className)}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 z-[60]" align="start">
        <Command className="w-full">
          <CommandInput placeholder="Buscar cidade..." />
          <CommandList>
            <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
            <CommandGroup>
              {cities.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === city ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
