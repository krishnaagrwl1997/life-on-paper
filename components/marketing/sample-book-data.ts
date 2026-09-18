/**
 * The sample book.
 *
 * This is a hand-written example of what the product produces — not generated
 * at request time, and deliberately not a real person's journal. It exists so a
 * visitor can read a finished book instead of looking at screenshots of one.
 *
 * Every chapter carries both faces the product promises: the woven `story`
 * (what the app writes from the user's words) and the `raw` entries beneath it
 * (what the user actually typed). The "Story / As written" toggle on `/sample`
 * is the honest demonstration of that promise, so the raw text here is written
 * the way people really type — lowercase, run-on, missing punctuation — and the
 * woven text never adds a single fact that is not in it.
 */

export type SampleMoment = {
  id: string;
  date: string;
  raw: string;
};

export type SampleChapter = {
  id: string;
  title: string;
  dates: string;
  /** The woven narrative, in the order the moments happened. */
  story: string[];
  /** The same period, exactly as it was written. */
  moments: SampleMoment[];
  people: string[];
};

export type SampleVolume = {
  id: string;
  title: string;
  years: string;
  /** One warm line describing the era, shown on the shelf. */
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
    note: "A street, a bicycle, and a steel tin of boiled sweets.",
    chapters: [
      {
        id: "bicycle",
        title: "The Bicycle",
        dates: "March 2003",
        story: [
          "I was nine when I learned to ride Appa’s bicycle. It was too tall for me, so I stood on the pedals and pushed, wobbling the whole length of our street while he held the back and ran behind me.",
          "I fell near the gate. The gravel took the skin off my left knee and I cried more from the shock than the pain. Appa said nothing. He picked up the cycle, straightened the handlebar with his foot, and waited.",
          "The next Sunday I rode to the end of the street and back. He was not holding it. I did not notice until I stopped.",
        ],
        moments: [
          {
            id: "bicycle-1",
            date: "16 March 2003",
            raw: "i learnt to ride appa's cycle when i was 9. too tall for me so i stood on the pedals. fell near the gate, knee was bleeding, i cried. appa didnt say anything he just picked up the cycle and waited. next sunday i rode till the end of the street and back. he wasnt holding it. i didnt notice till i stopped",
          },
        ],
        people: ["Appa"],
      },
      {
        id: "ajji",
        title: "Summer at Ajji’s",
        dates: "April 2005",
        story: [
          "Every summer we went to Ajji’s house in the village, where the water came from a well and the afternoons were so quiet you could hear the fan.",
          "She kept boiled sweets in a steel tin that I was not supposed to know about. I knew about it. She knew I knew.",
          "The last summer I went, I was fifteen and already too old for it. She gave me the tin anyway.",
        ],
        moments: [
          {
            id: "ajji-1",
            date: "2 April 2005",
            raw: "summers at ajji's. well water, quiet afternoons, the fan. she had a steel tin of boiled sweets i wasnt supposed to know about. i knew. she knew i knew. last summer i was 15 and too old for it. she gave me the tin anyway",
          },
        ],
        people: ["Ajji"],
      },
    ],
  },
  {
    id: "college",
    title: "College",
    years: "2009 – 2013",
    note: "A small room, a cheap mess, and someone talking until two in the morning.",
    chapters: [
      {
        id: "hostel",
        title: "Hostel Nights",
        dates: "August 2010",
        story: [
          "The hostel room was small enough that the door and the window could not both be open at once. Rahul slept on the top bunk and talked until two in the morning about things that had never happened to either of us.",
          "We ate at the same place every night because it was cheap and because the owner let us sit as long as we wanted. Nobody was in a hurry then.",
          "It rained the night before the last exam. We sat on the steps and did not study.",
        ],
        moments: [
          {
            id: "hostel-1",
            date: "21 August 2010",
            raw: "hostel room so small door and window couldnt be open at once. rahul on top bunk talked till 2am about things that never happened. same cheap place every night, owner let us sit. nobody was in a hurry. rained the night before last exam, we sat on steps and didnt study",
          },
        ],
        people: ["Rahul"],
      },
    ],
  },
  {
    id: "present",
    title: "The Present",
    years: "2014 – now",
    note: "A lake in the evenings, and a phone call on a Thursday.",
    chapters: [
      {
        id: "routine",
        title: "The Week of the New Routine",
        dates: "October 2024",
        story: [
          "I started walking to the lake in the evenings, mostly to have somewhere to go that was not the flat.",
          "On Tuesday the light was doing the thing it does in October. I stood there longer than I meant to, doing nothing in particular.",
          "The rest of the week was quiet.",
        ],
        moments: [
          {
            id: "routine-1",
            date: "8 October 2024",
            raw: "started walking to lake in evenings, somewhere to go thats not the flat. tuesday the light was doing the october thing. stood there longer than i meant to doing nothing. rest of week was quiet",
          },
        ],
        people: [],
      },
      {
        id: "amma-called",
        title: "When Amma Called",
        dates: "October 2024",
        story: [
          "Amma called on Thursday. She sounded tired in the way she does when she has decided not to say something.",
          "I told her about the lake. She laughed at the part about the ducks, and for a minute she sounded like herself.",
          "We talked for forty minutes. Neither of us said anything important.",
        ],
        moments: [
          {
            id: "amma-1",
            date: "10 October 2024",
            raw: "amma called thursday. she sounded tired in the way she does when shes decided not to say something. i told her about the lake. she laughed at the duck part and for a minute she sounded like herself. we talked 40 min. neither of us said anything important",
          },
        ],
        people: ["Amma"],
      },
    ],
  },
];
