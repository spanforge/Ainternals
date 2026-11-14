import { explanationParts, type FieldGuide } from '@/lib/tco/guidance';
import styles from './UserGuide.module.css';

export default function FieldExplanation({field}:{field:FieldGuide}) {
  return <dl className={styles.explanationList}>
    {explanationParts.map(([key,label]) => <div key={key}><dt>{label}</dt><dd>{field[key]}</dd></div>)}
  </dl>;
}
