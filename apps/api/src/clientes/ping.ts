import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface PingResult {
  success: boolean;
  ip: string | null;
  error?: string;
  packets_sent: number;
  packets_received: number;
  packets_lost: number;
  packet_loss: number;
  min_time: number;
  avg_time: number;
  max_time: number;
  raw_output: string;
}

const IPV4 = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

export function isSafeIpv4(value: string | null | undefined): value is string {
  const ip = (value ?? "").trim();
  return IPV4.test(ip);
}

export function parsePingOutput(output: string, ip: string, count: number, windows: boolean): PingResult {
  let received = 0;
  let minTime = 0;
  let avgTime = 0;
  let maxTime = 0;
  if (windows) {
    const receivedMatch = /Recibidos = (\d+)/.exec(output) ?? /Received = (\d+)/.exec(output);
    if (receivedMatch) {
      received = Number(receivedMatch[1]);
    }
    const timeMatch =
      /M[ií]nimo = (\d+)ms.*M[áa]ximo = (\d+)ms.*Media = (\d+)ms/s.exec(output) ??
      /Minimum = (\d+)ms.*Maximum = (\d+)ms.*Average = (\d+)ms/s.exec(output);
    if (timeMatch) {
      minTime = Number(timeMatch[1]);
      maxTime = Number(timeMatch[2]);
      avgTime = Number(timeMatch[3]);
    }
  } else {
    const receivedMatch = /(\d+) received/.exec(output);
    if (receivedMatch) {
      received = Number(receivedMatch[1]);
    }
    const timeMatch = /min\/avg\/max.*= ([\d.]+)\/([\d.]+)\/([\d.]+)/.exec(output);
    if (timeMatch) {
      minTime = Number(timeMatch[1]);
      avgTime = Number(timeMatch[2]);
      maxTime = Number(timeMatch[3]);
    }
  }
  const lost = Math.max(0, count - received);
  const loss = count > 0 ? Math.round((lost / count) * 10000) / 100 : 100;
  return {
    success: received > 0,
    ip,
    packets_sent: count,
    packets_received: received,
    packets_lost: lost,
    packet_loss: loss,
    min_time: minTime,
    avg_time: avgTime,
    max_time: maxTime,
    raw_output: output,
  };
}

function failed(ip: string | null, error: string, count: number): PingResult {
  return {
    success: false,
    ip,
    error,
    packets_sent: count,
    packets_received: 0,
    packets_lost: count,
    packet_loss: 100,
    min_time: 0,
    avg_time: 0,
    max_time: 0,
    raw_output: "",
  };
}

/** Ping uniquement une IPv4 déjà validée. Aucun shell. */
export async function pingIp(ipAddress: string | null | undefined, count = 10): Promise<PingResult> {
  const ip = (ipAddress ?? "").trim();
  if (!ip) {
    return failed(null, "IP no configurada", 0);
  }
  if (!isSafeIpv4(ip)) {
    return failed(ip, "IP no válida", 0);
  }
  const windows = process.platform === "win32";
  const args = windows ? ["-n", String(count), "-w", "1000", ip] : ["-c", String(count), "-W", "1", ip];
  try {
    const result = await execFileAsync("ping", args, { timeout: 30_000, windowsHide: true });
    return parsePingOutput(`${result.stdout ?? ""}\n${result.stderr ?? ""}`, ip, count, windows);
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string; killed?: boolean };
    if (err.code === "ENOENT") {
      return failed(ip, "El comando ping no está disponible en el servidor.", count);
    }
    if (err.killed || err.code === "ETIMEDOUT") {
      return failed(ip, "Timeout - El ping tardó demasiado", count);
    }
    const output = `${err.stdout ?? ""}\n${err.stderr ?? ""}`;
    if (output.trim()) {
      return parsePingOutput(output, ip, count, windows);
    }
    return failed(ip, "No se pudo comprobar la conectividad.", count);
  }
}
