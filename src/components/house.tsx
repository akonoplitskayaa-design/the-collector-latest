import { useState, type KeyboardEvent } from "react";
import { chooseMind, openMind, type MindSession } from "@/lib/director/mind";

function nextField(event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement>) {
  if (event.key !== "Enter" || event.shiftKey) return;
  const form = event.currentTarget.form;
  if (!form) return;
  const fields = [...form.querySelectorAll<HTMLElement>("textarea, input, select")];
  const index = fields.indexOf(event.currentTarget);
  const following = fields[index + 1];
  if (!following) return;
  event.preventDefault();
  following.focus();
}

const DAYS = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));
const MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const YEARS = Array.from({ length: 100 }, (_, index) => String(2015 - index));
const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

function numberSelect(name: string, label: string, values: string[], required = false) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-2 font-serif text-mute">
      {label}
      <select name={name} required={required} defaultValue="" onKeyDown={nextField} className="min-h-14 border-b border-gold/40 bg-ink font-serif text-2xl text-bone outline-none">
        <option value="" disabled={required}>{required ? " " : "—"}</option>
        {values.map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
    </label>
  );
}

export function House() {
  const [session, setSession] = useState<MindSession | null>(null);

  if (!session) {
    return (
      <main className="min-h-screen bg-ink text-bone">
        <div className="h-2 bg-crimson" />
        <form
          className="mx-auto flex min-h-[calc(100vh-0.5rem)] max-w-xl flex-col justify-center gap-8 px-6 py-12"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const year = String(data.get("year") ?? "");
            const month = String(data.get("month") ?? "");
            const day = String(data.get("day") ?? "");
            const hour = String(data.get("hour") ?? "");
            const minute = String(data.get("minute") ?? "");
            setSession(openMind({
              name: String(data.get("name") ?? "").trim(),
              desire: String(data.get("desire") ?? "").trim(),
              birth: {
                date: `${year}-${month}-${day}`,
                time: hour ? `${hour}:${minute || "00"}` : null,
                place: String(data.get("place") ?? "").trim() || null,
              },
              referenceInstant: new Date().toISOString(),
            }));
          }}
        >
          <p className="font-serif text-sm tracking-[0.35em] text-gold">THE COLLECTOR</p>
          <label className="flex flex-col gap-3">
            <span className="font-serif text-3xl leading-tight">Одно желание. На экран оно больше не вернётся.</span>
            <textarea required name="desire" rows={4} onKeyDown={nextField} className="min-h-28 resize-none border-0 border-b border-gold/50 bg-transparent py-3 font-serif text-2xl leading-snug text-bone outline-none" />
          </label>
          <div className="flex gap-4">
            {numberSelect("day", "День", DAYS, true)}
            {numberSelect("month", "Месяц", MONTHS, true)}
            {numberSelect("year", "Год", YEARS, true)}
          </div>
          <div className="flex gap-4">
            {numberSelect("hour", "Час", HOURS)}
            {numberSelect("minute", "Минута", MINUTES)}
          </div>
          <label className="flex flex-col gap-2 font-serif text-mute">
            Место
            <input name="place" onKeyDown={nextField} className="min-h-11 border-b border-gold/40 bg-transparent font-serif text-xl text-bone outline-none" />
          </label>
          <label className="flex flex-col gap-2 font-serif text-mute">
            Имя
            <input name="name" onKeyDown={nextField} className="min-h-11 border-b border-gold/40 bg-transparent font-serif text-xl text-bone outline-none" />
          </label>
          <button type="submit" className="min-h-12 self-start border border-gold px-8 font-serif text-xl text-bone">Войти</button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink text-bone">
      <div className="h-2 bg-crimson" />
      <section className="mx-auto flex min-h-[calc(100vh-0.5rem)] max-w-xl flex-col justify-center gap-8 px-6 py-16">
        {session.finale ? (
          <>
            {session.finale.lines.map((line) => <p key={line} className="font-serif text-2xl leading-snug">{line}</p>)}
            {session.finale.signs.map((sign) => (
              <p key={sign.object} className="font-serif text-3xl tracking-wide text-gold">
                {sign.object}
                <span className="mt-2 block text-xl">{sign.color}</span>
                <span className="block text-xl">{sign.material}</span>
                <span className="block text-xl">{sign.character}</span>
              </p>
            ))}
          </>
        ) : session.scene ? (
          <>
            {session.scene.lines.map((line) => <p key={line} className="font-serif text-2xl leading-snug">{line}</p>)}
            <div className="flex flex-col gap-3">
              {session.scene.choices.map((choice) => (
                <button key={choice.id} type="button" className="min-h-12 border border-gold px-5 py-3 text-left font-serif text-xl text-bone" onClick={() => setSession((current) => current && chooseMind(current, choice.id))}>
                  {choice.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
