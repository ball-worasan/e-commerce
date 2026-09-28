'use client';
import styles from './page.module.css';

export default function Index() {
  return (
    <div className={styles.container}>
      <div>
        <h1 className={styles.title}>Hello World</h1>
      </div>
      <div className={styles.description}>
        <p className={styles.descriptionText}>This is the home page</p>
      </div>
    </div>
  );
}
