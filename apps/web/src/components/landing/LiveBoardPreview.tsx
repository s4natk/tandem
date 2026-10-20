import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  AnimatePresence,
  LayoutGroup,
  animate,
  motion,
  type MotionValue,
  type ValueAnimationTransition,
  useInView,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/cn";

type ColumnId = "todo" | "doing" | "done";
type ActorId = "maya" | "leo";
type Tone = "violet" | "pink" | "cyan" | "amber";

interface PreviewCard {
  id: string;
  title: string;
  tag: string;
  tone: Tone;
  version: number;
}

interface FeedItem {
  id: number;
  actor: ActorId;
  text: string;
}

type Step =
  | { kind: "move"; actor: ActorId; card: string; to: ColumnId; index: number }
  | { kind: "edit"; actor: ActorId; card: string; title: string }
  | { kind: "conflict"; winner: ActorId; loser: ActorId; card: string; to: ColumnId; index: number }
  | { kind: "reset" };

const COLUMNS: { id: ColumnId; title: string; dot: string }[] = [
  { id: "todo", title: "To do", dot: "bg-white/40" },
  { id: "doing", title: "In progress", dot: "bg-amber-300" },
  { id: "done", title: "Done", dot: "bg-emerald-400" },
];

const ACTORS: Record<ActorId, { name: string; color: string; ring: string; text: string }> = {
  maya: { name: "Maya", color: "#f472b6", ring: "ring-pink-400/80", text: "text-pink-300" },
  leo: { name: "Leo", color: "#22d3ee", ring: "ring-cyan-300/80", text: "text-cyan-300" },
};

const TONES: Record<Tone, string> = {
  violet: "bg-brand-400/15 text-brand-200",
  pink: "bg-pink-400/15 text-pink-200",
  cyan: "bg-cyan-400/15 text-cyan-200",
  amber: "bg-amber-400/15 text-amber-200",
};

const INITIAL_CARDS: Record<string, PreviewCard> = {
  post: { id: "post", title: "Draft launch post", tag: "Marketing", tone: "pink", version: 1 },
  oauth: { id: "oauth", title: "Wire up Google login", tag: "Auth", tone: "violet", version: 2 },
  presence: { id: "presence", title: "Presence avatars", tag: "Realtime", tone: "cyan", version: 4 },
  redis: { id: "redis", title: "Redis fan-out", tag: "Infra", tone: "amber", version: 2 },
  codes: { id: "codes", title: "Join by room code", tag: "Rooms", tone: "violet", version: 3 },
  toast: { id: "toast", title: "Conflict toast", tag: "UX", tone: "pink", version: 1 },
};

const INITIAL_BOARD: Record<ColumnId, string[]> = {
  todo: ["post", "oauth"],
  doing: ["presence", "redis"],
  done: ["codes", "toast"],
};

const INITIAL_FEED: FeedItem[] = [
  { id: 2, actor: "leo", text: "joined the room" },
  { id: 1, actor: "maya", text: "created “Launch plan”" },
];

const SCRIPT: Step[] = [
  { kind: "move", actor: "maya", card: "oauth", to: "doing", index: 0 },
  { kind: "edit", actor: "leo", card: "post", title: "Write launch post" },
  { kind: "move", actor: "leo", card: "presence", to: "done", index: 0 },
  { kind: "conflict", winner: "maya", loser: "leo", card: "redis", to: "done", index: 0 },
  { kind: "move", actor: "maya", card: "post", to: "doing", index: 9 },
  { kind: "reset" },
];

const CARD_SPRING: ValueAnimationTransition<number> = {
  type: "spring",
  stiffness: 320,
  damping: 32,
  mass: 0.9,
};

const GLIDE: ValueAnimationTransition<number> = { duration: 0.85, ease: [0.4, 0, 0.2, 1] };

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function columnTitle(id: ColumnId): string {
  return COLUMNS.find((c) => c.id === id)?.title ?? id;
}

function moveInBoard(
  board: Record<ColumnId, string[]>,
  cardId: string,
  to: ColumnId,
  index: number,
): Record<ColumnId, string[]> {
  const next = {
    todo: board.todo.filter((id) => id !== cardId),
    doing: board.doing.filter((id) => id !== cardId),
    done: board.done.filter((id) => id !== cardId),
  };
  const list = next[to];
  list.splice(Math.min(index, list.length), 0, cardId);
  return next;
}

