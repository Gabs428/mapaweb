// src/components/SearchBar.jsx
import React, { useState } from "react";

export default function SearchBar({ onSearch, loading }) {
  const [text, setText] = useState("");

  const submit = (e) => {
    e.preventDefault();
    onSearch(text);
  };

  return (
    <form onSubmit={submit} className="search-box">
      <input
        type="text"
        placeholder="Ingresa una dirección..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // Evita el error del linter: llamada explícita
          if (e.key === "Enter") {
            submit(e);
          }
        }}
      />
      <button type="submit" disabled={loading}>
        {loading ? "⏳ Buscando..." : "🔍 Buscar"}
      </button>
    </form>
  );
}