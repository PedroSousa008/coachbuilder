"use client";

import { useState } from "react";
import type { NewStaffInput } from "@/contexts/AppDataContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function AddStaffModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: NewStaffInput) => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  if (!open) return null;

  const submit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onSave({
      name: trimmedName,
      role: role.trim() || "Staff",
      dateOfBirth: dateOfBirth || undefined,
    });
    setName("");
    setRole("");
    setDateOfBirth("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-surface-border bg-[#0f1419] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-semibold text-white">Add staff</h3>
        <p className="mt-1 text-sm text-zinc-500">Adiciona equipa técnica para organização e aniversários.</p>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="ns-name">
              Nome
            </label>
            <Input id="ns-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="ns-role">
              Função
            </label>
            <Input id="ns-role" value={role} onChange={(e) => setRole(e.target.value)} className="mt-1" placeholder="Treinador adjunto, treinador GR..." />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="ns-dob">
              Data de nascimento
            </label>
            <Input
              id="ns-dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-8 flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={submit} disabled={!name.trim()}>
            Add staff
          </Button>
        </div>
      </div>
    </div>
  );
}
