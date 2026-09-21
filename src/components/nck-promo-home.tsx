"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen, GraduationCap, HandHeart } from "lucide-react";
import { useState } from "react";

import type { Plan } from "@/lib/plans";
import { formatCurrency } from "@/lib/utils";

const faqItems = [
  {
    question: "What ages does the curriculum cover?",
    answer:
      "New Creation Kids spans preschool through Year 6. Every lesson has a school-aged version and a preschool adaptation, so two ministry groups can teach the same Bible passage on the same Sunday at an age-appropriate depth."
  },
  {
    question: "What theological convictions sit behind it?",
    answer:
      "It’s designed to sit comfortably in gospel-shaped, evangelical churches, without requiring denominational adjustment."
  },
  {
    question: "How long is a typical session, and how much prep does a leader need?",
    answer:
      "Sessions are designed to run for 45-60 minutes. The leader guides encourage personal preparation, with sufficient support, slides, and activity resources included so there is nothing to build from scratch."
  },
  {
    question: "We're a small church with one mixed-age group - does this work for us?",
    answer:
      "Yes. While the curriculum provides separate school-aged and preschool tracks, the underlying passage and big idea are the same each week, so a combined group can work through the same content together."
  },
  {
    question: "What leader training is included?",
    answer:
      "The leader notes use the Teaching Target framework, as used in Youthworks' LiT training program, to encourage leaders to develop their own exegetical skills. Videos and additional resources help leaders grow in ministry."
  },
  {
    question: "How does pricing work?",
    answer:
      "Pricing is per church, not per volunteer, so your whole team accesses the same materials under one subscription. No counting seats, no extra admin as your team grows."
  },
  {
    question: "Who is writing New Creation Kids?",
    answer:
      "New Creation Kids is a product of Youthworks in Sydney, written by experienced children's ministry practitioners on the Ministry Support Team alongside ministry workers in local churches."
  },
  {
    question: "When can we start using it?",
    answer:
      "Volume 1 is available through the subscription platform as content is released for churches."
  }
];

const cycleCards = [
  ["1", "Creation", "Genesis 1-2", "God made everything, and everything God made is good.", "pink"],
  ["2", "The Fall", "Genesis 3-11", "Sin breaks the world, but God does not give up on his people.", "orange"],
  ["3", "The Promise", "Old Testament", "God promises a Rescuer and prepares the way through his people.", "blue"],
  ["4", "The Rescue", "The Gospels", "Jesus lives, dies and rises: the promised King has come.", "pink"],
  ["5", "New Creation", "Acts-Revelation", "The good news spreads, and one day God makes all things new.", "blue"]
];

