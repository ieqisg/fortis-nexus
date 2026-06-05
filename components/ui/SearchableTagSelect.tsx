"use client"

import { useRef, useState, useEffect } from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface SearchableTagSelectProps {
  options: string[]
  selected: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  badgeClassName?: string
}

export function SearchableTagSelect({
  options,
  selected,
  onChange,
  placeholder = "Search or type...",
  badgeClassName = "border-slate-200 text-slate-700 bg-slate-50",
}: SearchableTagSelectProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtered = options.filter(
    (o) => o.toLowerCase().includes(query.toLowerCase()) && !selected.includes(o)
  )

  const addTag = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || selected.includes(trimmed)) return
    onChange([...selected, trimmed])
    setQuery("")
    setOpen(false)
  }

  const removeTag = (tag: string) => {
    onChange(selected.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (filtered.length === 1) {
        addTag(filtered[0])
      } else if (query.trim()) {
        addTag(query)
      }
    }
    if (e.key === "Escape") {
      setOpen(false)
    }
    if (e.key === "Backspace" && query === "" && selected.length > 0) {
      removeTag(selected[selected.length - 1])
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className={`text-xs flex items-center gap-1 ${badgeClassName}`}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />

      {/* Dropdown */}
      {open && (query.length > 0 || filtered.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-md overflow-hidden">
          {filtered.length > 0 ? (
            <ul className="max-h-48 overflow-y-auto py-1">
              {filtered.map((option) => (
                <li
                  key={option}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    addTag(option)
                  }}
                  className="px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-100 text-slate-800"
                >
                  {option}
                </li>
              ))}
              {query.trim() && !options.some((o) => o.toLowerCase() === query.toLowerCase()) && (
                <li
                  onMouseDown={(e) => {
                    e.preventDefault()
                    addTag(query)
                  }}
                  className="px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-100 text-slate-500 border-t border-slate-100"
                >
                  Add &ldquo;{query.trim()}&rdquo;
                </li>
              )}
            </ul>
          ) : query.trim() ? (
            <ul className="py-1">
              <li
                onMouseDown={(e) => {
                  e.preventDefault()
                  addTag(query)
                }}
                className="px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-100 text-slate-500"
              >
                Add &ldquo;{query.trim()}&rdquo;
              </li>
            </ul>
          ) : null}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-1">
        Search the list or type a custom entry and press Enter
      </p>
    </div>
  )
}
