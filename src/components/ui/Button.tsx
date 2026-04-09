import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-zinc-950 shadow-glow hover:bg-accent-muted focus-visible:ring-accent/40",
  secondary:
    "bg-surface-raised text-zinc-100 border border-surface-border hover:border-zinc-600 hover:bg-zinc-800/50",
  ghost: "text-zinc-300 hover:bg-white/5 hover:text-white",
  outline:
    "border border-zinc-600 text-zinc-200 hover:border-accent/50 hover:text-accent",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d10]",
        "disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        size === "sm" && "h-9 px-3.5 text-sm",
        size === "md" && "h-11 px-5 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
