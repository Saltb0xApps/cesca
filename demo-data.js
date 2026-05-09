/* Ariadne — demo personas.
   Three multi-passionate avatars with fully-populated brand maps + a few
   weeks of check-ins and per-platform numbers. Lets a visitor see the app
   "alive" without doing the whole flow first.

   To use:
     1. Visit /app.html?demo=maya  (or theo, or carla) — hydrates state and
        sends the user to the dashboard.
     2. Or click a persona on the landing CTA.
     3. Always reversible: the dashboard's "Reset" wipes everything.
*/

(function () {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();

  // helper: build the answer object the app expects
  const A = (value) => ({ value, unknown: false, updatedAt: now });

  /* -------------------- MAYA -------------------- */
  // Illustrator + DJ + cook. Lives in Lisbon. Posts since forever, always
  // felt scattered. Wants depth + community more than reach.
  const maya = {
    name: "Maya — illustrator / DJ / cook",
    description:
      "Illustrator who DJs on weekends and runs supper clubs once a month. Has been posting for years; nobody can quite tell what she's about.",
    answers: {
      what_you_do: A([
        "Illustration",
        "DJing electronic / dance",
        "Hosting supper clubs",
        "Photography (of food + studio life)",
        "Occasional zine making",
      ]),
      learning: A([
        "Illustration", "Risograph printing", "DJing", "Mixing & mastering",
        "Pastry", "Fermentation", "Food styling"
      ]),
      share: A([
        "Illustration", "DJing", "Cooking", "Hosting / dinners", "Food styling"
      ]),
      why: A(
        "Honestly? I'm tired of feeling invisible. I make a lot, and people who " +
        "see one thing have no idea I do the others. I'd love a small group of " +
        "people who actually 'get' me — and eventually I'd love this to fund " +
        "more of my time."
      ),
      audience: A(
        "Designers and other creative-leaning people in their late 20s to mid " +
        "30s who cook for friends, save playlists, and follow weird zines. " +
        "Mostly Europe. They like beautiful but unfussy things."
      ),
      goal_change: A(
        "I'd run one supper club a month with a sold-out guest list, sell a " +
        "small zine of recipes + illustrations once or twice a year, and have " +
        "a regular Saturday night DJ slot somewhere I love. Two days a week " +
        "of client illustration, three days for my own things."
      ),
      goal_signal: A(
        "Someone I don't know writes to me about the connection between my " +
        "food posts and my mixes — without me ever spelling it out."
      ),
      goal_kind: A(["depth", "community", "craft", "freedom"]),
      thread: A(
        "I make things people can taste, see, or dance to — sensory craft for " +
        "people who want their week to feel a little more delicious."
      ),
      pillars: A([
        "Studio diary (illustration in progress)",
        "Recipes with a story",
        "Mix tapes + the night that made them",
        "Behind a supper club"
      ]),
      series: A([
        "Weekly studio reel (Instagram)",
        "Monthly recipe-letter (Substack)",
        "Monthly mix + liner notes (SoundCloud)"
      ]),
      voice: A("warm, sensory, a bit dry"),
      no_go: A(
        "No hot takes. No selfies. No hustle posts. No 'creator economy' " +
        "language. No client work for fast-fashion brands."
      ),
      channels: A(["Instagram", "Newsletter (Substack)", "SoundCloud"]),
      cadence: A("1 reel/week + 1 newsletter/month + 1 mix/month")
    },
    checkins: [
      {
        offsetDays: 35,
        answers: {
          did:        "Three studio reels (one went a bit viral — 12k views), one recipe newsletter on slow tomatoes, no mix this month.",
          hard:       "Holding the cadence for the mix while client work was nuts.",
          felt_right: "The tomato newsletter — people DM'd me about it for days.",
          adjust:     "Maybe drop reel cadence to 2 a fortnight, give the mix more room.",
          next:       "Finish the August mix and write the liner notes properly."
        }
      },
      {
        offsetDays: 28,
        answers: {
          did:        "Studio reel x2, August mix released with full liner notes.",
          hard:       "The mix took a whole Sunday. I'm not sure that was worth it for the engagement.",
          felt_right: "The liner notes felt like 'me' more than the mix did, weirdly.",
          adjust:     "Lean harder on writing alongside the audio. Maybe the mix is the excuse.",
          next:       "Try a recipe-letter that ends with a one-track 'soundtrack' link."
        }
      },
      {
        offsetDays: 21,
        answers: {
          did:        "Recipe-letter on figs with a soundtrack at the end. Two studio reels.",
          hard:       "Finding the right track for the figs — took 3 hours of listening.",
          felt_right: "The soundtrack idea. People replied. One person asked for a wedding playlist (?!).",
          adjust:     "This is starting to feel like the actual brand.",
          next:       "Run a small supper club this month and post the prep, not the dinner."
        }
      },
      {
        offsetDays: 14,
        answers: {
          did:        "Supper club prep documented — 4 reels across the week. The dinner itself I just lived in.",
          hard:       "Resisting the urge to film the dinner.",
          felt_right: "The mise-en-place reel. Quiet, slow, no voiceover.",
          adjust:     "I think 'quiet' is the voice. Less talking.",
          next:       "Newsletter about hosting without performing."
        }
      },
      {
        offsetDays: 7,
        answers: {
          did:        "Newsletter on hosting without performing. Two reels. September mix half-done.",
          hard:       "The newsletter took two evenings — I want it to feel less precious.",
          felt_right: "The replies. Three new subscribers from one share.",
          adjust:     "Voice is dialled in. Cadence is right. Keep going.",
          next:       "Finish the mix; book a date for the next supper club."
        }
      }
    ],
    platformLogs: buildLogs([
      { offsetDays: 35, platform: "Instagram",            followers: 1180, posts: 4, notes: "studio diary format" },
      { offsetDays: 35, platform: "Newsletter (Substack)", followers: 84,  posts: 1, notes: "tomatoes" },
      { offsetDays: 35, platform: "SoundCloud",           followers: 210, posts: 0, notes: "" },
      { offsetDays: 28, platform: "Instagram",            followers: 1245, posts: 3, notes: "" },
      { offsetDays: 28, platform: "Newsletter (Substack)", followers: 92,  posts: 0, notes: "" },
      { offsetDays: 28, platform: "SoundCloud",           followers: 246, posts: 1, notes: "August mix + liner notes" },
      { offsetDays: 21, platform: "Instagram",            followers: 1320, posts: 3, notes: "" },
      { offsetDays: 21, platform: "Newsletter (Substack)", followers: 121, posts: 1, notes: "figs + soundtrack — biggest reply count yet" },
      { offsetDays: 21, platform: "SoundCloud",           followers: 252, posts: 0, notes: "" },
      { offsetDays: 14, platform: "Instagram",            followers: 1480, posts: 4, notes: "supper-club prep series" },
      { offsetDays: 14, platform: "Newsletter (Substack)", followers: 134, posts: 0, notes: "" },
      { offsetDays: 14, platform: "SoundCloud",           followers: 256, posts: 0, notes: "" },
      { offsetDays:  7, platform: "Instagram",            followers: 1560, posts: 2, notes: "" },
      { offsetDays:  7, platform: "Newsletter (Substack)", followers: 165, posts: 1, notes: "hosting without performing" },
      { offsetDays:  7, platform: "SoundCloud",           followers: 263, posts: 0, notes: "September mix half-done" },
    ])
  };

  /* -------------------- THEO -------------------- */
  // Web dev, climber, science writer. Newer to posting. Wants reach + craft.
  const theo = {
    name: "Theo — dev / climber / science writer",
    description:
      "Senior web dev who's been writing about science for years on a personal blog nobody reads, and started bouldering at 32. Wants to bring it all under one roof.",
    answers: {
      what_you_do: A([
        "Web development (front-end, mostly)",
        "Bouldering / sport climbing",
        "Science writing on neuroscience + climate",
        "Photography (climbing + outdoors)",
        "Side experiments (creative coding)"
      ]),
      learning: A([
        "Web development", "Creative coding", "AI / machine learning",
        "Climbing", "Strength training", "Neuroscience", "Climate"
      ]),
      share: A([
        "Web development", "Climbing", "Science explained simply",
        "Creative coding"
      ]),
      why: A(
        "I want a body of work that hangs together. I'm 34, I've been writing " +
        "online for 7 years, and the thing that's missing is a spine. Also " +
        "I'd love speaking invitations and consulting work that comes from " +
        "the writing instead of from cold pitches."
      ),
      audience: A(
        "Junior-to-mid web devs who like to think; technical-curious adults " +
        "who want their science explained like a friend not a textbook; " +
        "people who started climbing late."
      ),
      goal_change: A(
        "Two consulting days a week, two days for my own writing/coding, one " +
        "day for the body. A talk at a conference I respect. A small paid " +
        "newsletter that funds the rest."
      ),
      goal_signal: A(
        "Someone in the climbing gym mentions an essay I wrote without knowing " +
        "it was me."
      ),
      goal_kind: A(["reach", "craft", "career", "income"]),
      thread: A(
        "I translate hard things into experiences people can actually feel — " +
        "code, climbing, and science explained without losing the body."
      ),
      pillars: A([
        "Dev craft (deep but readable)",
        "Climbing as a beginner-late",
        "Science explained, friend-style",
        "Tiny creative-coding experiments"
      ]),
      series: A([
        "Weekly newsletter — one essay",
        "YouTube tutorial / month",
        "Climbing reel / week (Instagram)"
      ]),
      voice: A("plain, generous, nerdy without showing off"),
      no_go: A(
        "No hot takes. No 'productivity' content. No grinding. No takes on " +
        "JavaScript framework wars. No before/after climbing transformation posts."
      ),
      channels: A(["Newsletter", "YouTube", "Twitter / X", "Instagram"]),
      cadence: A("1 essay + 1 reel/week, 1 video/month")
    },
    checkins: [
      {
        offsetDays: 28,
        answers: {
          did:        "Two essays (one on async closures, one on climbing fear), one YouTube short.",
          hard:       "The essay on fear took me four sittings — I almost killed it.",
          felt_right: "The async closures piece. Cleanest writing I've done in months.",
          adjust:     "Maybe alternate technical / personal weeks instead of mixing them.",
          next:       "Publish the climbing-fear essay even if it feels too vulnerable."
        }
      },
      {
        offsetDays: 21,
        answers: {
          did:        "Climbing-fear essay went out (best open rate yet). One tutorial on view-transitions.",
          hard:       "Holding back from over-explaining the climbing piece.",
          felt_right: "Replies from devs who climb saying 'this is exactly the thing'.",
          adjust:     "The crossover IS the niche. Lean into it.",
          next:       "Try one essay that explicitly bridges the two — code through a body lens."
        }
      },
      {
        offsetDays: 14,
        answers: {
          did:        "'Debugging like climbing a project' — went weirdly well. Two reels.",
          hard:       "Editing the YouTube video. Filming is faster than the cut.",
          felt_right: "The bridge essay. People shared it without prompting.",
          adjust:     "I'm starting to see what people share unprompted. That's the shape.",
          next:       "Outline a 4-essay series on 'thinking with the body'."
        }
      },
      {
        offsetDays: 7,
        answers: {
          did:        "Outlined the series. First essay drafted. One climbing reel. No YouTube — couldn't fit it.",
          hard:       "Saying no to a freelance gig that would have been good money but wrong direction.",
          felt_right: "Saying no felt like the brand more than any post did.",
          adjust:     "Drop YouTube cadence to once every 6 weeks instead of 4.",
          next:       "Publish first essay in the series."
        }
      }
    ],
    platformLogs: buildLogs([
      { offsetDays: 28, platform: "Newsletter",  followers: 412,  posts: 2, notes: "async closures + fear" },
      { offsetDays: 28, platform: "YouTube",     followers: 220,  posts: 1, notes: "" },
      { offsetDays: 28, platform: "Twitter / X", followers: 1900, posts: 6, notes: "" },
      { offsetDays: 28, platform: "Instagram",   followers: 380,  posts: 4, notes: "" },
      { offsetDays: 21, platform: "Newsletter",  followers: 488,  posts: 1, notes: "fear essay — best open rate" },
      { offsetDays: 21, platform: "YouTube",     followers: 240,  posts: 1, notes: "view-transitions" },
      { offsetDays: 21, platform: "Twitter / X", followers: 2080, posts: 5, notes: "" },
      { offsetDays: 21, platform: "Instagram",   followers: 410,  posts: 4, notes: "" },
      { offsetDays: 14, platform: "Newsletter",  followers: 612,  posts: 1, notes: "debugging-as-climbing" },
      { offsetDays: 14, platform: "YouTube",     followers: 252,  posts: 0, notes: "" },
      { offsetDays: 14, platform: "Twitter / X", followers: 2240, posts: 7, notes: "" },
      { offsetDays: 14, platform: "Instagram",   followers: 445,  posts: 4, notes: "" },
      { offsetDays:  7, platform: "Newsletter",  followers: 740,  posts: 1, notes: "thinking with the body — series start" },
      { offsetDays:  7, platform: "YouTube",     followers: 256,  posts: 0, notes: "skipped — cut takes too long" },
      { offsetDays:  7, platform: "Twitter / X", followers: 2310, posts: 4, notes: "" },
      { offsetDays:  7, platform: "Instagram",   followers: 460,  posts: 3, notes: "" },
    ])
  };

  /* -------------------- CARLA -------------------- */
  // Dance + somatic therapy + ceramics. Wants depth, community, freedom.
  const carla = {
    name: "Carla — dancer / therapist / ceramicist",
    description:
      "Contemporary dancer turned somatic therapist who took up ceramics during burnout and now can't stop. Wants to bring her clients into the studio.",
    answers: {
      what_you_do: A([
        "Contemporary dance + choreography",
        "Somatic therapy (private practice)",
        "Ceramics — wheel-thrown",
        "Journaling workshops",
        "Slow-living writing"
      ]),
      learning: A([
        "Choreography", "Somatics", "Therapy / inner work",
        "Pottery", "Ceramics", "Mindfulness"
      ]),
      share: A([
        "Dance", "Somatics", "Ceramics", "Therapy / inner work", "Journaling"
      ]),
      why: A(
        "I want my clients, my dance students, and the people who buy my " +
        "pottery to feel like they're in one room — because for me they are. " +
        "Right now I run three Instagram accounts and it's killing me."
      ),
      audience: A(
        "Women in their 30s and 40s coming out of burnout. People who've " +
        "tried therapy and want something embodied. Slow-living people who " +
        "are tired of slow-living aesthetics."
      ),
      goal_change: A(
        "One Instagram account. A waitlist for therapy. A kiln of my own. " +
        "Two retreats a year, fully booked. A Sunday I don't post on."
      ),
      goal_signal: A(
        "A client says 'I bought one of your bowls and I drink water from it " +
        "differently now.'"
      ),
      goal_kind: A(["depth", "community", "freedom", "craft"]),
      thread: A(
        "I help people listen to their bodies again — through movement, " +
        "conversation, or making things with their hands."
      ),
      pillars: A([
        "Body wisdom (somatics in plain words)",
        "Slow ceramics — process, not product",
        "Dance for people who think they can't",
        "Journaling prompts that don't bullshit"
      ]),
      series: A([
        "Weekly newsletter — one prompt + one essay",
        "Monthly online workshop (free, 45 min)",
        "Daily ceramics process clip"
      ]),
      voice: A("calm, plain, a bit motherly without being precious"),
      no_go: A(
        "No before/after body content. No 'manifest' language. No selling at " +
        "anyone. No wellness-industrial vocabulary. No filtered ceramics shots."
      ),
      channels: A(["Newsletter", "Instagram", "YouTube"]),
      cadence: A("1 newsletter/week + ~5 ceramics clips + 1 workshop/month")
    },
    checkins: [
      {
        offsetDays: 28,
        answers: {
          did:        "Newsletter, 6 ceramics clips, one online workshop on 'a body that's allowed to be slow'.",
          hard:       "The workshop. Speaking to a screen still feels off.",
          felt_right: "The clips. Watching the wheel do its thing without my voiceover.",
          adjust:     "Maybe ceramics clips don't need any text overlay. Just the sound.",
          next:       "Run a clip-only week — no captions beyond two words."
        }
      },
      {
        offsetDays: 21,
        answers: {
          did:        "Clip-only week. Two newsletters (one on shame, one on hands).",
          hard:       "Resisting captions. Felt like leaving the door open.",
          felt_right: "Six DMs from people saying they watched the clay clips on loop.",
          adjust:     "This is the brand. Quiet. Hands. Bodies. No selling.",
          next:       "Start a free 'first session' offer for somatic therapy from the newsletter."
        }
      },
      {
        offsetDays: 14,
        answers: {
          did:        "Newsletter announcing the free first session. 12 sign-ups in 48h.",
          hard:       "Saying yes was scary. Then the inbox.",
          felt_right: "Three of those 12 booked paid sessions afterwards.",
          adjust:     "I'm undercharging. Raise rates after this batch.",
          next:       "Workshop on 'making with shaky hands' — for the burnout people."
        }
      },
      {
        offsetDays: 7,
        answers: {
          did:        "Workshop ran with 38 people. Newsletter follow-up with the prompt.",
          hard:       "Not crying on camera when someone shared.",
          felt_right: "The follow-up newsletter. Nobody unsubscribed.",
          adjust:     "Workshop monthly is right. Newsletter weekly is right.",
          next:       "Plan a small in-person retreat for spring."
        }
      }
    ],
    platformLogs: buildLogs([
      { offsetDays: 28, platform: "Newsletter", followers: 290,  posts: 1, notes: "shame + hands" },
      { offsetDays: 28, platform: "Instagram",  followers: 2100, posts: 6, notes: "ceramics clips" },
      { offsetDays: 28, platform: "YouTube",    followers: 95,   posts: 1, notes: "workshop replay" },
      { offsetDays: 21, platform: "Newsletter", followers: 365,  posts: 2, notes: "" },
      { offsetDays: 21, platform: "Instagram",  followers: 2380, posts: 7, notes: "clip-only week" },
      { offsetDays: 21, platform: "YouTube",    followers: 102,  posts: 0, notes: "" },
      { offsetDays: 14, platform: "Newsletter", followers: 462,  posts: 1, notes: "free first session offer — 12 signups in 48h" },
      { offsetDays: 14, platform: "Instagram",  followers: 2520, posts: 5, notes: "" },
      { offsetDays: 14, platform: "YouTube",    followers: 110,  posts: 0, notes: "" },
      { offsetDays:  7, platform: "Newsletter", followers: 580,  posts: 2, notes: "workshop follow-up — 0 unsubs" },
      { offsetDays:  7, platform: "Instagram",  followers: 2710, posts: 6, notes: "" },
      { offsetDays:  7, platform: "YouTube",    followers: 124,  posts: 1, notes: "workshop replay — making with shaky hands" },
    ])
  };

  // helper that turns offsetDays into real `at` timestamps
  function buildLogs(rows) {
    return rows.map(r => ({
      at: now - r.offsetDays * DAY,
      platform: r.platform,
      followers: r.followers,
      posts: r.posts,
      notes: r.notes || null
    }));
  }

  // expand check-ins to use real timestamps
  function bake(persona) {
    return {
      ...persona,
      checkins: persona.checkins.map(c => ({
        at: now - c.offsetDays * DAY,
        answers: c.answers
      }))
    };
  }

  window.ARIADNE_DEMOS = {
    maya:  bake(maya),
    theo:  bake(theo),
    carla: bake(carla)
  };

  // Build a state object the app can `Object.assign` over its defaults.
  window.ariadneLoadDemo = function (key) {
    const persona = window.ARIADNE_DEMOS[key];
    if (!persona) return null;
    return {
      started: true,
      completedAt: now - 30 * DAY,
      flowIndex: 0,
      answers: persona.answers,
      checkins: persona.checkins,
      platformLogs: persona.platformLogs,
      nextCheckinAt: now + 1 * DAY,
      notifications: false,
      lastSeenAt: now,
      userId: null,
      _demoKey: key
    };
  };
})();
