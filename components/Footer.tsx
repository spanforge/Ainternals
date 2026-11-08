import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div>
          <Link href="/" className={styles.brand}>AInternals</Link>
          <p className={styles.tagline}>The Economics of Intelligence.</p>
        </div>
        <p>An early-stage AI economics startup.</p>
      </div>
    </footer>
  );
}
