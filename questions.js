/* Ariadne — questions, taxonomy, ikigai prompts, and suggestion engines.
   Q types: long | short | list | single | multi | tagged | suggested-list | thread
*/

/* ------------------------------------------------------------------ *
 *  LEARNING TAXONOMY — macro → subcategories                         *
 *  Used by both "learning" and "share" questions.                    *
 * ------------------------------------------------------------------ */
const LEARNING_TAXONOMY = {
  "Visual art": [
    "Illustration", "Drawing", "Painting", "Animation", "3D / CGI",
    "Sculpture", "Ceramics", "Printmaking", "Collage", "Calligraphy",
    "Comics & graphic novels", "Tattoo art", "Mural / street art",
    "Concept art", "Character design", "Botanical illustration"
  ],
  "Photography & film": [
    "Photography", "Film photography", "Street photography", "Portrait",
    "Documentary", "Cinematography", "Directing", "Editing",
    "Sound design", "Color grading", "Screenwriting", "Producing",
    "Music videos", "Short film"
  ],
  "Design": [
    "Graphic design", "Type design", "Brand identity", "Editorial design",
    "UI / UX", "Product design", "Web design", "Motion design",
    "Industrial design", "Set design", "Costume design",
    "Interior design", "Packaging", "Service design", "Information design"
  ],
  "Writing": [
    "Fiction", "Non-fiction", "Essays", "Poetry", "Journalism",
    "Memoir", "Screenwriting", "Playwriting", "Copywriting",
    "Newsletter writing", "Blogging", "Translation", "Children's books"
  ],
  "Music & sound": [
    "Songwriting", "Music production", "DJing", "Beatmaking",
    "Mixing & mastering", "Sound design", "Field recording",
    "Composing", "Singing", "An instrument", "Music theory",
    "Live performance", "Sampling"
  ],
  "Performance": [
    "Acting", "Stand-up", "Improv", "Theater", "Public speaking",
    "Storytelling", "Voice acting", "Hosting", "Spoken word"
  ],
  "Movement & body": [
    "Dance", "Choreography", "Yoga", "Martial arts", "Climbing",
    "Running", "Parkour", "Pilates", "Strength training",
    "Somatics", "Breathwork", "Movement coaching"
  ],
  "Crafts & making": [
    "Woodworking", "Metalwork", "Leatherwork", "Sewing", "Knitting",
    "Embroidery", "Weaving", "Jewelry making", "Bookbinding",
    "Glassblowing", "Pottery", "Toy / model making", "Repair / restoration"
  ],
  "Food & drink": [
    "Cooking", "Baking", "Fermentation", "Pastry",
    "Mixology", "Coffee", "Wine", "Tea", "Food writing",
    "Recipe development", "Food styling", "Hosting / dinners"
  ],
  "Tech & code": [
    "Web development", "App development", "Game development",
    "AI / machine learning", "Data science", "Hardware / electronics",
    "Robotics", "Open source", "Cybersecurity", "DevOps",
    "Creative coding", "No-code", "Tooling"
  ],
  "Science & nature": [
    "Biology", "Ecology", "Astronomy", "Physics", "Chemistry",
    "Neuroscience", "Climate", "Geology", "Mathematics",
    "Birding", "Foraging", "Mycology"
  ],
  "Humanities & ideas": [
    "Philosophy", "History", "Literature", "Linguistics",
    "Anthropology", "Religion / spirituality", "Mythology",
    "Cultural criticism", "Politics", "Sociology", "Languages"
  ],
  "Wellbeing": [
    "Meditation", "Therapy / inner work", "Nutrition", "Sleep",
    "Mental health", "Herbalism", "Mindfulness", "Coaching"
  ],
  "Garden & nature": [
    "Gardening", "Permaculture", "Houseplants", "Foraging",
    "Composting", "Beekeeping", "Wild food"
  ],
  "Business & money": [
    "Entrepreneurship", "Marketing", "Sales", "Personal finance",
    "Investing", "Operations", "Freelancing", "Product management",
    "Negotiation", "Building teams"
  ],
  "People & community": [
    "Teaching", "Mentoring", "Community building", "Event hosting",
    "Activism", "Organizing", "Facilitation", "Coaching"
  ],
  "Travel & place": [
    "Solo travel", "Slow travel", "City exploration",
    "Outdoors / hiking", "Cultural travel", "Living abroad",
    "Van life / nomadism", "Architecture spotting"
  ],
  "Style & self": [
    "Fashion", "Personal style", "Sustainable fashion",
    "Makeup", "Hair", "Tailoring", "Vintage / archival"
  ]
};

