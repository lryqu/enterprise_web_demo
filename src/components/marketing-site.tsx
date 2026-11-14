"use client";

import Image from "next/image";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, ChevronDown, Menu, MessageCircle, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };
type Phase = { title: string; weeks: string; start: number; span: number; deliverables: string; owner: string };

const phases: Phase[] = [
  { title: "Discovery & feasibility", weeks: "Weeks 01–04", start: 1, span: 1, deliverables: "Site visit, existing-condition review, priorities brief, feasibility and early budget alignment.", owner: "Project director + design lead" },
  { title: "Design & engineering", weeks: "Weeks 05–14", start: 2, span: 3, deliverables: "Measured plans, material direction, engineering coordination, permit drawings and selections.", owner: "Architect + interior designer" },
  { title: "Fixed-price proposal", weeks: "Weeks 15–18", start: 5, span: 1, deliverables: "Trade-verified scope, allowances reconciled, written fixed price and a dated construction schedule.", owner: "Estimator + project director" },
  { title: "Build", weeks: "Weeks 19–46", start: 6, span: 6, deliverables: "One accountable site team, weekly written updates, quality reviews and documented decisions.", owner: "Construction manager + craftspeople" },
  { title: "Handover & care", weeks: "Weeks 47–52", start: 11, span: 2, deliverables: "Orientation, closeout documents, punch-list completion and a direct line to our care team.", owner: "Project director + care lead" },
];

