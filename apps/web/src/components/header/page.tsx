'use client';
import { useState } from 'react';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();
  const [languageSelected, setLanguageSelected] = useState<string>("en");
  const handleLanguageChange = (language: string) => {
    setLanguageSelected(language);
  };
  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <h1 className={styles.logo} onClick={() => router.push('/')}>LOGO</h1>
        <div className={styles.navItem} onClick={() => router.push('/')}>Home</div>
        <div className={styles.navItem} onClick={() => router.push('/about')}>About</div>
        <div className={styles.navItem} onClick={() => router.push('/contact')}>Contact</div>
      </div>
      <div className={styles.right}>
        <div className={styles.navItem}>
          <select className={styles.languageSelector} value={languageSelected} onChange={(e) => handleLanguageChange(e.target.value)}>
            <option value={"en"} selected={languageSelected === "en" ? true : false}>EN</option>
            <option value={"fr"} selected={languageSelected === "fr" ? true : false}>FR</option>
            <option value={"es"} selected={languageSelected === "es" ? true : false}>ES</option>
            <option value={"de"} selected={languageSelected === "de" ? true : false}>DE</option>
            <option value={"it"} selected={languageSelected === "it" ? true : false}>IT</option>
            <option value={"pt"} selected={languageSelected === "pt" ? true : false}>PT</option>
            <option value={"ru"} selected={languageSelected === "ru" ? true : false}>RU</option>
            <option value={"zh"} selected={languageSelected === "zh" ? true : false}>ZH</option>
            <option value={"ja"} selected={languageSelected === "ja" ? true : false}>JA</option>
          </select>
        </div>
        <div className={styles.navItem} onClick={() => router.push('/login')}>
          <button className={styles.navButton}>Login</button>
        </div>
        <div className={styles.navItem} onClick={() => router.push('/register')}>
          <button className={styles.navButton}>Register</button>
        </div>
      </div>
    </div >
  );
}