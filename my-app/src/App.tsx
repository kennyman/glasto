import { useEffect, useRef, useState } from "react";
import "./App.css";
import { groupNumberFromPath, loadPeople, type Person } from "./sheet.ts";

const TICKETS_URL = "https://glastonbury.seetickets.com/";
const LONDON = "Europe/London";
const COACH_SALE_AT = zonedDate(2026, 10, 1, 18, 0, LONDON);
const GENERAL_SALE_AT = zonedDate(2026, 10, 4, 9, 0, LONDON);

function zonedDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(guess));
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    pick("year"),
    pick("month") - 1,
    pick("day"),
    pick("hour") % 24,
    pick("minute"),
    pick("second"),
  );
  return new Date(guess - (asUtc - guess));
}

function placeName(timeZone: string) {
  return timeZone.split("/").at(-1)?.replaceAll("_", " ") ?? timeZone;
}

function formatWhen(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function londonTimeLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12",
  }).format(date);
}

function useNow(until: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until <= Date.now()) return;
    const id = window.setInterval(() => {
      const next = Date.now();
      setNow(next);
      if (until <= next) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [until]);

  return now;
}

function remainingParts(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function SaleTimer({
  now,
  isCoachSale,
}: {
  now: number;
  isCoachSale: boolean;
}) {
  const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const target = isCoachSale ? COACH_SALE_AT : GENERAL_SALE_AT;
  const left = target.getTime() - now;
  const parts = remainingParts(left);
  const units = [
    ["days", parts.days],
    ["hours", parts.hours],
    ["minutes", parts.minutes],
    ["seconds", parts.seconds],
  ] as const;
  const when = londonTimeLabel(target);

  if (left <= 0) return null;

  return (
    <div className="timer">
      <p className="timer-label">Time until sale starts</p>
      <div className="timer-clock">
        {units.map(([label, value]) => (
          <div className="timer-unit" key={label}>
            <strong>{String(value).padStart(2, "0")}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <p className="timer-where">
        {here === LONDON
          ? `You're on London time, so that's ${when} for you too.`
          : `Where you are (${placeName(here)}): ${formatWhen(target, here)}.`}
      </p>
    </div>
  );
}

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
  marked,
  onCopy,
}: {
  person: Person;
  copied: string | null;
  marked: string | null;
  onCopy: (id: string, value: string) => void;
}) {
  const id = `${person.group}-${person.name}`;

  return (
    <li className="entry">
      <h2 className="name">{person.name}</h2>
      {person.registration ? (
        <div className={marked === `${id}-reg` ? "field is-marked" : "field"}>
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
        <div className={marked === `${id}-pc` ? "field is-marked" : "field"}>
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

function Instructions({ isCoachSale }: { isCoachSale: boolean }) {
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
        style={{
          fontWeight: "bold",
          marginTop: "10px",
          marginBottom: "10px",
          color: "blue",
        }}
      >
        READ INSTRUCTIONS HERE
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
                <br />
                You might have to enter a captcha to access the queue.
              </li>
              <li>
                Stay in the queue until you are let through. Once you are let
                through, stay focused and act fast as tickets can sell out in
                the meantime.
                <img
                  className="queue"
                  src={`${import.meta.env.BASE_URL}queue.webp`}
                  alt="See Tickets waiting queue"
                />
              </li>
              <li>
                Congratulations! If you see this page you have been picked!
                Enter a <strong>registration number</strong> and{" "}
                <strong>postcode</strong> for all <strong>6 people</strong>. It
                does not matter who the main booker is. Fill in the first
                person, then add the other five.
                <img
                  src={`${import.meta.env.BASE_URL}deposits.jpg`}
                  alt="See Tickets deposit form with one main registration and five additional tickets"
                />
              </li>
              {isCoachSale ? (
                <li>
                  This is the coach sale. Choose one coach for all{" "}
                  <strong>6 people</strong>. Choose any available coach, time
                  doesn't matter. Preferably London but if there aren't any
                  available, choose any city.
                </li>
              ) : null}
              <li>
                Continue to payment. The card needs to cover{" "}
                <strong>£600</strong> {isCoachSale ? "+ coach fare" : ""}. Do
                not use American Express. It is £600{" "}
                {isCoachSale ? "+ coach fare" : ""} for the entire group which
                we will be reimbursed to you right away.
              </li>
              <li>
                You are only finished when the confirmation screen appears. You
                don't have to be worry about any double payments. Each person
                can only be bought for once, so go ahead — the same registration
                cannot be used twice. Once all is confirmed let me know
                immediately.
              </li>
              <li>
                By doing this you will make 6 people the happiest people in the
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
  const [marked, setMarked] = useState<string | null>(null);
  const groupNumber = groupNumberFromPath(window.location.pathname);
  const now = useNow(GENERAL_SALE_AT.getTime());
  const isCoachSale = now < COACH_SALE_AT.getTime();

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
      setMarked(id);
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
        <Instructions isCoachSale={isCoachSale} />
        <SaleTimer now={now} isCoachSale={isCoachSale} />
        <p>
          Click this link{" "}
          <strong>
            <u>before</u>{" "}
            {isCoachSale ? "6:00 pm (London time)" : "9:00 GMT (London time)"}
          </strong>{" "}
          on{" "}
          <strong>
            {isCoachSale ? "Thursday 1st October" : "Sunday 4th October"}
          </strong>{" "}
          to get in the queue.
        </p>

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
          <p style={{ fontSize: "14px", marginBottom: "10px" }}>
            Copy and paste the registration number and postcode for each person
            into the ticket website.
          </p>
          <ul className="entries">
            {visible
              .filter((person) => person.group === group)
              .map((person) => (
                <PersonCard
                  key={`${person.group}-${person.name}`}
                  person={person}
                  copied={copied}
                  marked={marked}
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
