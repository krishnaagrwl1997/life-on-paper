/**
 * The sample book.
 *
 * This is a hand-written example of what the product produces — not generated
 * at request time, and deliberately not a real person's journal. It exists so a
 * visitor can read a finished book instead of looking at screenshots of one.
 *
 * Every chapter carries both faces the product promises: the woven `story`
 * (what the app writes from the user's words) and the `moments` beneath it
 * (what the user actually typed or said). The "As written" view on `/sample`
 * is the honest demonstration of that promise.
 *
 * THE RULE (AGENTS.md §7): every fact, detail, feeling and quote in `story`
 * must already be in that chapter's `moments`. The story may only reorder,
 * fix capitals and punctuation, join entries, and write small numbers out.
 * It may not add a scene, a sensory detail, a place, a feeling or a lesson.
 * If a detail is worth having, add it to a raw moment first. Visitors check
 * this with the toggle — one invented word undoes the whole page.
 *
 * Language stays as written: Hinglish entries become Hinglish chapters.
 */

export type SampleMoment = {
  id: string;
  /** When it was written — often years after it happened. */
  date: string;
  via: "typed" | "voice";
  raw: string;
};

export type SampleChapter = {
  id: string;
  title: string;
  /** When it happened. */
  dates: string;
  /** The woven narrative, in the order the moments happened. */
  story: string[];
  /** The same chapter, exactly as it was written. */
  moments: SampleMoment[];
  people: string[];
  language?: "English" | "Hinglish";
};

export type SampleVolume = {
  id: string;
  title: string;
  years: string;
  /** One line describing the era, built only from details in its chapters. */
  note: string;
  chapters: SampleChapter[];
};

export const SAMPLE_BOOK_TITLE = "The Long Way Home";
export const SAMPLE_BOOK_AUTHOR = "a Life on Paper book";

export const SAMPLE_CAST = ["Amma", "Appa", "Ajji", "Rahul"];

