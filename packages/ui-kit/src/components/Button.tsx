import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "accent";

const VARIANT_VAR: Record<Variant, string> = {
  primary: "var(--brand-primary)",
  secondary: "var(--brand-secondary)",
  accent: "var(--brand-accent)",
};

export function Button({
  variant = "primary",
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      style={{
        backgroundColor: VARIANT_VAR[variant],
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "10px 16px",
        fontSize: 14,
        cursor: "pointer",
        ...style,
      }}
    />
  );
}