const projects = [
  { name: "The Rowan House", place: "Cambridge, MA", year: "2025", scope: "Whole-home renovation · 2,480 sq ft", description: "A quiet, light-filled reworking of a 1920s family home.", image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85", alt: "Warm contemporary living room with oak furniture and a long window" },
  { name: "Cedar Street", place: "Brookline, MA", year: "2024", scope: "Kitchen + first-floor replan", description: "A generous kitchen that brings the whole floor into conversation.", image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85", alt: "Calm residential interior with natural wood and pale stone finishes" },
  { name: "The Waverly", place: "Somerville, MA", year: "2024", scope: "Primary suite + two baths", description: "A considered retreat, shaped around enduring materials.", image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=85", alt: "Softly lit bedroom with natural textures and understated detailing" },
];

const towns = ["Boston", "Brookline", "Cambridge", "Concord", "Lexington", "Newton", "Somerville", "Wellesley" ];

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        node.classList.add("is-visible");
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${className}`}>{children}</div>;
}

export default function MarketingSite() {
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activePhase, setActivePhase] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: "Good afternoon. I’m the Slate & Timber project concierge. What would you like to think through?" }]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [conversationId, setConversationId] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let id = localStorage.getItem("st:conversation");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("st:conversation", id);
    }
    setConversationId(id);
  }, []);

  useEffect(() => {
    if (chatOpen) {
      chatInputRef.current?.focus();
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatOpen, messages]);

  useEffect(() => {
    if (!chatOpen) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setChatOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatOpen]);

  useEffect(() => {
    const timeline = document.querySelector(".timeline-grid");
    if (!timeline || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        timeline.classList.add("timeline-visible");
        observer.disconnect();
      }
    }, { threshold: 0.15 });
    observer.observe(timeline);
    return () => observer.disconnect();
  }, []);

  async function sendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = chatInput.trim();
    if (!content || chatBusy) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setChatInput("");
    setChatError("");
    setChatBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: content, history: messages, conversationId }),
      });
      const data = await response.json() as { reply?: string; mode?: string; leadCaptured?: { reference: string } | null; error?: string };
      if (!response.ok) throw new Error(data.error ?? "We couldn’t send that just now. Please try again.");
      setMessages((current) => [...current, { role: "assistant", content: data.reply ?? "I’m sorry, I couldn’t form a response. Please try once more." }]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "A connection issue interrupted that message.");
    } finally {
      setChatBusy(false);
    }
  }

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const values = Object.fromEntries(data.entries());
    const errors: Record<string, string> = {};
    if (String(values.name ?? "").trim().length < 2) errors.name = "Please enter your name.";
    if (!/^\+?[\d\s().-]{10,}$/.test(String(values.phone ?? ""))) errors.phone = "Enter a valid phone number.";
    if (!/^\d{5}$/.test(String(values.zip ?? ""))) errors.zip = "Enter a 5-digit ZIP code.";
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.email))) errors.email = "Enter a valid email address.";
    if (!values.projectType) errors.projectType = "Choose a project type.";
    setFormErrors(errors);
    if (Object.keys(errors).length) return;
    setFormBusy(true);
    try {
      const response = await fetch("/api/inquiry", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
      const result = await response.json() as { reference?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "We couldn’t send your inquiry.");
      const stored = JSON.parse(localStorage.getItem("st:inquiries") ?? "[]") as Array<Record<string, string>>;
      localStorage.setItem("st:inquiries", JSON.stringify([{ ...values, reference: result.reference ?? "", createdAt: new Date().toISOString() }, ...stored]));
      form.reset();
      setFormSuccess(true);
      setFormErrors({});
    } catch (error) {
      setFormErrors({ form: error instanceof Error ? error.message : "We couldn’t send your inquiry." });
    } finally {
      setFormBusy(false);
    }
  }

  function closeMenu() { setMobileMenu(false); }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-md">
        <div className="wrap flex h-[78px] items-center justify-between gap-6">
          <a aria-label="Slate & Timber Co. home" href="#top" className="display whitespace-nowrap text-[25px] leading-none no-underline">Slate <span className="text-brass">&</span> Timber Co.</a>
          <nav aria-label="Main navigation" className={`${mobileMenu ? "flex" : "hidden"} absolute left-0 right-0 top-[78px] flex-col gap-5 border-b border-line bg-paper px-5 py-6 md:static md:flex md:flex-row md:items-center md:gap-7 md:border-0 md:bg-transparent md:p-0`}>
            <a className="text-[13px] text-muted no-underline hover:text-ink" onClick={closeMenu} href="#work">Work</a>
            <a className="text-[13px] text-muted no-underline hover:text-ink" onClick={closeMenu} href="#approach">Approach</a>
            <a className="text-[13px] text-muted no-underline hover:text-ink" onClick={closeMenu} href="#about">About</a>
            <a className="text-[13px] text-muted no-underline hover:text-ink" onClick={closeMenu} href="#service-area">Service area</a>
          </nav>
          <div className="flex shrink-0 items-center gap-4">
            <a href="tel:+16175550184" className="hidden text-[13px] text-ink no-underline lg:block">617 555 0184</a>
            <a href="#book" className="button-primary !min-h-[42px] !px-4 !text-[12px]">Book a visit <ArrowUpRight size={14} aria-hidden="true" /></a>
            <button type="button" className="inline-flex size-10 items-center justify-center md:hidden" aria-label={mobileMenu ? "Close navigation" : "Open navigation"} aria-expanded={mobileMenu} onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="wrap grid min-h-[650px] grid-cols-1 items-center gap-10 py-14 md:min-h-[690px] md:grid-cols-[.9fr_1.1fr] md:gap-12 md:py-20">
          <Reveal className="order-2 md:order-1">
            <p className="eyebrow mb-7">Residential design-build · Greater Boston</p>
            <h1 className="display max-w-[550px] text-[clamp(54px,7vw,86px)] leading-[.94]">Start with a plan, <span className="text-brass">not a quote.</span></h1>
            <p className="mt-7 max-w-[430px] text-[16px] leading-7 text-muted">A fixed-price, date-certain whole-home renovation, thoughtfully designed and built by one accountable team.</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a className="button-primary" href="#book">Book a first visit <ArrowRight size={15} aria-hidden="true" /></a>
              <a className="button-quiet" href="#approach">See the process <ArrowDownRight size={15} aria-hidden="true" /></a>
            </div>
            <div className="mt-12 flex items-center gap-3 text-[12px] text-muted"><span className="size-2 rounded-full bg-brass" /> Taking on select 2026 projects</div>
          </Reveal>
          <Reveal className="order-1 h-[380px] md:order-2 md:h-[540px]">
            <div className="project-image relative h-full overflow-hidden bg-[#c4b8a5]">
              <Image src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1800&q=90" alt="Sunlit renovated home interior with pale oak floors and restrained natural materials" fill priority sizes="(max-width: 767px) 100vw, 55vw" className="object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-[#1c1f1d]/60 to-transparent px-6 pb-5 pt-14 text-[11px] text-paper">
                <span className="eyebrow !text-paper/90">A more considered way home</span><span className="font-mono">01 / 03</span>
              </div>
            </div>
          </Reveal>
        </section>

        <section aria-label="Materials" className="border-y border-line bg-paper-deep">
          <div className="wrap grid grid-cols-2 divide-x divide-line md:grid-cols-5">
            {[["Limestone", "#d2c9b9"], ["White oak", "#b8966b"], ["Blackened steel", "#464844"], ["Walnut", "#6e4e38"], ["Antique brass", "#9a7b3f"]].map(([label, color]) => <div key={label} className="flex min-h-[82px] items-center gap-3 px-4 first:pl-0 md:justify-center md:px-5"><span className="size-5 shrink-0 border border-ink/10" style={{ backgroundColor: color }} /><span className="eyebrow !text-[10px] !tracking-[.12em]">{label}</span></div>)}
          </div>
        </section>

        <section id="work" className="section wrap">
          <Reveal><div className="section-head"><span className="section-number">01</span><h2 className="display section-title">Selected work</h2><span className="eyebrow ml-auto hidden sm:block">Homes made for living in</span></div></Reveal>
          <div className="grid gap-8 md:grid-cols-3 md:gap-6">
            {projects.map((project, index) => <Reveal key={project.name} className={index === 1 ? "md:mt-12" : ""}>
              <article>
                <div className="project-image relative mb-5 aspect-[4/3] overflow-hidden bg-[#d2cabd]"><Image src={project.image} alt={project.alt} fill sizes="(max-width: 767px) 100vw, 33vw" className="object-cover" /></div>
                <div className="flex items-baseline justify-between gap-4"><h3 className="display text-[27px] leading-tight">{project.name}</h3><span className="eyebrow !text-[10px]">{project.year}</span></div>
                <div className="mt-1 flex justify-between gap-3 text-[12px] text-muted"><span>{project.place}</span><span className="text-right">{project.scope}</span></div>
                <p className="mt-4 border-t border-line pt-3 text-[13px] text-muted">{project.description}</p>
              </article>
            </Reveal>)}
          </div>
          <div className="mt-10 flex justify-end"><a href="#book" className="text-link text-[13px]">Discuss a home like yours <ArrowUpRight size={15} /></a></div>
        </section>

        <section id="approach" className="section border-y border-line bg-paper-deep">
          <div className="wrap">
            <Reveal><div className="section-head"><span className="section-number">02</span><h2 className="display section-title">A year, made legible.</h2><span className="eyebrow ml-auto hidden sm:block">A typical whole-home schedule</span></div></Reveal>
            <Reveal className="mb-12 max-w-[610px] text-[15px] leading-7 text-muted">Good work takes careful preparation. From the first conversation to the final walkthrough, every phase has an owner, a clear output and a place on the calendar.</Reveal>
            <div className="timeline-grid">
              <div className="mb-3 grid grid-cols-[minmax(160px,1.25fr)_minmax(0,4fr)] gap-5">
                <span className="eyebrow">Project phase</span>
                <div className="grid grid-cols-12 text-center">{["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month) => <span className="eyebrow !text-[9px] !tracking-[.08em]" key={month}>{month}</span>)}</div>
              </div>
              {phases.map((phase, index) => <div key={phase.title} className={`timeline-row grid grid-cols-[minmax(160px,1.25fr)_minmax(0,4fr)] items-center gap-5 border-t border-line py-4 ${activePhase === index ? "is-active" : ""}`}>
                <button type="button" onFocus={() => setActivePhase(index)} onMouseEnter={() => setActivePhase(index)} onClick={() => setActivePhase(index)} className="group flex min-h-11 items-center gap-3 text-left" aria-pressed={activePhase === index}>
                  <span className="font-mono text-[11px] text-brass">0{index + 1}</span><span className="text-[13px] text-muted transition-colors group-hover:text-ink group-focus:text-ink">{phase.title}</span>
                </button>
                <div className="grid min-h-9 grid-cols-12 items-center bg-[linear-gradient(to_right,transparent_calc(100%-1px),var(--line)_calc(100%-1px))] bg-[length:8.333%_100%]">
                  <div className="timeline-bar relative flex h-7 items-center px-2 text-[10px] text-paper" style={{ gridColumn: `${phase.start} / span ${phase.span}` }}><span className="whitespace-nowrap font-mono">{phase.weeks}</span></div>
                </div>
              </div>)}
              <div aria-live="polite" className="mt-6 grid gap-2 border-l-2 border-brass pl-5 md:grid-cols-[1fr_auto] md:items-start">
                <div><p className="eyebrow mb-2">Phase 0{activePhase + 1} · {phases[activePhase].title}</p><p className="max-w-[700px] text-[13px] leading-6 text-muted">{phases[activePhase].deliverables}</p></div>
                <p className="text-[12px] text-muted"><span className="font-mono uppercase tracking-[.12em]">Responsible</span><br />{phases[activePhase].owner}</p>
              </div>
            </div>
            <div className="mt-16 grid gap-0 border-t border-line md:grid-cols-3">
              {[["Fixed price in writing", "Every allowance and scope decision is resolved before construction begins."], ["A written completion date", "Your schedule is part of the agreement, not a hopeful estimate."], ["One team, all the way through", "The people who shape the plan stay accountable through the punch list."]].map(([title, copy], index) => <div key={title} className="border-b border-line py-6 md:border-b-0 md:px-6 md:first:pl-0 md: last:border-r-0 md:border-r md:border-line"><span className="font-mono text-[11px] text-brass">0{index + 1}</span><h3 className="display mt-3 text-[24px]">{title}</h3><p className="mt-2 max-w-[300px] text-[13px] leading-6 text-muted">{copy}</p></div>)}
            </div>
          </div>
        </section>

        <section id="about" className="section wrap">
          <Reveal><div className="section-head"><span className="section-number">03</span><h2 className="display section-title">Built on good questions.</h2></div></Reveal>
          <div className="grid items-center gap-12 md:grid-cols-[.95fr_1.05fr] md:gap-20">
            <Reveal>
              <p className="max-w-[520px] text-[15px] leading-7 text-muted">Slate & Timber is an independent residential design-build studio for homeowners who care how a home comes together as much as how it looks when it is done.</p>
              <p className="mt-5 max-w-[520px] text-[15px] leading-7 text-muted">Our small, senior team brings architecture, interiors and construction into one conversation early. That means fewer handoffs, better decisions and a renovation that feels considered at every scale.</p>
              <blockquote className="mt-9 border-l border-brass pl-6"><p className="display max-w-[440px] text-[29px] leading-[1.25]">“The best renovation is the one where the process feels as thoughtful as the finished rooms.”</p><footer className="eyebrow mt-4">Mara Ellis · Founding project director</footer></blockquote>
            </Reveal>
            <Reveal className="relative aspect-[4/5] max-h-[590px] bg-[#c4b9a8]">
              <Image src="https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85" alt="Natural material palette and careful detailing in a renovated home" fill sizes="(max-width: 767px) 100vw, 50vw" className="object-cover" />
              <span className="absolute bottom-4 left-4 bg-paper/90 px-3 py-2 eyebrow !text-[9px]">Material, light, proportion</span>
            </Reveal>
          </div>
        </section>

        <section id="service-area" className="border-y border-line bg-paper-deep py-20">
          <div className="wrap grid gap-8 md:grid-cols-[.8fr_1.2fr] md:items-center">
            <Reveal><div className="section-head mb-0"><span className="section-number">04</span><h2 className="display section-title">Close to home.</h2></div></Reveal>
            <Reveal><p className="eyebrow mb-5">Greater Boston · Massachusetts</p><ul className="grid grid-cols-2 gap-y-3 sm:grid-cols-4">{towns.map((town) => <li className="list-none text-[14px]" key={town}>{town}</li>)}</ul><p className="mt-6 max-w-[600px] text-[12px] leading-6 text-muted">Outside these neighborhoods? For the right project, we consider homes within a 45-minute drive of Boston. Tell us where you are and we’ll be candid about fit.</p></Reveal>
          </div>
        </section>

        <section id="book" className="section wrap">
          <Reveal><div className="section-head"><span className="section-number">05</span><h2 className="display section-title">Begin with a conversation.</h2></div></Reveal>
          <div className="grid gap-12 md:grid-cols-[.8fr_1.2fr] md:gap-20">
            <Reveal>
              <p className="max-w-[390px] text-[15px] leading-7 text-muted">Tell us a little about the home and what you hope to change. Our project director will be in touch within two working days.</p>
              <button type="button" onClick={() => setChatOpen(true)} className="mt-7 inline-flex items-center gap-3 border-0 bg-transparent p-0 text-[13px] text-ink underline decoration-line underline-offset-4 hover:text-brass-hover"><MessageCircle size={16} aria-hidden="true" /> Talk it through <ArrowUpRight size={14} aria-hidden="true" /></button>
              <div className="mt-12 border-t border-line pt-5"><p className="eyebrow mb-2">Prefer a direct conversation?</p><a className="display text-[27px] text-ink no-underline" href="tel:+16175550184">617 555 0184</a><p className="mt-1 text-[12px] text-muted">Monday–Friday · 9:00 am–5:00 pm</p></div>
            </Reveal>
            <Reveal>
              {formSuccess && <div role="status" className="mb-6 flex items-start justify-between gap-4 border border-brass/40 bg-[#efeae1] p-4 text-[13px]"><span className="flex gap-2"><Check size={17} className="shrink-0 text-brass" /> Your inquiry is with our project director. We’ll be in touch shortly.</span><button aria-label="Dismiss success message" type="button" onClick={() => setFormSuccess(false)}><X size={17} /></button></div>}
              <form className="grid gap-x-7 gap-y-5 sm:grid-cols-2" onSubmit={submitInquiry} noValidate>
                <Field label="Name" name="name" error={formErrors.name} required />
                <Field label="Phone" name="phone" type="tel" error={formErrors.phone} required />
                <Field label="ZIP code" name="zip" inputMode="numeric" error={formErrors.zip} required />
                <Field label="Email" name="email" type="email" error={formErrors.email} />
                <label className="block"><span className="eyebrow">Project type <span aria-hidden="true">*</span></span><span className="relative block"><select name="projectType" defaultValue="" aria-invalid={Boolean(formErrors.projectType)} aria-describedby={formErrors.projectType ? "projectType-error" : undefined} className="form-control appearance-none pr-7"><option value="" disabled>Select a project</option><option>Whole-home renovation</option><option>Kitchen</option><option>Bathroom</option><option>Addition</option><option>Other</option></select><ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-0 top-4 text-muted" /></span>{formErrors.projectType && <span id="projectType-error" className="mt-1 block text-[11px] text-[#8b4739]">{formErrors.projectType}</span>}</label>
                <label className="block sm:col-span-2"><span className="eyebrow">A little about the project <span className="normal-case tracking-normal">(optional)</span></span><textarea name="message" rows={3} className="form-control resize-y" placeholder="What would you like to make possible?" /></label>
                {formErrors.form && <p role="alert" className="sm:col-span-2 text-[12px] text-[#8b4739]">{formErrors.form}</p>}
                <div className="flex flex-wrap items-center gap-4 sm:col-span-2"><button className="button-primary disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={formBusy}>{formBusy ? "Sending…" : "Send inquiry"} {!formBusy && <ArrowRight size={15} aria-hidden="true" />}</button><span className="text-[11px] text-muted">Your details stay with our studio.</span></div>
              </form>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-paper-deep py-12">
        <div className="wrap">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-[1.2fr_.8fr_.8fr]">
            <div><a href="#top" className="display text-[27px] text-ink no-underline">Slate <span className="text-brass">&</span> Timber Co.</a><p className="mt-3 max-w-[270px] text-[12px] leading-6 text-muted">Thoughtful residential design-build for Greater Boston homes.</p></div>
            <div><p className="eyebrow mb-3">Explore</p><div className="grid grid-cols-2 gap-y-2 text-[12px]"><a className="text-muted no-underline hover:text-ink" href="#work">Work</a><a className="text-muted no-underline hover:text-ink" href="#about">About</a><a className="text-muted no-underline hover:text-ink" href="#approach">Approach</a><a className="text-muted no-underline hover:text-ink" href="#service-area">Service area</a><a className="text-muted no-underline hover:text-ink" href="#book">Inquire</a></div></div>
            <div><p className="eyebrow mb-3">Reach us</p><a className="block text-[12px] text-muted no-underline hover:text-ink" href="tel:+16175550184">617 555 0184</a><a className="mt-1 block text-[12px] text-muted no-underline hover:text-ink" href="mailto:studio@slateandtimber.co">studio@slateandtimber.co</a><p className="mt-3 text-[11px] text-muted">Monday–Friday · 9:00 am–5:00 pm</p></div>
          </div>
          <div className="mt-9 flex flex-col justify-between gap-2 border-t border-line pt-4 text-[10px] text-muted sm:flex-row"><span>© {new Date().getFullYear()} Slate & Timber Co. All rights reserved.</span><span>Made with care in Massachusetts.</span></div>
        </div>
      </footer>

      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
        {chatOpen && <section aria-label="Project concierge" className="chat-panel flex h-[min(560px,calc(100dvh-120px))] w-[min(380px,calc(100vw-32px))] flex-col border border-line bg-paper shadow-[0_16px_60px_rgba(28,31,29,.17)]">
          <div className="flex items-start justify-between border-b border-line px-5 py-4"><div><p className="eyebrow">Slate & Timber Co.</p><h2 className="display mt-1 text-[23px]">Project concierge</h2><p className="text-[11px] text-muted">A useful first conversation, without pressure.</p></div><button type="button" onClick={() => setChatOpen(false)} aria-label="Close concierge" className="p-2 text-muted hover:text-ink"><X size={18} /></button></div>
          <div className="chat-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite" aria-relevant="additions text">
            {messages.map((message, index) => <div key={`${index}-${message.role}`} className={`max-w-[88%] whitespace-pre-wrap px-3 py-2.5 text-[13px] leading-5 ${message.role === "user" ? "ml-auto bg-paper-deep text-ink" : "border-l border-brass bg-[#f1eee8] text-ink"}`}><p className="eyebrow mb-1 !text-[9px]">{message.role === "user" ? "You" : "Project director"}</p>{message.content}</div>)}
            {chatBusy && <p className="text-[12px] text-muted" role="status">Thinking…</p>}
            {chatError && <p role="alert" className="text-[12px] text-[#8b4739]">{chatError}</p>}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendChat} className="flex items-center gap-2 border-t border-line p-3"><label className="sr-only" htmlFor="chat-message">Your message</label><input ref={chatInputRef} id="chat-message" value={chatInput} onChange={(event) => setChatInput(event.target.value)} maxLength={2000} placeholder="Ask about a project…" className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-[13px] outline-none placeholder:text-muted" /><button type="submit" aria-label="Send message" disabled={chatBusy || !chatInput.trim()} className="inline-flex size-10 shrink-0 items-center justify-center bg-brass text-paper transition-colors hover:bg-brass-hover disabled:opacity-50"><ArrowUpRight size={18} /></button></form>
        </section>}
        <button type="button" onClick={() => setChatOpen((open) => !open)} aria-label={chatOpen ? "Close project concierge" : "Open project concierge"} aria-expanded={chatOpen} className="flex size-14 items-center justify-center border border-brass bg-brass text-paper shadow-lg transition-transform hover:scale-[1.03] hover:bg-brass-hover">{chatOpen ? <X size={21} /> : <MessageCircle size={21} />}</button>
      </div>
    </>
  );
}

function Field({ label, name, type = "text", error, required = false, inputMode }: { label: string; name: string; type?: string; error?: string; required?: boolean; inputMode?: "numeric" | "text" }) {
  return <label className="block"><span className="eyebrow">{label}{required && <span aria-hidden="true"> *</span>}</span><input name={name} type={type} inputMode={inputMode} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} className="form-control" />{error && <span id={`${name}-error`} className="mt-1 block text-[11px] text-[#8b4739]">{error}</span>}</label>;
}