/* ------------------------------------------------------------------ *
 *  IKIGAI PROMPTS — used when someone can't name their thread yet.   *
 * ------------------------------------------------------------------ */
const IKIGAI_PROMPTS = [
  {
    id: "love",
    title: "What do you love doing — even when no one's watching?",
    help: "The activities where time disappears. Not what looks good on paper."
  },
  {
    id: "good",
    title: "What are you naturally good at?",
    help: "What do people compliment you on without prompting? Strengths you might dismiss because they feel easy."
  },
  {
    id: "notice",
    title: "What do you notice that others don't?",
    help: "A pattern, a connection, an irritation, a kind of beauty. Multi-passionate people see across fields — what do you see?"
  },
  {
    id: "needed",
    title: "Who, specifically, would be glad you said this out loud?",
    help: "Don't moralize. \"My friends would\" is a fine answer. The thread often lives where your noticing meets someone else's relief."
  }
];

/* ------------------------------------------------------------------ *
 *  PRIMARY QUESTION FLOW                                             *
 * ------------------------------------------------------------------ */
const QUESTIONS = [
  /* ---- PHASE 1 — Discovery ---- */
  {
    id: "what_you_do",
    phase: "Discovery",
    mapLabel: "What you do",
    title: "What do you do? List all of it — even the things that feel unrelated.",
    help: "Don't tidy this up. Music, copywriting, urban planning, baking — write it all. The point is to see the full mess on paper.",
    type: "list",
    placeholder: "e.g. illustration"
  },
  {
    id: "learning",
    phase: "Discovery",
    mapLabel: "What you're learning",
    title: "What are you trying to learn or get deeper into?",
    help: "Pick from the list — it's wide on purpose — write your own, or both. Be greedy. We'll narrow down later.",
    type: "tagged",
    taxonomy: "LEARNING_TAXONOMY"
  },
  {
    id: "share",
    phase: "Discovery",
    mapLabel: "What you want to share",
    title: "And of all of that — what do you actually want to share with people?",
    help: "Same picker. Pull from what you're learning, or pick different things entirely. What you want to share isn't always what you're best at.",
    type: "tagged",
    taxonomy: "LEARNING_TAXONOMY"
  },

  /* ---- PHASE 2 — The Why ---- */
  {
    id: "why",
    phase: "The Why",
    mapLabel: "Why a personal brand",
    title: "Why are you building a personal brand? The honest reason.",
    help: "Not the LinkedIn answer. The real one. \"I want to be known\", \"I want to leave my job\", \"I'm tired of being invisible\", \"I want a community\" — all valid.",
    type: "long",
    placeholder: "Honestly, I'm doing this because…"
  },
  {
    id: "audience",
    phase: "The Why",
    mapLabel: "Who you want to reach",
    title: "Who do you actually want to reach?",
    help: "Be specific. \"Designers in their first job\" beats \"creative people\". If you don't know yet, that's an open loop.",
    type: "long",
    placeholder: "The people I'd love to find me are…"
  },

  /* ---- PHASE 3 — What This Means (meaning, not numbers) ---- */
  {
    id: "goal_change",
    phase: "What This Means",
    mapLabel: "What changes if this works",
    title: "If this works — really works — what changes in your life?",
    help: "Not numbers. Not yet. The shape of a regular Tuesday. The conversations you'd have. What you'd say no to. What you'd let yourself do.",
    type: "long",
    placeholder: "If this works, my life looks like…"
  },
  {
    id: "goal_signal",
    phase: "What This Means",
    mapLabel: "Signals it's working",
    title: "What's a small signal you'd notice that tells you it's working?",
    help: "Not a follower count. Smaller, more telling. \"A stranger emails me about a piece I made.\" \"Someone says back what I've been trying to say.\" \"I'm asked to talk about something I love.\"",
    type: "long",
    placeholder: "I'd know it's working when…"
  },
  {
    id: "goal_kind",
    phase: "What This Means",
    mapLabel: "What kind of growth matters",
    title: "What kinds of growth actually matter to you?",
    help: "Pick everything that's true. We can rank later — for now, just notice what lights up.",
    type: "multi",
    options: [
      { value: "depth",     label: "Depth",     hint: "Fewer, more meaningful connections with the right people." },
      { value: "reach",     label: "Reach",     hint: "My work in front of more eyes — yes, the number matters." },
      { value: "income",    label: "Income",    hint: "I want this to make money, eventually or now." },
      { value: "community", label: "Community", hint: "A small circle that talks back, not an audience." },
      { value: "career",    label: "Career",    hint: "Doors I can't open from inside a job — invitations, collaborations." },
      { value: "craft",     label: "Craft",     hint: "Sharing makes me a better maker." },
      { value: "freedom",   label: "Freedom",   hint: "Eventually, this on my own terms — full-time or close to it." },
      { value: "legacy",    label: "Legacy",    hint: "Something that exists after the scrolling stops." }
    ]
  },

  /* ---- PHASE 4 — The Thread (with ikigai branch) ---- */
  {
    id: "thread",
    phase: "The Thread",
    mapLabel: "The thread",
    title: "What's the thread between everything you do?",
    help: "Some people already feel it and just need to write it. Others don't — and that's why I have a guided exercise below. Either is a real way through.",
    type: "thread",
    placeholder: "The thread is…"
  },

  /* ---- PHASE 5 — Brand Strategy (suggestion-driven) ---- */
  {
    id: "pillars",
    phase: "Brand Strategy",
    mapLabel: "Content pillars",
    title: "Content pillars — the recurring topics your stuff lives inside.",
    help: "Based on what you've told me, here are pillars that fit you. Tap the ones you'd actually post about. Add your own at the bottom — what you write trumps what I suggest.",
    type: "suggested-list",
    suggester: "suggestPillars"
  },
  {
    id: "series",
    phase: "Brand Strategy",
    mapLabel: "Series & formats",
    title: "Repeating formats give multi-passionates an anchor without flattening you.",
    help: "Here are formats that work for people doing what you're doing. Pick what feels doable on a tired week. Add anything I missed.",
    type: "suggested-list",
    suggester: "suggestFormats"
  },
  {
    id: "voice",
    phase: "Brand Strategy",
    mapLabel: "Voice",
    title: "How do you want to sound?",
    help: "Three words is enough. Warm, dry, technical, generous, sharp, curious, irreverent, slow, quiet, plain.",
    type: "short",
    placeholder: "e.g. warm, curious, a bit dry"
  },
  {
    id: "no_go",
    phase: "Brand Strategy",
    mapLabel: "What you won't do",
    title: "What will you NOT do, ever?",
    help: "Naming the no-gos is half the brand. Hot takes? Selfies? Hustle posts? Specific clients? Be honest — this protects you later.",
    type: "long",
    placeholder: "I won't…"
  },
  {
    id: "channels",
    phase: "Brand Strategy",
    mapLabel: "Where you'll show up",
    title: "Platforms — where will you actually show up?",
    help: "Based on your work, here's what tends to fit. One platform done well beats four half-done. Pick what you'll genuinely use.",
    type: "suggested-list",
    suggester: "suggestChannels"
  },
  {
    id: "cadence",
    phase: "Brand Strategy",
    mapLabel: "Cadence you can sustain",
    title: "How often can you actually post — on a tired week?",
    help: "Not your best week. The version of you with a deadline and a cold. That's the real cadence.",
    type: "short",
    placeholder: "e.g. once a week + a monthly long piece"
  }
];

