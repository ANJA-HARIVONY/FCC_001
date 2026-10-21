import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";

interface PendienteNotice {
  id: number;
  intitule: string;
  client_nom: string;
  client_ville: string;
  operateur_nom: string;
  tiempo_transcurrido: string;
}

const HOUR = 60 * 60 * 1000;
const POLL = 30 * 60 * 1000;

function recent(tiempo: string): boolean {
  const hours = Number(tiempo.match(/(\d+)h/)?.[1] ?? 0);
  return hours <= 2;
}

function playDingDong() {
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const tones: [number, number, number][] = [
    [784, 0, 0.18],
    [988, 0.16, 0.22],
  ];
  for (const [frequency, offset, duration] of tones) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + offset;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }
  window.setTimeout(() => void ctx.close(), 800);
}

export function PendienteToasts() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PendienteNotice[]>([]);
  const shown = useRef(new Map<number, number>());
  const audioUnlocked = useRef(false);

  useEffect(() => {
    const unlock = () => {
      audioUnlocked.current = true;
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    async function check() {
      try {
        const payload = await api<{ success: boolean; notifications: PendienteNotice[] }>("/api/incidents-pendientes");
        if (!alive || !payload.success) return;
        const now = Date.now();
        const fresh = payload.notifications.filter((row) => {
          const last = shown.current.get(row.id) ?? 0;
          return now - last >= HOUR;
        });
        if (!fresh.length) return;
        let sounded = false;
        for (const row of fresh) {
          shown.current.set(row.id, now);
          if (!sounded && audioUnlocked.current) {
            playDingDong();
            sounded = true;
          }
        }
        setItems((current) => [...fresh, ...current].slice(0, 6));
        window.setTimeout(() => {
          const ids = new Set(fresh.map((row) => row.id));
          setItems((current) => current.filter((row) => !ids.has(row.id)));
        }, 5000);
      } catch {
        /* el aviso no bloquea la página */
      }
    }
    void check();
    const timer = window.setInterval(() => void check(), POLL);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  if (!items.length) return null;

  return (
    <div id="notification-container" className="notification-container" role="region" aria-live="polite" aria-label="Notificaciones de incidencias pendientes">
      {items.map((item) => (
        <div
          key={item.id}
          className={recent(item.tiempo_transcurrido) ? "notification-toast notification-recent" : "notification-toast"}
          role="link"
          tabIndex={0}
          onClick={() => navigate(`/incidencias/${item.id}`)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              navigate(`/incidencias/${item.id}`);
            }
          }}
        >
          <span className="notification-icon-wrap" aria-hidden="true">
            <i className="fas fa-exclamation-triangle notification-icon" />
          </span>
          <div className="notification-content">
            {item.client_nom ? <div className="notification-title">{item.client_nom}</div> : null}
            {item.intitule ? <div className="notification-subtitle">{item.intitule}</div> : null}
            <div className="notification-meta">
              {item.operateur_nom ? <div className="notification-operador">{item.operateur_nom}</div> : null}
              {item.client_ville ? <div className="notification-barrio">{item.client_ville}</div> : null}
            </div>
          </div>
          <button
            type="button"
            className="notification-close"
            aria-label="Cerrar"
            onClick={(event) => {
              event.stopPropagation();
              setItems((current) => current.filter((row) => row.id !== item.id));
            }}
          >
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
