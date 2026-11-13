import Image from 'next/image';
import styles from './page.module.css';

const areasOfInterest = [
  'AI infrastructure and computing costs',
  'Investment and capital allocation',
  'AI business models',
  'Productivity',
  'Long-term economic sustainability of AI',
];

export default function HomePage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={`container ${styles.heroGrid}`}>
          <div>
            <p className="eyebrow">An early-stage AI economics startup</p>
            <h1 id="hero-title">The Economics<br />of <span>Intelligence.</span></h1>
            <p className={styles.subtitle}>Understanding the economics behind artificial intelligence.</p>
          </div>
          <div className={styles.monogram}>
            <Image className={styles.logo} src="/ainternals-growth-monogram.png" alt="AInternals growth monogram" width={1254} height={1254} sizes="(max-width: 760px) 213px, (max-width: 1000px) 418px, 532px" preload />
          </div>
        </div>
      </section>

      <section id="about" className={styles.section} aria-labelledby="about-title">
        <div className={`container ${styles.split}`}>
          <h2 id="about-title">Understanding<br />AI economics.</h2>
          <div className={styles.prose}>
            <p className={styles.lead}>AInternals is an early-stage startup focused on AI economics.</p>
            <p>We are exploring how artificial intelligence is changing the economics of technology, business, and society.</p>
            <div className={styles.interests}>
              <h3>Our areas of interest</h3>
              <ul>
                {areasOfInterest.map((area, index) => (
                  <li key={area}>
                    <span aria-hidden="true">0{index + 1}</span>
                    {area}
                  </li>
                ))}
              </ul>
            </div>
            <p>We believe understanding AI requires looking beyond what the technology can do to examine what it costs, what value it creates, and whether that value can be sustained.</p>
          </div>
        </div>
      </section>

      <section id="where-we-are" className={`${styles.section} ${styles.today}`} aria-labelledby="today-title">
        <div className={`container ${styles.split}`}>
          <div><p className="eyebrow">Our foundation</p><h2 id="today-title">Where We Are Today</h2></div>
          <div className={styles.prose}>
            <p className={styles.lead}>AInternals is at an early stage of development.</p>
            <p>We are currently learning, researching, and shaping our direction. Our ambition is to build a thoughtful, evidence-led perspective on the economics of artificial intelligence.</p>
            <p>We are not presenting ourselves as an established research institution or advisory firm. We are building our foundation, one step at a time.</p>
          </div>
        </div>
      </section>
    </>
  );
}
