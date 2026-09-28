const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

export type SkillKind = "offer" | "want";

export type SkillSide = {
  name: string;
  context: string;
};

export type MatchPerson = {
  id: string;
  name: string;
  offered: SkillSide[];
  needed: SkillSide[];
  profileOffers: string[];
  profileWants: string[];
};

export type MissingSkill = {
  name: string;
  kind: SkillKind;
};

export type MatchCard = {
  id: string;
  name: string;
  summary: string;
  score: number;
  missing: MissingSkill[];
};

export function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/([a-z])(\d)/gi, "$1 $2")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(value: string, dropStop = false) {
  const parts = normalizeText(value).split(" ").filter(Boolean);
  if (!dropStop) return parts;
  return parts.filter((word) => !STOP_WORDS.has(word));
}

function containsPhrase(haystack: string[], needle: string[]) {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let index = 0; index <= haystack.length - needle.length; index += 1) {
    if (needle.every((word, offset) => haystack[index + offset] === word)) {
      return true;
    }
  }
  return false;
}

function isPrefix(shorter: string, longer: string) {
  return shorter.length >= 4 && longer.length > shorter.length && longer.startsWith(shorter);
}

export function skillsMatch(left: string, right: string) {
  const a = tokens(left);
  const b = tokens(right);
  if (a.length === 0 || b.length === 0) return false;
  if (a.join(" ") === b.join(" ")) return true;
  if (containsPhrase(a, b) || containsPhrase(b, a)) return true;
  return a.some((word) => b.some((other) => isPrefix(word, other) || isPrefix(other, word)));
}

export function closenessScore(source: string, target: string) {
  const sourceWords = tokens(source, true);
  const targetWords = tokens(target, true);
  const used = new Set<number>();
  let score = 0;

  for (const word of sourceWords) {
    let best = 0;
    let bestIndex = -1;
    targetWords.forEach((other, index) => {
      if (used.has(index)) return;
      const value = word === other ? 10 : isPrefix(word, other) || isPrefix(other, word) ? 2 : 0;
      if (value > best) {
        best = value;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0) {
      used.add(bestIndex);
      score += best;
    }
  }

  return score;
}

export function collegeKey(name: string) {
  let value = name.trim().toLowerCase().replace(/\s+/g, " ");
  let previous = "";
  while (value !== previous) {
    previous = value;
    value = value.replace(/^(college of|school of|the)\s+/, "");
  }
  return value;
}

export function groupColleges(names: string[]) {
  const groups = new Map<string, Map<string, number>>();
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const key = collegeKey(trimmed);
    if (!key) continue;
    const counts = groups.get(key) ?? new Map<string, number>();
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
    groups.set(key, counts);
  }

  return [...groups.entries()]
    .map(([key, counts]) => {
      const label = [...counts.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      )[0][0];
      return { key, label };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function searchTokens(query: string) {
  return [...new Set(tokens(query, true))].slice(0, 12);
}

function bestOverlap(needs: SkillSide[], offers: SkillSide[]) {
  let best: { need: SkillSide; offer: SkillSide; score: number } | null = null;
  for (const need of needs) {
    for (const offer of offers) {
      if (!skillsMatch(need.name, offer.name)) continue;
      const score = closenessScore(
        `${need.name} ${need.context}`,
        `${offer.name} ${offer.context}`,
      );
      if (!best || score > best.score) best = { need, offer, score };
    }
  }
  return best;
}

function profileHas(names: string[], skillName: string) {
  return names.some((name) => skillsMatch(name, skillName));
}

function directionSentence(
  needName: string,
  offerName: string,
  needPerson: string,
  offerPerson: string,
) {
  const same = normalizeText(needName) === normalizeText(offerName);
  const offerText = same ? "offers it" : `offers ${offerName}`;
  if (needPerson === "You") {
    return `You need ${needName} — ${offerPerson} ${offerText}`;
  }
  return `${needPerson} needs ${needName} — you ${same ? "offer it" : `offer ${offerName}`}`;
}

export function complementaryMatches(me: MatchPerson, others: MatchPerson[]) {
  const cards: MatchCard[] = [];
  for (const other of others) {
    if (other.id === me.id) continue;
    const theyHelpMe = bestOverlap(me.needed, other.offered);
    const iHelpThem = bestOverlap(other.needed, me.offered);
    if (!theyHelpMe || !iHelpThem) continue;

    const missing: MissingSkill[] = [];
    if (!profileHas(me.profileOffers, iHelpThem.need.name)) {
      missing.push({ name: iHelpThem.need.name, kind: "offer" });
    }
    if (!profileHas(me.profileWants, theyHelpMe.offer.name)) {
      missing.push({ name: theyHelpMe.offer.name, kind: "want" });
    }

    cards.push({
      id: other.id,
      name: other.name || "Student",
      summary: `${directionSentence(theyHelpMe.need.name, theyHelpMe.offer.name, "You", other.name || "They")}. ${directionSentence(iHelpThem.need.name, iHelpThem.offer.name, other.name || "They", "you")}.`,
      score: theyHelpMe.score + iHelpThem.score,
      missing,
    });
  }

  return cards.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function rankItems<T extends { created_at: string }>(
  items: T[],
  query: string,
  matches: (item: T) => boolean,
  textOf: (item: T) => string,
) {
  const filtered = query.trim() ? items.filter(matches) : items;
  return filtered.sort((a, b) => {
    if (query.trim()) {
      const diff = closenessScore(query, textOf(b)) - closenessScore(query, textOf(a));
      if (diff !== 0) return diff;
    }
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}