export function NckPromoHome({ plans, isLoggedIn = false }: { plans: Plan[]; isLoggedIn?: boolean }) {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <main className="nck-promo-home">
      <section className="promo-hero promo-dark promo-grid-lines" id="home">
        <div className="promo-container promo-hero-grid">
          <div>
            <p className="promo-eyebrow promo-hero-kicker">Bible-centred · Child-focused · Preschool-Year 6</p>
            <h1 className="promo-hero-title">
              <span>New</span>
              <span className="promo-blue">Creation</span>
              <span className="promo-blue">Kids</span>
            </h1>
            <p className="promo-hero-copy">
              A Bible-centred curriculum from Youthworks for your children&apos;s ministry. One per-church price -
              your whole leadership team gets access on one subscription.
            </p>
          </div>
          <Image
            className="promo-hero-product-image"
            src="/nck-promo/hero-platform-preview.png"
            alt="New Creation Kids platform preview showing lesson downloads"
            width={521}
            height={412}
            priority
          />
        </div>
      </section>

      <section className="promo-light promo-sample-section" id="sample">
        <div className="promo-container promo-narrow">
          <p className="promo-eyebrow">Sample lesson</p>
          <h2>See a lesson before you commit.</h2>
          <p className="promo-section-caption">Download a sample week below or click preview above to see the member area.</p>
          <div className="promo-sample-grid">
            <article className="promo-sample-card">
              <div className="promo-sample-head promo-pink-bg">
                <small>Unit 1 · For School Age</small>
                <h3>Mary and Martha</h3>
                <span>Luke 10 · School aged</span>
              </div>
              <div className="promo-sample-body">
                <small>Big idea</small>
                <p>Jesus says listen to me first.</p>
                <a href="/nck-promo/NCK-LUKE-PRIMARY SCHOOL CURRICULUM-WEEK 6 SAMPLE.pdf" target="_blank" rel="noreferrer">
                  Download sample
                </a>
              </div>
            </article>
            <article className="promo-sample-card">
              <div className="promo-sample-head promo-green-bg">
                <small>Unit 1 · For Preschool</small>
                <h3>Mary and Martha</h3>
                <span>Luke 10 · Preschool</span>
              </div>
              <div className="promo-sample-body">
                <small>Big idea</small>
                <p>Jesus says listen to me first.</p>
                <a href="/nck-promo/NCK-LUKE-PRE-SCHOOL CURRICULUM-WEEK 6 SAMPLE.pdf" target="_blank" rel="noreferrer">
                  Download sample
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="promo-dark promo-built-section">
        <div className="promo-container promo-narrow">
          <p className="promo-eyebrow">Why New Creation Kids</p>
          <h2>Built on Three Pillars</h2>
          <div className="promo-feature-grid">
            <article className="promo-feature-card">
              <span className="promo-icon-box promo-pink-bg"><BookOpen size={20} /></span>
              <h3>Bible-centred</h3>
              <p>Every week engages children with the Bible text, helping them see Jesus and the one redemptive story.</p>
            </article>
            <article className="promo-feature-card">
              <span className="promo-icon-box promo-orange-bg"><HandHeart size={20} /></span>
              <h3>Family discipleship</h3>
              <p>Family reading guides and take-home resources are included to partner with families.</p>
            </article>
            <article className="promo-feature-card">
              <span className="promo-icon-box promo-blue-bg"><GraduationCap size={20} /></span>
              <h3>Training for leaders</h3>
              <p>Resources, guides, and training content help leaders grow as they teach and lead.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="promo-light promo-video-section">
        <div className="promo-container promo-center">
          <p className="promo-eyebrow promo-centered">Watch the vision</p>
          <h2>Two minutes on why we built this.</h2>
          <div className="promo-video-poster">
            <Image src="/nck-promo/video-poster.jpg" alt="Video poster for Watch the vision" width={680} height={382} />
            <span className="promo-play-button" aria-hidden="true" />
          </div>
          <p className="promo-section-caption">
            Hear from the team behind New Creation Kids on the heart of the curriculum and what makes it different for
            your church.
          </p>
        </div>
      </section>

      <section className="promo-dark promo-platform-section promo-grid-lines" id="platform">
        <div className="promo-container promo-platform-grid">
          <div>
            <p className="promo-eyebrow">The platform</p>
            <h2>A purpose-built<br />platform for<br />churches.</h2>
            <p>Plan your year. Give your volunteers access to everything they need. All in one calm, uncluttered place.</p>
            <ul className="promo-check-list">
              <li>Every age stage, planned out term by term</li>
              <li>Leader guides, slides and image packs in a click</li>
              <li>Family take-home pages</li>
            </ul>
          </div>
          <Image
            className="promo-platform-panel-image"
            src="/nck-promo/platform-panel-preview.png"
            alt="New Creation Kids platform lesson page showing resources"
            width={636}
            height={492}
          />
        </div>
      </section>

      <section className="promo-light promo-cycle-section" id="teaching-cycle">
        <div className="promo-container promo-center">
          <p className="promo-eyebrow promo-centered">The teaching cycle</p>
          <h2>The whole Bible story,<br />start to finish.</h2>
          <p className="promo-section-caption promo-cycle-caption">
            New Creation Kids moves children through Scripture&apos;s one big story every three years. Each year we spend 6 months in the Old Testament and 6 months in the New Testament. After three years we&apos;ll go back to the start so kids will read the whole story several times through your children&apos;s ministry.
          </p>
          <div className="promo-cycle-grid">
            {cycleCards.map(([number, title, reference, text, colour]) => (
              <article className="promo-cycle-card" key={title}>
                <span className={`promo-cycle-number promo-${colour}-bg`}>{number}</span>
                <h3>{title}</h3>
                <small>{reference}</small>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <div className="promo-scope-callout">
            <span aria-hidden="true" />
            <a className="promo-scope-link" href="/nck-promo/NCK-Scope-Sequence.pdf" target="_blank" rel="noreferrer">
              Download Scope and Sequence
            </a>
          </div>
        </div>
      </section>

      <section id="subscription-plans" className="promo-dark promo-grid-lines promo-subscribe-section promo-pricing-section">
        <div className="promo-container promo-center">
          <p className="promo-eyebrow promo-centered">Subscription</p>
          <h2>One church subscription.<br />Three simple tiers.</h2>
          <p className="promo-section-caption">
            Choose the plan that matches the size of your children&apos;s ministry.
          </p>
          <div className="promo-pricing-grid">
            {plans.map((plan) => (
              <article className={`promo-pricing-card promo-pricing-card-${plan.id}`} key={plan.id}>
                <span className="promo-plan-range">{plan.studentRange}</span>
                <h3>{plan.name}</h3>
                <p className="promo-plan-price">
                  {formatCurrency(plan.annualPrice, plan.currency)}
                  <span>/year +GST</span>
                </p>
                <div className="promo-plan-summary" dangerouslySetInnerHTML={{ __html: plan.summaryHtml }} />
                {isLoggedIn ? (
                  <button type="button" className="promo-hot-button promo-hot-button-disabled" disabled>
                    Choose this plan
                  </button>
                ) : (
                  <Link href={`/subscribe?tier=${plan.id}`} className="promo-hot-button">
                    Choose this plan
                  </Link>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="promo-light promo-questions-section" id="questions">
        <div className="promo-container">
          <div className="promo-center">
            <p className="promo-eyebrow promo-centered">Questions</p>
            <h2>Everything you&apos;re<br />wondering.</h2>
          </div>
          <div className="promo-faq-list">
            {faqItems.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <article className="promo-faq-item" key={item.question}>
                  <button type="button" onClick={() => setOpenFaq(isOpen ? -1 : index)} aria-expanded={isOpen}>
                    <span>{item.question}</span>
                    <span aria-hidden="true">{isOpen ? "↑" : "↓"}</span>
                  </button>
                  {isOpen ? <p>{item.answer}</p> : null}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <a
        className="promo-floating-call-cta"
        href="https://bookings.cloud.microsoft/book/NewCreationKids@youthworks.net/s/ehFDP-7D6Ued_m6BPY1SxQ2?ismsaljsauthenabled"
        target="_blank"
        rel="noreferrer"
      >
        <span>Book a call</span>
        <small>Let us help you</small>
      </a>

    </main>
  );
}
