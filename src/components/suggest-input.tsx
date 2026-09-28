"use client";

import { useState } from "react";

export function SuggestInput({
  name,
  label,
  defaultValue = "",
  required = false,
  maxLength,
  suggest,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  maxLength?: number;
  suggest: (query: string) => Promise<string[]>;
}) {
  const [value, setValue] = useState(defaultValue);
  const [options, setOptions] = useState<string[]>([]);

  async function onChange(next: string) {
    setValue(next);
    if (next.trim().length < 1) {
      setOptions([]);
      return;
    }
    const matches = await suggest(next);
    setOptions(matches.filter((option) => option.toLowerCase() !== next.trim().toLowerCase()));
  }

  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        name={name}
        value={value}
        required={required}
        maxLength={maxLength}
        onChange={(event) => void onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 font-normal outline-none focus:border-request"
      />
      {options.length > 0 ? (
        <ul className="mt-1 overflow-hidden rounded-xl border border-rose-100 bg-white">
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left font-normal hover:bg-rose-50"
                onClick={() => {
                  setValue(option);
                  setOptions([]);
                }}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </label>
  );
}
