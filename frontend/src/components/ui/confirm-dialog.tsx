import * as React from "react";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Variant = "default" | "destructive" | "warning";

const iconFor = {
  default: Info,
  warning: AlertTriangle,
  destructive: AlertCircle,
};

const iconColor = {
  default: "text-primary bg-primary/10",
  warning: "text-warning bg-warning-soft",
  destructive: "text-destructive bg-destructive/10",
};

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: Variant;
  /** Texto que el usuario debe tipear exacto para habilitar el botón de confirmar */
  typeToConfirm?: string;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  typeToConfirm,
  onConfirm,
}: ConfirmDialogProps) {
  const [typed, setTyped] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setTyped("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const Icon = iconFor[variant];
  const canConfirm = !typeToConfirm || typed.trim() === typeToConfirm;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn("rounded-lg p-2 shrink-0", iconColor[variant])}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-[15px]">{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-1 text-[13px] leading-relaxed">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {typeToConfirm && (
          <div className="space-y-1.5 px-6">
            <Label htmlFor="confirm-text" className="text-[11px] uppercase tracking-widest">
              Escribe <span className="tabular font-semibold text-foreground">{typeToConfirm}</span> para confirmar
            </Label>
            <Input
              id="confirm-text"
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canConfirm) handleConfirm();
              }}
              autoComplete="off"
              className="tabular"
              placeholder={typeToConfirm}
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
