import { useEffect, useState } from "react";
import type { BoardCard } from "@collab/shared";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useBoardStore } from "@/store/board";
import { useBoardActions } from "@/realtime/useBoardActions";

interface Props {
  roomId: string;
  cardId: string | null;
  onClose: () => void;
}

export function CardDetailModal({ roomId, cardId, onClose }: Props): JSX.Element {
  const card = useBoardStore((s) => (cardId ? s.cards[cardId] ?? null : null));
  const { updateCard, deleteCard, setLocalActiveCard } = useBoardActions(roomId);

  useEffect(() => {
    setLocalActiveCard(cardId);
    return () => setLocalActiveCard(null);
  }, [cardId, setLocalActiveCard]);

  return (
    <Modal
      open={Boolean(cardId)}
      onClose={onClose}
      title={card?.title ?? "Card"}
      size="lg"
    >
      {!card ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <CardEditor
          card={card}
          onSubmit={async (patch) => {
            await updateCard(card.id, { ...patch, version: card.version });
            onClose();
          }}
          onDelete={async () => {
            if (window.confirm("Delete this card? This cannot be undone.")) {
              await deleteCard(card.id);
              onClose();
            }
          }}
        />
      )}
    </Modal>
  );
}

function CardEditor({
  card,
  onSubmit,
  onDelete,
}: {
  card: BoardCard;
  onSubmit: (patch: { title?: string; description?: string | null }) => Promise<void>;
  onDelete: () => Promise<void>;
}): JSX.Element {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // If a server update arrives while the modal is open, refresh local fields
    // (unless the user is actively editing). For simplicity we hard-sync on
    // card identity changes only.
    setTitle(card.title);
    setDescription(card.description ?? "");
  }, [card.id]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await onSubmit({
            title: title.trim() || card.title,
            description: description.trim().length ? description.trim() : null,
          });
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-slate-700">Title</label>
        <input
          className="input mt-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Description</label>
        <textarea
          className="input mt-1 h-40 resize-none"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={4000}
        />
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onDelete} className="btn-danger px-3 py-1.5 text-sm">
          Delete card
        </button>
        <div className="text-xs text-slate-500">
          v{card.version} · updated{" "}
          {new Date(card.updatedAt).toLocaleString()}
        </div>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <Spinner size="sm" className="text-white" /> : "Save"}
        </button>
      </div>
    </form>
  );
}
