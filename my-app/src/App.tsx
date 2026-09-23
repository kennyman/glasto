import { useEffect, useState } from "react";
import "./App.css";
import {
  groupNumberFromPath,
  loadPeople,
  type Person,
} from "./sheet.ts";

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

  return (
    <main className="page">
      <h1>Glastonbury 2027</h1>
      <a
        className="tickets"
        href={TICKETS_URL}
        target="_blank"
        rel="noreferrer"
      >
        Glastonbury tickets
      </a>

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
    </main>
  );
}

export default App;
