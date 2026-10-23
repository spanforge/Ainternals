'use client';
import { useRef, useState } from 'react';
import styles from './Nav.module.css';
const links = [['why', 'Why AInternals'], ['focus', 'Our Focus'], ['building', 'What We’re Building'], ['thinking', 'How We Think']];
export default function Nav() {
    const [open, setOpen] = useState(false);
    const toggle = useRef<HTMLButtonElement>(null);
    return <header className={styles.header} onKeyDown={e => { if (e.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
    } }}><div className={`container ${styles.inner}`}><a href="/" className={styles.logo} aria-label="AInternals home"><span className={styles.mark} aria-hidden="true">ai</span>AInternals<span className={styles.logoDot}>.</span></a><nav aria-label="Main navigation" className={styles.desktop}>{links.map(([id, label]) => <a key={id} href={`/#${id}`}>{label}</a>)}</nav><a href="/#connect" className={styles.contact}>Let’s Talk <span aria-hidden="true">↗</span></a><button ref={toggle} type="button" className={styles.toggle} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(!open)}>{open ? 'Close −' : 'Menu +'}</button></div><nav id="mobile-navigation" hidden={!open} aria-label="Mobile navigation" className={styles.mobile}>{[...links, ['connect', 'Let’s Talk']].map(([id, label]) => <a key={id} href={`/#${id}`} onClick={() => setOpen(false)}>{label}<span aria-hidden="true">↗</span></a>)}</nav></header>;
}
