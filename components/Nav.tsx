import styles from './Nav.module.css';
export default function Nav() {
  return <header className={styles.header}><div className={`container ${styles.inner}`}><a href="/" className={styles.brand} aria-label="AInternals home">AInternals<span>.</span></a><nav aria-label="Main navigation"><a href="/#about">About</a><a href="/#where-we-are">Where we are</a></nav></div></header>;
}
