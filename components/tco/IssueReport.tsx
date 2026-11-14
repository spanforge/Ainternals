import styles from './IssueReport.module.css';

const email = 'sriram@sriramadvisory.com';
const subject = encodeURIComponent('AInternals AI TCO Calculator — issue report');

export default function IssueReport() {
  return <section className={styles.report} aria-label="Report a calculator issue">
    <h2>Something doesn’t look right?</h2>
    <p>Report a calculation discrepancy, unclear guidance, or any other issue to <a href={`mailto:${email}?subject=${subject}`}>{email}</a>.</p>
    <p className={styles.hint}>Include the affected field or result, what you expected, and what you observed. Avoid sharing sensitive financial assumptions or private scenario files.</p>
  </section>;
}
