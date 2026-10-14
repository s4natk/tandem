import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BoardCard } from "@collab/shared";
import { roomsApi } from "@/api/endpoints";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { CardAttachments } from "@/components/board/CardAttachments";
import { TypingLine } from "@/components/board/Card";
import { useBoardStore } from "@/store/board";
import { useBoardActions } from "@/realtime/useBoardActions";

interface Props {
  roomId: string;
  cardId: string | null;
  readOnly?: boolean;
  onClose: () => void;
}

export function CardDetailModal({
  roomId,
  cardId,
  readOnly = false,
  onClose,
}: Props): JSX.Element {
  const card = useBoardStore((s) => (cardId ? s.cards[cardId] ?? null : null));
  const { updateCard, deleteCard, setLocalActiveCard, setTyping } = useBoardActions(roomId);

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
          roomId={roomId}
          readOnly={readOnly}
          onTyping={(typing) => setTyping(card.id, typing)}
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
  roomId,
  readOnly,
  onTyping,
  onSubmit,
  onDelete,
}: {
  card: BoardCard;
  roomId: string;
  readOnly: boolean;
  onTyping: (typing: boolean) => void;
  onSubmit: (patch: {
    title?: string;
    description?: string | null;
    assigneeId?: string | null;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}): JSX.Element {
  const membersQuery = useQuery({
    queryKey: ["room-members", roomId],
    queryFn: () => roomsApi.members(roomId),
  });
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [assigneeId, setAssigneeId] = useState(card.assigneeId ?? "");
  const [saving, setSaving] = useState(false);
  const typing = useRef(false);
  const idleTimer = useRef<number | null>(null);

  const stopTyping = (): void => {
    if (idleTimer.current != null) window.clearTimeout(idleTimer.current);
    idleTimer.current = null;
    if (!typing.current) return;
    typing.current = false;
    onTyping(false);
  };

  const noteTyping = (): void => {
    if (readOnly) return;
    if (!typing.current) {
      typing.current = true;
      onTyping(true);
    }
    if (idleTimer.current != null) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(stopTyping, 1200);
  };

  useEffect(() => {
    return () => {
      if (idleTimer.current != null) window.clearTimeout(idleTimer.current);
      if (typing.current) {
        typing.current = false;
        onTyping(false);
      }
    };
  }, [card.id, onTyping]);

  useEffect(() => {
    // If a server update arrives while the modal is open, refresh local fields
    // (unless the user is actively editing). For simplicity we hard-sync on
    // card identity changes only.
    setTitle(card.title);
    setDescription(card.description ?? "");
    setAssigneeId(card.assigneeId ?? "");
  }, [card.id]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          stopTyping();
          await onSubmit({
            title: title.trim() || card.title,
            description: description.trim().length ? description.trim() : null,
            assigneeId: assigneeId || null,
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
          onChange={(e) => {
            setTitle(e.target.value);
            noteTyping();
          }}
          required
          maxLength={200}
          readOnly={readOnly}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Description</label>
        <textarea
          className="input mt-1 h-40 resize-none"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            noteTyping();
          }}
          onBlur={stopTyping}
          maxLength={4000}
          readOnly={readOnly}
        />
        <TypingLine cardId={card.id} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Assignee</label>
        {readOnly ? (
          <p className="mt-1 text-sm text-slate-600">
            {membersQuery.data?.members.find((member) => member.user.id === assigneeId)?.user
              .name ?? "Unassigned"}
          </p>
        ) : (
          <select
            className="input mt-1"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {membersQuery.data?.members.map((member) => (
              <option key={member.user.id} value={member.user.id}>
                {member.user.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <CardAttachments roomId={roomId} cardId={card.id} readOnly={readOnly} />

      <div className="flex items-center justify-between">
        {readOnly ? (
          <span className="text-xs font-medium text-slate-500">View only</span>
        ) : (
          <button type="button" onClick={onDelete} className="btn-danger px-3 py-1.5 text-sm">
            Delete card
          </button>
        )}
        <div className="text-xs text-slate-500">
          v{card.version} · updated{" "}
          {new Date(card.updatedAt).toLocaleString()}
        </div>
        {!readOnly && (
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner size="sm" className="text-white" /> : "Save"}
          </button>
        )}
      </div>
    </form>
  );
}
