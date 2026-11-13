import Link from 'next/link';
import styles from './Nav.module.css';

export default function Nav() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label="AInternals home">
          AInternals<span>.</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/prices">Price watch</Link>
          <Link href="/#about">About</Link>
          <Link href="/#where-we-are">Where we are</Link>
        </nav>
      </div>
    </header>
  );
}
