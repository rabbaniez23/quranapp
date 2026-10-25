import { useEffect } from 'react';

// Elemen ber-kelas "reveal" diberi kelas "muncul" saat masuk layar (animasinya di index.css)
export const useReveal = () => {
  useEffect(() => {
    const elemen = document.querySelectorAll('.reveal:not(.muncul)');
    if (!('IntersectionObserver' in window)) {
      elemen.forEach((el) => el.classList.add('muncul'));
      return;
    }
    const pengamat = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('muncul');
          pengamat.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    elemen.forEach((el) => pengamat.observe(el));
    return () => pengamat.disconnect();
  }, []);
};

// Kartu menyala mengikuti kursor: simpan posisi kursor ke variabel CSS --x / --y
export const ikutiKursor = (e) => {
  const kotak = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--x', `${e.clientX - kotak.left}px`);
  e.currentTarget.style.setProperty('--y', `${e.clientY - kotak.top}px`);
};
