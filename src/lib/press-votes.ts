import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

export interface PressVoteSummary {
  totalStars: number;
  voteCount: number;
  average: number;
}

export interface PressVotesData {
  byTrack: Record<string, PressVoteSummary>;
  bySession: Record<string, Record<string, number>>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const VOTES_PATH = path.join(DATA_DIR, "press-votes.json");

function emptyVotes(): PressVotesData {
  return { byTrack: {}, bySession: {} };
}

function summarize(totalStars: number, voteCount: number): PressVoteSummary {
  return {
    totalStars,
    voteCount,
    average: voteCount > 0 ? Math.round((totalStars / voteCount) * 10) / 10 : 0,
  };
}

export function readPressVotes(): PressVotesData {
  if (!existsSync(VOTES_PATH)) return emptyVotes();
  try {
    const parsed = JSON.parse(readFileSync(VOTES_PATH, "utf-8")) as PressVotesData;
    return {
      byTrack: parsed.byTrack ?? {},
      bySession: parsed.bySession ?? {},
    };
  } catch {
    return emptyVotes();
  }
}

export function recordPressVote(
  sessionId: string,
  trackId: string,
  stars: number
): PressVoteSummary {
  const safeStars = Math.min(5, Math.max(1, Math.round(stars)));
  const data = readPressVotes();
  const prevStars = data.bySession[sessionId]?.[trackId];
  if (prevStars === safeStars) {
    return data.byTrack[trackId] ?? summarize(0, 0);
  }

  if (!data.bySession[sessionId]) data.bySession[sessionId] = {};
  data.bySession[sessionId]![trackId] = safeStars;

  const allVotes = Object.values(data.bySession).map((session) => session[trackId]).filter(Boolean) as number[];
  const totalStars = allVotes.reduce((sum, value) => sum + value, 0);
  const voteCount = allVotes.length;
  data.byTrack[trackId] = summarize(totalStars, voteCount);

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(VOTES_PATH, JSON.stringify(data, null, 2), "utf-8");
  return data.byTrack[trackId]!;
}

export function getPressVoteForSession(sessionId: string, trackId: string): number | null {
  const data = readPressVotes();
  return data.bySession[sessionId]?.[trackId] ?? null;
}
