/* Question definitions for cesca.
   Each question has:
     id      — stable key (used as map title + storage key)
     phase   — section grouping shown in the UI
     title   — the question itself
     help    — supporting text shown below the question
     type    — "long" | "short" | "list" | "single" | "multi"
     options — for single/multi types
     mapLabel — short label used on the brand map
     placeholder — input placeholder
*/

const QUESTIONS = [
  // ---------- PHASE 1 — DISCOVERY ----------
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
    title: "What are you trying to learn right now?",
    help: "The skills, ideas or worlds you're actively reaching toward. Not what you already know — what you're chasing.",
    type: "long",
    placeholder: "I'm trying to learn…"
  },
  {
    id: "share",
    phase: "Discovery",
    mapLabel: "What you want to share",
    title: "What do you want to share with people?",
    help: "What feels worth saying out loud? Could be process, opinions, finished work, lessons, questions you're sitting with.",
    type: "long",
    placeholder: "I want to share…"
  },
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
  {
    id: "goal_kind",
    phase: "Goals",
    mapLabel: "Type of goal",
    title: "What kind of growth do you want?",
    help: "More than one is fine — but try to rank what matters most.",
    type: "multi",
    options: [
      { value: "reach",      label: "Reach",       hint: "I want more people to see and follow my work." },
      { value: "money",      label: "Income",      hint: "I want to earn from this — clients, products, sponsorships." },
      { value: "community",  label: "Community",   hint: "I want a small, real circle of people around what I do." },
      { value: "career",     label: "Career",      hint: "I want this to open doors — jobs, collaborations, invitations." },
      { value: "craft",      label: "Craft",       hint: "I want sharing to make me better at the things I do." },
      { value: "freedom",    label: "Freedom",     hint: "I want eventually to do this on my own terms, full-time." }
    ]
  },
  {
    id: "goal_metric",
    phase: "Goals",
    mapLabel: "Concrete goal",
    title: "Pick one number that would mean something to you in six months.",
    help: "1,000 followers? €500/month from this? 5 paid clients? Three speaking invitations? It's just a marker — we can change it.",
    type: "short",
    placeholder: "In 6 months I'd like to…"
  },
  {
    id: "goal_why",
    phase: "Goals",
    mapLabel: "Why that goal",
    title: "And why that number, specifically?",
    help: "The number is a stand-in for something deeper. What does hitting it actually unlock for you?",
    type: "long",
    placeholder: "Because then I'd…"
  },

  // ---------- PHASE 2 — BRAND STRATEGY ----------
  {
    id: "thread",
    phase: "Brand Strategy",
    mapLabel: "The thread",
    title: "If you had to name the thread between everything you do — what would it be?",
    help: "Not a job title. A sensibility. \"I notice patterns no one else does.\" \"I make things that feel quiet.\" Bad first drafts welcome.",
    type: "long",
    placeholder: "The thread is…"
  },
  {
    id: "pillars",
    phase: "Brand Strategy",
    mapLabel: "Content pillars",
    title: "What are 3 to 5 content pillars you'd actually post about?",
    help: "Pillars are the recurring topics your content lives inside. Aim for things that overlap with at least two of the things you do.",
    type: "list",
    placeholder: "e.g. process notes"
  },
  {
    id: "series",
    phase: "Brand Strategy",
    mapLabel: "Series ideas",
    title: "Any series or repeating formats you'd love to do?",
    help: "Weekly sketch, monthly long-form, \"things I read this week\". Repeating formats let multi-passionate people anchor without flattening.",
    type: "list",
    placeholder: "e.g. monthly studio diary"
  },
  {
    id: "voice",
    phase: "Brand Strategy",
    mapLabel: "Voice",
    title: "How do you want to sound?",
    help: "Three words is enough. Warm, dry, technical, generous, sharp, curious, irreverent, slow.",
    type: "short",
    placeholder: "e.g. warm, curious, a bit dry"
  },
  {
    id: "no_go",
    phase: "Brand Strategy",
    mapLabel: "What you won't do",
    title: "What will you NOT do, ever?",
    help: "Naming the no-gos is half the brand. Hot takes? Selfies? Hustle posts? Specific clients? Be honest.",
    type: "long",
    placeholder: "I won't…"
  },
  {
    id: "channels",
    phase: "Brand Strategy",
    mapLabel: "Where you'll show up",
    title: "Where will you actually show up?",
    help: "Pick the platforms you'll genuinely use. One done well beats four half-done.",
    type: "multi",
    options: [
      { value: "instagram",  label: "Instagram" },
      { value: "tiktok",     label: "TikTok" },
      { value: "youtube",    label: "YouTube" },
      { value: "linkedin",   label: "LinkedIn" },
      { value: "twitter",    label: "Twitter / X" },
      { value: "newsletter", label: "Newsletter" },
      { value: "blog",       label: "Personal site / blog" },
      { value: "podcast",    label: "Podcast" }
    ]
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

const CHECKIN_QUESTIONS = [
  {
    id: "did",
    title: "What did you actually post or share since we last talked?",
    placeholder: "Even rough things count.",
    type: "long"
  },
  {
    id: "hard",
    title: "What was the hardest part?",
    placeholder: "Time? Confidence? Not knowing what to say?",
    type: "long"
  },
  {
    id: "felt_right",
    title: "What felt right? What sounded the most like you?",
    placeholder: "We want more of this.",
    type: "long"
  },
  {
    id: "adjust",
    title: "Anything you want to change about your pillars, voice or cadence?",
    placeholder: "If yes, we'll update the map.",
    type: "long"
  },
  {
    id: "next",
    title: "One small thing you'll try before our next check-in.",
    placeholder: "Make it small enough to actually do.",
    type: "short"
  }
];

const CHECKIN_INTERVAL_DAYS = 7; // first one after 7 days, then every 7
