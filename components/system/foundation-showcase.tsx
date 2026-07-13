"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NavShell } from "@/components/system/nav-shell";

type Destination = "Home" | "Library" | "Add Memory" | "Garden";

const paperEase = [0.22, 0.72, 0.26, 1] as const;

export function FoundationShowcase() {
  const [active, setActive] = useState<Destination>("Home");
  const [assemblyKey, setAssemblyKey] = useState(0);
  const reduceMotion = useReducedMotion();

  const selectDestination = (destination: Destination) => {
    setActive(destination);
    if (destination === "Add Memory") setAssemblyKey((key) => key + 1);
  };

  return (
    <main className="foundation-canvas">
      <div className="foundation-grid">
        <section className="masthead-panel" aria-labelledby="foundation-title">
          <header className="brand-lockup">
            <div>
              <p className="ui-eyebrow">Identity masthead</p>
              <h1 id="foundation-title">Life In Books</h1>
            </div>
            <span className="ceremonial-mark" aria-label="Ceremonial premium mark">
              <Sparkle size={19} weight="fill" aria-hidden="true" />
            </span>
          </header>

          <div className="living-masthead">
            <p className="ui-eyebrow">Living masthead</p>
            <h2>
              Every life
              <br />
              has chapters.
              <br />
              We help you
              <br />
              read them
              <br />
              beautifully.
            </h2>
            <div className="masthead-art" aria-hidden="true">
              <Image
                src="/assets/botanical-paper-collage.png"
                alt=""
                fill
                sizes="(max-width: 900px) 80vw, 38vw"
                priority
              />
            </div>
            <p className="masthead-deck">
              Turn conversations into keepsakes.
              <br />
              Book → Volume → Chapter → Page.
            </p>
          </div>
        </section>

        <section className="type-panel specimen-panel" aria-labelledby="type-title">
          <p className="ui-eyebrow" id="type-title">Typography</p>
          <div className="type-specimen">
            <h2>Fraunces</h2>
            <p className="ui-caption">For headlines and reading.</p>
          </div>
          <div className="type-scale">
            <div><span className="type-h1">H1 Display</span><small>64 / 72</small></div>
            <div><span className="type-h2">H2 Headline</span><small>40 / 48</small></div>
            <div><span className="type-h3">H3 Title</span><small>24 / 32</small></div>
            <div><span className="type-body">We believe your story deserves the care of a beautiful book.</span><small>Body / Reading · 18 / 30</small></div>
          </div>
          <div className="inter-specimen">
            <p className="ui-eyebrow">Inter</p>
            <p className="ui-caption">For UI and chrome only.</p>
            <dl>
              <div><dt>UI label</dt><dd>12 / 16</dd></div>
              <div><dt>UI body</dt><dd>14 / 20</dd></div>
              <div><dt>UI button</dt><dd>12 / 16</dd></div>
            </dl>
          </div>
        </section>

        <section className="token-panel specimen-panel" aria-labelledby="token-title">
          <p className="ui-eyebrow" id="token-title">Color & material</p>
          <div className="swatch-grid">
            <Swatch label="Text" value="#2B2620" className="swatch--ink" />
            <Swatch label="Paper" value="#F7F1E7" className="swatch--paper" />
            <Swatch label="Action" value="#C1592B" className="swatch--action" />
            <Swatch label="Ceremonial" value="#D4AF37" className="swatch--gold" />
          </div>
          <div className="paper-trio" aria-label="Paper surface elevations">
            <span className="paper-tile paper-tile--flat" />
            <span className="paper-tile paper-tile--raised" />
            <span className="paper-tile paper-tile--soft" />
          </div>
          <p className="ui-caption paper-caption">Smooth · Laid · Soft cotton</p>
        </section>

        <section className="component-panel specimen-panel" aria-labelledby="component-title">
          <p className="ui-eyebrow" id="component-title">Components</p>
          <div className="component-group">
            <p className="ui-label">Buttons</p>
            <Button onClick={() => setAssemblyKey((key) => key + 1)}>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="text">Learn how it works</Button>
          </div>
          <div className="component-group">
            <label className="ui-label" htmlFor="memory-title">Input field</label>
            <Input id="memory-title" placeholder="Your memory title" />
            <Input aria-label="Disabled input example" placeholder="Unavailable" disabled />
          </div>
          <div className="divider-specimen" />
          <div className="folio-marker" aria-label="Folio 23"><span />23<span /></div>
        </section>

        <section className="page-panel specimen-panel" aria-labelledby="pages-title">
          <p className="ui-eyebrow" id="pages-title">Page composition samples</p>
          <div className="page-samples">
            <article className="page-sample page-sample--coast">
              <div className="page-copy">
                <small>I.</small>
                <h3>The beginning is always a place</h3>
              </div>
              <Image src="/assets/seaside-memory.png" alt="A quiet rocky coast" fill sizes="280px" />
            </article>
            <article className="page-sample page-sample--still">
              <div className="page-copy">
                <h3>A small kitchen, many lessons.</h3>
              </div>
              <Image src="/assets/domestic-still-life.png" alt="A quiet kitchen still life" fill sizes="280px" />
            </article>
            <article className="page-sample page-sample--letter">
              <div className="page-copy">
                <h3>The letters I kept changed everything.</h3>
              </div>
              <Image src="/assets/botanical-paper-collage.png" alt="Pressed leaves and preserved paper" fill sizes="280px" />
            </article>
          </div>
        </section>

        <section className="elevation-panel specimen-panel" aria-labelledby="elevation-title">
          <p className="ui-eyebrow" id="elevation-title">Paper & elevation</p>
          <div className="elevation-row" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((item) => <span key={item} />)}
          </div>
        </section>

        <section className="motion-panel specimen-panel" aria-labelledby="motion-title">
          <div className="motion-heading">
            <div>
              <p className="ui-eyebrow" id="motion-title">Motion language</p>
              <p className="ui-caption">Page assembly sequence · 500ms</p>
            </div>
            <button className="replay-button" type="button" onClick={() => setAssemblyKey((key) => key + 1)}>
              Replay
            </button>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={assemblyKey}
              className="assembly-sequence"
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0 }}
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.1 } },
              }}
            >
              {["Elements enter", "Align to grid", "Content settles", "Complete"].map((label, index) => (
                <motion.div
                  className="assembly-step"
                  key={label}
                  variants={{
                    hidden: { opacity: 0, y: reduceMotion ? 0 : 16, rotate: reduceMotion ? 0 : -1.2 },
                    visible: { opacity: 1, y: 0, rotate: 0, transition: { duration: reduceMotion ? 0 : 0.5, ease: paperEase } },
                  }}
                >
                  <div className="mini-page"><span>{index + 1}</span></div>
                  <p>{label}</p>
                  <small>{index === 3 ? "500ms" : `${index * 160}ms`}</small>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
          <p className="motion-note">Paper-weight easing. No bounce. No spring. No spinner.</p>
        </section>
      </div>

      <NavShell active={active} onSelect={selectDestination} />
      <p className="shell-status" aria-live="polite">Foundation shell · {active} treatment selected</p>
    </main>
  );
}

function Swatch({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="swatch">
      <span className={className} />
      <div><strong>{label}</strong><small>{value}</small></div>
    </div>
  );
}