interface CursorState {
  x: MotionValue<number>;
  y: MotionValue<number>;
  press: MotionValue<number>;
}

export function LiveBoardPreview(): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef(new Map<string, HTMLElement>());
  const inView = useInView(rootRef, { amount: 0.3 });
  const inViewRef = useRef(inView);
  inViewRef.current = inView;
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const [board, setBoard] = useState(INITIAL_BOARD);
  const [cards, setCards] = useState(INITIAL_CARDS);
  const [held, setHeld] = useState<Partial<Record<string, ActorId>>>({});
  const [typing, setTyping] = useState<{ card: string; actor: ActorId } | null>(null);
  const [toast, setToast] = useState<{ actor: ActorId; text: string } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>(INITIAL_FEED);
  const feedId = useRef(10);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const maya: CursorState = {
    x: useMotionValue(0),
    y: useMotionValue(0),
    press: useMotionValue(0),
  };
  const leo: CursorState = {
    x: useMotionValue(0),
    y: useMotionValue(0),
    press: useMotionValue(0),
  };
  const cursorsRef = useRef<Record<ActorId, CursorState>>({ maya, leo });

  const idlePoint = (actor: ActorId): { x: number; y: number } => {
    const el = boardRef.current;
    const w = el?.offsetWidth ?? 800;
    const h = el?.offsetHeight ?? 360;
    return actor === "maya" ? { x: w * 0.3, y: h * 0.16 } : { x: w * 0.62, y: h * 0.86 };
  };

  useLayoutEffect(() => {
    for (const actor of ["maya", "leo"] as const) {
      const point = idlePoint(actor);
      cursorsRef.current[actor].x.set(point.x);
      cursorsRef.current[actor].y.set(point.y);
    }
  }, []);

  useEffect(() => {
    if (reduced) return;
    let alive = true;
    const cursors = cursorsRef.current;

    // Layout position (not the animated one), so moves aim at where a card lands.
    const pointOn = (id: string, fx = 0.72, fy = 0.6): { x: number; y: number } => {
      const el = cardEls.current.get(id);
      if (!el) return { x: 0, y: 0 };
      return { x: el.offsetLeft + el.offsetWidth * fx, y: el.offsetTop + el.offsetHeight * fy };
    };

    const glide = (
      actor: ActorId,
      to: { x: number; y: number },
      transition: ValueAnimationTransition<number> = GLIDE,
    ): Promise<unknown> =>
      Promise.all([
        animate(cursors[actor].x, to.x, transition),
        animate(cursors[actor].y, to.y, transition),
      ]);

    const press = (actor: ActorId, down: boolean): Promise<unknown> =>
      Promise.resolve(animate(cursors[actor].press, down ? 1 : 0, { duration: 0.14 }));

    const pushFeed = (actor: ActorId, text: string): void => {
      feedId.current += 1;
      const item = { id: feedId.current, actor, text };
      setFeed((items) => [item, ...items].slice(0, 4));
    };

    const flashCard = (id: string): void => {
      setFlash(id);
      window.setTimeout(() => {
        if (alive) setFlash((current) => (current === id ? null : current));
      }, 900);
    };

    const commitMove = (cardId: string, to: ColumnId, index: number): number => {
      const version = cardsRef.current[cardId]!.version + 1;
      flushSync(() => {
        setBoard((b) => moveInBoard(b, cardId, to, index));
        setCards((cs) => ({ ...cs, [cardId]: { ...cs[cardId]!, version } }));
      });
      flashCard(cardId);
      return version;
    };

    const waitUntilVisible = async (): Promise<void> => {
      while (alive && !inViewRef.current) await sleep(250);
    };

    const runStep = async (step: Step): Promise<void> => {
      switch (step.kind) {
        case "move": {
          const title = cardsRef.current[step.card]!.title;
          await glide(step.actor, pointOn(step.card));
          if (!alive) return;
          await press(step.actor, true);
          setHeld({ [step.card]: step.actor });
          await sleep(260);
          if (!alive) return;
          commitMove(step.card, step.to, step.index);
          await glide(step.actor, pointOn(step.card), CARD_SPRING);
          if (!alive) return;
          await sleep(140);
          setHeld({});
          await press(step.actor, false);
          pushFeed(step.actor, `moved “${title}” to ${columnTitle(step.to)}`);
          await sleep(700);
          return;
        }
        case "edit": {
          await glide(step.actor, pointOn(step.card, 0.4, 0.55));
          if (!alive) return;
          setTyping({ card: step.card, actor: step.actor });
          await sleep(1700);
          if (!alive) return;
          setTyping(null);
          setCards((cs) => {
            const card = cs[step.card]!;
            return { ...cs, [step.card]: { ...card, title: step.title, version: card.version + 1 } };
          });
          flashCard(step.card);
          pushFeed(step.actor, `renamed a card to “${step.title}”`);
          await sleep(800);
          return;
        }
        case "conflict": {
          const title = cardsRef.current[step.card]!.title;
          const staleVersion = cardsRef.current[step.card]!.version;
          const target = pointOn(step.card);
          await Promise.all([
            glide(step.winner, { x: target.x - 18, y: target.y - 4 }),
            glide(step.loser, { x: target.x + 26, y: target.y + 12 }, { duration: 1, ease: [0.4, 0, 0.2, 1] }),
          ]);
          if (!alive) return;
          await Promise.all([press(step.winner, true), press(step.loser, true)]);
          setHeld({ [step.card]: step.winner });
          await sleep(320);
          if (!alive) return;
          const version = commitMove(step.card, step.to, step.index);
          const loser = cursors[step.loser];
          const lx = loser.x.get();
          await Promise.all([
            glide(step.winner, pointOn(step.card), CARD_SPRING),
            animate(loser.x, [lx, lx - 7, lx + 7, lx - 4, lx + 4, lx], { duration: 0.45 }),
          ]);
          if (!alive) return;
          setToast({
            actor: step.loser,
            text: `Stale write (v${staleVersion}) rejected · synced to v${version}`,
          });
          setHeld({});
          await Promise.all([press(step.winner, false), press(step.loser, false)]);
          pushFeed(step.winner, `moved “${title}” to ${columnTitle(step.to)}`);
          await sleep(500);
          pushFeed(step.loser, `edit was stale, re-synced to v${version}`);
          await sleep(1800);
          if (!alive) return;
          setToast(null);
          await sleep(400);
          return;
        }
        case "reset": {
          await sleep(900);
          if (!alive) return;
          flushSync(() => {
            setBoard(INITIAL_BOARD);
            setCards(INITIAL_CARDS);
          });
          pushFeed("maya", "started a new sprint");
          await Promise.all([
            glide("maya", idlePoint("maya"), { duration: 1.1, ease: [0.4, 0, 0.2, 1] }),
            glide("leo", idlePoint("leo"), { duration: 1.2, ease: [0.4, 0, 0.2, 1] }),
          ]);
          await sleep(900);
          return;
        }
      }
    };

    void (async () => {
      await sleep(600);
      while (alive) {
        for (const step of SCRIPT) {
          await waitUntilVisible();
          if (!alive) return;
          await runStep(step);
          if (!alive) return;
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [reduced]);

  const setCardEl = (id: string) => (el: HTMLElement | null) => {
    if (el) cardEls.current.set(id, el);
    else cardEls.current.delete(id);
  };

  return (
    <div ref={rootRef} className="relative mx-auto max-w-5xl">
      <div className="absolute -inset-x-10 -inset-y-8 rounded-[3rem] bg-brand-500/10 blur-3xl" />
      <div className="glass relative overflow-hidden rounded-3xl shadow-[0_40px_120px_-40px_rgba(114,98,251,0.55)]">
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <div className="mx-auto hidden rounded-md bg-white/[0.05] px-3 py-1 font-mono text-[11px] text-white/45 sm:block">
            tandem.app/rooms/launch-plan
          </div>
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <div className="flex -space-x-1.5">
              <Dot initial="M" color={ACTORS.maya.color} />
              <Dot initial="L" color={ACTORS.leo.color} />
              <Dot initial="Y" color="#8d7cff" />
            </div>
            <span className="text-[11px] text-white/45">3 online</span>
          </div>
        </div>

        <div className="scrollbar-thin overflow-x-auto">
          <LayoutGroup id="preview">
            <div ref={boardRef} className="relative flex min-w-[720px] gap-3 p-4">
              {COLUMNS.map((column) => (
                <div key={column.id} className="flex min-w-0 flex-1 flex-col rounded-2xl bg-white/[0.035] p-2.5">
                  <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                    <span className={cn("h-1.5 w-1.5 rounded-full", column.dot)} />
                    {column.title}
                    <span className="ml-auto rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] tabular-nums text-white/50">
                      {board[column.id].length}
                    </span>
                  </div>
                  <div className="flex min-h-[19.5rem] flex-col gap-2">
                    {board[column.id].map((id) => {
                      const card = cards[id]!;
                      return (
                        <PreviewCardView
                          key={id}
                          card={card}
                          heldBy={held[id]}
                          typingBy={typing?.card === id ? typing.actor : undefined}
                          flash={flash === id}
                          setRef={setCardEl(id)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}

              <aside className="hidden w-56 shrink-0 flex-col rounded-2xl bg-white/[0.02] p-3 lg:flex">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                  Activity
                </div>
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {feed.map((item) => (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex gap-2 text-[12px] leading-snug text-white/60"
                      >
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: ACTORS[item.actor].color }}
                        />
                        <span>
                          <span className={cn("font-semibold", ACTORS[item.actor].text)}>
                            {ACTORS[item.actor].name}
                          </span>{" "}
                          {item.text}
                        </span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </aside>

              {!reduced && (
                <>
                  <Cursor actor="maya" state={maya} toast={toast?.actor === "maya" ? toast.text : null} />
                  <Cursor actor="leo" state={leo} toast={toast?.actor === "leo" ? toast.text : null} />
                </>
              )}
            </div>
          </LayoutGroup>
        </div>
      </div>
    </div>
  );
}

function PreviewCardView({
  card,
  heldBy,
  typingBy,
  flash,
  setRef,
}: {
  card: PreviewCard;
  heldBy?: ActorId;
  typingBy?: ActorId;
  flash: boolean;
  setRef: (el: HTMLElement | null) => void;
}): JSX.Element {
  return (
    <motion.div
      ref={setRef}
      layoutId={`preview-${card.id}`}
      layout
      transition={{ layout: CARD_SPRING }}
      animate={{ scale: heldBy ? 1.045 : 1, rotate: heldBy ? -2.2 : 0 }}
      className={cn(
        "rounded-xl border bg-[#161338] p-3 shadow-[0_10px_24px_-14px_rgba(0,0,0,0.8)] transition-[border-color,box-shadow] duration-200",
        heldBy
          ? cn("border-transparent ring-2 shadow-[0_24px_40px_-16px_rgba(0,0,0,0.9)]", ACTORS[heldBy].ring)
          : "border-white/[0.08]",
      )}
      style={{ zIndex: heldBy ? 20 : 1 }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", TONES[card.tone])}>
          {card.tag}
        </span>
        <span
          className={cn(
            "rounded px-1 font-mono text-[10px] transition-colors duration-300",
            flash ? "bg-emerald-400/20 text-emerald-300" : "text-white/35",
          )}
        >
          v{card.version}
        </span>
      </div>
      <p className="mt-2 text-[13px] font-medium leading-snug text-white/90">{card.title}</p>
      {typingBy && (
        <p className={cn("mt-1.5 flex items-center gap-1 text-[11px] font-medium", ACTORS[typingBy].text)}>
          {ACTORS[typingBy].name} is typing
          <span className="inline-flex gap-0.5">
            <TypingDot delay="0s" />
            <TypingDot delay="0.15s" />
            <TypingDot delay="0.3s" />
          </span>
        </p>
      )}
    </motion.div>
  );
}

function TypingDot({ delay }: { delay: string }): JSX.Element {
  return (
    <span
      className="inline-block h-1 w-1 rounded-full bg-current animate-typing"
      style={{ animationDelay: delay }}
    />
  );
}

function Cursor({
  actor,
  state,
  toast,
}: {
  actor: ActorId;
  state: CursorState;
  toast: string | null;
}): JSX.Element {
  const scale = useTransform(state.press, [0, 1], [1, 0.82]);
  const { name, color } = ACTORS[actor];
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 z-30"
      style={{ x: state.x, y: state.y }}
    >
      <motion.svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        style={{ scale, originX: 0, originY: 0 }}
        className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
      >
        <path d="M2 1.5 L17 9.2 L10.2 10.9 L7.4 17.6 Z" fill={color} stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
      </motion.svg>
      <div
        className="ml-4 -mt-0.5 w-max rounded-full px-2 py-0.5 text-[11px] font-semibold text-ink-900"
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="ml-4 mt-1.5 w-max max-w-[240px] rounded-lg border border-rose-300/30 bg-rose-950/95 px-2.5 py-1.5 text-[11px] font-medium text-rose-100 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Dot({ initial, color }: { initial: string; color: string }): JSX.Element {
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-ink-900 ring-2 ring-ink-850"
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  );
}