/* ------------------------------------------------------------------ *
 *  CHECK-INS                                                         *
 * ------------------------------------------------------------------ */
const CHECKIN_QUESTIONS = [
  { id: "did",        type: "long",  title: "What did you actually post or share since we last talked?", placeholder: "Even rough things count." },
  { id: "hard",       type: "long",  title: "What was the hardest part?", placeholder: "Time? Confidence? Not knowing what to say?" },
  { id: "felt_right", type: "long",  title: "What felt right? What sounded the most like you?", placeholder: "We want more of this." },
  { id: "adjust",     type: "long",  title: "Anything you want to change about your pillars, voice or cadence?", placeholder: "If yes, we'll update the map." },
  { id: "next",       type: "short", title: "One small thing you'll try before our next check-in.", placeholder: "Make it small enough to actually do." }
];

const CHECKIN_INTERVAL_DAYS = 7;

/* ================================================================== *
 *  SUGGESTION ENGINES                                                *
 *  Pure functions over state.answers — used by suggested-list type.  *
 * ================================================================== */

const PILLAR_TEMPLATES = {
  "Visual art":        ["Process notes from the studio", "References and influences I'm drawing from", "Half-finished work and what I learned", "How I look at other people's work"],
  "Photography & film":["Behind the frame — how a shot came together", "What I'm watching, with notes", "On-location diaries"],
  "Design":            ["Design decisions, explained", "Critiques (kind ones) of work in the wild", "Tools, and how I actually use them"],
  "Writing":           ["Drafts and discards", "What I'm reading and why", "On the writing life", "Annotated reading lists"],
  "Music & sound":     ["Demos in progress", "What I'm sampling and why", "Listening notes"],
  "Performance":       ["On stage / off stage", "Bits that didn't work", "Voice as a craft"],
  "Movement & body":   ["Training notes", "How my body learns", "Practice as a practice"],
  "Crafts & making":   ["From raw material to thing", "Tool talk", "Mistakes that taught me something"],
  "Food & drink":      ["What I'm cooking this week", "Recipe rewrites", "On taste"],
  "Tech & code":       ["Build logs", "Things I broke and fixed", "Tools I'm trying"],
  "Science & nature":  ["What I'm learning right now", "Good ideas, plainly explained", "Field notes"],
  "Humanities & ideas":["Ideas I'm chewing on", "Books changing my mind", "Connections across disciplines"],
  "Wellbeing":         ["What's working for me right now", "Practices, honestly described", "On rest as a craft"],
  "Garden & nature":   ["What's growing", "Seasonal notes", "Plants as teachers"],
  "Business & money":  ["Behind the numbers of my work", "What I charge and why", "Lessons from running my own thing"],
  "People & community":["How I gather people", "Teaching publicly", "Conversations worth having"],
  "Travel & place":    ["Field notes from a place", "How a city changes how I work", "Slow travel diaries"],
  "Style & self":      ["What I'm wearing and why", "Style as identity", "Archive finds"]
};

