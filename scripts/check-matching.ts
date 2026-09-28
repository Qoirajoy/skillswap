import {
  closenessScore,
  collegeKey,
  complementaryMatches,
  groupColleges,
  skillsMatch,
} from "../src/lib/matching";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(skillsMatch("Python", "Python 3"), "Python matches Python 3");
assert(skillsMatch("Python", "Python3"), "Python matches Python3");
assert(skillsMatch("Python", "Python-3"), "Python matches Python-3");
assert(!skillsMatch("art", "starting"), "art does not match starting");
assert(skillsMatch("design", "designing"), "design matches designing");
assert(collegeKey("College of Engineering") === collegeKey("Engineering"), "engineering colleges group");
assert(collegeKey("Business") === collegeKey("business"), "college case folds");
assert(collegeKey("Mechanical Engineering") !== collegeKey("Engineering"), "majors are not colleges");

const closer = closenessScore("design dashboard", "designing a dashboard for class");
const generic = closenessScore("design dashboard", "I can help with design");
assert(closer > generic, "dashboard context outranks a generic design match");
assert(
  closenessScore("plan dashboard", "plant growing") < closenessScore("plan dashboard", "a dashboard plan"),
  "an extra word outranks a shared beginning",
);

const cards = complementaryMatches(
  {
    id: "maya",
    name: "Maya",
    offered: [{ name: "Python", context: "" }],
    needed: [{ name: "presentation design", context: "designing a dashboard" }],
    profileOffers: ["Python"],
    profileWants: [],
  },
  [
    {
      id: "alex",
      name: "Alex",
      offered: [{ name: "presentation design", context: "dashboard slides" }],
      needed: [{ name: "Python 3", context: "" }],
      profileOffers: ["presentation design"],
      profileWants: ["Python 3"],
    },
    {
      id: "sam",
      name: "Sam",
      offered: [{ name: "Excel", context: "" }],
      needed: [{ name: "Python", context: "" }],
      profileOffers: ["Excel"],
      profileWants: ["Python"],
    },
  ],
);

assert(cards.length === 1 && cards[0].id === "alex", "Maya matches Alex and not Sam");
assert(cards[0].summary.includes("presentation design"), "match explains presentation design");
assert(cards[0].summary.includes("Python"), "match explains Python");
assert(groupColleges(["College of Engineering", "Engineering", "engineering"]).length === 1, "one engineering choice");
assert(
  groupColleges(["College of Engineering", "Engineering", "Engineering"]).some((group) => group.label === "Engineering"),
  "the most common spelling is the filter label",
);

console.log("matching checks passed");
