import { ReactNode } from 'react';

import styles from './footer.module.scss';

interface FooterProps {
  children: ReactNode;
}

export function Footer({ children }: FooterProps): JSX.Element {
  return (
    <footer className={styles.footerContainer}>
      <div className={styles.footerContent}>{children}</div>
    </footer>
  );
}