const UNIVERSAL_PILLARS = [
  "Lessons from doing too much at once",
  "Behind-the-scenes of my actual week",
  "What I'm questioning right now"
];

const FORMAT_TEMPLATES = {
  "Visual art":        ["Weekly sketch", "Monthly studio dump", "Process timelapse", "Sketchbook tour"],
  "Photography & film":["Weekly contact sheet", "One photo, one paragraph", "Roll-of-the-month"],
  "Design":            ["Design teardown of the week", "Before / after redesigns", "Tool of the week"],
  "Writing":           ["Sunday letter", "Monday reading notes", "Drafts series"],
  "Music & sound":     ["Demo Friday", "One sample, one story", "Mix of the month"],
  "Performance":       ["Bit of the week", "Backstage diary"],
  "Movement & body":   ["Training Tuesday", "How my body is learning"],
  "Crafts & making":   ["Make-it-Monday", "From scratch series"],
  "Food & drink":      ["What I cooked this week", "Recipe rewrite series"],
  "Tech & code":       ["Build-in-public log", "What I broke this week"],
  "Science & nature":  ["Idea of the week", "Field note Friday"],
  "Humanities & ideas":["Idea I'm chewing on", "Book diary"],
  "Wellbeing":         ["What's working this week", "Practice notes"],
  "Garden & nature":   ["Garden Sunday", "Seasonal almanac"],
  "Business & money":  ["Behind the business", "Numbers Friday"],
  "People & community":["Conversation of the week", "Gathering notes"],
  "Travel & place":    ["Postcard series", "City diaries"],
  "Style & self":      ["Outfit of the week", "Archive finds"]
};

