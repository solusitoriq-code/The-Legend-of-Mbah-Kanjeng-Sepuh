// Interactive Learning Evaluation & Structure Data - The Legend of Mbah Kanjeng Sepuh
// Catatan: Glosarium kosakata diambil secara dinamis dari Google Sheets melalui dataService.getGlossary()

// Data Detail Generic Structure (Slide 6)
export const GENERIC_STRUCTURES = {
  orientation: {
    title: "Orientation",
    desc: "Introduces the characters, setting (time and place), and background situation.",
    audioText: "Introduces the characters, setting, time and place, and background situation."
  },
  complication: {
    title: "Complication",
    desc: "Presents the challenges, rising conflicts, or major crises faced by the protagonist.",
    audioText: "Presents the challenges, rising conflicts, or major crises faced by the protagonist."
  },
  resolution: {
    title: "Resolution",
    desc: "Shows how the protagonist resolves the problem, leading to the outcome of the story.",
    audioText: "Shows how the protagonist resolves the problem, leading to the outcome of the story."
  },
  coda: {
    title: "Coda",
    desc: "Concludes the story with a moral lesson, cultural reflection, or the legacy left behind.",
    audioText: "Concludes the story with a moral lesson, cultural reflection, or the legacy left behind."
  }
};

// Data Detail Language Features (Slide 11)
export const LANGUAGE_FEATURES = {
  past_tense: {
    title: "Narrative Past tense",
    desc: "Simple Past (V2) shows the historical events and milestones in chronological order.",
    example: "He governed Sedayu with deep wisdom and opposed unfair levies.",
    audioText: "Narrative Past tense. Simple Past shows the historical events and milestones in chronological order. Example: He governed Sedayu with deep wisdom and opposed unfair levies."
  },
  action_verbs: {
    title: "Action Verbs",
    desc: "Shows purposeful, deliberate, and principled physical activity rather than passive observation.",
    example: "excavated, confronted, roamed, delivered, carved, replenished, and quenched.",
    audioText: "Action Verbs. Shows purposeful, deliberate, and principled physical activity rather than passive observation. Example: excavated, confronted, roamed, delivered, carved, replenished, and quenched."
  },
  temporal_connectives: {
    title: "Temporal Connectives and Adverbial Transitions",
    desc: "Ensures flawless chronological transitions, increasing story flow and dramatic timing.",
    example: "At dawn, under cover of darkness, over the borderlands, as a result.",
    audioText: "Temporal Connectives and Adverbial Transitions. Ensures flawless chronological transitions, increasing story flow and dramatic timing. Example: At dawn, under cover of darkness, over the borderlands, as a result."
  },
  direct_reported: {
    title: "Direct and Reported",
    desc: 'Speech is used to create tension and express personal beliefs (for example, he declared, "This market is for everyone," rejecting colonial tariffs).',
    example: null,
    audioText: 'Direct and Reported. Speech is used to create tension and express personal beliefs, for example, he declared, This market is for everyone, rejecting colonial tariffs.'
  },
  descriptive_adjectives: {
    title: "Descriptive Adjectives",
    desc: "produce vivid imagery and a strong tone (tyrannical oversight, parched ground, unrestrained discipline, lasting legacy).",
    example: null,
    audioText: "Descriptive Adjectives. Produce vivid imagery and a strong tone, such as tyrannical oversight, parched ground, unrestrained discipline, lasting legacy."
  }
};

