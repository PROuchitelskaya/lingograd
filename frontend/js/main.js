// Точка входа: /teacher — панель учителя, всё остальное — экран ученика.

import { startStudent, mountChrome as studentChrome } from './student.js';
import { startTeacher, mountChrome as teacherChrome } from './teacher.js';
import { unlock, startMusic, settings } from './audio.js';

const isTeacher = location.pathname.replace(/\/+$/, '') === '/teacher';
document.body.dataset.role = isTeacher ? 'teacher' : 'student';

if (isTeacher) {
  teacherChrome();
  startTeacher();
} else {
  studentChrome();
  startStudent();
}

// Браузеры включают звук только после жеста пользователя.
const wake = () => {
  unlock();
  if (settings.music) startMusic();
  window.removeEventListener('pointerdown', wake);
  window.removeEventListener('keydown', wake);
};
window.addEventListener('pointerdown', wake, { once: false });
window.addEventListener('keydown', wake, { once: false });

window.addEventListener('error', (e) => console.error('[lingograd]', e.message));