const UNIVERSAL_FORMATS = [
  "Monthly recap: what I made, learned, abandoned",
  "Open question of the week",
  "Now-page: what I'm working on right now"
];

const PLATFORM_AFFINITY = {
  "Visual art":        ["Instagram", "TikTok", "YouTube", "Personal site"],
  "Photography & film":["Instagram", "YouTube", "Personal site"],
  "Design":            ["Instagram", "Twitter / X", "LinkedIn", "Personal site"],
  "Writing":           ["Newsletter", "Twitter / X", "Personal site / blog", "Substack"],
  "Music & sound":     ["Instagram", "TikTok", "YouTube", "SoundCloud"],
  "Performance":       ["TikTok", "Instagram", "YouTube"],
  "Movement & body":   ["Instagram", "YouTube", "TikTok"],
  "Crafts & making":   ["Instagram", "YouTube", "TikTok"],
  "Food & drink":      ["Instagram", "TikTok", "YouTube", "Newsletter"],
  "Tech & code":       ["Twitter / X", "GitHub", "YouTube", "Personal site"],
  "Science & nature":  ["Newsletter", "YouTube", "Twitter / X"],
  "Humanities & ideas":["Newsletter", "Personal site / blog", "Podcast"],
  "Wellbeing":         ["Instagram", "Newsletter", "Podcast"],
  "Garden & nature":   ["Instagram", "Newsletter", "YouTube"],
  "Business & money":  ["LinkedIn", "Twitter / X", "Newsletter"],
  "People & community":["Newsletter", "LinkedIn", "Instagram"],
  "Travel & place":    ["Instagram", "YouTube", "Newsletter"],
  "Style & self":      ["Instagram", "TikTok", "Pinterest"]
};

const ALL_PLATFORMS = [
  "Instagram", "TikTok", "YouTube", "Newsletter", "Twitter / X",
  "LinkedIn", "Personal site / blog", "Podcast", "Pinterest",
  "GitHub", "SoundCloud", "Substack", "Medium"
];

/* helpers ---------------------------------------------------------- */

function _collectMacros(answers, ids) {
  const macros = [];
  const seen = new Set();
  ids.forEach(id => {
    const a = answers[id];
    if (!a || !Array.isArray(a.value)) return;
    a.value.forEach(item => {
      if (item && typeof item === "object" && item.macro && item.macro !== "custom") {
        if (!seen.has(item.macro)) { seen.add(item.macro); macros.push(item.macro); }
      }
    });
  });
  return macros;
}

function suggestPillars(answers) {
  const macros = _collectMacros(answers, ["share", "learning", "what_you_do"]);
  const out = [];
  const seen = new Set();
  const push = label => { if (label && !seen.has(label)) { seen.add(label); out.push(label); } };

  macros.forEach(m => (PILLAR_TEMPLATES[m] || []).forEach(push));
  if (macros.length >= 2) push(`Where ${macros[0].toLowerCase()} meets ${macros[1].toLowerCase()}`);
  if (macros.length >= 3) push(`Connections between ${macros[0].toLowerCase()}, ${macros[1].toLowerCase()} and ${macros[2].toLowerCase()}`);
  UNIVERSAL_PILLARS.forEach(push);
  return out.slice(0, 14);
}

function suggestFormats(answers) {
  const macros = _collectMacros(answers, ["share", "learning"]);
  const out = [];
  const seen = new Set();
  const push = label => { if (label && !seen.has(label)) { seen.add(label); out.push(label); } };
  macros.forEach(m => (FORMAT_TEMPLATES[m] || []).forEach(push));
  UNIVERSAL_FORMATS.forEach(push);
  return out.slice(0, 12);
}

function suggestChannels(answers) {
  const macros = _collectMacros(answers, ["share", "learning"]);
  const counts = {};
  macros.forEach(m => (PLATFORM_AFFINITY[m] || []).forEach(p => counts[p] = (counts[p] || 0) + 1));
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([p]) => p);
  ALL_PLATFORMS.forEach(p => { if (!ranked.includes(p)) ranked.push(p); });
  return ranked;
}