// Data Bank Soal Post-test (15 Soal: 10 MCQ & 5 Matching) dari materi_evaluasi.xlsx
export const POSTTEST_QUESTIONS = [
  {
    "ID": 1,
    "Tipe": "mcq",
    "Pertanyaan": "Read the opening lines:\n\"Once Upon a time, in the Gresik Region there was once a powerful regency called Sedayu on the north coast of East Java ... Kanjeng Sepuh was the eighth ruler of Sedayu in the early 1800s.\"\nThis excerpt fulfils the function of the Orientation stage because it ....",
    "Opsi_A": "resolves the regional border dispute between local villagers",
    "Opsi_B": "introduces the historical timeframe, geographic setting, and the protagonist",
    "Opsi_C": "delivers the final moral reflection for future generations",
    "Opsi_D": "describes the miraculous origins of local water springs",
    "Opsi_E": "provides modern statistical records of the regency",
    "Kunci": "B",
    "Pasangan_Kiri": "",
    "Pasangan_Kanan": "",
    "Pembahasan": "Orientation introduces the historical timeframe, geographic setting (Sedayu, Gresik), and the protagonist (Kanjeng Sepuh)."
  },
  {
    "ID": 2,
    "Tipe": "mcq",
    "Pertanyaan": "Consider the sentence:\n\"He ... (refuse) to let his people suffer, so he firmly ... (push) aside the colonial tax decree.\"\nThe correct Past Tense (V2) forms to complete the sentence are ....",
    "Opsi_A": "refuses – pushes",
    "Opsi_B": "refused – pushed",
    "Opsi_C": "refusing – pushing",
    "Opsi_D": "was refuse – was push",
    "Opsi_E": "refuse – pushed",
    "Kunci": "B",
    "Pasangan_Kiri": "",
    "Pasangan_Kanan": "",
    "Pembahasan": "Both verbs describe past completed historical events in narrative text: refuse -> refused, push -> pushed."
  },
  {
    "ID": 3,
    "Tipe": "mcq",
    "Pertanyaan": "In the legend of Rojo Pandito (Mbah Kanjeng Sepuh), which external crises disrupt the peace and initiate the Complication stage?",
    "Opsi_A": "The construction of the grand mosque and tomb in Kauman",
    "Opsi_B": "The surrender of noble steeds to Kyai Jayeng Katon",
    "Opsi_C": "Unfair colonial tax demands and a severe drought leading to border clashes",
    "Opsi_D": "The naming of the communal traditional market as Kabean",
    "Opsi_E": "The retirement of Kanjeng Sepuh as the regional ruler",
    "Kunci": "C",
    "Pasangan_Kiri": "",
    "Pasangan_Kanan": "",
    "Pembahasan": "The complication begins when unfair colonial taxes and a severe regional drought disrupt societal peace."
  },
  {
    "ID": 4,
    "Tipe": "mcq",
    "Pertanyaan": "Read the following sentence:\n\"During one of his trips at night, he dug a canal in Tempuran that is now known as Kalibela.\"\nThe verb dug is classified as an Action Verb because it ....",
    "Opsi_A": "reflects a static mental contemplation",
    "Opsi_B": "connects the subject to an adjective without movement",
    "Opsi_C": "denotes a deliberate, physical action performed by the subject",
    "Opsi_D": "functions as an auxiliary verb indicating a future condition",
    "Opsi_E": "modifies the time and place of the event",
    "Kunci": "C",
    "Pasangan_Kiri": "",
    "Pasangan_Kanan": "",
    "Pembahasan": "'Dug' (from dig) represents an intentional physical deed rather than a passive state."
  },
  {
    "ID": 5,
    "Tipe": "mcq",
    "Pertanyaan": "Read the passage:\n\"Under cover of darkness, he walked across Sedayu to deliver fresh water, and at dawn, he stood over the running canal to reconcile both sides.\"\nThe bold phrases serve as linguistic devices to ....",
    "Opsi_A": "describe the physical appearance of the colonial officers",
    "Opsi_B": "establish chronological sequencing and signal smooth temporal transitions",
    "Opsi_C": "convert direct quotes into reported speech structures",
    "Opsi_D": "verify the scientific flow rate of the canal water",
    "Opsi_E": "identify the defensive perimeter of the royal palace",
    "Kunci": "B",
    "Pasangan_Kiri": "",
    "Pasangan_Kanan": "",
    "Pembahasan": "'Under cover of darkness' and 'at dawn' establish chronological sequencing and signal smooth temporal transitions."
  },
  {
    "ID": 6,
    "Tipe": "mcq",
    "Pertanyaan": "During his secret nocturnal missions, Kanjeng Sepuh departed in disguise and carried supplies. Which pair represents the accurate base verb (V1) to past simple (V2) transformation for these actions?",
    "Opsi_A": "Leave - Leaved ; Bring - Bringed",
    "Opsi_B": "Leave - Left ; Bring - Brought",
    "Opsi_C": "Leave - Left ; Bring - Brang",
    "Opsi_D": "Leave - Leaving ; Bring - Brought",
    "Opsi_E": "Leave - Was left ; Bring - Brought",
    "Kunci": "B",
    "Pasangan_Kiri": "",
    "Pasangan_Kanan": "",
    "Pembahasan": "Irregular past simple forms: Leave becomes Left, and Bring becomes Brought."
  },
  {
    "ID": 7,
    "Tipe": "mcq",
    "Pertanyaan": "Kanjeng Sepuh declared to the colonial official: \"This market will be called 'Kabean,' which means it belongs to everyone, and my people will not have to pay any unfair taxes on it!\"\nThe author uses this direct speech primarily to show ....",
    "Opsi_A": "Kanjeng Sepuh's hesitation and indecisiveness in public matters",
    "Opsi_B": "Kanjeng Sepuh's firm stance, moral courage, and commitment to the common folk",
    "Opsi_C": "the merchants' willingness to comply with Batavia's decrees",
    "Opsi_D": "a mutual financial agreement between the regency and Batavia",
    "Opsi_E": "the formal legal protocol of colonial councils",
    "Kunci": "B",
    "Pasangan_Kiri": "",
    "Pasangan_Kanan": "",
    "Pembahasan": "Direct dialogue highlights Kanjeng Sepuh's moral courage and unwavering defense of common citizens."
  },
  {
    "ID": 8,
    "Tipe": "mcq",
    "Pertanyaan": "How are the severe drought and the border hostilities between the villages permanently resolved in the story's Resolution?",
    "Opsi_A": "By seeking external military reinforcement from the Mataram kingdom",
    "Opsi_B": "By relocating all agrarian families to the coastal ports of Surabaya",
    "Opsi_C": "By submitting completely to the higher tax orders of the colonial rulers",
    "Opsi_D": "By excavating the Kalibela canal and constructing the springs of Telaga Rambit and Sumur Dhahar",
    "Opsi_E": "By having Kyai Jayeng Katon command the noble steeds into battle",
    "Kunci": "D",
    "Pasangan_Kiri": "",
    "Pasangan_Kanan": "",
    "Pembahasan": "The crisis was resolved by excavating the Kalibela irrigation canal and constructing the Telaga Rambit springs."
  },
  {
    "ID": 9,
    "Tipe": "mcq",
    "Pertanyaan": "What is the primary moral takeaway (Coda) emphasized at the conclusion of Kanjeng Sepuh's narrative?",
    "Opsi_A": "High political status is designed to display personal prestige and accumulate private assets",
    "Opsi_B": "Authentic leadership is rooted in moral courage, selfless charity, and serving the vulnerable",
    "Opsi_C": "Border tensions can only be effectively handled through armed warfare",
    "Opsi_D": "Unchecked taxation is the clearest benchmark of economic success",
    "Opsi_E": "Earthly authority is permanent and remains tied to one individual",
    "Kunci": "B",
    "Pasangan_Kiri": "",
    "Pasangan_Kanan": "",
    "Pembahasan": "The coda teaches that authentic leadership is rooted in moral courage, selfless charity, and serving the vulnerable."
  },
  {
    "ID": 10,
    "Tipe": "mcq",
    "Pertanyaan": "A vital social function of a legend is to preserve collective cultural heritage. Which tangible relics mentioned in the text continue to validate this story today?",
    "Opsi_A": "The colonial council table in Batavia and ancient trade ships in Surabaya",
    "Opsi_B": "The Grand Tomb and Mosque in Kauman, Sidayu, alongside Telaga Rambit",
    "Opsi_C": "The historical bronze statues of Kyai Jayeng Katon in Lamongan",
    "Opsi_D": "The stone ramparts of the Mataram royal pavilion",
    "Opsi_E": "The original written decree of the Kabean tax policy",
    "Kunci": "B",
    "Pasangan_Kiri": "",
    "Pasangan_Kanan": "",
    "Pembahasan": "Physical landmarks in Sidayu (the Grand Mosque, Tomb, and Telaga Rambit) validate the living heritage of the legend."
  },
  {
    "ID": 11,
    "Tipe": "matching",
    "Pertanyaan": "Match each base verb (Column A) with its correct irregular past form (Column B) based on the actions performed in the story!",
    "Opsi_A": "",
    "Opsi_B": "",
    "Opsi_C": "",
    "Opsi_D": "",
    "Opsi_E": "",
    "Kunci": "",
    "Pasangan_Kiri": "Leave (to depart at night)|Throw (to cast tax decree)|Dig (to excavate canal)|Bring (to carry fresh water)|Build (to construct springs)",
    "Pasangan_Kanan": "left|threw|dug|brought|built",
    "Pembahasan": "Answer Key: Leave ➔ left | Throw ➔ threw | Dig ➔ dug | Bring ➔ brought | Build ➔ built."
  }
];
