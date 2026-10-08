"use client";
import { useState } from "react";
export function PropertyTags({
  name,
  title,
  initial = [],
  suggestions,
}: {
  name: string;
  title: string;
  initial?: string[];
  suggestions: string[];
}) {
  const [tags, setTags] = useState(initial),
    [text, setText] = useState("");
  const add = (value: string) => {
    const tag = value.trim().slice(0, 60);
    if (tag && tags.length < 20 && !tags.includes(tag)) setTags([...tags, tag]);
    setText("");
  };
  return (
    <div className="field span property-tags">
      <h3>{title}</h3>
      <input type="hidden" name={name} value={JSON.stringify(tags)} />
      <div className="property-tag-list">
        {tags.map((tag) => (
          <button
            type="button"
            key={tag}
            aria-label={`${tag} özelliğini kaldır`}
            onClick={() => setTags(tags.filter((x) => x !== tag))}
          >
            {tag} ×
          </button>
        ))}
      </div>
      <div className="property-tag-entry">
        <input
          aria-label={`${title} etiketi`}
          value={text}
          maxLength={60}
          placeholder="Özellik yazın ve ekleyin"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(text);
            }
          }}
        />
        <button
          type="button"
          className="button secondary"
          onClick={() => add(text)}
          disabled={!text.trim() || tags.length >= 20}
        >
          Ekle
        </button>
      </div>
      <div className="property-tag-list suggestions">
        {suggestions
          .filter((t) => !tags.includes(t))
          .map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => add(t)}
              disabled={tags.length >= 20}
            >
              + {t}
            </button>
          ))}
      </div>
    </div>
  );
}
