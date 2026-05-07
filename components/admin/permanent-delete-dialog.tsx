"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Heavier confirmation flow for irreversible hard delete.
 *
 * Per the UI spec: "type the user's email to confirm, not just a yes/no
 * dialog." The two-step backend ordering (must soft-delete before
 * permanent) is mirrored in the UI — this dialog is only reachable from a
 * row that is ALREADY soft-deleted (rendered in the includeDeleted view).
 *
 * The action is gated until the typed text exactly matches the target's
 * email. Whitespace is trimmed; case-insensitive (matches backend's
 * lowercase-on-disk reality).
 */
export function PermanentDeleteDialog({
  open,
  onOpenChange,
  email,
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [typed, setTyped] = React.useState("");
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  // Reset on open/close so a previous typed value doesn't pre-arm the next dialog.
  React.useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permanently delete user</DialogTitle>
          <DialogDescription>
            This removes the Firebase Auth account and the Firestore profile
            for <strong>{email}</strong>. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="confirm-email">
            Type the user&apos;s email to confirm:
          </Label>
          <Input
            id="confirm-email"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={email}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!matches || loading}
          >
            {loading ? "Deleting..." : "Permanently delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