export const SAMPLE_VOLUMES: SampleVolume[] = [
  {
    id: "school",
    title: "School Years",
    years: "1999 – 2009",
    note: "A cycle too tall for me, a steel tin of boiled sweets, and curd before every paper.",
    chapters: [
      {
        id: "bicycle",
        title: "The Bicycle",
        dates: "Around 2003",
        people: ["Appa"],
        story: [
          "I learnt to ride Appa’s cycle when I was nine. It was too tall for me, so I stood on the pedals and pushed, and he held the back of the seat and ran behind me the whole street.",
          "I fell near the gate. Gravel, my knee bleeding — I cried more from the shock than the pain, honestly. Appa didn’t say anything. He just picked up the cycle and waited.",
          "The next Sunday I tried again. I rode till the end of the street and back. He wasn’t holding it. I didn’t notice till I stopped. He was standing at the gate, just smiling.",
        ],
        moments: [
          {
            id: "bicycle-1",
            date: "3 November 2024",
            via: "typed",
            raw: "i learnt to ride appa's cycle when i was 9. it was too tall for me so i stood on the pedals and pushed. he held the back of the seat and ran behind me the whole street. fell near the gate, gravel, knee was bleeding, i cried more from shock than pain honestly. appa didnt say anything he just picked up the cycle and waited",
          },
          {
            id: "bicycle-2",
            date: "5 November 2024",
            via: "voice",
            raw: "next sunday i tried again. rode till the end of the street and back. he wasnt holding it. i didnt notice till i stopped. he was standing at the gate just smiling",
          },
        ],
      },
      {
        id: "ajji",
        title: "Summer at Ajji’s",
        dates: "Summers, 2000 – 2006",
        people: ["Ajji"],
        language: "Hinglish",
        story: [
          "Har summer hum Ajji ke ghar jaate the, gaon mein. Paani kuen se aata tha. Dopahar itni quiet hoti thi ki sirf pankha sunai deta tha.",
          "Ajji ke paas boiled sweets ka ek steel ka dabba tha. Mujhe uske baare mein pata nahi hona chahiye tha. Mujhe pata tha. Use pata tha ki mujhe pata hai.",
          "Last summer jab main gaya, main 15 ka tha — too old for all this. Phir bhi usne dabba mujhe de diya.",
        ],
        moments: [
          {
            id: "ajji-1",
            date: "10 November 2024",
            via: "typed",
            raw: "har summer hum ajji ke ghar jaate the, gaon mein. paani kuen se aata tha. dopahar itni quiet hoti thi ki sirf pankha sunai deta tha",
          },
          {
            id: "ajji-2",
            date: "10 November 2024",
            via: "typed",
            raw: "ajji ke paas ek steel ka dabba tha boiled sweets ka, mujhe uske baare mein pata nahi hona chahiye tha. mujhe pata tha. use pata tha ki mujhe pata hai",
          },
          {
            id: "ajji-3",
            date: "14 November 2024",
            via: "voice",
            raw: "last summer jab main gaya main 15 ka tha, too old for all this. phir bhi usne dabba mujhe de diya",
          },
        ],
      },
      {
        id: "boards",
        title: "The Board Exams",
        dates: "March – May 2009",
        people: ["Amma", "Appa"],
        story: [
          "Tenth boards. Amma made me eat curd and sugar before every paper — every single one. I hated curd. I ate it anyway.",
          "On result day the website kept crashing, so Appa drove to the cyber cafe at 6 am. Eighty-seven percent. He called every relative before I’d even seen the screen properly.",
        ],
        moments: [
          {
            id: "boards-1",
            date: "19 November 2024",
            via: "typed",
            raw: "10th boards. amma made me eat curd and sugar before every paper, every single one. i hated curd. ate it anyway",
          },
          {
            id: "boards-2",
            date: "21 November 2024",
            via: "voice",
            raw: "result day the website kept crashing so appa drove to the cyber cafe at 6 am. 87 percent. he called every relative before i'd even seen the screen properly",
          },
        ],
      },
    ],
  },
  {
    id: "college",
    title: "College",
    years: "2009 – 2013",
    note: "A room too small for the door and the window, and a charger that doesn’t fit.",
    chapters: [
      {
        id: "hostel",
        title: "Hostel Nights",
        dates: "2010 – 2012",
        people: ["Rahul"],
        story: [
          "The hostel room was so small that the door and the window couldn’t be open at once. Rahul was on the top bunk and talked till 2 am about things that never happened.",
          "The same cheap place, every night. The owner let us sit as long as we wanted. Nobody was in a hurry.",
          "It rained the night before the last exam. We sat on the steps and didn’t study.",
        ],
        moments: [
          {
            id: "hostel-1",
            date: "26 November 2024",
            via: "typed",
            raw: "hostel room so small door and window couldnt be open at once. rahul on top bunk talked till 2am about things that never happened",
          },
          {
            id: "hostel-2",
            date: "27 November 2024",
            via: "typed",
            raw: "same cheap place every night, owner let us sit as long as we wanted. nobody was in a hurry",
          },
          {
            id: "hostel-3",
            date: "1 December 2024",
            via: "typed",
            raw: "rained the night before the last exam. we sat on the steps and didnt study",
          },
        ],
      },
      {
        id: "leaving",
        title: "Leaving",
        dates: "May 2013",
        people: ["Rahul"],
        story: [
          "On the last day of hostel, Rahul’s train was at five. We didn’t say bye properly — just “call karna”. He didn’t call for two months. Neither did I.",
          "Weeks later I found his old charger in my bag. I still have it. It doesn’t even fit my phone.",
        ],
        moments: [
          {
            id: "leaving-1",
            date: "4 December 2024",
            via: "typed",
            raw: "last day of hostel. rahul's train was at 5. we didnt say bye properly, just 'call karna'. he didnt call for 2 months. neither did i",
          },
          {
            id: "leaving-2",
            date: "4 December 2024",
            via: "typed",
            raw: "found his old charger in my bag weeks later. still have it. doesnt even fit my phone",
          },
        ],
      },
    ],
  },
  {
    id: "present",
    title: "The Present",
    years: "2014 – now",
    note: "A lake in the evenings, a phone call on a Thursday, and a cake with the wrong name.",
    chapters: [
      {
        id: "routine",
        title: "The Week of the New Routine",
        dates: "Week of 7 October 2024",
        people: [],
        story: [
          "I started walking to the lake in the evenings — somewhere to go that’s not the flat.",
          "On Tuesday the light was doing the October thing. I stood there longer than I meant to, doing nothing. There were ducks; one kept chasing the others for no reason.",
          "The rest of the week was quiet. Good quiet, I think.",
        ],
        moments: [
          {
            id: "routine-1",
            date: "7 October 2024",
            via: "typed",
            raw: "started walking to the lake in the evenings. somewhere to go thats not the flat",
          },
          {
            id: "routine-2",
            date: "8 October 2024",
            via: "voice",
            raw: "light was doing the october thing today. stood there longer than i meant to. doing nothing. there were ducks, one kept chasing the others for no reason",
          },
          {
            id: "routine-3",
            date: "12 October 2024",
            via: "typed",
            raw: "rest of the week was quiet. good quiet i think",
          },
        ],
      },
      {
        id: "amma-called",
        title: "When Amma Called",
        dates: "10 October 2024",
        people: ["Amma"],
        story: [
          "Amma called on Thursday. She sounded tired — the way she does when she’s decided not to say something.",
          "I told her about the lake and the duck. She laughed, and for a minute she sounded like herself.",
          "We talked for forty minutes. Neither of us said anything important. Best call in weeks.",
        ],
        moments: [
          {
            id: "amma-1",
            date: "10 October 2024",
            via: "voice",
            raw: "amma called thursday. she sounded tired, the way she does when shes decided not to say something. i told her about the lake and the duck. she laughed and for a minute she sounded like herself",
          },
          {
            id: "amma-2",
            date: "10 October 2024",
            via: "typed",
            raw: "we talked 40 min. neither of us said anything important. best call in weeks",
          },
        ],
      },
      {
        id: "appa-birthday",
        title: "Appa’s Birthday",
        dates: "November 2024",
        people: ["Appa"],
        language: "Hinglish",
        story: [
          "Appa ka 65th birthday. Bakery walon ne cake pe galat naam likha tha — “Happy Birthday Apa”. Sab hase, Appa sabse zyada.",
          "Raat ko usne kaha, “Next year bhi aana.” Bas itna. I said haan, obviously.",
        ],
        moments: [
          {
            id: "birthday-1",
            date: "16 November 2024",
            via: "typed",
            raw: "appa ka 65th birthday. cake pe galat naam likha tha bakery walon ne, 'happy birthday apa'. sab hase, appa sabse zyada",
          },
          {
            id: "birthday-2",
            date: "16 November 2024",
            via: "voice",
            raw: "raat ko usne kaha 'next year bhi aana'. bas itna. i said haan obviously",
          },
        ],
      },
    ],
  },
];

/** Every chapter in reading order, with its volume — for contents and prev/next. */
export const SAMPLE_CHAPTERS = SAMPLE_VOLUMES.flatMap((volume) =>
  volume.chapters.map((chapter) => ({ volume, chapter })),
);
