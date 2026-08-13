import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      // Los botones con fondo se levantan (bisel de luz arriba + sombra de apoyo)
      // y se hunden al presionar. Los planos —ghost, link— no llevan relieve.
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-raised hover:bg-primary/92 hover:shadow-raised-hover hover:-translate-y-px active:translate-y-0 active:shadow-raised-press",
        destructive:
          "bg-destructive text-destructive-foreground shadow-raised hover:bg-destructive/92 hover:shadow-raised-hover hover:-translate-y-px active:translate-y-0 active:shadow-raised-press",
        outline:
          "border border-border-strong bg-surface shadow-subtle hover:bg-accent hover:text-accent-foreground hover:shadow-card hover:-translate-y-px active:translate-y-0 active:shadow-raised-press",
        secondary:
          "bg-secondary text-secondary-foreground shadow-subtle hover:bg-secondary/80 hover:shadow-card active:shadow-raised-press",
        ghost: "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
