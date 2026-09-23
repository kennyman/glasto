import { useEffect, useRef, useState } from "react";
import "./App.css";
import { groupNumberFromPath, loadPeople, type Person } from "./sheet.ts";

const TICKETS_URL = "https://glastonbury.seetickets.com/";

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5 9.5 17 19 7" />
    </svg>
  );
}

function CopyButton({
  value,
  label,
  copied,
  onCopy,
}: {
  value: string;
  label: string;
  copied: boolean;
  onCopy: (value: string) => void;
}) {
  return (
    <button
      type="button"
      className="copy"
      aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
      onClick={() => onCopy(value)}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

function PersonCard({
  person,
  copied,
  onCopy,
}: {
  person: Person;
  copied: string | null;
  onCopy: (id: string, value: string) => void;
}) {
  const id = `${person.group}-${person.name}`;

  return (
    <li className="entry">
      <h2 className="name">{person.name}</h2>
      {person.registration ? (
        <div className="field">
          <span className="label">Registration number</span>
          <span className="value">{person.registration}</span>
          <CopyButton
            value={person.registration}
            label={`registration number ${person.registration}`}
            copied={copied === `${id}-reg`}
            onCopy={(value) => onCopy(`${id}-reg`, value)}
          />
        </div>
      ) : null}
      {person.postcode ? (
        <div className="field">
          <span className="label">Postcode</span>
          <span className="value">{person.postcode}</span>
          <CopyButton
            value={person.postcode}
            label={`postcode ${person.postcode}`}
            copied={copied === `${id}-pc`}
            onCopy={(value) => onCopy(`${id}-pc`, value)}
          />
        </div>
      ) : null}
    </li>
  );
}

function SwitchGroup({
  current,
  groups,
}: {
  current: number;
  groups: number[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const others = groups.filter((group) => group !== current);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="switch" ref={rootRef}>
      {open ? (
        <>
          <button
            type="button"
            className="switch-backdrop"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="switch-popup" role="dialog" aria-label="Switch group">
            <ul>
              {others.map((group) => (
                <li key={group}>
                  <a href={`${import.meta.env.BASE_URL}${group}`}>
                    Group {group}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
      <button
        type="button"
        className="switch-link"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        switch group
      </button>
    </div>
  );
}

function Instructions() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="instructions-link"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        style={{ fontWeight: "bold", marginTop: "10px", marginBottom: "10px" }}
      >
        INSTRUCTIONS
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="drawer-backdrop"
            aria-label="Close instructions"
            onClick={() => setOpen(false)}
          />
          <aside className="drawer" role="dialog" aria-label="Instructions">
            <div className="drawer-header">
              <h2>Instructions</h2>
              <button
                type="button"
                className="drawer-close"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            <ol className="steps">
              <li>
                Open the See Tickets Glastonbury page before the sale starts.
                &rarr;
                <a href={TICKETS_URL} target="_blank" rel="noreferrer">
                  Glastonbury tickets
                </a>
              </li>
              <li>Stay in the queue until you are let through.</li>
              <li>
                If you get through, enter a <strong>registration number</strong>{" "}
                and <strong>postcode</strong> for all <strong>6 people</strong>.
                It does not matter who the main booker is. Fill in the first
                person, then add the other five.
                <img
                  src={`${import.meta.env.BASE_URL}deposits.jpg`}
                  alt="See Tickets deposit form with one main registration and five additional tickets"
                />
              </li>
              <li>
                Continue to payment. The card needs to cover{" "}
                <strong>£600</strong>. Do not use American Express.
              </li>
              <li>
                You are only finished when the confirmation screen appears. You
                don't have to be worry about payments. Each person can only be
                bought for once, so go ahead — the same registration cannot be
                used twice. Once all is confirmed let me know immediately.
              </li>
              <li>
                Doing this you will make 6 people the happiest people in the
                world. &hearts;
              </li>
            </ol>
          </aside>
        </>
      ) : null}
    </>
  );
}

function App() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const groupNumber = groupNumberFromPath(window.location.pathname);

  useEffect(() => {
    let active = true;
    loadPeople()
      .then((loaded) => {
        if (active) setPeople(loaded);
      })
      .catch(() => {
        if (active) setError("Could not load the sheet.");
      });
    return () => {
      active = false;
    };
  }, []);

  function copy(id: string, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(id);
      window.setTimeout(() => {
        setCopied((current) => (current === id ? null : current));
      }, 1500);
    });
  }

  const visible =
    people?.filter((person) =>
      groupNumber === null ? true : person.group === groupNumber,
    ) ?? [];
  const groups = [...new Set(visible.map((person) => person.group))];
  const allGroups = [
    ...new Set(people?.map((person) => person.group) ?? []),
  ].sort((a, b) => a - b);

  return (
    <main className="page">
      <h1>Glastonbury 2027</h1>
      <div className="actions">
        <Instructions />
        <a
          className="tickets"
          href={TICKETS_URL}
          target="_blank"
          rel="noreferrer"
        >
          Glastonbury Ticket Link
        </a>
      </div>

      {error ? <p className="status">{error}</p> : null}
      {people === null && !error ? <p className="status">Loading…</p> : null}
      {people && visible.length === 0 ? (
        <p className="status">
          {groupNumber === null
            ? "The sheet has no names yet."
            : `No one is listed in group ${groupNumber}.`}
        </p>
      ) : null}

      {groups.map((group) => (
        <section key={group} className="group">
          <h2 className="group-title">Group {group}</h2>
          <ul className="entries">
            {visible
              .filter((person) => person.group === group)
              .map((person) => (
                <PersonCard
                  key={`${person.group}-${person.name}`}
                  person={person}
                  copied={copied}
                  onCopy={copy}
                />
              ))}
          </ul>
        </section>
      ))}

      {groupNumber !== null && allGroups.length > 0 ? (
        <SwitchGroup current={groupNumber} groups={allGroups} />
      ) : null}
    </main>
  );
}

export default App;
