import type { HTMLAttributes } from "react";

export function Card(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      style={{
        border: "1px solid #e2e2e2",
        borderRadius: 12,
        padding: 20,
        background: "#fff",
        ...props.style,
      }}
    />
  );
}
