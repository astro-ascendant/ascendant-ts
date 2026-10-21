// IMPORTANT: Order of planet should follow order of week days starting from sunday
export const CLASSICAL_PLANETS = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
] as const;

export const PLANETS = [...CLASSICAL_PLANETS, "Rahu", "Ketu"] as const;

export const RASHIS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

export const STARS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
] as const;

export const SIGN_LORDS = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter",
} as const;

export const PLANET_DIGNITY = [
  "EXALTED",
  "MOOLA_TRIKONA",
  "OWN",
  "FRIEND",
  "NEUTRAL",
  "ENEMY",
  "DEBILITATED",
] as const;

export const DIGNITY_RANGES = {
  Sun: [
    {
      dignity: "EXALTED",
      ranges: [[0, 30]],
    },
    {
      dignity: "MOOLA_TRIKONA",
      ranges: [[120, 140]],
    },
    {
      dignity: "OWN",
      ranges: [[140, 150]],
    },
    {
      dignity: "FRIEND",
      ranges: [
        [90, 120],
        [210, 240],
        [240, 270],
        [330, 360],
      ],
    },
    {
      dignity: "NEUTRAL",
      ranges: [
        [60, 90],
        [150, 180],
      ],
    },
    {
      dignity: "ENEMY",
      ranges: [
        [30, 60],
        [270, 300],
        [300, 330],
      ],
    },
    {
      dignity: "DEBILITATED",
      ranges: [[180, 210]],
    },
  ],

  Moon: [
    {
      dignity: "EXALTED",
      ranges: [[30, 33]],
    },
    {
      dignity: "MOOLA_TRIKONA",
      ranges: [[33, 60]],
    },
    {
      dignity: "OWN",
      ranges: [[90, 120]],
    },
    {
      dignity: "FRIEND",
      ranges: [
        [60, 90],
        [120, 150],
        [150, 180],
      ],
    },
    {
      dignity: "NEUTRAL",
      ranges: [
        [0, 30],
        [180, 210],
        [240, 270],
        [270, 300],
        [300, 330],
        [330, 360],
      ],
    },
    {
      dignity: "ENEMY",
      ranges: [],
    },
    {
      dignity: "DEBILITATED",
      ranges: [[210, 240]],
    },
  ],

  Mars: [
    {
      dignity: "EXALTED",
      ranges: [[270, 300]],
    },
    {
      dignity: "MOOLA_TRIKONA",
      ranges: [[0, 12]],
    },
    {
      dignity: "OWN",
      ranges: [
        [12, 30],
        [210, 240],
      ],
    },
    {
      dignity: "FRIEND",
      ranges: [
        [120, 150],
        [240, 270],
        [330, 360],
      ],
    },
    {
      dignity: "NEUTRAL",
      ranges: [
        [30, 60],
        [180, 210],
        [300, 330],
      ],
    },
    {
      dignity: "ENEMY",
      ranges: [
        [60, 90],
        [150, 180],
      ],
    },
    {
      dignity: "DEBILITATED",
      ranges: [[90, 120]],
    },
  ],

  Mercury: [
    {
      dignity: "EXALTED",
      ranges: [[150, 165]],
    },
    {
      dignity: "MOOLA_TRIKONA",
      ranges: [[165, 170]],
    },
    {
      dignity: "OWN",
      ranges: [
        [60, 90],
        [170, 180],
      ],
    },
    {
      dignity: "FRIEND",
      ranges: [
        [30, 60],
        [120, 150],
        [180, 210],
      ],
    },
    {
      dignity: "NEUTRAL",
      ranges: [
        [0, 30],
        [210, 240],
        [240, 270],
        [270, 300],
        [300, 330],
      ],
    },
    {
      dignity: "ENEMY",
      ranges: [[90, 120]],
    },
    {
      dignity: "DEBILITATED",
      ranges: [[330, 360]],
    },
  ],

  Jupiter: [
    {
      dignity: "EXALTED",
      ranges: [[90, 120]],
    },
    {
      dignity: "MOOLA_TRIKONA",
      ranges: [[240, 250]],
    },
    {
      dignity: "OWN",
      ranges: [
        [250, 270],
        [330, 360],
      ],
    },
    {
      dignity: "FRIEND",
      ranges: [
        [0, 30],
        [120, 150],
        [210, 240],
      ],
    },
    {
      dignity: "NEUTRAL",
      ranges: [[300, 330]],
    },
    {
      dignity: "ENEMY",
      ranges: [
        [30, 60],
        [60, 90],
        [150, 180],
        [180, 210],
      ],
    },
    {
      dignity: "DEBILITATED",
      ranges: [[270, 300]],
    },
  ],

  Venus: [
    {
      dignity: "EXALTED",
      ranges: [[330, 360]],
    },
    {
      dignity: "MOOLA_TRIKONA",
      ranges: [[180, 195]],
    },
    {
      dignity: "OWN",
      ranges: [
        [30, 60],
        [195, 210],
      ],
    },
    {
      dignity: "FRIEND",
      ranges: [
        [60, 90],
        [270, 300],
        [300, 330],
      ],
    },
    {
      dignity: "NEUTRAL",
      ranges: [
        [0, 30],
        [210, 240],
        [240, 270],
      ],
    },
    {
      dignity: "ENEMY",
      ranges: [
        [90, 120],
        [120, 150],
      ],
    },
    {
      dignity: "DEBILITATED",
      ranges: [[150, 180]],
    },
  ],

  Saturn: [
    {
      dignity: "EXALTED",
      ranges: [[180, 210]],
    },
    {
      dignity: "MOOLA_TRIKONA",
      ranges: [[300, 320]],
    },
    {
      dignity: "OWN",
      ranges: [
        [270, 300],
        [320, 330],
      ],
    },
    {
      dignity: "FRIEND",
      ranges: [
        [30, 60],
        [60, 90],
        [150, 180],
      ],
    },
    {
      dignity: "NEUTRAL",
      ranges: [
        [240, 270],
        [330, 360],
      ],
    },
    {
      dignity: "ENEMY",
      ranges: [
        [90, 120],
        [120, 150],
        [210, 240],
      ],
    },
    {
      dignity: "DEBILITATED",
      ranges: [[0, 30]],
    },
  ],

  Rahu: [
    {
      dignity: "EXALTED",
      ranges: [[30, 60]],
    },
    {
      dignity: "FRIEND",
      ranges: [
        [90, 120],
        [180, 210],
        [270, 300],
        [300, 330],
      ],
    },
    {
      dignity: "NEUTRAL",
      ranges: [
        [60, 90],
        [150, 180],
      ],
    },
    {
      dignity: "ENEMY",
      ranges: [
        [0, 30],
        [120, 150],
        [240, 270],
        [330, 360],
      ],
    },
    {
      dignity: "DEBILITATED",
      ranges: [[210, 240]],
    },
  ],

  Ketu: [
    {
      dignity: "EXALTED",
      ranges: [[210, 240]],
    },
    {
      dignity: "FRIEND",
      ranges: [
        [0, 30],
        [90, 120],
        [120, 150],
      ],
    },
    {
      dignity: "NEUTRAL",
      ranges: [
        [240, 270],
        [270, 300],
        [300, 330],
        [330, 360],
      ],
    },
    {
      dignity: "ENEMY",
      ranges: [
        [60, 90],
        [150, 180],
        [180, 210],
      ],
    },
    {
      dignity: "DEBILITATED",
      ranges: [[30, 60]],
    },
  ],
} as const;

export const STAR_SPAN: number = 360 / STARS.length;

export const STAR_LORD_CYCLE = [
  "Ketu",
  "Venus",
  "Sun",
  "Moon",
  "Mars",
  "Rahu",
  "Jupiter",
  "Saturn",
  "Mercury",
] as const;

export const VIMSHOTTARI_CYCLE_YEARS = 120;

export const VIMSHOTTARI_YEARS = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
} as const;
