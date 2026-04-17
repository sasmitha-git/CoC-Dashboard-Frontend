import Link from 'next/link';
import Image from 'next/image';
import styles from './Footer.module.css';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/player', label: 'Players' },
  { href: '/clan', label: 'Clans' },
  { href: '/login', label: 'Login' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.siteFooter}>
      <div className={styles.footerShell}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <span className={styles.footerKicker}>CoC Dashboard</span>
            <h2>Your quick Clash of Clans overview.</h2>
            <p>Jump between the essentials and keep your stats close.</p>
          </div>

          <div className={styles.footerArt} aria-hidden="true">
            <Image
              src="/valkyrie2.png"
              alt=""
              width={88}
              height={88}
              className={styles.footerImage}
              style={{ height: 'auto' }}
            />
          </div>
        </div>

        <div className={styles.footerLinks}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={styles.footerLink}>
              {item.label}
            </Link>
          ))}
        </div>

        <div className={styles.footerMeta}>
          <span>Built for Clash of Clans stats and clan snapshots.</span>
          <span>{year} CoC Dashboard</span>
        </div>
      </div>
    </footer>
  );
}
